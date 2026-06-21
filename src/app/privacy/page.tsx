import Link from "next/link";
import { Zap, ArrowLeft, Shield } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — QuizNex",
  description: "How QuizNex collects, uses, and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#05050f]">
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="orb-1 absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #1d4ed8 0%, #1e40af 40%, transparent 70%)", filter: "blur(60px)" }}
        />
        <div
          className="orb-2 absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #3b82f6 0%, #2563eb 40%, transparent 70%)", filter: "blur(70px)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: "linear-gradient(rgba(59,130,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">QuizNex</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </nav>

      {/* Content */}
      <main className="relative z-10 mx-auto max-w-3xl px-6 pb-24 pt-8 md:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-400">
            <Shield className="h-3.5 w-3.5" />
            Last updated: June 21, 2026
          </div>
          <h1 className="text-4xl font-bold text-white md:text-5xl">
            Privacy <span className="gradient-text">Policy</span>
          </h1>
          <p className="mt-4 text-slate-400">
            Your privacy matters to us. This policy explains what data we collect, why we collect it, and how we protect it.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">

          <Section title="1. Information We Collect">
            <p>We collect information you provide directly when you:</p>
            <ul>
              <li><strong>Create an account</strong> — name, email address, password (hashed with bcrypt), and selected role (Student, Teacher, or Organization).</li>
              <li><strong>Set up two-factor authentication</strong> — we store an encrypted TOTP secret (AES-256-GCM). We never store raw TOTP keys.</li>
              <li><strong>Register a passkey</strong> — public-key credential metadata (no biometric data leaves your device).</li>
              <li><strong>Take or create quizzes</strong> — quiz content, answers submitted, timestamps, time spent, tab-switch events, and proctoring signals.</li>
              <li><strong>Communicate with us</strong> — support requests or feedback you send.</li>
            </ul>
            <p className="mt-4">We also collect limited technical data automatically:</p>
            <ul>
              <li>IP address (for rate limiting and security audit logs).</li>
              <li>Browser type, OS, and device information.</li>
              <li>Session tokens (stored as secure, HTTP-only JWT cookies).</li>
              <li>Error and performance telemetry via Sentry (anonymized where possible).</li>
            </ul>
          </Section>

          <Section title="2. How We Use Your Information">
            <ul>
              <li>Provide and operate the QuizNex platform.</li>
              <li>Authenticate your identity and protect your account.</li>
              <li>Generate AI-powered quiz content on your behalf via Claude API (your prompts are sent to Anthropic; see their privacy policy).</li>
              <li>Detect cheating or policy violations during proctored assessments.</li>
              <li>Send transactional emails (email verification, password reset, notifications).</li>
              <li>Maintain security audit logs to investigate abuse.</li>
              <li>Improve and debug the platform using aggregated, anonymized analytics.</li>
            </ul>
          </Section>

          <Section title="3. Data Sharing">
            <p>We do <strong>not</strong> sell your personal data. We share data only with:</p>
            <ul>
              <li><strong>Neon (database hosting)</strong> — stores all user and quiz data on encrypted PostgreSQL.</li>
              <li><strong>AWS S3</strong> — stores uploaded files (avatars, attachments) using presigned URLs with short expiry.</li>
              <li><strong>Anthropic (Claude API)</strong> — processes quiz-generation prompts. Data is subject to Anthropic&apos;s API data usage policy.</li>
              <li><strong>Google OAuth</strong> — if you sign in with Google, we receive your name and email from Google.</li>
              <li><strong>Sentry</strong> — receives error reports and stack traces for debugging.</li>
              <li><strong>Law enforcement</strong> — only when legally required by a valid court order or subpoena.</li>
            </ul>
          </Section>

          <Section title="4. Data Retention">
            <ul>
              <li>Account data is retained for as long as your account is active.</li>
              <li>Quiz attempts and proctoring data are retained for 2 years after the attempt, then purged.</li>
              <li>Security audit logs are retained for 1 year.</li>
              <li>Deleted accounts are purged from our primary database within 30 days. Backup retention may extend up to 90 days.</li>
            </ul>
          </Section>

          <Section title="5. Security">
            <p>We implement industry-standard security measures:</p>
            <ul>
              <li>Passwords hashed with bcrypt (work factor ≥ 12).</li>
              <li>TOTP secrets encrypted with AES-256-GCM before storage.</li>
              <li>All data in transit encrypted via TLS 1.2+.</li>
              <li>Admin accounts require two-factor authentication and undergo live database verification on every request.</li>
              <li>Rate limiting on all sensitive endpoints.</li>
              <li>S3 files accessed via short-lived presigned URLs, never public.</li>
            </ul>
            <p className="mt-4">No system is 100% secure. If you believe your account has been compromised, contact us immediately.</p>
          </Section>

          <Section title="6. Your Rights">
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul>
              <li><strong>Access</strong> — request a copy of personal data we hold about you.</li>
              <li><strong>Correction</strong> — request correction of inaccurate data.</li>
              <li><strong>Deletion</strong> — request deletion of your account and associated data.</li>
              <li><strong>Portability</strong> — request an export of your data in a machine-readable format.</li>
              <li><strong>Object</strong> — object to certain processing activities.</li>
            </ul>
            <p className="mt-4">To exercise these rights, email us at <a href="mailto:tools.sufiyan@gmail.com" className="text-blue-400 hover:underline">tools.sufiyan@gmail.com</a>.</p>
          </Section>

          <Section title="7. Cookies">
            <p>We use only essential cookies:</p>
            <ul>
              <li><strong>next-auth.session-token</strong> — HTTP-only, secure JWT session cookie. Expires in 30 days or on sign-out.</li>
              <li><strong>next-auth.csrf-token</strong> — CSRF protection token.</li>
            </ul>
            <p className="mt-4">We do not use advertising or tracking cookies.</p>
          </Section>

          <Section title="8. Children's Privacy">
            <p>QuizNex is not directed at children under 13. We do not knowingly collect personal data from children under 13. If you believe a child has provided us data, contact us and we will delete it promptly.</p>
          </Section>

          <Section title="9. Changes to This Policy">
            <p>We may update this policy periodically. We will notify you of material changes by posting the updated policy here and, where required, via email. Continued use of the platform after changes take effect constitutes acceptance.</p>
          </Section>

          <Section title="10. Contact">
            <p>Questions or concerns? Reach us at:</p>
            <ul>
              <li>Email: <a href="mailto:tools.sufiyan@gmail.com" className="text-blue-400 hover:underline">tools.sufiyan@gmail.com</a></li>
            </ul>
          </Section>
        </div>

        {/* Footer nav */}
        <div className="mt-16 flex flex-col items-center gap-4 border-t border-white/5 pt-8 text-sm text-slate-500">
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
            <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          </div>
          <p>© 2026 QuizNex. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl p-6 md:p-8">
      <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-400 [&_a]:text-blue-400 [&_a:hover]:underline [&_strong]:text-slate-300 [&_ul]:mt-2 [&_ul]:space-y-2 [&_ul]:pl-4 [&_ul>li]:relative [&_ul>li]:pl-4 [&_ul>li]:before:absolute [&_ul>li]:before:left-0 [&_ul>li]:before:text-blue-500 [&_ul>li]:before:content-['–']">
        {children}
      </div>
    </div>
  );
}
