"use client";

import { useCallback, useEffect, useState } from "react";
import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";
import {
  KeyRound,
  Plus,
  Trash2,
  Loader2,
  Shield,
  Smartphone,
  Cloud,
  CheckCircle2,
} from "lucide-react";

type Passkey = {
  id:         string;
  name:       string;
  deviceType: string | null;
  backedUp:   boolean;
  createdAt:  string;
  lastUsedAt: string | null;
};

export default function PasskeySettings() {
  const [passkeys, setPasskeys]   = useState<Passkey[]>([]);
  const [loading, setLoading]     = useState(true);
  const [adding, setAdding]       = useState(false);
  const [newName, setNewName]     = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/passkey/list");
      const json = await res.json();
      if (res.ok) setPasskeys(json.passkeys ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (adding) return;
    setAdding(true);
    setError(null);
    setSuccess(null);
    try {
      // 1. Get options
      const optRes  = await fetch("/api/auth/passkey/register/options", { method: "POST" });
      const optJson = await optRes.json();
      if (!optRes.ok) { setError(optJson.error ?? "Failed to start registration."); return; }

      // 2. Browser prompt
      let regResponse;
      try {
        regResponse = await startRegistration({ optionsJSON: optJson.options });
      } catch (e) {
        setError(`Registration cancelled: ${(e as Error).message}`);
        return;
      }

      // 3. Verify + save
      const verRes  = await fetch("/api/auth/passkey/register/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          challengeId: optJson.challengeId,
          name:        newName.trim() || "Passkey",
          response:    regResponse,
        }),
      });
      const verJson = await verRes.json();
      if (!verRes.ok) { setError(verJson.error ?? "Verification failed."); return; }

      setSuccess("Passkey registered successfully!");
      setShowForm(false);
      setNewName("");
      await load();
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    if (deleting) return;
    setDeleting(id);
    setError(null);
    try {
      const res = await fetch(`/api/auth/passkey/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPasskeys((prev) => prev.filter((pk) => pk.id !== id));
        setSuccess("Passkey removed.");
      } else {
        const json = await res.json();
        setError(json.error ?? "Failed to remove passkey.");
      }
    } finally {
      setDeleting(null);
    }
  }

  function fmtDate(dateStr: string | null) {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 p-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 ring-1 ring-blue-500/30">
            <KeyRound className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Passkeys</h3>
            <p className="text-xs text-slate-400">Sign in with Face ID, Touch ID, or Windows Hello</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm((v) => !v); setError(null); setSuccess(null); }}
          className="flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition-all hover:border-blue-500/60 hover:bg-blue-500/15"
        >
          <Plus className="h-3.5 w-3.5" />
          Add passkey
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <span>✕</span> {error}
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4" /> {success}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="mb-3 text-sm font-medium text-slate-300">Name this passkey</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder='e.g. "iPhone 15" or "MacBook"'
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none"
              maxLength={100}
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              {adding ? "Registering…" : "Register"}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Your browser will prompt you to authenticate (Face ID, fingerprint, or PIN).
          </p>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
        </div>
      ) : passkeys.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-8 text-center">
          <KeyRound className="h-8 w-8 text-slate-600" />
          <p className="text-sm text-slate-500">No passkeys registered yet</p>
          <p className="text-xs text-slate-600">Add a passkey to sign in without a password</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {passkeys.map((pk) => (
            <li key={pk.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                  {pk.backedUp ? (
                    <Cloud className="h-4 w-4 text-blue-400" />
                  ) : (
                    <Smartphone className="h-4 w-4 text-slate-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{pk.name}</p>
                  <p className="text-xs text-slate-500">
                    Added {fmtDate(pk.createdAt)}
                    {pk.lastUsedAt && ` · Last used ${fmtDate(pk.lastUsedAt)}`}
                    {pk.backedUp && " · Synced"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(pk.id)}
                disabled={!!deleting}
                className="ml-3 flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-500/15 hover:text-red-400 disabled:opacity-40"
                title="Remove passkey"
              >
                {deleting === pk.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
