# QuizNex — Deployment Guide (AWS Amplify)

**Stack:** Next.js 14+ SSR · Neon DB · AWS S3 · AWS Amplify  
**Target:** Production deployment on AWS Amplify with custom domain

---

## Prerequisites

- AWS account (root or IAM with Amplify + S3 + IAM permissions)
- GitHub repo with code pushed
- Neon account (neon.tech)
- Google Cloud project (for Gemini API key + OAuth)
- Gmail account with App Password enabled (for email OTPs)
- Domain name (optional but recommended)

---

## Step 1 — Neon Database

1. Go to [neon.tech](https://neon.tech) → **New Project**
2. Name: `quiznex-prod`, Region: same as your Amplify region (e.g. `us-east-1`)
3. After creation → **Dashboard → Connection Details**
4. Select **Pooled connection** → copy the `DATABASE_URL`
   - Format: `postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`
5. Save this URL — needed in Step 5

### Push schema to production DB

```bash
# In your local project, temporarily set DATABASE_URL to the prod Neon URL
DATABASE_URL=<prod-url> npx drizzle-kit push
```

Or update `.env.local` with prod URL, run `npx drizzle-kit push`, then restore local URL.

---

## Step 2 — AWS S3 Bucket

### Create bucket

1. AWS Console → **S3** → **Create bucket**
2. Bucket name: `quiznex-uploads` (must be globally unique — add suffix if taken e.g. `quiznex-uploads-prod`)
3. Region: `us-east-1` (match your Amplify region)
4. **Uncheck** "Block all public access" → confirm
5. Create bucket

### Bucket policy (public read for uploaded files)

1. Bucket → **Permissions** → **Bucket Policy** → Edit → paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::quiznex-uploads/*"
    }
  ]
}
```

2. Save

### CORS (for browser uploads)

1. Bucket → **Permissions** → **Cross-origin resource sharing (CORS)** → Edit → paste:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://yourdomain.com"],
    "ExposeHeaders": []
  }
]
```

Replace `yourdomain.com` with your actual domain. For testing add `http://localhost:3000` as a second entry.

---

## Step 3 — IAM User for S3 Access

1. AWS Console → **IAM** → **Users** → **Create user**
2. Name: `quiznex-app`
3. **Permissions** → **Attach policies directly** → search and select `AmazonS3FullAccess`
4. Create user
5. Open the user → **Security credentials** → **Create access key**
6. Use case: **Application running outside AWS**
7. Copy `Access key ID` and `Secret access key` — save both, shown only once

---

## Step 4 — Google Cloud Setup

### Gemini API key

1. [Google AI Studio](https://aistudio.google.com) → **Get API key** → Create
2. Copy the key → `GOOGLE_API_KEY`

### Google OAuth (optional — for Sign in with Google)

1. [Google Cloud Console](https://console.cloud.google.com) → Select/create project
2. **APIs & Services** → **OAuth consent screen**
   - User type: External
   - App name: QuizNex, support email: your email
   - Add scope: `email`, `profile`
   - Save
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: Web application
   - Name: QuizNex Web
   - Authorized redirect URIs: `https://yourdomain.com/api/auth/callback/google`
   - Also add: `http://localhost:3000/api/auth/callback/google` (for local dev)
4. Copy `Client ID` → `GOOGLE_CLIENT_ID`
5. Copy `Client Secret` → `GOOGLE_CLIENT_SECRET`

---

## Step 5 — Gmail App Password (Email OTPs)

1. Google Account → **Security** → **2-Step Verification** (must be ON)
2. **Security** → **App passwords** → create new
3. App name: `QuizNex`
4. Copy 16-character password → `EMAIL_APP_PASSWORD`
5. `EMAIL_FROM` = the Gmail address you used (e.g. `noreply@gmail.com`)

---

## Step 6 — Generate AUTH_SECRET

Run locally:

```bash
openssl rand -base64 32
```

Copy output → `AUTH_SECRET`

---

## Step 7 — AWS Amplify Setup

### Connect repository

1. AWS Console → **Amplify** → **Create new app**
2. **Host web app** → GitHub → authorize → select repo `QuizNex` → branch `master` (or `main`)
3. Next

### Build settings

Amplify should auto-detect Next.js. Verify `amplify.yml` (auto-generated or create manually):

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install --legacy-peer-deps
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

> **Important:** Must use `--legacy-peer-deps` due to simplewebauthn peer dependency conflict.

### Framework setting

- Amplify Console → App settings → **Rewrites and redirects** — leave as default for Next.js SSR
- Make sure **Compute** is set to **SSR** (not SSG/Static) — Amplify should detect this automatically from Next.js config

---

## Step 8 — Environment Variables in Amplify

Amplify Console → **App settings** → **Environment variables** → **Manage variables**

Add all of these:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `AUTH_SECRET` | Generated in Step 6 |
| `NEXTAUTH_URL` | `https://yourdomain.com` |
| `GOOGLE_API_KEY` | Gemini API key |
| `AWS_ACCESS_KEY_ID` | IAM user access key (Step 3) |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key (Step 3) |
| `AWS_REGION` | `us-east-1` |
| `AWS_S3_BUCKET_NAME` | `quiznex-uploads` |
| `AWS_CLOUDFRONT_URL` | *(leave empty unless CloudFront added)* |
| `GOOGLE_CLIENT_ID` | OAuth client ID (Step 4) |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret (Step 4) |
| `EMAIL_APP_PASSWORD` | Gmail app password (Step 5) |
| `EMAIL_FROM` | Gmail address |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` |

> `NEXT_PUBLIC_*` variables must be set before build — Amplify inlines them at build time.

---

## Step 9 — Deploy

1. Amplify Console → **Deploy** (or push a commit to trigger auto-deploy)
2. Watch build logs — should take 3–5 minutes
3. On success → Amplify gives a URL like `https://main.d1abc123.amplifyapp.com`
4. Test: open URL → should redirect to `/login`

### If build fails

Common issues:

| Error | Fix |
|---|---|
| `ERESOLVE peer dependency` | Ensure `amplify.yml` uses `npm install --legacy-peer-deps` |
| `Cannot find module 'sharp'` | Add `sharp` to dependencies: `npm install sharp --legacy-peer-deps` |
| `AUTH_SECRET not set` | Check env vars in Amplify Console, redeploy |
| `password authentication failed` | Wrong `DATABASE_URL` — use pooled connection from Neon |
| `Module not found: @tensorflow*` | TF.js packages large — increase Amplify memory if hitting Lambda limits |

---

## Step 10 — Custom Domain (Optional)

1. Amplify Console → **Domain management** → **Add domain**
2. Enter your domain (e.g. `quiznex.com`)
3. Amplify gives you DNS records (CNAME or ALIAS) → add to your DNS provider
4. SSL certificate auto-provisioned via ACM — takes 5–30 min
5. After DNS propagation → update these env vars in Amplify:
   - `NEXTAUTH_URL` → `https://quiznex.com`
   - `NEXT_PUBLIC_APP_URL` → `https://quiznex.com`
6. Update Google OAuth redirect URI (Step 4) to include `https://quiznex.com/api/auth/callback/google`
7. Update S3 CORS `AllowedOrigins` to include `https://quiznex.com`
8. **Redeploy** (env vars changed)

---

## Step 11 — Post-Deployment Checks

Run through this checklist after first successful deploy:

- [ ] `/login` loads correctly
- [ ] Register new account → OTP email received
- [ ] Email verification works
- [ ] 2FA setup works (QR code, TOTP code)
- [ ] Sign in with Google works
- [ ] Passkey registration + login works
- [ ] Teacher: create classroom, create quiz, add questions, upload question image (S3)
- [ ] Teacher: AI generate questions from topic
- [ ] Teacher: AI generate from document upload (S3)
- [ ] Student: join classroom via key
- [ ] Student: take quiz (camera, fullscreen, gaze tracking)
- [ ] Student: SSE activates quiz live when teacher starts it
- [ ] Analytics: export CSV + PDF
- [ ] Notifications bell works

---

## SSE Notes (Important)

SSE routes (`/api/classrooms/[id]/stream`, `/api/quizzes/[quizId]/stream`) use:

```typescript
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
```

AWS Amplify supports long-running SSE connections via Node.js runtime natively. No extra API Gateway or WebSocket setup needed. Default Amplify timeout is 29 seconds — the routes send a heartbeat every 15 seconds to keep connections alive.

---

## Auto-Deploy on Push

By default Amplify watches the connected branch. Every `git push origin master` triggers a new build and deploy automatically.

To deploy a specific branch (e.g. `updates`):
- Amplify Console → **Hosting** → **Branch deployments** → **Connect branch** → select `updates`

---

## Rollback

Amplify keeps build history. To rollback:

1. Amplify Console → **Deployments** → select a previous successful build
2. Click **Redeploy this version**
