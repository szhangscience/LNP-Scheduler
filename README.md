# LNP Sample Scheduler — Netlify deployment

## Repository layout

```
your-repo/
├── index.html                      ← your frontend (no secrets)
├── netlify.toml                    ← build + redirect config
└── netlify/
    └── functions/
        └── airtable.js             ← serverless proxy
```

## First-time setup

### 1. Rotate your exposed Airtable token

Your old token (`patdiwRuqtTXmLBVL…`) was visible in source code and must be
considered compromised. In Airtable:

  Account → Developer hub → Personal access tokens → Delete the old one → Create new

Give the new token the same scopes as before (`data.records:read`,
`data.records:write`), scoped to your base only.

### 2. Push to GitHub / GitLab / Bitbucket

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 3. Create a Netlify site

- Log in to netlify.com → "Add new site" → "Import an existing project"
- Connect your repo — Netlify auto-detects `netlify.toml`

### 4. Set environment variables

In the Netlify dashboard:
  Site → Site configuration → Environment variables → Add a variable

| Variable          | Value                                |
|-------------------|--------------------------------------|
| `AIRTABLE_TOKEN`  | Your new Personal Access Token       |
| `AIRTABLE_BASE`   | `appDVT20bEp9giK53` (your base ID)   |
| `AIRTABLE_TABLE`  | `Submissions`                        |
| `ALLOWED_ORIGIN`  | `https://your-site.netlify.app`      |

`ALLOWED_ORIGIN` should be your exact Netlify URL (or custom domain).
Use `*` only for local dev.

### 5. Deploy

Netlify deploys automatically on every push. You can also trigger a manual
deploy from the dashboard: Deploys → Trigger deploy.

---

## Local development

Install the Netlify CLI once:

```bash
npm install -g netlify-cli
```

Create a `.env` file at the repo root (this is **never** committed):

```
AIRTABLE_TOKEN=pat...your_new_token...
AIRTABLE_BASE=appDVT20bEp9giK53
AIRTABLE_TABLE=Submissions
ALLOWED_ORIGIN=*
```

Run the dev server (serves your HTML + the function locally):

```bash
netlify dev
```

Open http://localhost:8888 — the `/api/airtable` redirects work exactly as
they will in production.

---

## How the proxy works

```
Browser  →  GET /api/airtable          →  Netlify redirect
         →  /.netlify/functions/airtable  →  airtable.js
                                             (injects token from env)
                                          →  api.airtable.com
```

The Airtable token and base ID never appear in any response sent to the
browser. They exist only as server-side environment variables.

---

## Security notes

- **Never commit `.env`** — add it to `.gitignore`
- `ALLOWED_ORIGIN` restricts which domains can call the function via CORS.
  Set it to your exact production URL once you know it.
- The function validates that `AIRTABLE_TOKEN` and `AIRTABLE_BASE` are present
  before forwarding any request, returning a 500 if they're missing.
- Consider adding Netlify's built-in password protection
  (Site → Site configuration → Access control) if the app should be
  internal-only.
