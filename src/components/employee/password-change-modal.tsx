"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, LogOut, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PasswordChangeModal({
  isOpen,
  onClose,
  isMandatory = false,
  onSuccess,
}: {
  isOpen: boolean;
  onClose?: () => void;
  isMandatory?: boolean;
  onSuccess?: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Password change failed.");
      }

      setStatus({ type: "success", message: data.message || "Password updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        onSuccess?.();
        if (!isMandatory) onClose?.();
      }, 1200);
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Password change failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0a0f1d] p-6 shadow-2xl animate-in fade-in zoom-in-95">
        {!isMandatory && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4 mb-5">
          <div className={`grid h-10 w-10 place-items-center rounded-xl border ${
            isMandatory
              ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
              : "border-sky-500/40 bg-sky-500/10 text-sky-300"
          }`}>
            {isMandatory ? <ShieldAlert className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              {isMandatory ? "Mandatory Password Change Required" : "Change Account Password"}
            </h2>
            <p className="text-xs text-slate-400">
              {isMandatory
                ? "First login detected with temporary credential. Update your password to continue."
                : "Update your permanent login credentials per AOCC security compliance standards."}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase text-slate-300">Current / Temporary Password</label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current or temporary password"
                required
                className="bg-slate-900 border-slate-700 text-xs pr-10 text-white font-mono"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-slate-300">New Password</label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 12 characters"
                  required
                  className="bg-slate-900 border-slate-700 text-xs pr-10 text-white font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase text-slate-300">Confirm Password</label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  className="bg-slate-900 border-slate-700 text-xs pr-10 text-white font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-[11px] text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>AOCC Security Password Policy</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
              <li>Minimum 12 characters length</li>
              <li>Must contain uppercase, lowercase, numbers, and symbols</li>
              <li>Must differ from current/temporary password</li>
            </ul>
          </div>

          {status && (
            <div
              className={`flex items-center gap-2 rounded-lg p-3 text-xs ${
                status.type === "success"
                  ? "border border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
                  : "border border-rose-500/30 bg-rose-950/40 text-rose-300"
              }`}
            >
              {status.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{status.message}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {isMandatory ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-xs border-slate-700 text-slate-400 hover:text-white flex items-center gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out Instead
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs border-slate-700 text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="bg-sky-500 hover:bg-sky-400 text-black font-semibold text-xs px-5"
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
