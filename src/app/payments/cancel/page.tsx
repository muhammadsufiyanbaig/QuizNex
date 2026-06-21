import Link from "next/link";
import { Zap, XCircle } from "lucide-react";

export default function PaymentCancelPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#05050f] flex items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="orb-1 absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #1d4ed8 0%, #1e40af 40%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="orb-2 absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #3b82f6 0%, #2563eb 40%, transparent 70%)", filter: "blur(70px)" }} />
      </div>

      <div className="relative z-10 w-full max-w-md text-center animate-fade-in-up">
        <div className="mb-8 flex justify-center">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">QuizNex</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-10 shadow-2xl shadow-black/40">
          <div className="mb-6 flex justify-center">
            <XCircle className="h-16 w-16 text-slate-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Payment cancelled</h1>
          <p className="mt-2 text-sm text-slate-400">
            No charge was made. You can upgrade any time from the pricing page.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link href="/pricing"
              className="btn-gradient flex items-center justify-center rounded-xl py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20">
              View plans
            </Link>
            <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
