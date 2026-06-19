"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  BookOpen,
  Building2,
  Check,
  GraduationCap,
  Loader2,
  Pencil,
  ShieldCheck,
  ShieldAlert,
  X,
  Camera,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { Role } from "@/types/auth";

const ROLE_META: Record<Role, { label: string; icon: React.ReactNode; color: string }> = {
  STUDENT: {
    label: "Student",
    icon: <GraduationCap className="h-4 w-4" />,
    color: "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20",
  },
  TEACHER: {
    label: "Teacher",
    icon: <BookOpen className="h-4 w-4" />,
    color: "bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20",
  },
  ORGANIZATION: {
    label: "Organization",
    icon: <Building2 className="h-4 w-4" />,
    color: "bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20",
  },
};

type ProfilePageProps = {
  name:              string;
  email:             string;
  role:              Role;
  image?:            string | null;
  twoFactorEnabled:  boolean;
  createdAt:         Date;
  hasPassword?:      boolean;
};

export default function ProfilePage({
  name: initialName,
  email,
  role,
  image: initialImage,
  twoFactorEnabled,
  createdAt,
  hasPassword = true,
}: ProfilePageProps) {
  const router    = useRouter();
  const { update } = useSession();
  const fileRef   = useRef<HTMLInputElement>(null);

  // Name editing
  const [editing, setEditing]   = useState(false);
  const [nameValue, setNameValue] = useState(initialName);
  const [saving, setSaving]     = useState(false);
  const [nameError, setNameError] = useState("");
  const [saved, setSaved]       = useState(false);

  // Avatar upload
  const [image, setImage]         = useState(initialImage ?? null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [imgError, setImgError]   = useState("");

  // Password change
  const [showPwForm, setShowPwForm]   = useState(false);
  const [currentPw, setCurrentPw]     = useState("");
  const [newPw, setNewPw]             = useState("");
  const [confirmPw, setConfirmPw]     = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [pwSaving, setPwSaving]       = useState(false);
  const [pwError, setPwError]         = useState("");
  const [pwSaved, setPwSaved]         = useState(false);

  const roleMeta = ROLE_META[role];

  // ── Save name ─────────────────────────────────────────────────────────────
  async function handleSaveName() {
    if (!nameValue.trim()) { setNameError("Name cannot be empty."); return; }
    setNameError("");
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: nameValue.trim() }),
      });
      if (!res.ok) { const j = await res.json(); setNameError(j.error ?? "Failed to save."); return; }
      setSaved(true);
      setEditing(false);
      await update({ name: nameValue.trim() });
      setTimeout(() => { setSaved(false); router.refresh(); }, 1500);
    } finally {
      setSaving(false);
    }
  }

  // ── Upload avatar ─────────────────────────────────────────────────────────
  async function handleImageUpload(file: File) {
    setImgError("");
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setImgError(data.error ?? "Upload failed"); return; }

      const patchRes = await fetch("/api/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ image: data.url }),
      });
      if (patchRes.ok) {
        setImage(data.url);
        await update({ image: data.url });
        router.refresh();
      } else {
        setImgError("Failed to save avatar.");
      }
    } finally {
      setUploadingImg(false);
    }
  }

  // ── Change password ───────────────────────────────────────────────────────
  async function handleChangePassword() {
    setPwError("");
    if (!newPw) { setPwError("New password is required."); return; }
    if (newPw.length < 8) { setPwError("New password must be at least 8 characters."); return; }
    if (newPw !== confirmPw) { setPwError("Passwords do not match."); return; }
    setPwSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error ?? "Failed to change password."); return; }
      setPwSaved(true);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setShowPwForm(false);
      setTimeout(() => setPwSaved(false), 3000);
    } finally {
      setPwSaving(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="mt-1 text-sm text-slate-400">Manage your personal information.</p>
      </div>

      {/* Avatar + basic info */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            {image ? (
              <Image
                src={image}
                alt={nameValue}
                width={64}
                height={64}
                className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/10"
                unoptimized
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/30 to-blue-700/30 ring-1 ring-white/10 text-2xl font-bold text-blue-300">
                {nameValue[0]?.toUpperCase() ?? "U"}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingImg}
              className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Change avatar"
            >
              {uploadingImg
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Camera className="h-3 w-3" />
              }
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload(f);
              }}
            />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {editing ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") { setEditing(false); setNameValue(initialName); } }}
                    autoFocus
                    className="input-glow flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 transition-all"
                    placeholder="Your name"
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={saving}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => { setEditing(false); setNameValue(initialName); setNameError(""); }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-white">{nameValue}</h2>
                  <button
                    onClick={() => setEditing(true)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {saved && <span className="text-xs text-green-400">Saved!</span>}
                </>
              )}
            </div>
            {nameError && <p className="text-xs text-red-400">{nameError}</p>}
            {imgError  && <p className="text-xs text-red-400">{imgError}</p>}
            <p className="text-sm text-slate-400">{email}</p>
            <div className="flex items-center gap-2 pt-1">
              <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${roleMeta.color}`}>
                {roleMeta.icon}
                {roleMeta.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="glass-card rounded-2xl divide-y divide-white/8">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-medium text-slate-300">Email address</p>
            <p className="mt-0.5 text-sm text-slate-500">{email}</p>
          </div>
          <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400 ring-1 ring-green-500/20">
            Verified
          </span>
        </div>

        {/* Password change */}
        {hasPassword && (
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">Password</p>
                <p className="mt-0.5 text-sm text-slate-500">Update your login password.</p>
              </div>
              <button
                onClick={() => { setShowPwForm((v) => !v); setPwError(""); }}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                <KeyRound className="h-3.5 w-3.5" />
                {showPwForm ? "Cancel" : "Change"}
              </button>
            </div>

            {showPwForm && (
              <div className="mt-4 space-y-3">
                {/* Current password */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrent ? "text" : "password"}
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      placeholder="Enter current password"
                      className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 pr-10 text-sm text-white placeholder-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500">New Password</label>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="At least 8 characters"
                      className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 pr-10 text-sm text-white placeholder-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
                    placeholder="Re-enter new password"
                    className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-600"
                  />
                </div>

                {pwError && <p className="text-xs text-red-400">{pwError}</p>}

                <div className="flex justify-end">
                  <button
                    onClick={handleChangePassword}
                    disabled={pwSaving}
                    className="btn-gradient flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Update Password
                  </button>
                </div>
              </div>
            )}

            {pwSaved && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-green-400">
                <Check className="h-3.5 w-3.5" /> Password updated successfully.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-medium text-slate-300">Two-factor authentication</p>
            <p className="mt-0.5 text-sm text-slate-500">
              {twoFactorEnabled ? "Enabled — your account is well protected." : "Not enabled."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {twoFactorEnabled
              ? <ShieldCheck className="h-5 w-5 text-green-400" />
              : <ShieldAlert className="h-5 w-5 text-slate-500" />
            }
            <Link
              href="/settings/security"
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Manage
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-medium text-slate-300">Member since</p>
            <p className="mt-0.5 text-sm text-slate-500">
              {createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
