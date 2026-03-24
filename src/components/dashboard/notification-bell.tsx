"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  BellOff,
  Check,
  Loader2,
  Trash2,
  BookOpen,
  GraduationCap,
  Flag,
  Building2,
  UserPlus,
  UserMinus,
  Trophy,
  X,
} from "lucide-react";

type Notification = {
  id:        string;
  type:      string;
  title:     string;
  body:      string;
  link:      string | null;
  isRead:    boolean;
  createdAt: string;
};

function typeIcon(type: string) {
  const cls = "h-4 w-4 shrink-0";
  switch (type) {
    case "QUIZ_STARTED":        return <BookOpen className={`${cls} text-blue-400`} />;
    case "QUIZ_RESULT":         return <Trophy className={`${cls} text-green-400`} />;
    case "CLASSROOM_INVITE":    return <UserPlus className={`${cls} text-indigo-400`} />;
    case "STUDENT_JOINED":      return <GraduationCap className={`${cls} text-emerald-400`} />;
    case "STUDENT_FLAGGED":     return <Flag className={`${cls} text-red-400`} />;
    case "ORG_INVITE":          return <Building2 className={`${cls} text-violet-400`} />;
    case "ORG_INVITE_ACCEPTED": return <Check className={`${cls} text-green-400`} />;
    case "ORG_INVITE_DECLINED": return <X className={`${cls} text-red-400`} />;
    case "STUDENT_REMOVED":     return <UserMinus className={`${cls} text-amber-400`} />;
    default:                    return <Bell className={`${cls} text-slate-400`} />;
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)   return "just now";
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  return `${days}d ago`;
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen]                   = useState(false);
  const [items, setItems]                 = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(false);
  const [markingAll, setMarkingAll]       = useState(false);
  const [clearing, setClearing]           = useState(false);
  const panelRef                          = useRef<HTMLDivElement>(null);
  const buttonRef                         = useRef<HTMLButtonElement>(null);

  const unread = items.filter((n) => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) setItems(await res.json());
    } catch { /* silent */ }
  }, []);

  // Initial fetch + poll every 30s
  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current  && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleOpen() {
    setOpen((v) => !v);
    if (!open) {
      setLoading(true);
      await fetchNotifications();
      setLoading(false);
    }
  }

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
  }

  async function markAllRead() {
    setMarkingAll(true);
    await fetch("/api/notifications", { method: "PATCH" });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setMarkingAll(false);
  }

  async function clearAll() {
    setClearing(true);
    await fetch("/api/notifications", { method: "DELETE" });
    setItems([]);
    setClearing(false);
  }

  function handleItemClick(n: Notification) {
    if (!n.isRead) markRead(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-all"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white ring-2 ring-slate-900">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl shadow-black/50 backdrop-blur-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unread > 0 && (
                <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-400">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={markingAll}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/8 transition-colors disabled:opacity-50"
                  title="Mark all read"
                >
                  {markingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  All read
                </button>
              )}
              {items.length > 0 && (
                <button
                  onClick={clearAll}
                  disabled={clearing}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/8 transition-colors disabled:opacity-50"
                  title="Clear all"
                >
                  {clearing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10">
                <BellOff className="h-8 w-8 text-slate-700" />
                <p className="text-sm text-slate-500">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${
                      n.isRead ? "opacity-60" : ""
                    }`}
                  >
                    {/* Unread dot */}
                    <div className="mt-0.5 shrink-0">
                      {!n.isRead && (
                        <span className="block h-2 w-2 rounded-full bg-blue-500" />
                      )}
                      {n.isRead && (
                        <span className="block h-2 w-2" />
                      )}
                    </div>
                    {/* Icon */}
                    <div className="mt-0.5 shrink-0">
                      {typeIcon(n.type)}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white leading-snug truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {n.body}
                      </p>
                      <p className="text-[10px] text-slate-600 mt-1">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
