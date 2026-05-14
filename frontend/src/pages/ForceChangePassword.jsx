import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { LockKeyhole, ShieldCheck } from "lucide-react";

function getHomePath(role) {
  if (role === "ADMIN") return "/admin";
  if (role === "STAFF") return "/staff-home";
  return "/dashboard";
}

export default function ForceChangePassword() {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    if (newPassword === currentPassword) {
      setError("Choose a new password that is different from the temporary password.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.put("/api/users/me", {
        currentPassword,
        newPassword,
      });

      const updated = res.data?.user || res.data?.data?.user || {};
      const nextUser = {
        ...storedUser,
        ...updated,
        mustChangePassword: false,
      };
      localStorage.setItem("user", JSON.stringify(nextUser));
      localStorage.setItem("role", nextUser.role || storedUser.role);

      navigate(getHomePath(nextUser.role || storedUser.role), { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error?.message ||
          "Password update failed. Please check your temporary password."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition focus:border-indigo-400 focus:bg-indigo-500/[0.06]";

  return (
    <div className="min-h-screen bg-[#080b18] text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#10172a] p-6 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-11 w-11 rounded-lg bg-indigo-500/15 text-indigo-200 flex items-center justify-center">
            <LockKeyhole size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Change Temporary Password</h1>
            <p className="text-sm text-white/55">Required before accessing your staff workspace</p>
          </div>
        </div>

        <div className="mb-5 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100 flex gap-2">
          <ShieldCheck size={18} className="mt-0.5 shrink-0" />
          <span>Use the temporary password provided by admin, then create your own password.</span>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-white/70">Temporary Password</label>
            <input
              className={inputClass}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-white/70">New Password</label>
            <input
              className={inputClass}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-white/70">Confirm New Password</label>
            <input
              className={inputClass}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
