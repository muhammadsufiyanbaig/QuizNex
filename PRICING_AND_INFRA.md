# QuizNex — Pricing Strategy & Infrastructure Analysis

---

## 1. Teacher Plans

| Feature | Free | Gold | Platinum |
|---|---|---|---|
| Classrooms | 5 | 20 | 50 |
| Quizzes per classroom | 2 | 10 | 15 |
| AI quiz generation | ❌ | ✅ | ✅ |
| Proctoring | Basic | Full | Full |
| Analytics | Basic | Advanced | Advanced |
| Priority support | ❌ | ❌ | ✅ |
| **Monthly** | Free | **249 PKR** | **499 PKR** |
| **Yearly** | Free | **2,499 PKR** | **4,999 PKR** |

Yearly savings: Gold saves ~1 month (≈17%), Platinum saves ~1 month (≈17%).

---

## 2. Organization Plans

Organizations **cannot** use a free plan — they must choose a paid tier on registration.

### Rationale for org pricing
Organizations are institutions (schools, colleges, coaching centers, companies). They need:
- Multiple teacher sub-accounts under one dashboard
- Centralized billing
- Org-level analytics (cross-classroom, cross-teacher)
- Higher volume limits

### Recommended Organization Tiers

#### Starter — 2,499 PKR/month | 24,990 PKR/year (save ~17%)
**Target:** Small coaching centers, single-department teams (5–15 teachers)
- Up to **8 teacher sub-accounts**
- **80 classrooms** total (org-wide)
- **10 quizzes** per classroom
- Org admin dashboard
- AI quiz generation for all sub-accounts
- Full proctoring
- Email support

#### Growth — 5,999 PKR/month | 59,990 PKR/year (save ~17%)
**Target:** Medium schools, multi-branch institutes (15–50 teachers)
- Up to **30 teacher sub-accounts**
- **300 classrooms** total
- **20 quizzes** per classroom
- Everything in Starter, plus:
- Advanced org-level analytics (per teacher, per classroom)
- Custom branding (logo on quiz pages)
- Priority email support (48h SLA)

#### Enterprise — 13,999 PKR/month | 139,990 PKR/year (save ~17%)
**Target:** Universities, large school networks, EdTech companies (50+ teachers)
- **Unlimited** teacher sub-accounts
- **Unlimited** classrooms
- **Unlimited** quizzes per classroom
- Everything in Growth, plus:
- Dedicated onboarding session
- API access (embed QuizNex into your LMS)
- SLA: 99.9% uptime guarantee
- Dedicated support channel (WhatsApp/Slack)
- Custom data retention policy
- White-label option (custom domain)

### Comparison Table

| Feature | Starter | Growth | Enterprise |
|---|---|---|---|
| Teacher sub-accounts | 8 | 30 | Unlimited |
| Total classrooms | 80 | 300 | Unlimited |
| Quizzes per classroom | 10 | 20 | Unlimited |
| Org analytics dashboard | ✅ | ✅ | ✅ |
| Custom branding | ❌ | ✅ | ✅ |
| API access | ❌ | ❌ | ✅ |
| Support | Email | Priority email | Dedicated |
| **Monthly** | **2,499 PKR** | **5,999 PKR** | **13,999 PKR** |
| **Yearly** | **24,990 PKR** | **59,990 PKR** | **139,990 PKR** |

### Why no free org tier?
Organizations have institutional budgets. A free tier would be abused by solo users trying to bypass teacher plan limits. Org features (sub-account management, org analytics) also carry real infra cost.

---

## 3. Infrastructure Feasibility — 1,000 Free-Plan Teachers

**Assumption:** 1,000 registered teachers, all on free plan (5 classrooms × 2 quizzes each), moderate usage (not all active simultaneously).

---

### 3.1 AWS Amplify Hosting (Free Tier)

| Limit | Free Tier | Estimated Usage @ 1K users | Verdict |
|---|---|---|---|
| Build minutes | 1,000 min/month | ~50–200 min/month (deploys) | ✅ Fine |
| Storage (build artifacts) | 15 GB | ~500 MB | ✅ Fine |
| **Data transfer (serving)** | **5 GB/month** | **~4–12 GB/month** | ⚠️ **Risky** |
| SSR compute (Lambda) | 1M req + 400K GB-sec | ~200K–500K requests | ✅ Fine |

**Bandwidth math:**
- First load per user: ~1.5 MB (Next.js bundle + page)
- 1,000 users × 1.5 MB = 1.5 GB (first visits)
- Repeat visits (9×/user/month): ~200 KB each = 1.8 GB
- API calls (50 calls × 3 KB): 0.15 GB
- **Total ≈ 3.5–7 GB/month**

5 GB free tier is tight. Any teacher who creates quizzes actively, or if students start taking quizzes, pushes you over. Amplify overage costs **$0.15/GB** — so 5 GB overage = $0.75. Not catastrophic but unpredictable.

**Recommendation: Use Vercel Hobby instead of Amplify.**
- Vercel Hobby = **100 GB bandwidth/month** free, built for Next.js, zero config SSR, no overage surprises at 1K users.
- Amplify makes more sense when you're already deep in AWS ecosystem or need Cognito/AppSync.

---

### 3.2 Neon DB (Free Tier)

