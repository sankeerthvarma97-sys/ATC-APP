"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function PasswordChangeCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | "idle"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
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

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStatus({ type: "success", message: data.message || "Password updated successfully." });
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
    <Card className="border-slate-800 bg-slate-900/60">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base text-white">Security: Change Password</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Use a unique password that meets the AOCC policy.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative">
            <label className="mb-1 block text-xs font-medium text-slate-300">Current password</label>
            <Input
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Current password"
            />
            <button
              type="button"
              className="absolute right-3 top-8 text-slate-400"
              aria-label={showCurrent ? "Hide current password" : "Show current password"}
              onClick={() => setShowCurrent((value) => !value)}
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="relative">
            <label className="mb-1 block text-xs font-medium text-slate-300">New password</label>
            <Input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="New password"
            />
            <button
              type="button"
              className="absolute right-3 top-8 text-slate-400"
              aria-label={showNew ? "Hide new password" : "Show new password"}
              onClick={() => setShowNew((value) => !value)}
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="relative">
            <label className="mb-1 block text-xs font-medium text-slate-300">Confirm password</label>
            <Input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm password"
            />
            <button
              type="button"
              className="absolute right-3 top-8 text-slate-400"
              aria-label={showConfirm ? "Hide confirmation password" : "Show confirmation password"}
              onClick={() => setShowConfirm((value) => !value)}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-300">
          <div className="flex items-center gap-2 font-semibold text-slate-200">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Password policy
          </div>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-slate-400">
            <li>At least 12 characters</li>
            <li>Uppercase, lowercase, number, and symbol</li>
            <li>Must differ from current password</li>
          </ul>
        </div>

        {status && (
          <div
            className={status.type === "success" ? "rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300" : "rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300"}
          >
            {status.message}
          </div>
        )}

        <Button type="button" onClick={submit} disabled={loading} className="w-full md:w-auto">
          {loading ? "Updating..." : "Update Password"}
        </Button>
      </CardContent>
    </Card>
  );
}
