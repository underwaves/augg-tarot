"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  ExternalLink,
  Shuffle,
  Copy,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { ReorderModal } from "@/components/ReorderModal";
import { useToast } from "@/components/Toast";

export default function CalendarPage() {
  const { showToast } = useToast();
  const todayStr = new Date().toISOString().split("T")[0];

  const [currentDate, setCurrentDate] = useState(todayStr);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Reorder modal
  const [selectedQueueForReorder, setSelectedQueueForReorder] = useState<any | null>(null);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

  const fetchDailyQueues = useCallback(async (date: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/calendar?date=${date}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการโหลดข้อมูลคิวรายวัน", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDailyQueues(currentDate);
  }, [currentDate, fetchDailyQueues]);

  const changeDateByDays = (days: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    const newDateStr = d.toISOString().split("T")[0];
    setCurrentDate(newDateStr);
  };

  const handleStatusChange = async (queueId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/queues/${queueId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        showToast("เปลี่ยนสถานะเรียบร้อยค่ะ ✨", "success");
        fetchDailyQueues(currentDate);
      } else {
        const err = await res.json();
        showToast(err.error || "ไม่สามารถเปลี่ยนสถานะได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ", "error");
    }
  };

  const handleReorderStep = async (queueId: string, direction: "up" | "down") => {
    const res = await fetch(`/api/queues/${queueId}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "step", direction }),
    });
    if (res.ok) {
      showToast("เลื่อนลำดับคิวสำเร็จ ✨", "success");
      fetchDailyQueues(currentDate);
    }
  };

  const handleJumpPosition = async (queueId: string, targetPosition: number) => {
    const res = await fetch(`/api/queues/${queueId}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "jump", targetPosition }),
    });
    if (res.ok) {
      showToast(`ลัดคิวสำเร็จ ✨`, "success");
      fetchDailyQueues(currentDate);
    }
  };

  const copyTrackingLink = async (queue: any) => {
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

  const summary = data?.summary || { total: 0, waiting: 0, inProgress: 0, completed: 0, cancelled: 0 };
  const queues = data?.queues || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header and Date Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-purple-700 text-xs font-bold uppercase tracking-wider mb-1">
              <CalendarIcon className="w-4 h-4" />
              <span>ตารางคิวรายวัน</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-pastel-deep font-magic">
              จัดการคิวประจำวัน 🔮
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              เลือกดูคิวตามวันที่ เลื่อนวัน หรือกลับมาที่คิววันนี้ได้อย่างสะดวกรวดเร็ว
            </p>
          </div>

          {/* Date Controls */}
          <div className="flex items-center gap-2 bg-white/90 p-1.5 rounded-2xl border border-pastel-lavender/60 shadow-xs self-start sm:self-auto">
            <button
              onClick={() => changeDateByDays(-1)}
              className="p-2 rounded-xl hover:bg-pastel-babypink text-pastel-deep transition"
              title="วันก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <input
              type="date"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs sm:text-sm font-semibold text-pastel-deep focus:outline-none focus:ring-2 focus:ring-pastel-purple"
            />

            <button
              onClick={() => changeDateByDays(1)}
              className="p-2 rounded-xl hover:bg-pastel-babypink text-pastel-deep transition"
              title="วันถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {currentDate !== todayStr && (
              <button
                onClick={() => setCurrentDate(todayStr)}
                className="px-3 py-1.5 rounded-xl bg-pastel-lavender/50 hover:bg-pastel-lavender text-purple-900 text-xs font-bold transition ml-1"
              >
                กลับมาวันนี้
              </button>
            )}
          </div>
        </div>

        {/* Day Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="pastel-card p-3.5 bg-white border-pastel-lavender/60 text-center">
            <span className="text-[11px] font-bold text-gray-500">คิวทั้งหมดในวัน</span>
            <p className="text-2xl font-extrabold text-pastel-deep mt-0.5">{summary.total}</p>
          </div>
          <div className="pastel-card p-3.5 bg-pastel-yellow/30 border-amber-200 text-center">
            <span className="text-[11px] font-bold text-amber-900">รอคิว</span>
            <p className="text-2xl font-extrabold text-amber-950 mt-0.5">{summary.waiting}</p>
          </div>
          <div className="pastel-card p-3.5 bg-pastel-blue/40 border-blue-200 text-center">
            <span className="text-[11px] font-bold text-blue-900">กำลังดำเนินการ</span>
            <p className="text-2xl font-extrabold text-blue-950 mt-0.5">{summary.inProgress}</p>
          </div>
          <div className="pastel-card p-3.5 bg-pastel-green/40 border-emerald-200 text-center">
            <span className="text-[11px] font-bold text-emerald-900">เสร็จแล้ว</span>
            <p className="text-2xl font-extrabold text-emerald-950 mt-0.5">{summary.completed}</p>
          </div>
          <div className="pastel-card p-3.5 bg-rose-50/70 border-rose-200 text-center col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-rose-900">ยกเลิก</span>
            <p className="text-2xl font-extrabold text-rose-950 mt-0.5">{summary.cancelled}</p>
          </div>
        </div>

        {/* Day's Queue List */}
        {loading ? (
          <div className="pastel-card p-12 text-center text-sm text-gray-500 animate-pulse">
            กำลังส่องดวงดาวประจำวัน {currentDate}... ✨
          </div>
        ) : queues.length === 0 ? (
          <div className="pastel-card p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-pastel-babypink text-pastel-purple flex items-center justify-center mb-3">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-pastel-deep">
              วันที่ {currentDate} ยังไม่มีคิวเลยค่ะ ♡
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              คุณสามารถกดเพิ่มคิวใหม่โดยกำหนดวันที่เป็นวันดังกล่าวได้ทันที
            </p>
            <Link
              href="/admin/queues/new"
              className="mt-4 inline-flex items-center gap-1.5 btn-magical px-5 py-2.5 rounded-xl text-xs font-semibold"
            >
              + เพิ่มคิวสำหรับวันนี้
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {queues.map((q: any) => (
              <div
                key={q.id}
                className="pastel-card p-4 sm:p-5 border-pastel-lavender/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:shadow-md"
              >
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-pastel-lavender/60 text-purple-900 font-extrabold text-sm flex items-center justify-center shrink-0">
                    #{q.queueOrder}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-pastel-deep text-base">
                        คุณ{q.nickname}
                      </span>
                      <span className="font-mono text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                        {q.queueNumber}
                      </span>
                      <StatusBadge status={q.status} size="sm" />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      🔮 {q.packageName} ({q.questionCount} คำถาม)
                    </p>
                    {q.details && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 italic">
                        &quot;{q.details}&quot;
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
                  {/* Status Dropdown */}
                  <select
                    value={q.status}
                    onChange={(e) => handleStatusChange(q.id, e.target.value)}
                    className="text-xs font-semibold rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-300"
                  >
                    <option value="waiting">รอคิว</option>
                    <option value="in_progress">กำลังดำเนินการ</option>
                    <option value="completed">เสร็จแล้ว</option>
                    <option value="cancelled">ยกเลิก</option>
                  </select>

                  {["waiting", "in_progress"].includes(q.status) && (
                    <button
                      onClick={() => {
                        setSelectedQueueForReorder(q);
                        setIsReorderModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-pastel-lavender/40 hover:bg-pastel-lavender text-purple-800 transition"
                      title="จัดลำดับ / ลัดคิว"
                    >
                      <Shuffle className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => copyTrackingLink(q)}
                    className="p-2 rounded-xl bg-pastel-pink/50 hover:bg-pastel-pink text-pink-900 transition"
                    title="คัดลอกลิงก์ติดตามคิว"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <Link
                    href={`/admin/queues/${q.id}`}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-xs font-semibold text-pastel-deep transition"
                  >
                    ดูข้อมูล
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reorder Modal */}
      <ReorderModal
        isOpen={isReorderModalOpen}
        queue={selectedQueueForReorder}
        totalActiveCount={queues.length}
        onClose={() => {
          setIsReorderModalOpen(false);
          setSelectedQueueForReorder(null);
        }}
        onReorderStep={handleReorderStep}
        onJumpPosition={handleJumpPosition}
      />
    </AdminLayout>
  );
}
