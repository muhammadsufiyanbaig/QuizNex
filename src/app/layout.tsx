import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "QuizNex — AI-Powered Proctored Quizzes",
  description:
    "Create, manage, and take proctored quizzes with AI-assisted question generation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.variable} antialiased bg-[#05050f] text-slate-200`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
