import Link from "next/link";
import { Zap, ArrowLeft, FileText } from "lucide-react";

export const metadata = {
  title: "Terms of Service — QuizNex",
  description: "Terms and conditions for using the QuizNex platform.",
};

export default function TermsPage() {
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
            <FileText className="h-3.5 w-3.5" />
            Last updated: June 21, 2026
          </div>
          <h1 className="text-4xl font-bold text-white md:text-5xl">
            Terms of <span className="gradient-text">Service</span>
          </h1>
          <p className="mt-4 text-slate-400">
            Please read these terms carefully before using QuizNex. By accessing the platform you agree to be bound by them.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">

          <Section title="1. Acceptance of Terms">
            <p>By creating an account or using any part of the QuizNex platform (&quot;Service&quot;), you agree to these Terms of Service and our <Link href="/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link>. If you do not agree, do not use the Service.</p>
            <p className="mt-3">We may update these terms at any time. We will notify you of material changes by email or in-app notice. Continued use after the effective date constitutes acceptance of the revised terms.</p>
          </Section>

          <Section title="2. Eligibility">
            <ul>
              <li>You must be at least 13 years old to use the Service.</li>
              <li>If you are under 18, you must have parental or guardian consent.</li>
              <li>You must provide accurate, complete registration information.</li>
              <li>One person may not maintain multiple accounts.</li>
            </ul>
          </Section>

          <Section title="3. Account Security">
            <ul>
              <li>You are responsible for maintaining the confidentiality of your password and two-factor authentication credentials.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>Notify us immediately at <a href="mailto:tools.sufiyan@gmail.com">tools.sufiyan@gmail.com</a> if you suspect unauthorized access.</li>
              <li>We reserve the right to suspend accounts that show signs of compromise or abuse.</li>
            </ul>
          </Section>

          <Section title="4. Acceptable Use">
            <p>You agree <strong>not</strong> to:</p>
            <ul>
              <li>Cheat on proctored assessments (e.g., switching tabs, using unauthorized aids, impersonation).</li>
              <li>Attempt to circumvent proctoring or security features.</li>
              <li>Reverse-engineer, decompile, or scrape the platform.</li>
              <li>Use the Service to distribute malware, spam, or illegal content.</li>
              <li>Attempt unauthorized access to other users&apos; accounts or data.</li>
              <li>Use automated scripts or bots to interact with the Service without permission.</li>
              <li>Abuse AI generation features to produce harmful, deceptive, or infringing content.</li>
            </ul>
          </Section>

          <Section title="5. User Content">
            <p>You retain ownership of quiz content and materials you create (&quot;User Content&quot;). By uploading or generating content on QuizNex, you grant us a non-exclusive, worldwide, royalty-free license to host, display, and deliver that content to participants you designate, solely to operate the Service.</p>
            <p className="mt-3">You are solely responsible for ensuring your User Content does not infringe third-party intellectual property rights, violate privacy laws, or contain prohibited material.</p>
          </Section>

          <Section title="6. AI-Generated Content">
            <p>QuizNex uses Anthropic&apos;s Claude API to generate quiz questions and feedback. AI-generated content is provided as-is. You are responsible for reviewing AI output for accuracy, appropriateness, and compliance with your institution&apos;s policies before using it in assessments.</p>
            <p className="mt-3">We make no representations about the accuracy or completeness of AI-generated content.</p>
          </Section>

          <Section title="7. Proctoring & Monitoring">
            <p>When you take a proctored quiz, the platform may collect:</p>
            <ul>
              <li>Tab-switch and focus-loss events.</li>
              <li>Face detection signals (if enabled by the quiz creator).</li>
              <li>Timestamps and answer sequences.</li>
            </ul>
            <p className="mt-3">This data is shared with the quiz creator (Teacher or Organization) and may be used to evaluate academic integrity. By taking a proctored quiz you consent to this monitoring.</p>
          </Section>

          <Section title="8. Intellectual Property">
            <p>The QuizNex name, logo, UI, and underlying software are owned by QuizNex and protected by intellectual property laws. You may not copy, modify, or distribute any part of the platform without our express written permission.</p>
          </Section>

          <Section title="9. Termination">
            <p>We may suspend or terminate your account at our discretion if you violate these Terms, engage in fraudulent activity, or pose a security risk. You may delete your account at any time from your account settings.</p>
            <p className="mt-3">Upon termination, your license to use the Service ends immediately. Sections 5, 8, 10, and 11 survive termination.</p>
          </Section>

          <Section title="10. Disclaimer of Warranties">
            <p>The Service is provided <strong>&quot;as is&quot;</strong> and <strong>&quot;as available&quot;</strong> without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or secure.</p>
          </Section>

          <Section title="11. Limitation of Liability">
            <p>To the fullest extent permitted by law, QuizNex and its affiliates, officers, and employees shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service, even if advised of the possibility of such damages.</p>
            <p className="mt-3">Our total liability for any claim related to the Service shall not exceed the amount you paid us in the 12 months preceding the claim, or USD $50, whichever is greater.</p>
          </Section>

          <Section title="12. Governing Law">
            <p>These Terms are governed by and construed in accordance with applicable law. Any disputes shall be resolved through binding arbitration, except that either party may seek injunctive relief in a court of competent jurisdiction to protect intellectual property or confidential information.</p>
          </Section>

          <Section title="13. Contact">
            <p>Questions about these Terms? Contact us:</p>
            <ul>
              <li>Email: <a href="mailto:tools.sufiyan@gmail.com">tools.sufiyan@gmail.com</a></li>
            </ul>
          </Section>
        </div>

        {/* Footer nav */}
        <div className="mt-16 flex flex-col items-center gap-4 border-t border-white/5 pt-8 text-sm text-slate-500">
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
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
