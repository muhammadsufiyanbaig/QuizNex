"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2, Check, Loader2, Pencil, ShieldCheck, ShieldAlert, X, Zap,
} from "lucide-react";

type SubProp = {
  plan: string;
  status: string;
  isExpired: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
};

const PLAN_LABEL: Record<string, string> = {
  FREE: "Free", GOLD: "Gold", PLATINUM: "Platinum",
  ORG_STARTER: "Starter", ORG_GROWTH: "Growth", ORG_ENTERPRISE: "Enterprise",
};
const PLAN_COLOR: Record<string, string> = {
  FREE:           "bg-red-500/15 text-red-400 ring-red-500/25",
  GOLD:           "bg-yellow-500/15 text-yellow-400 ring-yellow-500/25",
  PLATINUM:       "bg-cyan-500/15 text-cyan-400 ring-cyan-500/25",
  ORG_STARTER:    "bg-blue-500/15 text-blue-400 ring-blue-500/25",
  ORG_GROWTH:     "bg-violet-500/15 text-violet-400 ring-violet-500/25",
  ORG_ENTERPRISE: "bg-amber-500/15 text-amber-400 ring-amber-500/25",
};

type OrgData = {
  id: string;
  name: string;
  description: string | null;
  contactEmail: string | null;
  logoUrl: string | null;
};

type Props = {
  user: { name: string; email: string; twoFactorEnabled: boolean; createdAt: Date };
  org: OrgData | null;
  subscription?: SubProp | null;
};

