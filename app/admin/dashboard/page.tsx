"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Clock,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  AlertCircle,
  PlusCircle,
  Search,
  ExternalLink,
  Copy,
  RefreshCw,
  ArrowRight,
  UserCheck,
  Moon,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";

export default function DashboardPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardStats = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const copyTrackingLink = async (queue: any) => {
    if (!queue.tokens || queue.tokens.length === 0) {
      showToast("ยังไม่มีลิงก์สำหรับคิวนี้ กรุณาสร้างลิงก์ในหน้ารายละเอียดคิว", "info");
      return;
    }
    // Generate or fetch link
    try {
      const res = await fetch(`/api/queues/${queue.id}/token`, { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        navigator.clipboard.writeText(json.trackingUrl);
        showToast(`คัดลอกลิงก์ติดตามคิว ${queue.queueNumber} สำเร็จ ✨`, "success");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการคัดลอกลิงก์", "error");
    }
  };

  const stats = data?.stats || {
    total: 0,
    waiting: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    today: 0,
    pendingOverdue: 0,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden pastel-card p-6 sm:p-8 bg-gradient-to-r from-pastel-purple/30 via-pastel-lavender/20 to-pastel-pink/30 border-pastel-lavender/60">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-purple-700 text-xs font-bold uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4 animate-spin-slow" />
                <span>ศูนย์ควบคุมแดชบอร์ดหลังบ้าน</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-pastel-deep font-magic">
                Magical Tarot Dashboard 🔮
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                จัดการคิวเปิดไพ่ทาโรต์วันนี้อย่างราบรื่นและเปี่ยมด้วยมนตรา
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/admin/queues/new"
                className="btn-magical px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-md"
              >
                <PlusCircle className="w-4 h-4" />
                <span>เพิ่มคิวใหม่</span>
              </Link>

              <button
                onClick={fetchDashboardStats}
                disabled={refreshing}
                className="p-2.5 rounded-xl bg-white/80 hover:bg-white border border-pastel-lavender text-pastel-deep transition shadow-xs flex items-center gap-1.5 text-xs font-semibold"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-purple-600" : ""}`} />
                <span className="hidden sm:inline">อัปเดตข้อมูล</span>
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-purple-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>
              🕒 ข้อมูลล่าสุด:{" "}
              {data?.lastUpdated
                ? new Date(data.lastUpdated).toLocaleTimeString("th-TH")
                : "-"}
            </span>
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              เชื่อมต่อฐานข้อมูลจริง (Real Database Live)
            </span>
          </div>
        </div>

        {/* 7 Stats Cards in Magical Pastel Colors */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
          {/* 1. Total (Purple) */}
          <div className="pastel-card p-4 bg-white/90 border-pastel-lavender/80 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-purple-900">คิวทั้งหมด</span>
              <div className="p-1.5 rounded-lg bg-pastel-lavender text-purple-800">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-pastel-deep">
              {stats.total}
            </div>
            <span className="text-[10px] text-gray-500 mt-1">บันทึกในระบบ</span>
          </div>

          {/* 2. Today (Pale Yellow) */}
          <div className="pastel-card p-4 bg-pastel-yellow/30 border-pastel-yellow/70 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-900">คิววันนี้</span>
              <div className="p-1.5 rounded-lg bg-pastel-yellow text-amber-800">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-950">
              {stats.today}
            </div>
            <span className="text-[10px] text-amber-800/80 mt-1">กำหนดรับงานวันนี้</span>
          </div>

          {/* 3. Waiting (Yellow/Lavender) */}
          <div className="pastel-card p-4 bg-amber-50/70 border-amber-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-900">รอดำเนินการ</span>
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-950">
              {stats.waiting}
            </div>
            <span className="text-[10px] text-amber-800/80 mt-1">อยู่ในคิว</span>
          </div>

          {/* 4. In Progress (Soft Blue) */}
          <div className="pastel-card p-4 bg-pastel-blue/40 border-pastel-blue flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-900">กำลังทำ</span>
              <div className="p-1.5 rounded-lg bg-pastel-blue text-blue-800">
                <PlayCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-950">
              {stats.inProgress}
            </div>
            <span className="text-[10px] text-blue-800/80 mt-1">กำลังเปิดไพ่</span>
          </div>

          {/* 5. Completed (Mint Green) */}
          <div className="pastel-card p-4 bg-pastel-green/40 border-pastel-green flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-900">เสร็จแล้ว</span>
              <div className="p-1.5 rounded-lg bg-pastel-green text-emerald-800">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-950">
              {stats.completed}
            </div>
            <span className="text-[10px] text-emerald-800/80 mt-1">ส่งผลเรียบร้อย</span>
          </div>

          {/* 6. Cancelled (Soft Pink) */}
          <div className="pastel-card p-4 bg-rose-50/60 border-rose-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-rose-900">ยกเลิก</span>
              <div className="p-1.5 rounded-lg bg-rose-100 text-rose-800">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-950">
              {stats.cancelled}
            </div>
            <span className="text-[10px] text-rose-800/80 mt-1">ยกเลิกรายการ</span>
          </div>

          {/* 7. Pending / Overdue (Alert) */}
          <div className="pastel-card p-4 bg-purple-50/80 border-purple-200 col-span-2 sm:col-span-1 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-purple-900">คิวค้างรวม</span>
              <div className="p-1.5 rounded-lg bg-purple-100 text-purple-800">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-purple-950">
              {stats.pendingOverdue}
            </div>
            <span className="text-[10px] text-purple-800/80 mt-1">ยังไม่เสร็จสิ้น</span>
          </div>
        </div>

        {/* Quick Shortcuts Bar */}
        <div className="pastel-card p-4 border-pastel-lavender/50 flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-xs font-bold text-pastel-deep mr-2 flex items-center gap-1">
            <Moon className="w-3.5 h-3.5 text-purple-600" />
            <span>ทางลัดด่วน:</span>
          </span>
          <Link
            href="/admin/queues?status=all"
            className="px-3 py-1.5 rounded-xl bg-white/90 hover:bg-pastel-babypink border border-purple-100 text-xs font-medium text-pastel-deep transition shadow-xs"
          >
            📋 ดูคิวทั้งหมด
          </Link>
          <Link
            href="/admin/queues?date=today"
            className="px-3 py-1.5 rounded-xl bg-white/90 hover:bg-pastel-yellow/30 border border-amber-200 text-xs font-medium text-amber-900 transition shadow-xs"
          >
            ☀️ ดูคิววันนี้ ({stats.today})
          </Link>
          <Link
            href="/admin/queues?status=pending"
            className="px-3 py-1.5 rounded-xl bg-white/90 hover:bg-purple-100/50 border border-purple-200 text-xs font-medium text-purple-900 transition shadow-xs"
          >
            ⏳ ดูคิวที่ยังค้าง ({stats.pendingOverdue})
          </Link>
          <Link
            href="/admin/calendar"
            className="px-3 py-1.5 rounded-xl bg-white/90 hover:bg-blue-50 border border-blue-200 text-xs font-medium text-blue-900 transition shadow-xs"
          >
            🗓️ เปิดปฏิทินรายวัน
          </Link>
          <Link
            href="/admin/history"
            className="px-3 py-1.5 rounded-xl bg-white/90 hover:bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900 transition shadow-xs"
          >
            📜 ดูประวัติคิวเก่า
          </Link>
        </div>

        {/* Middle Section: Upcoming Active Queues & Recent System Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Queues (2 Cols) */}
          <div className="lg:col-span-2 pastel-card p-5 border-pastel-lavender/60">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-pastel-lavender/60 text-purple-700">
                  <Clock className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-pastel-deep text-base">
                  คิวที่ใกล้ถึงลำดับดำเนินการ (Upcoming Queues)
                </h2>
              </div>
              <Link
                href="/admin/queues"
                className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1"
              >
                <span>ดูทั้งหมด</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm text-gray-500 animate-pulse">
                กำลังอ่านดวงดาวของคิว... ✨
              </div>
            ) : !data?.upcomingQueues || data.upcomingQueues.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-pastel-babypink text-pastel-purple flex items-center justify-center mb-2">
                  <Sparkles className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-pastel-deep">วันนี้ยังไม่มีคิวเลย ♡</p>
                <p className="text-xs text-gray-400 mt-1">
                  เพิ่มคิวใหม่เพื่อเริ่มเปิดไพ่ให้ลูกค้าของคุณได้เลยค่ะ
                </p>
                <Link
                  href="/admin/queues/new"
                  className="mt-4 inline-flex items-center gap-1.5 btn-magical px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  เพิ่มคิวแรก
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {data.upcomingQueues.map((q: any) => (
                  <div
                    key={q.id}
                    className="py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-pastel-babypink/30 px-3 rounded-xl transition"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-pastel-lavender/50 text-purple-800 font-bold text-xs flex items-center justify-center shrink-0">
                        #{q.queueOrder}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-pastel-deep text-sm">
                            {q.nickname}
                          </span>
                          <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                            {q.queueNumber}
                          </span>
                          <StatusBadge status={q.status} size="sm" />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                          {q.packageName} ({q.questionCount} คำถาม) • วันที่: {q.queueDate}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => copyTrackingLink(q)}
                        className="p-1.5 rounded-lg bg-pastel-lavender/40 hover:bg-pastel-lavender text-purple-800 text-xs font-medium flex items-center gap-1 transition"
                        title="คัดลอกลิงก์ติดตามคิวส่งให้ลูกค้า"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">คัดลอกลิงก์</span>
                      </button>

                      <Link
                        href={`/admin/queues/${q.id}`}
                        className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700 transition"
                      >
                        รายละเอียด
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity Audit Logs (1 Col) */}
          <div className="pastel-card p-5 border-pastel-lavender/60">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-pastel-pink text-pink-700">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-pastel-deep text-base">
                  บันทึกกิจกรรมล่าสุด
                </h2>
              </div>
              <Link
                href="/admin/logs"
                className="text-xs font-semibold text-purple-700 hover:text-purple-900"
              >
                ดูทั้งหมด
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400">กำลังโหลด...</div>
            ) : !data?.recentLogs || data.recentLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                ยังไม่มีบันทึกกิจกรรม
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentLogs.map((log: any) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-pastel-babypink/40 border border-pastel-pink/40 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                      <span className="font-semibold text-pastel-deep">
                        {log.actorName || "ระบบ"}
                      </span>
                      <span>
                        {new Date(log.createdAt).toLocaleTimeString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-gray-700 font-medium">{log.details || log.action}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
