export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#05050f] flex items-center justify-center px-4 py-12">

      {/* ── Animated background orbs ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Large orb — top left */}
        <div
          className="orb-1 absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, #1d4ed8 0%, #1e40af 40%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        {/* Medium orb — bottom right */}
        <div
          className="orb-2 absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full opacity-15"
          style={{
            background:
              "radial-gradient(circle, #3b82f6 0%, #2563eb 40%, transparent 70%)",
            filter: "blur(70px)",
          }}
        />
        {/* Small orb — top right */}
        <div
          className="orb-3 absolute top-1/4 -right-20 h-[300px] w-[300px] rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, #818cf8 0%, #6366f1 50%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />
        {/* Tiny orb — bottom left */}
        <div
          className="orb-1 absolute bottom-20 left-1/4 h-[200px] w-[200px] rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, #60a5fa 0%, transparent 70%)",
            filter: "blur(40px)",
            animationDelay: "-6s",
          }}
        />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(59,130,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        {children}
      </div>
    </div>
  );
}
