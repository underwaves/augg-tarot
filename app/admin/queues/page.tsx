"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  PlusCircle,
  Copy,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ExternalLink,
  Sparkles,
  Shuffle,
  RefreshCw,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { ReorderModal } from "@/components/ReorderModal";
import { useToast } from "@/components/Toast";

export default function QueuesPage() {
  const { showToast } = useToast();

  const [queues, setQueues] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Reorder modal state
  const [selectedQueueForReorder, setSelectedQueueForReorder] = useState<any | null>(null);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

  const fetchQueues = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "15");

      if (searchTerm.trim()) {
        params.set("search", searchTerm.trim());
      }

      if (activeTab === "today") {
        params.set("date", "today");
      } else if (activeTab !== "all") {
        params.set("status", activeTab);
      }

      if (dateFilter && dateFilter !== "all" && activeTab !== "today") {
        params.set("date", dateFilter);
      }

      const res = await fetch(`/api/queues?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setQueues(data.queues || []);
        setPagination(data.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 });
      }
    } catch (error) {
      console.error(error);
      showToast("เกิดข้อผิดพลาดในการโหลดรายการคิว", "error");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, activeTab, dateFilter, showToast]);

  useEffect(() => {
    fetchQueues(1);
  }, [fetchQueues]);

  // Handle Quick Status Change
  const handleStatusChange = async (queueId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/queues/${queueId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        showToast("เปลี่ยนสถานะคิวสำเร็จ ✨", "success");
        fetchQueues(pagination.page);
      } else {
        const err = await res.json();
        showToast(err.error || "ไม่สามารถเปลี่ยนสถานะได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ", "error");
    }
  };

  // Handle Reorder Step (Up/Down)
  const handleReorderStep = async (queueId: string, direction: "up" | "down") => {
    try {
      const res = await fetch(`/api/queues/${queueId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "step", direction }),
      });

      if (res.ok) {
        showToast("เลื่อนลำดับคิวสำเร็จ ✨", "success");
        fetchQueues(pagination.page);
      } else {
        const err = await res.json();
        showToast(err.error || "ไม่สามารถเลื่อนลำดับได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเลื่อนลำดับ", "error");
    }
  };

  // Handle Jump Position
  const handleJumpPosition = async (queueId: string, targetPosition: number) => {
    try {
      const res = await fetch(`/api/queues/${queueId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "jump", targetPosition }),
      });

      if (res.ok) {
        showToast(`ลัดคิวไปยังลำดับที่ #${targetPosition} สำเร็จ ✨`, "success");
        fetchQueues(pagination.page);
      } else {
        const err = await res.json();
        showToast(err.error || "ไม่สามารถลัดคิวได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการลัดคิว", "error");
    }
  };

  // Copy tracking link
  const copyTrackingLink = async (queue: any) => {
    try {
      const res = await fetch(`/api/queues/${queue.id}/token`, { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        navigator.clipboard.writeText(json.trackingUrl);
        showToast(`คัดลอกลิงก์ติดตามคิว ${queue.queueNumber} สำเร็จ ✨`, "success");
      } else {
        showToast("ไม่สามารถสร้างลิงก์ได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการคัดลอกลิงก์", "error");
    }
  };

  const tabs = [
    { id: "all", label: "คิวทั้งหมด" },
    { id: "today", label: "คิววันนี้" },
    { id: "waiting", label: "รอคิว" },
    { id: "in_progress", label: "กำลังดำเนินการ" },
    { id: "completed", label: "เสร็จแล้ว" },
    { id: "cancelled", label: "ยกเลิก" },
    { id: "pending", label: "คิวที่ยังค้าง" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Title & Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-purple-700 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>ระบบจัดการคิวลูกค้า</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-pastel-deep font-magic">
              จัดการคิวทั้งหมด 🔮
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              ค้นหา กรองข้อมูล ลัดคิว และเปลี่ยนสถานะคิวลูกค้าได้แบบเรียลไทม์
            </p>
          </div>

          <Link
            href="/admin/queues/new"
            className="btn-magical px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-md self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>เพิ่มคิวใหม่</span>
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all shadow-xs ${
                  isActive
                    ? "bg-pastel-purple text-pastel-deep border border-purple-300 shadow-sm"
                    : "bg-white/80 hover:bg-pastel-babypink text-gray-600 border border-gray-200/70"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Actions Bar */}
        <div className="pastel-card p-4 border-pastel-lavender/50 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาด้วยเลขคิว (TQ-...), ชื่อเล่นลูกค้า, หรือชื่อแพ็กเกจ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pastel-purple text-sm text-pastel-deep"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={dateFilter === "all" ? "" : dateFilter}
              onChange={(e) => setDateFilter(e.target.value || "all")}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white/80 text-xs sm:text-sm text-pastel-deep focus:outline-none focus:ring-2 focus:ring-pastel-purple"
              title="กรองตามวันที่รับคิว"
            />
            {dateFilter !== "all" && (
              <button
                onClick={() => setDateFilter("all")}
                className="px-2.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs text-gray-600 transition"
              >
                ล้างวัน
              </button>
            )}

            <button
              onClick={() => fetchQueues(pagination.page)}
              className="p-2.5 rounded-xl bg-white hover:bg-pastel-babypink border border-gray-200 text-gray-600 transition shrink-0"
              title="รีเฟรชรายการ"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-purple-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Queue Content: Desktop Table & Mobile Cards */}
        {loading ? (
          <div className="pastel-card p-12 text-center text-sm text-gray-500 animate-pulse">
            กำลังส่องลูกแก้วคริสตัลดึงข้อมูลคิว... ✨
          </div>
        ) : queues.length === 0 ? (
          <div className="pastel-card p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-pastel-babypink text-pastel-purple flex items-center justify-center mb-3">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-pastel-deep">ไม่พบคิวที่ตรงกับเงื่อนไข ♡</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองสถานะและวันที่ เพื่อดูคิวอื่น ๆ ค่ะ
            </p>
            <button
              onClick={() => {
                setSearchTerm("");
                setActiveTab("all");
                setDateFilter("all");
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-pastel-lavender/40 hover:bg-pastel-lavender text-purple-900 text-xs font-semibold transition"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden lg:block pastel-card overflow-hidden border-pastel-lavender/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-pastel-babypink/70 border-b border-pastel-pink/50 text-pastel-deep font-bold">
                  <tr>
                    <th className="py-3 px-4 text-center w-16">ลำดับ</th>
                    <th className="py-3 px-4">เลขคิว</th>
                    <th className="py-3 px-4">ชื่อเล่นลูกค้า</th>
                    <th className="py-3 px-4">วันที่รับคิว</th>
                    <th className="py-3 px-4">แพ็กเกจ</th>
                    <th className="py-3 px-4 text-center">คำถาม</th>
                    <th className="py-3 px-4">สถานะ</th>
                    <th className="py-3 px-4">ผู้เพิ่มคิว</th>
                    <th className="py-3 px-4 text-center">จัดลำดับ</th>
                    <th className="py-3 px-4 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/80">
                  {queues.map((q) => (
                    <tr
                      key={q.id}
                      className="hover:bg-pastel-babypink/20 transition-colors"
                    >
                      <td className="py-3 px-4 text-center font-bold text-purple-800">
                        #{q.queueOrder}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-purple-700">
                        <Link
                          href={`/admin/queues/${q.id}`}
                          className="hover:underline flex items-center gap-1"
                        >
                          <span>{q.queueNumber}</span>
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-bold text-pastel-deep">
                        {q.nickname}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {q.queueDate}
                      </td>
                      <td className="py-3 px-4 text-gray-700 max-w-xs truncate" title={q.packageName}>
                        {q.packageName}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-600">
                        {q.questionCount} ข้อ
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={q.status}
                          onChange={(e) => handleStatusChange(q.id, e.target.value)}
                          className="text-xs rounded-lg border border-gray-200 bg-white px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-300 font-medium"
                        >
                          <option value="waiting">รอคิว</option>
                          <option value="in_progress">กำลังดำเนินการ</option>
                          <option value="completed">เสร็จแล้ว</option>
                          <option value="cancelled">ยกเลิก</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {q.creator?.displayName || "แอดมิน"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {["waiting", "in_progress"].includes(q.status) ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedQueueForReorder(q);
                                setIsReorderModalOpen(true);
                              }}
                              className="p-1 rounded-lg bg-pastel-lavender/30 hover:bg-pastel-lavender text-purple-700 transition"
                              title="จัดลำดับ / ลัดคิว"
                            >
                              <Shuffle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => copyTrackingLink(q)}
                            className="p-1.5 rounded-lg bg-pastel-lavender/30 hover:bg-pastel-lavender text-purple-700 transition"
                            title="คัดลอกลิงก์ติดตามคิว"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={`/admin/queues/${q.id}`}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 text-pastel-deep font-medium transition"
                          >
                            รายละเอียด
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (Visible on phone/tablet) */}
            <div className="lg:hidden space-y-3">
              {queues.map((q) => (
                <div
                  key={q.id}
                  className="pastel-card p-4 border-pastel-lavender/60 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-pastel-lavender/60 text-purple-800 font-bold text-xs flex items-center justify-center shrink-0">
                        #{q.queueOrder}
                      </span>
                      <div>
                        <h3 className="font-bold text-pastel-deep text-sm">
                          {q.nickname}
                        </h3>
                        <span className="font-mono text-xs text-purple-700">
                          {q.queueNumber}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={q.status} size="sm" />
                  </div>

                  <div className="bg-pastel-babypink/30 rounded-xl p-2.5 text-xs text-gray-600 space-y-1">
                    <p className="font-medium text-pastel-deep">
                      🔮 {q.packageName} ({q.questionCount} คำถาม)
                    </p>
                    <p className="text-[11px] text-gray-500">
                      📅 วันที่รับคิว: {q.queueDate}
                    </p>
                  </div>

                  {/* Mobile Actions */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {["waiting", "in_progress"].includes(q.status) && (
                        <button
                          onClick={() => {
                            setSelectedQueueForReorder(q);
                            setIsReorderModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-pastel-lavender/40 text-purple-800 text-xs font-semibold flex items-center gap-1"
                        >
                          <Shuffle className="w-3.5 h-3.5" />
                          <span>ลัดคิว</span>
                        </button>
                      )}
                      <button
                        onClick={() => copyTrackingLink(q)}
                        className="px-2.5 py-1.5 rounded-lg bg-pastel-pink/50 text-pink-800 text-xs font-semibold flex items-center gap-1"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>ลิงก์</span>
                      </button>
                    </div>

                    <Link
                      href={`/admin/queues/${q.id}`}
                      className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-pastel-deep"
                    >
                      ดูข้อมูลคิว →
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="pastel-card p-4 border-pastel-lavender/40 flex items-center justify-between text-xs text-gray-600">
                <span>
                  แสดง {queues.length} จากทั้งหมด {pagination.total} คิว (หน้า {pagination.page} / {pagination.totalPages})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => fetchQueues(pagination.page - 1)}
                    className="p-1.5 rounded-lg bg-white border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => fetchQueues(pagination.page + 1)}
                    className="p-1.5 rounded-lg bg-white border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Reorder Modal */}
      <ReorderModal
        isOpen={isReorderModalOpen}
        queue={selectedQueueForReorder}
        totalActiveCount={pagination.total}
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