export default function OrgProfileClient({ user, org: initialOrg, subscription }: Props) {
  const [org, setOrg] = useState<OrgData | null>(initialOrg);

  // Org fields editing
  const [editingOrg, setEditingOrg] = useState(false);
  const [orgName, setOrgName] = useState(initialOrg?.name ?? "");
  const [orgDesc, setOrgDesc] = useState(initialOrg?.description ?? "");
  const [orgEmail, setOrgEmail] = useState(initialOrg?.contactEmail ?? "");
  const [orgLogo, setOrgLogo] = useState(initialOrg?.logoUrl ?? "");
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgError, setOrgError] = useState("");
  const [orgSaved, setOrgSaved] = useState(false);

  async function handleSaveOrg() {
    if (!orgName.trim()) { setOrgError("Organization name is required."); return; }
    setOrgError("");
    setSavingOrg(true);
    try {
      const res = await fetch("/api/organization/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: orgName.trim(),
          description: orgDesc.trim() || null,
          contactEmail: orgEmail.trim() || null,
          logoUrl: orgLogo.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setOrgError(data.error ?? "Failed to save."); return; }
      setOrg(data);
      setEditingOrg(false);
      setOrgSaved(true);
      setTimeout(() => setOrgSaved(false), 2000);
    } finally {
      setSavingOrg(false);
    }
  }

  function cancelOrgEdit() {
    setEditingOrg(false);
    setOrgName(org?.name ?? "");
    setOrgDesc(org?.description ?? "");
    setOrgEmail(org?.contactEmail ?? "");
    setOrgLogo(org?.logoUrl ?? "");
    setOrgError("");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Organization Profile</h1>
        <p className="mt-1 text-sm text-slate-400">Manage your account and organization details.</p>
      </div>

      {/* Account info (read-only) */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-500/25">
            <Building2 className="h-5 w-5 text-violet-400" />
          </div>
          <h2 className="font-semibold text-white">Account</h2>
        </div>
        <div className="divide-y divide-white/8">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-slate-300">Name</p>
              <p className="text-sm text-slate-500">{user.name}</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-slate-300">Email</p>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
            <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400 ring-1 ring-green-500/20">
              Verified
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-slate-300">Two-factor authentication</p>
              <p className="mt-0.5 text-sm text-slate-500">
                {user.twoFactorEnabled ? "Enabled" : "Not enabled"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {user.twoFactorEnabled
                ? <ShieldCheck className="h-5 w-5 text-green-400" />
                : <ShieldAlert className="h-5 w-5 text-slate-500" />
              }
              <Link href="/settings/security" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                Manage
              </Link>
            </div>
          </div>
          <div className="py-3">
            <p className="text-sm font-medium text-slate-300">Member since</p>
            <p className="mt-0.5 text-sm text-slate-500">
              {user.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* Plan status */}
      {subscription && (
        <div className="glass-card rounded-2xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-500/25">
              <Zap className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Current Plan</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${PLAN_COLOR[subscription.plan] ?? "bg-slate-500/15 text-slate-400 ring-slate-500/25"}`}>
                  {PLAN_LABEL[subscription.plan] ?? subscription.plan}
                </span>
                {subscription.status === "TRIAL" && subscription.trialEndsAt && (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                    Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / 86_400_000)) <= 3
                      ? "bg-red-500/10 text-red-400 ring-red-500/20"
                      : "bg-amber-500/10 text-amber-400 ring-amber-500/20"
                  }`}>
                    Trial · {Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / 86_400_000))}d left
                  </span>
                )}
                {subscription.isExpired && (
                  <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-400 ring-1 ring-red-500/20">Expired</span>
                )}
                {subscription.status === "ACTIVE" && subscription.currentPeriodEnd && (
                  <span className="text-xs text-slate-500">
                    renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Link
            href="/pricing"
            className="btn-gradient shrink-0 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/20"
          >
            {subscription.isExpired ? "Renew" : "Upgrade"}
          </Link>
        </div>
      )}

      {/* Organization details */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Organization Details</h2>
          {!editingOrg && (
            <button
              onClick={() => setEditingOrg(true)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
        </div>

        {editingOrg ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Organization Name *</label>
              <input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Your organization name"
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-600"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Description</label>
              <textarea
                value={orgDesc}
                onChange={(e) => setOrgDesc(e.target.value)}
                rows={3}
                placeholder="Brief description of your organization…"
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-600 resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Contact Email</label>
              <input
                type="email"
                value={orgEmail}
                onChange={(e) => setOrgEmail(e.target.value)}
                placeholder="contact@yourorg.com"
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-600"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Logo URL</label>
              <input
                value={orgLogo}
                onChange={(e) => setOrgLogo(e.target.value)}
                placeholder="https://yourorg.com/logo.png"
                className="input-glow w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-600"
              />
            </div>

            {orgError && <p className="text-xs text-red-400">{orgError}</p>}

            <div className="flex gap-2 justify-end">
              <button
                onClick={cancelOrgEdit}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOrg}
                disabled={savingOrg}
                className="btn-gradient flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {savingOrg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {orgSaved && (
              <p className="flex items-center gap-1.5 text-xs text-green-400">
                <Check className="h-3.5 w-3.5" /> Changes saved.
              </p>
            )}
            {org ? (
              <div className="divide-y divide-white/8">
                <div className="flex items-start gap-4 py-3">
                  {org.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={org.logoUrl} alt="Org logo" className="h-12 w-12 rounded-xl object-cover ring-1 ring-white/10" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-500/25">
                      <Building2 className="h-6 w-6 text-violet-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-white">{org.name}</p>
                    {org.description && (
                      <p className="mt-0.5 text-sm text-slate-400">{org.description}</p>
                    )}
                  </div>
                </div>
                {org.contactEmail && (
                  <div className="py-3">
                    <p className="text-xs text-slate-500">Contact Email</p>
                    <p className="text-sm text-slate-300">{org.contactEmail}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-6">
                <Building2 className="h-8 w-8 text-slate-600" />
                <p className="text-sm text-slate-500">No organization details set up yet.</p>
                <button
                  onClick={() => setEditingOrg(true)}
                  className="btn-gradient rounded-xl px-4 py-2 text-sm font-semibold text-white"
                >
                  Set Up Organization
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
