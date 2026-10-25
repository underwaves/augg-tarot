"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Package,
  HelpCircle,
  FileText,
  Lock,
  Copy,
  ExternalLink,
  Shuffle,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  History,
  Trash2,
  RefreshCw,
  Share2,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { ReorderModal } from "@/components/ReorderModal";
import { useToast } from "@/components/Toast";

export default function QueueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const id = params?.id as string;

  const [queue, setQueue] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [canViewAuditLogs, setCanViewAuditLogs] = useState(false);
  const [loading, setLoading] = useState(true);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editNickname, setEditNickname] = useState("");
  const [editQueueDate, setEditQueueDate] = useState("");
  const [editPackageName, setEditPackageName] = useState("");
  const [editQuestionCount, setEditQuestionCount] = useState(1);
  const [editDetails, setEditDetails] = useState("");
  const [editInternalNote, setEditInternalNote] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Tracking link state
  const [currentTrackingUrl, setCurrentTrackingUrl] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);

  // Modals state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelNote, setCancelNote] = useState("");
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);

  const fetchQueueData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/queues/${id}`);
      if (res.ok) {
        const data = await res.json();
        setQueue(data.queue);
        setAuditLogs(data.auditLogs || []);
        setCanViewAuditLogs(Boolean(data.canViewAuditLogs));

        // Fill edit fields
        setEditNickname(data.queue.nickname);
        setEditQueueDate(data.queue.queueDate);
        setEditPackageName(data.queue.packageName);
        setEditQuestionCount(data.queue.questionCount);
        setEditDetails(data.queue.details || "");
        setEditInternalNote(data.queue.internalNote || "");

        // Setup active tracking url
        if (data.queue.activeTrackingUrl) {
          setCurrentTrackingUrl(data.queue.activeTrackingUrl);
        } else if (data.queue.tokens && data.queue.tokens.length > 0) {
          const activeToken = data.queue.tokens.find((t: any) => !t.revokedAt);
          if (activeToken) {
            setCurrentTrackingUrl("LINK_ACTIVE");
          } else {
            setCurrentTrackingUrl(null);
          }
        } else {
          setCurrentTrackingUrl(null);
        }
      } else {
        showToast("ไม่พบข้อมูลคิว", "error");
        router.push("/admin/queues");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการโหลดข้อมูลคิว", "error");
    } finally {
      setLoading(false);
    }
  }, [id, router, showToast]);

  useEffect(() => {
    if (id) {
      fetchQueueData();
    }
  }, [id, fetchQueueData]);

  // Handle Edit Submit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/queues/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: editNickname.trim(),
          queueDate: editQueueDate,
          packageName: editPackageName.trim(),
          questionCount: editQuestionCount,
          details: editDetails.trim(),
          internalNote: editInternalNote.trim(),
        }),
      });

      if (res.ok) {
        showToast("บันทึกการแก้ไขข้อมูลคิวเรียบร้อยค่ะ ✨", "success");
        setIsEditing(false);
        fetchQueueData();
      } else {
        const err = await res.json();
        showToast(err.error || "เกิดข้อผิดพลาดในการบันทึก", "error");
      }
    } catch {
      showToast("ไม่สามารถบันทึกข้อมูลได้", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // Change Status Handler
  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/queues/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        showToast(`เปลี่ยนสถานะเป็น "${newStatus}" เรียบร้อยแล้วค่ะ ✨`, "success");
        fetchQueueData();
      } else {
        const err = await res.json();
        showToast(err.error || "ไม่สามารถเปลี่ยนสถานะได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ", "error");
    }
  };

  // Cancel Queue
  const handleConfirmCancel = async () => {
    try {
      const res = await fetch(`/api/queues/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled", note: cancelNote }),
      });

      if (res.ok) {
        showToast("ยกเลิกคิวเรียบร้อยแล้วค่ะ", "info");
        setIsCancelModalOpen(false);
        fetchQueueData();
      } else {
        const err = await res.json();
        showToast(err.error || "ไม่สามารถยกเลิกคิวได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการยกเลิกคิว", "error");
    }
  };

  // Create or Regenerate Tracking Token
  const handleGenerateToken = async () => {
    try {
      setGeneratingToken(true);
      const res = await fetch(`/api/queues/${id}/token`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setCurrentTrackingUrl(data.trackingUrl);
        navigator.clipboard.writeText(data.trackingUrl);
        showToast("สร้างและคัดลอกลิงก์ติดตามคิวใหม่สำเร็จเรียบร้อยค่ะ ✨", "success");
        setIsRegenerateModalOpen(false);
        fetchQueueData();
      } else {
        const err = await res.json();
        showToast(err.error || "ไม่สามารถสร้างลิงก์ได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการสร้างลิงก์", "error");
    } finally {
      setGeneratingToken(false);
    }
  };

  // Copy Existing Link without generating a new token or revoking
  const handleCopyLink = () => {
    if (currentTrackingUrl && currentTrackingUrl !== "LINK_ACTIVE") {
      navigator.clipboard.writeText(currentTrackingUrl);
      showToast("คัดลอกลิงก์ติดตามคิวเรียบร้อยแล้วค่ะ ✨", "success");
    } else {
      setIsRegenerateModalOpen(true);
    }
  };

  // Revoke Token
  const handleRevokeToken = async () => {
    try {
      const res = await fetch(`/api/queues/${id}/token`, { method: "DELETE" });
      if (res.ok) {
        showToast("เพิกถอนลิงก์ติดตามคิวเรียบร้อยแล้ว ลูกค้าจะไม่สามารถเข้าดูได้อีก", "info");
        setCurrentTrackingUrl(null);
        setIsRevokeModalOpen(false);
        fetchQueueData();
      } else {
        showToast("ไม่สามารถเพิกถอนลิงก์ได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเพิกถอนลิงก์", "error");
    }
  };

  // Reorder Handlers
  const handleReorderStep = async (queueId: string, direction: "up" | "down") => {
    const res = await fetch(`/api/queues/${queueId}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "step", direction }),
    });
    if (res.ok) {
      showToast("เลื่อนลำดับคิวสำเร็จ ✨", "success");
      fetchQueueData();
    }
  };

  const handleJumpPosition = async (queueId: string, targetPosition: number) => {
    const res = await fetch(`/api/queues/${queueId}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "jump", targetPosition }),
    });
    if (res.ok) {
      showToast(`ลัดคิวไปยังลำดับ #${targetPosition} สำเร็จ ✨`, "success");
      fetchQueueData();
    }
  };

  if (loading || !queue) {
    return (
      <AdminLayout>
        <div className="py-20 text-center text-sm text-gray-500 animate-pulse">
          กำลังเปิดตำราดึงรายละเอียดคิว... ✨
        </div>
      </AdminLayout>
    );
  }

  const hasActiveToken = queue.tokens && queue.tokens.some((t: any) => !t.revokedAt);

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Back */}
        <Link
          href="/admin/queues"
          className="inline-flex items-center gap-2 text-xs font-semibold text-purple-700 hover:text-purple-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปยังรายการคิวทั้งหมด</span>
        </Link>

        {/* Top Header Card */}
        <div className="pastel-card p-6 bg-gradient-to-r from-pastel-purple/20 via-white to-pastel-pink/20 border-pastel-lavender/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-pastel-lavender/70 text-purple-900 font-extrabold text-base flex items-center justify-center shrink-0 shadow-xs">
              #{queue.queueOrder}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-pastel-deep font-mono">
                  {queue.queueNumber}
                </h1>
                <StatusBadge status={queue.status} size="md" />
              </div>
              <p className="text-sm font-semibold text-purple-950 mt-1">
                ลูกค้า: คุณ{queue.nickname} • วันที่รับคิว: {queue.queueDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
            {["waiting", "in_progress"].includes(queue.status) && (
              <button
                onClick={() => setIsReorderModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-white hover:bg-pastel-lavender/30 border border-pastel-lavender text-xs font-semibold text-purple-900 flex items-center gap-1.5 transition shadow-xs"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>ลัดคิว / จัดลำดับ</span>
              </button>
            )}

            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="btn-magical px-4 py-2 rounded-xl text-xs font-semibold shadow-xs"
              >
                แก้ไขข้อมูลคิว
              </button>
            )}
          </div>
        </div>

        {/* Customer Tracking Link Card */}
        <div className="pastel-card p-5 bg-white border-pastel-lavender/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-pastel-pink text-purple-700">
                <Share2 className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-pastel-deep">
                ลิงก์ติดตามคิวสำหรับลูกค้า (Customer Live Tracker)
              </h2>
            </div>
            {hasActiveToken && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                ● กำลังเปิดใช้งาน (Active)
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500">
            ส่งลิงก์นี้ให้ลูกค้าผ่านไลน์หรือแชตร้าน ลูกค้าจะเห็นเฉพาะสถานะและคิวที่อยู่ก่อนหน้า โดยไม่ต้องล็อกอิน
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono text-gray-600 truncate">
              {currentTrackingUrl && currentTrackingUrl !== "LINK_ACTIVE"
                ? currentTrackingUrl
                : hasActiveToken
                ? "ลิงก์ติดตามคิวพร้อมใช้งานแล้ว (กดปุ่มสร้าง/คัดลอกใหม่เพื่อรับ URL ล่าสุด)"
                : "ยังไม่มีการสร้างลิงก์สำหรับคิวนี้"}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {hasActiveToken ? (
                <>
                  <button
                    onClick={handleCopyLink}
                    className="btn-magical px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs shrink-0"
                    title="คัดลอกลิงก์เดิมโดยไม่ยกเลิกหรือสร้างใหม่"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอกลิงก์</span>
                  </button>

                  <button
                    onClick={() => setIsRegenerateModalOpen(true)}
                    disabled={generatingToken}
                    className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold flex items-center gap-1 shrink-0 transition"
                    title="ออกลิงก์ใหม่และเพิกถอนลิงก์เดิม"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>ออกลิงก์ใหม่</span>
                  </button>

                  <button
                    onClick={() => setIsRevokeModalOpen(true)}
                    className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold shrink-0 transition"
                    title="เพิกถอนลิงก์ไม่ให้ลูกค้าเข้าดูได้อีก"
                  >
                    เพิกถอน
                  </button>
                </>
              ) : (
                <button
                  onClick={handleGenerateToken}
                  disabled={generatingToken}
                  className="btn-magical px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>สร้างลิงก์ติดตาม</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Status Bar */}
        <div className="pastel-card p-4 border-pastel-lavender/50 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold text-pastel-deep">เปลี่ยนสถานะด่วน:</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleStatusChange("waiting")}
              disabled={queue.status === "waiting"}
              className="px-3 py-1.5 rounded-xl bg-pastel-yellow/30 hover:bg-pastel-yellow/70 text-amber-900 border border-amber-300 text-xs font-semibold disabled:opacity-40 transition"
            >
              รอคิว (Waiting)
            </button>
            <button
              onClick={() => handleStatusChange("in_progress")}
              disabled={queue.status === "in_progress"}
              className="px-3 py-1.5 rounded-xl bg-pastel-blue/40 hover:bg-pastel-blue text-blue-900 border border-blue-300 text-xs font-semibold disabled:opacity-40 transition"
            >
              กำลังดำเนินการ (In Progress)
            </button>
            <button
              onClick={() => handleStatusChange("completed")}
              disabled={queue.status === "completed"}
              className="px-3 py-1.5 rounded-xl bg-pastel-green/40 hover:bg-pastel-green text-emerald-900 border border-emerald-300 text-xs font-semibold disabled:opacity-40 transition"
            >
              เสร็จแล้ว (Completed)
            </button>
            <button
              onClick={() => setIsCancelModalOpen(true)}
              disabled={queue.status === "cancelled"}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold disabled:opacity-40 transition"
            >
              ยกเลิกคิว (Cancel)
            </button>
          </div>
        </div>

        {/* Edit Form OR View Details */}
        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="pastel-card p-6 space-y-4 border-purple-200 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-base text-pastel-deep">แก้ไขข้อมูลคิว</h3>
              <span className="text-xs text-purple-700">กำลังอยู่ในโหมดแก้ไข</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ชื่อเล่นลูกค้า</label>
                <input
                  type="text"
                  required
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-pastel-purple focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">วันที่รับคิว</label>
                <input
                  type="date"
                  required
                  value={editQueueDate}
                  onChange={(e) => setEditQueueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-pastel-purple focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">ชื่อแพ็กเกจ</label>
                <input
                  type="text"
                  required
                  value={editPackageName}
                  onChange={(e) => setEditPackageName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-pastel-purple focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">จำนวนคำถาม</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editQuestionCount}
                  onChange={(e) => setEditQuestionCount(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-pastel-purple focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">รายละเอียดเพิ่มเติม / คำถามลูกค้า</label>
              <textarea
                rows={3}
                value={editDetails}
                onChange={(e) => setEditDetails(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-pastel-purple focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>หมายเหตุภายในร้าน (ลูกค้าจะไม่เห็น)</span>
              </label>
              <textarea
                rows={2}
                value={editInternalNote}
                onChange={(e) => setEditInternalNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-amber-50/30 text-sm focus:ring-2 focus:ring-amber-300 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="btn-magical px-5 py-2 rounded-xl text-xs font-bold shadow-xs"
              >
                {savingEdit ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
              </button>
            </div>
          </form>
        ) : (
          <div className="pastel-card p-6 space-y-4 border-pastel-lavender/60">
            <h3 className="font-bold text-base text-pastel-deep pb-2 border-b border-gray-100">
              รายละเอียดคิว
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-400 block mb-0.5">ชื่อแพ็กเกจ</span>
                <span className="font-bold text-pastel-deep text-sm">{queue.packageName}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">จำนวนคำถาม</span>
                <span className="font-bold text-pastel-deep text-sm">{queue.questionCount} ข้อ</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">วันที่รับคิว</span>
                <span className="font-medium text-gray-700">{queue.queueDate}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">ผู้บันทึกคิว</span>
                <span className="font-medium text-gray-700">{queue.creator?.displayName} ({queue.creator?.email})</span>
              </div>
            </div>

            {queue.details && (
              <div className="pt-2">
                <span className="text-gray-400 block mb-1 text-xs">รายละเอียดคำถามจากลูกค้า:</span>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {queue.details}
                </div>
              </div>
            )}

            {queue.internalNote && (
              <div className="pt-2">
                <span className="text-amber-700 block mb-1 text-xs font-semibold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>หมายเหตุภายในร้าน:</span>
                </span>
                <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/80 text-xs text-amber-950 whitespace-pre-wrap leading-relaxed">
                  {queue.internalNote}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between text-[11px] text-gray-400">
              <span>สร้างเมื่อ: {new Date(queue.createdAt).toLocaleString("th-TH")}</span>
              <span>อัปเดตล่าสุด: {new Date(queue.updatedAt).toLocaleString("th-TH")}</span>
            </div>
          </div>
        )}

        {/* Audit Log / History for this Queue */}
        <div className="pastel-card p-6 border-pastel-lavender/60 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-pastel-lavender/60 text-purple-700">
              <History className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base text-pastel-deep">
              ประวัติการเปลี่ยนแปลงคิว (Audit Log)
            </h3>
          </div>

          {!canViewAuditLogs ? (
            <p className="text-xs text-gray-400 py-3">
              ประวัติระบบแสดงเฉพาะผู้ดูแลที่มีสิทธิ์ดูประวัติระบบ (view_audit_logs) เท่านั้น
            </p>
          ) : auditLogs.length === 0 ? (
            <p className="text-xs text-gray-400 py-3">ยังไม่มีประวัติการเปลี่ยนแปลงเพิ่มเติม</p>
          ) : (
            <div className="space-y-2.5">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-pastel-babypink/30 border border-pastel-pink/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                >
                  <div>
                    <span className="font-bold text-purple-900 mr-2">
                      {log.actorName || "ระบบ"}
                    </span>
                    <span className="text-gray-700">{log.details || log.action}</span>
                  </div>
                  <span className="text-[11px] text-gray-400 shrink-0">
                    {new Date(log.createdAt).toLocaleString("th-TH")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        isOpen={isCancelModalOpen}
        title={`ยืนยันการยกเลิกคิว ${queue.queueNumber}`}
        message="คุณต้องการยกเลิกคิวนี้ใช่หรือไม่? คิวที่ถูกยกเลิกแล้วจะไม่ถูกนับรวมในคิวที่รอดำเนินการ"
        confirmLabel="ยืนยันยกเลิกคิว"
        isDestructive
        onConfirm={handleConfirmCancel}
        onCancel={() => setIsCancelModalOpen(false)}
      />

      {/* Regenerate Token Confirmation Modal */}
      <ConfirmationModal
        isOpen={isRegenerateModalOpen}
        title="ยืนยันการออกลิงก์ติดตามคิวใหม่"
        message="การออกลิงก์ใหม่จะทำให้ลิงก์ติดตามเดิมของลูกค้าใช้งานไม่ได้ทันที (ถูกเพิกถอน) คุณแน่ใจหรือไม่ที่จะออกลิงก์ใหม่?"
        confirmLabel="ยืนยันออกลิงก์ใหม่"
        onConfirm={handleGenerateToken}
        onCancel={() => setIsRegenerateModalOpen(false)}
      />

      {/* Revoke Token Confirmation Modal */}
      <ConfirmationModal
        isOpen={isRevokeModalOpen}
        title="ยืนยันการเพิกถอนลิงก์ติดตามคิว"
        message="เมื่อเพิกถอนแล้ว ลูกค้าจะไม่สามารถใช้ลิงก์เดิมเพื่อดูสถานะคิวได้อีกจนกว่าคุณจะสร้างลิงก์ใหม่"
        confirmLabel="เพิกถอนลิงก์"
        isDestructive
        onConfirm={handleRevokeToken}
        onCancel={() => setIsRevokeModalOpen(false)}
      />

      {/* Reorder Modal */}
      <ReorderModal
        isOpen={isReorderModalOpen}
        queue={queue}
        onClose={() => setIsReorderModalOpen(false)}
        onReorderStep={handleReorderStep}
        onJumpPosition={handleJumpPosition}
      />
    </AdminLayout>
  );
}
