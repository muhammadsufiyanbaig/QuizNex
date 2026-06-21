"use client";

import { useState } from "react";
import { Bell, Send } from "lucide-react";

export default function AdminNotificationsPage() {
  const [title, setTitle]   = useState("");
  const [body, setBody]     = useState("");
  const [link, setLink]     = useState("");
  const [target, setTarget] = useState("all");
  const [sending, setSending] = useState(false);
  const [result, setResult]   = useState<{ sent?: number; error?: string } | null>(null);

  async function send() {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res  = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, link: link || undefined, target }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ sent: data.sent });
        setTitle(""); setBody(""); setLink("");
      } else {
        setResult({ error: data.error });
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <Bell className="h-6 w-6 text-purple-400" />
          Send Notification
        </h1>
        <p className="text-sm text-white/40 mt-1">Broadcast a platform announcement to users</p>
      </div>

      <div className="rounded-xl border border-white/8 bg-white/2 p-6 space-y-4">
        <div>
          <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">Target Audience</label>
          <select
            value={target}
            onChange={e => setTarget(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-white/20"
          >
            <option value="all">All Users</option>
            <option value="STUDENT">Students only</option>
            <option value="TEACHER">Teachers only</option>
            <option value="ORGANIZATION">Organizations only</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">Title *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={255}
            placeholder="Notification title"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">Message *</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="Notification body text"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 resize-none"
          />
          <p className="text-xs text-white/20 mt-1 text-right">{body.length}/2000</p>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wide">Link (optional)</label>
          <input
            value={link}
            onChange={e => setLink(e.target.value)}
            maxLength={500}
            placeholder="/some/path or https://…"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
        </div>

        {result && (
          <div className={`rounded-lg px-4 py-3 text-sm ${result.error ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
            {result.error ? `Error: ${result.error}` : `✓ Sent to ${result.sent} users`}
          </div>
        )}

        <button
          onClick={send}
          disabled={sending || !title.trim() || !body.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-colors"
        >
          <Send className="h-4 w-4" />
          {sending ? "Sending…" : "Send Notification"}
        </button>
      </div>
    </div>
  );
}