| Limit | Free Tier | Estimated Usage @ 1K users | Verdict |
|---|---|---|---|
| Storage | 10 GB | ~100–300 MB (1K users, free plan) | ✅ Fine |
| RAM | 0.5 GB | Shared, auto-suspend helps | ✅ Fine |
| Compute hours | 190 hr/month | ~30–80 hr/month (light usage) | ✅ Fine |
| Concurrent connections | ~100 | Serverless pool keeps this low | ✅ Fine |
| Projects | 1 | 1 needed | ✅ Fine |

**Why compute hours are safe:**
Neon auto-suspends the DB after **5 minutes of inactivity** — compute hours only tick when queries are running. With teachers spread across timezones and not querying 24/7, realistically the DB is active maybe 30–80 hours/month. Well within 190 hours.

**Storage math:**
- 1K user rows: ~200 KB
- 5,000 classrooms (5 per teacher): ~2 MB
- 10,000 quizzes: ~5 MB
- Questions, attempts (free plan = low activity): ~50 MB
- Audit logs, sessions: ~20 MB
- **Total ≈ 100–300 MB — far under 10 GB.**

**Neon free tier is safe for 1K free-plan users.** You won't hit limits until you have 10K+ active users or paid users storing large quiz banks.

---

### 3.3 AWS S3 (Free Tier — first 12 months)

| Limit | Free Tier | Estimated @ 1K users | Verdict |
|---|---|---|---|
| Storage | 5 GB | ~500 MB (avatars, attachments) | ✅ Fine |
| PUT requests | 20,000/month | ~2,000/month | ✅ Fine |
| GET requests | 100,000/month | ~20,000/month | ✅ Fine |

After 12 months, S3 costs are minimal: ~$0.023/GB storage, $0.0004 per 1K GET. At 1K free users = likely under $1/month.

---

### 3.4 Claude API (AI Module)

No free tier. You already know this.

| Usage | Estimated Cost |
|---|---|
| Quiz generation (free plan: limited) | ~$3–8/month @ 1K teachers |
| If you rate-limit AI on free plan | Can cap to ~$5/month |

**Enforce AI rate limits on free plan** (e.g., 5 AI-generated quizzes/month per teacher). This keeps AI cost predictable.

---

### 3.5 Summary — Monthly Cost @ 1K Free Users

| Service | Platform | Free Tier Sufficient? | Cost if Free |
|---|---|---|---|
| Hosting | Vercel Hobby | ✅ Yes (100 GB BW) | $0 |
| Hosting | AWS Amplify | ⚠️ Risky (5 GB BW) | $0–$1.50 |
| Database | Neon Free | ✅ Yes | $0 |
| File storage | AWS S3 | ✅ Yes (first 12 mo) | $0 |
| Email | Resend free | ✅ Yes (3K emails/mo) | $0 |
| Error tracking | Sentry free | ✅ Yes (5K errors/mo) | $0 |
| AI | Claude API | ❌ No free tier | **$5–$8/month** |
| **TOTAL** | | | **$5–$8/month** |

**Bottom line: Yes, 1K free-plan teachers is survivable on free infra tiers.**
The only unavoidable cost is Claude API ($5–$8/month if you rate-limit AI on free plan). Use **Vercel** not Amplify to safely avoid the 5 GB bandwidth wall.

---

### 3.6 When Free Tiers Break

| Trigger | Breaks what | Upgrade cost |
|---|---|---|
| >1K active users OR paid users uploading files heavily | S3 storage | ~$1–5/month |
| >5K users, frequent logins | Neon compute hours | Neon Pro: $19/month |
| >1K active users with rich UI | Amplify BW (if using Amplify) | Switch to Vercel |
| AI heavily used by free users | Claude API bill | Rate-limit free tier |
| >3K emails/month (Resend) | Email delivery | Resend Pro: $20/month |

**At 1K users, Vercel + Neon + S3 + rate-limited Claude = ~$5–8/month total.** That's sustainable even before your first paid subscriber.

---

---

## 4. Decisions Made

| Decision | Choice | Reason |
|---|---|---|
| Payment gateway | **Safepay** | Cards + JazzCash + Easypaisa + subscription-friendly API |
| Org free plan | **None** | Orgs have budgets; free tier enables abuse |
| Org onboarding | **30-day trial** (auto-created on first login) | Pakistan market needs time to test before committing budget. Gated by phone verification. AI generation capped during trial. |
| Hosting | **AWS Amplify** (already deployed) | CloudFront caching makes 5 GB limit manageable at 1K users (~2.5–4.5 GB real usage) |
| Trial abuse prevention | Phone/business email verification | No credit card required (too much friction in PK market) |
| Trial AI cap | 10 AI quiz generations | Keeps Claude API cost under $1 during org trials |

## 5. Webhook Logs

Safepay webhook logs are visible in your **Safepay Dashboard → Developers → Endpoints**.

- **Sandbox**: https://sandbox.api.getsafepay.com/dashboard/login → Developers → Endpoints
- **Production**: https://getsafepay.com/dashboard/login → Developers → Endpoints

Each webhook delivery shows: event type, payload sent, HTTP status returned by your server, and retry history. If your server returned non-200, the event goes into a **retry queue** (Safepay retries automatically).

Your webhook endpoint: `POST {NEXT_PUBLIC_APP_URL}/api/payments/webhook`

Signature header: `X-SFPY-SIGNATURE` (HMAC-SHA512 of raw body using your webhook secret).

---

*Updated: June 21, 2026*
