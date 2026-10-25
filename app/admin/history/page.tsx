"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  History,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";

export default function HistoryPage() {
  const { showToast } = useToast();

  const [queues, setQueues] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'completed' | 'cancelled'
  const [dateFilter, setDateFilter] = useState("");

  const fetchHistoryQueues = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "15");
      params.set("isHistory", "true");

      if (searchTerm.trim()) {
        params.set("search", searchTerm.trim());
      }

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      if (dateFilter) {
        params.set("date", dateFilter);
      }

      const res = await fetch(`/api/queues?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setQueues(data.queues || []);
        setPagination(data.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 });
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการโหลดประวัติคิว", "error");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, dateFilter, showToast]);

  useEffect(() => {
    fetchHistoryQueues(1);
  }, [fetchHistoryQueues]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-purple-700 text-xs font-bold uppercase tracking-wider mb-1">
              <History className="w-4 h-4" />
              <span>คลังประวัติคิวเก่า (Queue Archive)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-pastel-deep font-magic">
              ประวัติคิวที่เสร็จสิ้นและยกเลิก 📜
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              ข้อมูลประวัติคิวจะไม่สูญหาย และสามารถค้นหาย้อนหลังได้อย่างละเอียดตลอดเวลา
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="pastel-card p-4 border-pastel-lavender/50 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาด้วยเลขคิว, ชื่อเล่นลูกค้า, หรือชื่อแพ็กเกจ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pastel-purple text-sm text-pastel-deep"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white/80 text-xs sm:text-sm font-semibold text-pastel-deep focus:outline-none focus:ring-2 focus:ring-pastel-purple"
            >
              <option value="all">ทุกสถานะเก่า</option>
              <option value="completed">เสร็จแล้วเท่านั้น</option>
              <option value="cancelled">ยกเลิกเท่านั้น</option>
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white/80 text-xs sm:text-sm text-pastel-deep focus:outline-none focus:ring-2 focus:ring-pastel-purple"
              title="กรองตามวันที่รับคิว"
            />

            {(searchTerm || statusFilter !== "all" || dateFilter) && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setDateFilter("");
                }}
                className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs text-gray-600 transition shrink-0"
              >
                ล้างตัวกรอง
              </button>
            )}

            <button
              onClick={() => fetchHistoryQueues(pagination.page)}
              className="p-2.5 rounded-xl bg-white hover:bg-pastel-babypink border border-gray-200 text-gray-600 transition shrink-0"
              title="รีเฟรช"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-purple-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* History List */}
        {loading ? (
          <div className="pastel-card p-12 text-center text-sm text-gray-500 animate-pulse">
            กำลังเปิดหีบโบราณดึงประวัติคิว... ✨
          </div>
        ) : queues.length === 0 ? (
          <div className="pastel-card p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-pastel-babypink text-pastel-purple flex items-center justify-center mb-3">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-pastel-deep">ไม่พบประวัติคิวตามเงื่อนไข ♡</h3>
            <p className="text-xs text-gray-500 mt-1">
              คิวที่ทำเสร็จแล้วหรือถูกยกเลิกจะถูกจัดเก็บในหน้านี้อย่างปลอดภัย
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {queues.map((q) => (
              <div
                key={q.id}
                className="pastel-card p-4 sm:p-5 border-pastel-lavender/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center shrink-0">
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
                      {q.packageName} ({q.questionCount} คำถาม) • วันที่รับคิว: {q.queueDate}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {q.status === "completed" && q.completedAt
                        ? `เสร็จสิ้นเมื่อ: ${new Date(q.completedAt).toLocaleString("th-TH")}`
                        : q.cancelledAt
                        ? `ยกเลิกเมื่อ: ${new Date(q.cancelledAt).toLocaleString("th-TH")}`
                        : `อัปเดต: ${new Date(q.updatedAt).toLocaleString("th-TH")}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Link
                    href={`/admin/queues/${q.id}`}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-xs font-semibold text-pastel-deep transition shadow-xs"
                  >
                    ดูรายละเอียดคิว →
                  </Link>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="pastel-card p-4 border-pastel-lavender/40 flex items-center justify-between text-xs text-gray-600">
                <span>
                  แสดง {queues.length} จากทั้งหมด {pagination.total} คิวเก่า (หน้า {pagination.page} / {pagination.totalPages})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => fetchHistoryQueues(pagination.page - 1)}
                    className="p-1.5 rounded-lg bg-white border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => fetchHistoryQueues(pagination.page + 1)}
                    className="p-1.5 rounded-lg bg-white border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
