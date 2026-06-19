"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";

type QuizStat = {
  title: string;
  type: string;
  totalMarks: number;
  attempted: number;
  avgScore: number | null;
  avgScorePct: number | null;
  flaggedCount: number;
  difficulty: string | null;
};

type StudentRanking = {
  name: string;
  email: string;
  quizzesAttempted: number;
  avgScore: number | null;
  totalScore: number;
  flaggedCount: number;
};

type SummaryStats = {
  totalStudents: number;
  totalQuizzes: number;
  overallAvgScore: number | null;
  completionRate: number;
};

type Props = {
  csvHref: string;
  pdfFilename: string;
  title: string;
  summary: SummaryStats;
  quizStats: QuizStat[];
  studentRankings: StudentRanking[];
};

export default function AnalyticsExportButtons({
  csvHref,
  pdfFilename,
  title,
  summary,
  quizStats,
  studentRankings,
}: Props) {
  const [pdfLoading, setPdfLoading] = useState(false);

  async function handlePdfExport() {
    setPdfLoading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "landscape" });
      const pageW = doc.internal.pageSize.getWidth();

      // Title
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text(title, 14, 18);

      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(`Exported: ${new Date().toLocaleString()}`, 14, 25);

      // Summary row
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      doc.text(
        `Students: ${summary.totalStudents}   Quizzes: ${summary.totalQuizzes}   Avg Score: ${summary.overallAvgScore !== null ? summary.overallAvgScore.toFixed(1) : "N/A"}   Completion: ${summary.completionRate.toFixed(1)}%`,
        14,
        33
      );

      let y = 40;

      // Student Rankings table
      if (studentRankings.length > 0) {
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.text("Student Rankings", 14, y);
        y += 4;

        autoTable(doc, {
          startY: y,
          head: [["#", "Name", "Email", "Quizzes", "Avg Score", "Total Score", "Flagged"]],
          body: studentRankings.map((s, i) => [
            String(i + 1),
            s.name,
            s.email,
            String(s.quizzesAttempted),
            s.avgScore !== null ? s.avgScore.toFixed(1) : "—",
            String(s.totalScore),
            s.flaggedCount > 0 ? "Yes" : "No",
          ]),
          theme: "striped",
          headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          columnStyles: { 0: { cellWidth: 10 }, 6: { cellWidth: 16 } },
          margin: { left: 14, right: 14 },
        });

        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      }

      // Quiz Performance table
      if (quizStats.length > 0) {
        // Start new page if not enough space
        if (y > doc.internal.pageSize.getHeight() - 60) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        doc.text("Quiz Performance", 14, y);
        y += 4;

        autoTable(doc, {
          startY: y,
          head: [["Quiz Title", "Type", "Marks", "Attempted", "Avg Score", "Avg %", "Difficulty", "Flagged"]],
          body: quizStats.map((q) => [
            q.title,
            q.type,
            String(q.totalMarks),
            String(q.attempted),
            q.avgScore !== null ? q.avgScore.toFixed(1) : "—",
            q.avgScorePct !== null ? q.avgScorePct.toFixed(1) + "%" : "—",
            q.difficulty ?? "—",
            String(q.flaggedCount),
          ]),
          theme: "striped",
          headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
        });
      }

      // Footer on every page
      const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text(`Page ${i} of ${totalPages} — QuizNex Analytics`, pageW / 2, doc.internal.pageSize.getHeight() - 6, { align: "center" });
      }

      doc.save(pdfFilename);
    } catch (err) {
      console.error("[pdf export]", err);
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <a
        href={csvHref}
        download
        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
      >
        <Download className="h-3.5 w-3.5" />
        CSV
      </a>
      <button
        onClick={handlePdfExport}
        disabled={pdfLoading}
        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FileText className="h-3.5 w-3.5" />
        {pdfLoading ? "Generating…" : "PDF"}
      </button>
    </div>
  );
}
