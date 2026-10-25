"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ListOrdered,
  PlusCircle,
  Calendar,
  History,
  Users,
  ShieldAlert,
  LogOut,
  Sparkles,
  Moon,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { SessionUser } from "@/lib/types";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-pastel-babypink/30">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-pastel-purple/30 border-t-pastel-purple animate-spin" />
          <Moon className="w-6 h-6 text-pastel-purple absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="mt-4 text-sm font-medium text-pastel-deep animate-pulse">
          กำลังเตรียมเปิดตำรับไพ่เวทมนตร์... ✨
        </p>
      </div>
    );
  }

  const isOwner = user?.role === "owner";
  const permissions = user?.permissions || [];

  const navItems = [
    {
      label: "ภาพรวมแดชบอร์ด",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
      show: true,
    },
    {
      label: "จัดการคิวทั้งหมด",
      href: "/admin/queues",
      icon: ListOrdered,
      show: true,
    },
    {
      label: "เพิ่มคิวใหม่",
      href: "/admin/queues/new",
      icon: PlusCircle,
      show: isOwner || permissions.includes("create_queue"),
    },
    {
      label: "คิวรายวัน / ปฏิทิน",
      href: "/admin/calendar",
      icon: Calendar,
      show: true,
    },
    {
      label: "ประวัติคิวเก่า",
      href: "/admin/history",
      icon: History,
      show: isOwner || permissions.includes("view_history"),
    },
    {
      label: "จัดการแอดมิน",
      href: "/admin/users",
      icon: Users,
      show: isOwner || permissions.includes("manage_users"),
    },
    {
      label: "บันทึก Audit Log",
      href: "/admin/logs",
      icon: ShieldAlert,
      show: isOwner || permissions.includes("view_audit_logs"),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-md border-b border-pastel-lavender/50 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-pastel-lavender/60 text-pastel-deep">
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-pastel-deep font-magic tracking-wider">
              Magical Tarot
            </h1>
            <p className="text-[10px] text-gray-500">Queue Management</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-pastel-babypink text-pastel-deep border border-pastel-pink/60"
          aria-label="เมนูหลัก"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar for Desktop & Mobile Overlay */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/95 backdrop-blur-xl border-r border-pastel-lavender/40 flex flex-col transition-transform duration-300 md:translate-x-0 md:static ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-pastel-lavender/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pastel-purple via-pastel-lavender to-pastel-pink flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-6 h-6 animate-sparkle-slow" />
            </div>
            <div>
              <h2 className="font-bold text-pastel-deep text-lg font-magic tracking-wide">
                Magical Tarot
              </h2>
              <span className="text-[11px] font-medium text-purple-600 bg-pastel-lavender/40 px-2 py-0.5 rounded-full">
                Queue System ✨
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current User Badge */}
        <div className="p-4 mx-4 my-3 rounded-2xl bg-pastel-babypink/60 border border-pastel-pink/50 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-pastel-purple/30 text-pastel-deep font-bold flex items-center justify-center shrink-0">
              {user?.displayName?.charAt(0) || "T"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-pastel-deep truncate">
                {user?.displayName}
              </p>
              <span className="text-[10px] font-semibold text-purple-700 bg-white/80 px-2 py-0.2 rounded-full inline-block mt-0.5">
                {user?.role === "owner" ? "👑 เจ้าของร้าน" : "🔮 แอดมิน"}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-pastel-purple/30 via-pastel-lavender/40 to-pastel-pink/30 text-pastel-deep font-bold border border-pastel-lavender/60 shadow-xs"
                      : "text-gray-600 hover:bg-pastel-babypink/50 hover:text-pastel-deep"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-purple-700" : "text-gray-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
        </nav>

        {/* Footer Logout */}
        <div className="p-4 border-t border-pastel-lavender/30 space-y-2">
          <Link
            href="/track/demo-tq-20261025-0001"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-purple-700 bg-pastel-lavender/30 hover:bg-pastel-lavender/50 transition"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              ดูตัวอย่างหน้าลูกค้า
            </span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 pb-16 md:pb-8 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
