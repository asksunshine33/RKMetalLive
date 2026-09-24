# RK Metal ERP — UAT (M-CONFIG)
Single-file UAT app for RK Metal Roofings ERP v2. Wired live to the Supabase UAT database (login required; accounts are created by the administrator only — public signups disabled).

- `index.html` — the entire app (M-CONFIG module: Reference Lists, Numbering, Workflow, Notifications, Flags, Modules, TAT, Governance; Approval Authority pending M04).
- Auth: Supabase (email/password). The embedded key is the *publishable* key — safe by design; all access is enforced by database Row-Level Security.
- Quality record: 118 rule-points audited, 36/36 violations fixed, 2 independent audit cycles clean (see project registers).

Deploy: static hosting (Vercel). No build step.
