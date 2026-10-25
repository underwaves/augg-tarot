import React, { useState } from "react";
import { ArrowUp, ArrowDown, Shuffle, X } from "lucide-react";

interface ReorderModalProps {
  isOpen: boolean;
  queue: {
    id: string;
    queueNumber: string;
    nickname: string;
    queueOrder: number;
    queueDate: string;
  } | null;
  totalActiveCount?: number;
  isLoading?: boolean;
  onClose: () => void;
  onReorderStep: (queueId: string, direction: "up" | "down") => Promise<void>;
  onJumpPosition: (queueId: string, targetPosition: number) => Promise<void>;
}

export function ReorderModal({
  isOpen,
  queue,
  totalActiveCount = 10,
  isLoading = false,
  onClose,
  onReorderStep,
  onJumpPosition,
}: ReorderModalProps) {
  const [targetPos, setTargetPos] = useState<number>(queue?.queueOrder || 1);

  if (!isOpen || !queue) return null;

  const handleJump = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetPos < 1) return;
    await onJumpPosition(queue.id, targetPos);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pastel-deep/40 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md bg-white/95 rounded-3xl p-6 shadow-2xl border border-pastel-lavender">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition"
          aria-label="ปิดหน้าต่าง"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-pastel-lavender/60 text-purple-700">
            <Shuffle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-pastel-deep">จัดลำดับ / ลัดคิว</h3>
            <p className="text-xs text-gray-500">
              {queue.queueNumber} • {queue.nickname} (ลำดับปัจจุบัน: #{queue.queueOrder})
            </p>
          </div>
        </div>

        {/* Step up/down */}
        <div className="bg-pastel-babypink/60 border border-pastel-pink/50 rounded-2xl p-4 mb-5">
          <p className="text-xs font-semibold text-pastel-deep mb-2">เลื่อนทีละ 1 ลำดับ</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isLoading || queue.queueOrder <= 1}
              onClick={async () => {
                await onReorderStep(queue.id, "up");
                onClose();
              }}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-pastel-lavender/40 border border-pastel-lavender rounded-xl text-sm font-medium text-pastel-deep disabled:opacity-40 transition shadow-xs"
            >
              <ArrowUp className="w-4 h-4 text-purple-600" />
              <span>เลื่อนขึ้น (เร็วขึ้น)</span>
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={async () => {
                await onReorderStep(queue.id, "down");
                onClose();
              }}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-pastel-pink/40 border border-pastel-pink rounded-xl text-sm font-medium text-pastel-deep disabled:opacity-40 transition shadow-xs"
            >
              <ArrowDown className="w-4 h-4 text-pink-600" />
              <span>เลื่อนลง (ช้าลง)</span>
            </button>
          </div>
        </div>

        {/* Jump position */}
        <form onSubmit={handleJump} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-pastel-deep mb-1">
              หรือระบุลำดับที่ต้องการลัดคิวโดยตรง (1 - {Math.max(totalActiveCount, queue.queueOrder)})
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                max={Math.max(totalActiveCount, queue.queueOrder)}
                value={targetPos}
                onChange={(e) => setTargetPos(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-pastel-purple text-center font-bold text-lg text-pastel-deep"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="btn-magical px-5 py-2.5 rounded-xl text-sm whitespace-nowrap shadow-md"
              >
                ย้ายไปลำดับนี้
              </button>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 leading-tight">
            * ระบบจะคำนวณลำดับคิวของลูกค้ารายอื่นในวันที่ {queue.queueDate} ใหม่โดยอัตโนมัติ และป้องกันไม่ให้เกิดลำดับซ้ำ
          </p>
        </form>
      </div>
    </div>
  );
}
