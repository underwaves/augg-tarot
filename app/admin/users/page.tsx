"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  Shield,
  Key,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Mail,
  UserCheck,
  Edit2,
  X,
  Sparkles,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useToast } from "@/components/Toast";
import { PERMISSION_KEYS, PERMISSION_LABELS, PermissionKey } from "@/lib/types";

export default function AdminUsersPage() {
  const { showToast } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Admin Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>([
    "view_queues",
    "create_queue",
    "edit_queue",
    "change_status",
    "reorder_queue",
    "view_history",
    "create_tracking_token",
  ]);
  const [creating, setCreating] = useState(false);

  // Edit Permissions Modal State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editPermissionsList, setEditPermissionsList] = useState<PermissionKey[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Reset Password Modal
  const [resettingUser, setResettingUser] = useState<any | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Toggle Active State
  const [toggleUserTarget, setToggleUserTarget] = useState<any | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        showToast("ไม่สามารถโหลดรายชื่อผู้ใช้งานได้ (อาจไม่มีสิทธิ์)", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้งาน", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle Create Admin Submit
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newDisplayName || !newPassword) {
      showToast("กรุณากรอกข้อมูลให้ครบถ้วน", "error");
      return;
    }
    if (newPassword.length < 8) {
      showToast("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร", "error");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          displayName: newDisplayName.trim(),
          password: newPassword,
          permissions: selectedPermissions,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`สร้างบัญชีแอดมินสำหรับคุณ ${data.user.displayName} เรียบร้อยแล้วค่ะ ✨`, "success");
        setIsCreateModalOpen(false);
        setNewDisplayName("");
        setNewEmail("");
        setNewPassword("");
        fetchUsers();
      } else {
        showToast(data.error || "เกิดข้อผิดพลาดในการสร้างบัญชี", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    } finally {
      setCreating(false);
    }
  };

  // Toggle Permission Checkbox
  const togglePermissionCheckbox = (perm: PermissionKey) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const toggleEditPermissionCheckbox = (perm: PermissionKey) => {
    setEditPermissionsList((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  // Save Permissions
  const handleSavePermissions = async () => {
    if (!editingUser) return;
    setSavingPermissions(true);
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: editPermissionsList }),
      });

      if (res.ok) {
        showToast("อัปเดตสิทธิ์ผู้ใช้งานสำเร็จ ✨", "success");
        setEditingUser(null);
        fetchUsers();
      } else {
        const err = await res.json();
        showToast(err.error || "ไม่สามารถอัปเดตสิทธิ์ได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการอัปเดตสิทธิ์", "error");
    } finally {
      setSavingPermissions(false);
    }
  };

  // Confirm Toggle Active
  const handleConfirmToggleActive = async () => {
    if (!toggleUserTarget) return;
    try {
      const newActive = !toggleUserTarget.isActive;
      const res = await fetch(`/api/users/${toggleUserTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newActive }),
      });

      if (res.ok) {
        showToast(
          newActive
            ? `เปิดใช้งานบัญชี ${toggleUserTarget.displayName} สำเร็จ ✨`
            : `ระงับการใช้งานบัญชี ${toggleUserTarget.displayName} เรียบร้อยแล้ว`,
          newActive ? "success" : "info"
        );
        setToggleUserTarget(null);
        fetchUsers();
      } else {
        const err = await res.json();
        showToast(err.error || "ไม่สามารถเปลี่ยนสถานะบัญชีได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ", "error");
    }
  };

  // Reset Password Submit
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser || resetNewPassword.length < 8) {
      showToast("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร", "error");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch(`/api/users/${resettingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: resetNewPassword }),
      });

      if (res.ok) {
        showToast(`ตั้งรหัสผ่านใหม่สำหรับคุณ ${resettingUser.displayName} เรียบร้อยแล้ว ✨`, "success");
        setResettingUser(null);
        setResetNewPassword("");
      } else {
        const err = await res.json();
        showToast(err.error || "ไม่สามารถเปลี่ยนรหัสผ่านได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-purple-700 text-xs font-bold uppercase tracking-wider mb-1">
              <Shield className="w-4 h-4" />
              <span>การกำหนดสิทธิ์และการเข้าถึง (RBAC)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-pastel-deep font-magic">
              จัดการบัญชีและสิทธิ์แอดมิน 👑
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              ควบคุมสิทธิ์ในการจัดการคิว สร้างบัญชีใหม่ หรือระงับการใช้งานตามบทบาทหน้าที่
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-magical px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-md self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>เพิ่มบัญชีแอดมินใหม่</span>
          </button>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="pastel-card p-12 text-center text-sm text-gray-500 animate-pulse">
            กำลังตรวจสอบบันทึกบัญชีผู้ดูแล... ✨
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users.map((u) => {
              const isOwner = u.role === "owner";
              return (
                <div
                  key={u.id}
                  className={`pastel-card p-5 border transition-all ${
                    !u.isActive
                      ? "bg-gray-50/90 border-gray-200 opacity-75"
                      : isOwner
                      ? "bg-gradient-to-br from-pastel-purple/20 via-white to-pastel-pink/20 border-pastel-purple/60"
                      : "bg-white border-pastel-lavender/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shadow-xs shrink-0 ${
                          isOwner
                            ? "bg-gradient-to-tr from-purple-500 to-pink-400 text-white"
                            : "bg-pastel-lavender/60 text-purple-900"
                        }`}
                      >
                        {u.displayName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-pastel-deep text-base">
                            {u.displayName}
                          </h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isOwner
                                ? "bg-purple-100 text-purple-900 border border-purple-300"
                                : "bg-blue-50 text-blue-900 border border-blue-200"
                            }`}
                          >
                            {isOwner ? "👑 เจ้าของร้าน (Owner)" : "🔮 แอดมิน (Admin)"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>ใช้งานอยู่</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                          <XCircle className="w-3 h-3" />
                          <span>ถูกระงับ</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Permissions Badges */}
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-600">สิทธิ์ในระบบ:</span>
                      {!isOwner && (
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setEditPermissionsList(u.permissions);
                          }}
                          className="text-xs text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>แก้ไขสิทธิ์</span>
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {isOwner ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                          ✦ สิทธิ์เต็มทุกรายการ (Full Administrator)
                        </span>
                      ) : u.permissions.length === 0 ? (
                        <span className="text-[10px] text-gray-400">ไม่มีสิทธิ์ใด ๆ</span>
                      ) : (
                        u.permissions.map((pKey: PermissionKey) => (
                          <span
                            key={pKey}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-pastel-lavender/30 text-purple-900 border border-purple-200/60"
                          >
                            ✓ {PERMISSION_LABELS[pKey]?.split(" (")[0] || pKey}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Actions for this user */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
                    <button
                      onClick={() => {
                        setResettingUser(u);
                        setResetNewPassword("");
                      }}
                      className="text-purple-700 hover:text-purple-900 font-medium flex items-center gap-1"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>รีเซ็ตรหัสผ่าน</span>
                    </button>

                    {!isOwner && (
                      <button
                        onClick={() => setToggleUserTarget(u)}
                        className={`font-semibold ${
                          u.isActive
                            ? "text-rose-600 hover:text-rose-800"
                            : "text-emerald-600 hover:text-emerald-800"
                        }`}
                      >
                        {u.isActive ? "ระงับการใช้งาน" : "เปิดใช้งานอีกครั้ง"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Admin Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pastel-deep/40 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white/95 rounded-3xl p-6 shadow-2xl border border-pastel-lavender max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-pastel-lavender/60 text-purple-700">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-pastel-deep">เพิ่มบัญชีแอดมินใหม่</h3>
                <p className="text-xs text-gray-500">สร้างบัญชีสำหรับผู้ช่วยเปิดไพ่หรือแอดมินร้าน</p>
              </div>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">ชื่อแสดงผล</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น น้องเมย์ (Tarot Assistant)"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-pastel-purple focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">อีเมลเข้าสู่ระบบ</label>
                <input
                  type="email"
                  required
                  placeholder="admin.may@magicaltarot.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-pastel-purple focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">รหัสผ่านเริ่มต้น (อย่างน้อย 8 ตัวอักษร)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-pastel-purple focus:outline-none"
                />
              </div>

              {/* Permissions Checklist */}
              <div className="pt-2">
                <label className="block font-bold text-pastel-deep mb-2">กำหนดสิทธิ์การใช้งาน:</label>
                <div className="space-y-2 bg-pastel-babypink/40 p-3 rounded-2xl border border-pastel-pink/40">
                  {PERMISSION_KEYS.map((permKey) => {
                    const checked = selectedPermissions.includes(permKey);
                    return (
                      <label
                        key={permKey}
                        className="flex items-center gap-2 cursor-pointer hover:bg-white/60 p-1 rounded-lg transition"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermissionCheckbox(permKey)}
                          className="rounded text-purple-600 focus:ring-purple-400"
                        />
                        <span className="text-gray-700 font-medium">
                          {PERMISSION_LABELS[permKey]}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-magical px-5 py-2 rounded-xl font-bold shadow-xs"
                >
                  {creating ? "กำลังสร้างบัญชี..." : "บันทึกบัญชีแอดมิน"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pastel-deep/40 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white/95 rounded-3xl p-6 shadow-2xl border border-pastel-lavender">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-pastel-deep mb-1">
              แก้ไขสิทธิ์สำหรับคุณ {editingUser.displayName}
            </h3>
            <p className="text-xs text-gray-500 mb-4">{editingUser.email}</p>

            <div className="space-y-2 max-h-72 overflow-y-auto p-3 bg-pastel-babypink/40 rounded-2xl border border-pastel-pink/40 mb-4 text-xs">
              {PERMISSION_KEYS.map((permKey) => {
                const checked = editPermissionsList.includes(permKey);
                return (
                  <label
                    key={permKey}
                    className="flex items-center gap-2 cursor-pointer hover:bg-white/60 p-1.5 rounded-lg transition"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleEditPermissionCheckbox(permKey)}
                      className="rounded text-purple-600 focus:ring-purple-400"
                    />
                    <span className="text-gray-700 font-medium">
                      {PERMISSION_LABELS[permKey]}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={savingPermissions}
                onClick={handleSavePermissions}
                className="btn-magical px-5 py-2 rounded-xl font-bold shadow-xs"
              >
                {savingPermissions ? "กำลังบันทึก..." : "บันทึกสิทธิ์ใหม่"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pastel-deep/40 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white/95 rounded-3xl p-6 shadow-2xl border border-pastel-lavender">
            <button
              onClick={() => setResettingUser(null)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-pastel-deep mb-1">
              รีเซ็ตรหัสผ่านสำหรับคุณ {resettingUser.displayName}
            </h3>
            <p className="text-xs text-gray-500 mb-4">{resettingUser.email}</p>

            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-pastel-purple focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="btn-magical px-5 py-2 rounded-xl font-bold shadow-xs"
                >
                  {savingPassword ? "กำลังตั้งรหัสผ่าน..." : "ตั้งรหัสผ่านใหม่"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Toggle Active Modal */}
      <ConfirmationModal
        isOpen={!!toggleUserTarget}
        title={
          toggleUserTarget?.isActive
            ? `ยืนยันการระงับการใช้งาน ${toggleUserTarget?.displayName}`
            : `ยืนยันเปิดใช้งาน ${toggleUserTarget?.displayName}`
        }
        message={
          toggleUserTarget?.isActive
            ? "เมื่อระงับการใช้งาน ผู้ใช้รายนี้จะไม่สามารถเข้าสู่ระบบเพื่อจัดการคิวได้อีกจนกว่าจะเปิดใช้งานใหม่"
            : "ต้องการเปิดสิทธิ์ให้ผู้ใช้รายนี้กลับมาเข้าสู่ระบบใช่หรือไม่?"
        }
        confirmLabel={toggleUserTarget?.isActive ? "ระงับการใช้งาน" : "เปิดใช้งาน"}
        isDestructive={toggleUserTarget?.isActive}
        onConfirm={handleConfirmToggleActive}
        onCancel={() => setToggleUserTarget(null)}
      />
    </AdminLayout>
  );
}
