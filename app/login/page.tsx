"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Moon, Eye, EyeOff, Lock, Mail, Star, Wand2 } from "lucide-react";
import { useToast } from "@/components/Toast";

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const isDev = process.env.NODE_ENV !== "production";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email || !password) {
      setErrorMessage("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        return;
      }

      showToast(`ยินดีต้อนรับกลับมาค่ะ ✨ คุณ${data.user.displayName}`, "success");
      router.push("/admin/dashboard");
    } catch {
      setErrorMessage("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (role: "owner" | "admin") => {
    if (!isDev) return;
    if (role === "owner") {
      setEmail("owner@magicaltarot.com");
      setPassword("Password123!");
    } else {
      setEmail("admin@magicaltarot.com");
      setPassword("Password123!");
    }
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Decorative magical celestial background elements */}
      <div className="absolute top-12 left-12 text-pastel-purple/40 animate-sparkle-slow pointer-events-none">
        <Sparkles className="w-12 h-12" />
      </div>
      <div className="absolute bottom-16 right-16 text-pastel-pink/50 animate-float-slow pointer-events-none">
        <Moon className="w-16 h-16" />
      </div>
      <div className="absolute top-1/4 right-1/4 text-pastel-lavender/40 animate-pulse pointer-events-none">
        <Star className="w-8 h-8" />
      </div>
      <div className="absolute bottom-1/3 left-1/5 text-pastel-blue/40 animate-sparkle-slow pointer-events-none">
        <Star className="w-6 h-6" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="pastel-card p-6 sm:p-8 shadow-2xl border border-pastel-lavender/60 relative">
          {/* Header & Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-pastel-purple via-pastel-lavender to-pastel-pink text-white shadow-lg mb-4 transform hover:rotate-6 transition duration-300">
              <Sparkles className="w-9 h-9" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-pastel-deep font-magic tracking-wider">
              Magical Tarot
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 flex items-center justify-center gap-1.5 font-medium">
              <span>✦</span> ระบบจัดการคิวร้านเปิดไพ่ทาโรต์ <span>✦</span>
            </p>
          </div>

          {/* Quick Demo Login Helpers (Visible only in Development) */}
          {isDev && (
            <div className="mb-6 p-3 rounded-2xl bg-pastel-babypink/70 border border-pastel-pink/50">
              <p className="text-[11px] font-semibold text-pastel-deep mb-2 flex items-center gap-1">
                <Wand2 className="w-3.5 h-3.5 text-purple-600" />
                <span>ทดลองเข้าสู่ระบบด่วน (Quick Demo)</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillQuickDemo("owner")}
                  className="py-1.5 px-2 bg-white/80 hover:bg-white border border-purple-200 rounded-xl text-xs font-semibold text-purple-800 transition shadow-xs text-center"
                >
                  👑 เจ้าของร้าน (Owner)
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickDemo("admin")}
                  className="py-1.5 px-2 bg-white/80 hover:bg-white border border-pink-200 rounded-xl text-xs font-semibold text-pink-800 transition shadow-xs text-center"
                >
                  🔮 แอดมิน (Admin)
                </button>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2 animate-shake">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-pastel-deep mb-1.5">
                อีเมลผู้ดูแล
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder={isDev ? "owner@magicaltarot.com" : "admin@yourshop.com"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pastel-purple text-sm text-pastel-deep transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-pastel-deep mb-1.5">
                รหัสผ่าน
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 bg-white/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pastel-purple text-sm text-pastel-deep transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-magical py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 mt-6 shadow-md transition"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-purple-800 border-t-transparent rounded-full animate-spin" />
                  <span>กำลังตรวจสอบมนตรา...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>เข้าสู่ระบบหลังบ้าน</span>
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="mt-6 text-center text-[11px] text-gray-400">
            ระบบความปลอดภัยสำหรับบุคลากรภายในร้านเท่านั้น ✨
          </p>
        </div>
      </div>
    </div>
  );
}
