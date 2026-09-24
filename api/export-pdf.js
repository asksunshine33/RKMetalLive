

'use strict';

if (!process.env.AWS_EXECUTION_ENV && !process.env.AWS_LAMBDA_JS_RUNTIME) {
  process.env.AWS_LAMBDA_JS_RUNTIME = 'nodejs22.x';
}

const crypto = require('crypto');
const chromium = require('@sparticuz/chromium');
const { chromium: playwright } = require('playwright-core');
const { PDFDocument } = require('pdf-lib');
const { merge } = require('./_merge.js');

chromium.setGraphicsMode = false;

const RENDERER = 'rk-pdf-engine@1.0.0';

// supabase
function sb(path, init) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('the engine is not configured');
  return fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init && init.headers)
    }
  });
}

async function rpc(name, body) {
  const res = await sb(`/rest/v1/rpc/${name}`, { method: 'POST', body: JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${name} failed (${res.status}): ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function readExport(exportId) {
  const res = await sb(`/rest/v1/pdf_exports?id=eq.${exportId}&select=id,status,module_code,document_id,template_id,template_code,copy_type,cost_visible,payload,generated_at`, { method: 'GET' });
  if (!res.ok) throw new Error(`could not read the export row (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const rows = await res.json();
  return rows[0] || null;
}

async function readTemplate(templateId) {
  const res = await sb(`/rest/v1/pdf_templates?id=eq.${templateId}&select=template_code,template_body_html,version,template_name`, { method: 'GET' });
  if (!res.ok) throw new Error(`could not read the template row (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const rows = await res.json();
  return rows[0] || null;
}

async function upload(objectPath, bytes) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${url}/storage/v1/object/pdf-exports/${objectPath}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/pdf',
      'x-upsert': 'false'          
    },
    body: bytes
  });
  if (!res.ok) throw new Error(`upload failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
}

// ---------------------------------------------------------------- assets

const ASSET_KIND = {
  is_logo:      t => /logo|letterhead/i.test(t || ''),
  is_signature: t => /sign/i.test(t || ''),
  is_seal:      t => /seal|stamp/i.test(t || ''),
  is_qr:        t => /qr|upi/i.test(t || '')
};

async function inlineAssets(assets) {
  if (!Array.isArray(assets) || assets.length === 0) return [];
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const out = [];
  for (const a of assets) {
    if (!a || !a.storage_bucket || !a.storage_path) continue;
    try {
      const r = await fetch(`${url}/storage/v1/object/${a.storage_bucket}/${a.storage_path}`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }
      });
      if (!r.ok) continue;                       
      const buf = Buffer.from(await r.arrayBuffer());
      const mime = a.mime_type || 'image/png';
      const item = { ...a, data_uri: `data:${mime};base64,${buf.toString('base64')}` };
      for (const [flag, test] of Object.entries(ASSET_KIND)) {
        if (test(a.asset_type) || test(a.asset_label)) item[flag] = true;
      }
      out.push(item);
    } catch (_) {  }
  }
  return out;
}

// ---------------------------------------------------------------- render

async function renderPdf(htmls) {
  const list = Array.isArray(htmls) ? htmls : [htmls];
  const browser = await playwright.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true
  });
  try {

    const page = await browser.newPage();
    await page.emulateMedia({ media: 'print' });
    const bufs = [];
    for (const html of list) {

      await page.setContent(html, { waitUntil: 'load' });
      bufs.push(await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true }));
    }
    const version = `${RENDERER}+chromium${(await browser.version()).replace(/[^0-9.]/g, '')}`;
    if (bufs.length === 1) return { buf: bufs[0], version };

    const out = await PDFDocument.create();
    for (const b of bufs) {
      const src = await PDFDocument.load(b);
      const pages = await out.copyPages(src, src.getPageIndices());
      for (const p of pages) out.addPage(p);
    }
    return { buf: Buffer.from(await out.save()), version };
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------- handler
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'POST only' });
    return;
  }

  let exportId = null;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    exportId = body.export_id;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(exportId || ''))) {
      res.status(400).json({ ok: false, error: 'export_id is required and must be an id' });
      return;
    }

    const row = await readExport(exportId);
    if (!row) { res.status(404).json({ ok: false, error: 'no such export' }); return; }

    if (row.status !== 'REQUESTED') {
      res.status(200).json({ ok: true, replay: true, export_id: exportId, status: row.status });
      return;
    }

    const tpl = await readTemplate(row.template_id);
    if (!tpl) throw new Error('the export cites a template row that cannot be read');

    const context = { ...row.payload, assets: await inlineAssets(row.payload && row.payload.assets) };

    const twoPart = tpl.template_body_html.indexOf('{{#part_main}}') !== -1;
    const passes = twoPart
      ? [merge(tpl.template_body_html, { ...context, part_main: true }),
         merge(tpl.template_body_html, { ...context, part_annex: true })]
      : [merge(tpl.template_body_html, context)];

    const hasVisible = (h) => {
      const body = String(h).replace(/[\s\S]*?<body[^>]*>/i, '');
      if (/<img[\s>]/i.test(body)) return true;
      const text = body
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/&[a-z#0-9]+;/gi, '')
        .replace(/\s+/g, '');
      return text.length > 0;
    };
    const htmls = passes.filter(hasVisible);
    if (htmls.length === 0) {
      throw new Error('every render pass merged to an empty page');
    }

    const html = htmls.join('\n<!-- ==== RK-PDF PASS BOUNDARY ==== -->\n');

    const { buf, version } = await renderPdf(htmls);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    const year = String(row.generated_at || new Date().toISOString()).slice(0, 4);
    const objectPath = `${row.module_code}/${year}/${exportId}.pdf`;

    const p = row.payload || {};

    const docNo = (p.order && p.order.so_no) || (p.quote && p.quote.quote_no)
               || (p.work_order && p.work_order.wo_no) || (p.packing_list && p.packing_list.pl_no)
               || row.document_id;
    const fileName = `${docNo}-${row.copy_type}.pdf`;

    await upload(objectPath, buf);

    const out = await rpc('export_pdf_fulfil', {
      p_payload: {
        export_id: exportId,
        status: 'DONE',
        file_name: fileName,
        file_path: objectPath,
        file_hash: hash,
        file_bytes: buf.length,
        renderer_version: version,
        rendered_html: html
      }
    });

    res.status(200).json({ ok: true, replay: false, export_id: exportId, file_path: objectPath, file_hash: hash, result: out });
  } catch (err) {

    // finished document.

    console.error('[export-pdf]', exportId, err);
    try {
      if (exportId) {
        await rpc('export_pdf_fulfil', {
          p_payload: { export_id: exportId, status: 'ERROR', error_message: String(err && err.message || err).slice(0, 500) }
        });
      }
    } catch (_) {  }
    res.status(500).json({ ok: false, error: String(err && err.message || err) });
  }
};
