"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2, X, Building2, Shield, ShieldCheck,
  User, ArrowRight, Loader2, AlertCircle, Sparkles, Clock, Users
} from "lucide-react";
import { useTranslation } from "@/contexts/TranslationContext";
import { supabase } from "@/supabaseClient";

interface InvitationData {
  id: string;
  workspace_id: string;
  workspace_name: string;
  workspace_logo?: string;
  workspace_theme?: string;
  email: string;
  role: string;
  invited_by_name?: string;
  status: string;
  expires_at?: string;
  is_expired?: boolean;
}

interface AcceptInviteModalProps {
  token: string | null;
  onClose: () => void;
  onAccept: (inviteId: string, workspaceId: string, role: string) => Promise<void>;
  onDecline: (inviteId: string) => Promise<void>;
  triggerToast?: (type: any, title: string, message: string) => void;
}

export default function AcceptInviteModal({
  token,
  onClose,
  onAccept,
  onDecline,
  triggerToast,
}: AcceptInviteModalProps) {
  const { isVietnamese } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setInvitation(null);
      return;
    }

    const fetchInvite = async () => {
      setLoading(true);
      setError(null);

      // 1. Direct workspace link support: e.g. ws_workspaceId_role
      if (token.startsWith('ws_')) {
        const parts = token.slice(3).split('_');
        const wsId = parts[0];
        const role = parts[1] || 'member';

        try {
          const { data: wsData, error: wsError } = await supabase
            .from('workspaces')
            .select('id, name, icon')
            .eq('id', wsId)
            .maybeSingle();

          const { data: { session } } = await supabase.auth.getSession();
          const userEmail = session?.user?.email || '';

          if (wsData) {
            setInvitation({
              id: `direct_${wsId}`,
              workspace_id: wsId,
              workspace_name: wsData.name || (isVietnamese ? 'Không gian Upgen' : 'Upgen Workspace'),
              workspace_logo: wsData.icon || undefined,
              email: userEmail,
              role: role,
              invited_by_name: isVietnamese ? 'Quản trị viên' : 'Workspace Admin',
              status: 'pending',
            });
            return;
          }
        } catch (err) {
          console.warn('Error fetching workspace direct invite:', err);
        }
      }

      // 2. Standard token-backed invitation
      try {
        let inviteRecord: any = null;

        // Try RPC first
        try {
          const { data, error: rpcError } = await supabase.rpc("get_invitation_by_token", {
            p_token: token,
          });
          if (!rpcError && data) {
            inviteRecord = data;
          }
        } catch (_) {}

        // Fallback: query workspace_invitations table directly
        if (!inviteRecord) {
          try {
            const { data, error: queryError } = await supabase
              .from('workspace_invitations')
              .select('*')
              .eq('token', token)
              .maybeSingle();

            if (!queryError && data) {
              inviteRecord = {
                id: data.id,
                workspace_id: data.workspace_id,
                workspace_name: data.workspace_name || 'Upgen Workspace',
                email: data.email,
                role: data.role,
                invited_by_name: data.invited_by_name || 'Admin',
                status: data.status,
                expires_at: data.expires_at,
                is_expired: data.expires_at ? new Date(data.expires_at).getTime() < Date.now() : false
              };
            }
          } catch (_) {}
        }

        // Fallback: check local storage
        if (!inviteRecord && typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('apexa_workspace_invitations');
            if (raw) {
              const list = JSON.parse(raw);
              const found = list.find((i: any) => i.token === token || i.id === token);
              if (found) {
                inviteRecord = {
                  id: found.id,
                  workspace_id: found.workspaceId,
                  workspace_name: found.workspaceName || 'Upgen Workspace',
                  email: found.email,
                  role: found.role,
                  invited_by_name: found.invitedByName || 'Admin',
                  status: found.status,
                  expires_at: found.expiresAt,
                  is_expired: found.expiresAt ? new Date(found.expiresAt).getTime() < Date.now() : false
                };
              }
            }
          } catch (_) {}
        }

        if (!inviteRecord) {
          setError(isVietnamese ? "Lời mời không hợp lệ hoặc đã bị thu hồi." : "Invitation is invalid or has been revoked.");
          return;
        }

        setInvitation(inviteRecord as InvitationData);
      } catch (err) {
        console.error("Error fetching invite by token:", err);
        setError(err instanceof Error ? err.message : (isVietnamese ? "Không thể tải thông tin lời mời." : "Failed to load invitation."));
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [token, isVietnamese]);

  const cleanUrlToken = () => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("invite_token");
      url.searchParams.delete("invite_ws");
      url.searchParams.delete("role");
      url.searchParams.delete("email");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    }
  };

  const handleAccept = async () => {
    if (!invitation) return;
    setActionLoading(true);
    try {
      await onAccept(invitation.id, invitation.workspace_id, invitation.role);
      cleanUrlToken();
      onClose();
    } catch (err) {
      triggerToast?.("error", isVietnamese ? "Lỗi tham gia" : "Join Error", err instanceof Error ? err.message : "Vui lòng thử lại.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!invitation) return;
    setActionLoading(true);
    try {
      await onDecline(invitation.id);
      cleanUrlToken();
      onClose();
    } catch (err) {
      triggerToast?.("error", isVietnamese ? "Lỗi từ chối" : "Decline Error", err instanceof Error ? err.message : "Vui lòng thử lại.");
    } finally {
      setActionLoading(false);
    }
  };

  if (!token) return null;

  const roleLabel = (role: string) => {
    if (role === "admin") return isVietnamese ? "Quản trị viên (Admin)" : "Admin";
    if (role === "guest") return isVietnamese ? "Khách (Guest)" : "Guest";
    return isVietnamese ? "Thành viên (Member)" : "Member";
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            cleanUrlToken();
            onClose();
          }}
          className="absolute inset-0 modal-backdrop-blur bg-slate-950/60 cursor-pointer"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.94, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.94, y: 15, opacity: 0 }}
          transition={{ type: "spring", stiffness: 360, damping: 28 }}
          className="relative w-[min(95vw,460px)] bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-7 z-10 select-none text-center"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => {
              cleanUrlToken();
              onClose();
            }}
            className="absolute top-4 right-4 min-w-[36px] min-h-[36px] rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {loading ? (
            <div className="py-12 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
              <p className="text-xs font-bold text-slate-400">
                {isVietnamese ? "Đang kiểm tra liên kết lời mời…" : "Validating invitation link…"}
              </p>
            </div>
          ) : error ? (
            <div className="py-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto border border-rose-200/60 dark:border-rose-900/50">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-slate-100">
                  {isVietnamese ? "Liên kết không khả dụng" : "Invitation Unavailable"}
                </h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                  {error}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  cleanUrlToken();
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              >
                {isVietnamese ? "Đóng" : "Close"}
              </button>
            </div>
          ) : invitation ? (
            <div className="space-y-6">
              {/* Workspace Logo Badge */}
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-500/25 uppercase overflow-hidden border border-white/20">
                {invitation.workspace_logo ? (
                  <img src={invitation.workspace_logo} alt={invitation.workspace_name} className="w-full h-full object-cover" />
                ) : (
                  <span>{invitation.workspace_name.charAt(0) || "W"}</span>
                )}
              </div>

              {/* Text info */}
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/50 dark:border-indigo-800/50 text-[11px] font-black text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isVietnamese ? "Lời mời tham gia" : "Workspace Invitation"}</span>
                </div>

                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight pt-1">
                  {invitation.workspace_name}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  {invitation.invited_by_name ? (
                    <>
                      {isVietnamese ? "Được mời bởi" : "Invited by"}{" "}
                      <strong className="text-slate-800 dark:text-slate-200 font-bold">{invitation.invited_by_name}</strong>
                    </>
                  ) : (
                    (isVietnamese ? "Bạn đã nhận được lời mời tham gia không gian này." : "You have been invited to join this workspace.")
                  )}
                </p>
              </div>

              {/* Details card */}
              <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">{isVietnamese ? "Vai trò được cấp:" : "Role granted:"}</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {roleLabel(invitation.role)}
                  </span>
                </div>
                {invitation.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">{isVietnamese ? "Email nhận mời:" : "Target email:"}</span>
                    <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                      {invitation.email}
                    </span>
                  </div>
                )}
                {invitation.expires_at && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10.5px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{isVietnamese ? "Hiệu lực:" : "Valid until:"}</span>
                    </span>
                    <span className={invitation.is_expired ? "text-rose-500 font-bold" : "text-slate-500"}>
                      {new Date(invitation.expires_at).toLocaleDateString(isVietnamese ? "vi-VN" : "en-US")}
                      {invitation.is_expired && (isVietnamese ? " (Đã hết hạn)" : " (Expired)")}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleDecline}
                  className="w-full sm:w-1/3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {isVietnamese ? "Từ chối" : "Decline"}
                </button>

                <button
                  type="button"
                  disabled={actionLoading || invitation.is_expired}
                  onClick={handleAccept}
                  className="w-full sm:w-2/3 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isVietnamese ? "Tham gia không gian" : "Accept & Join"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
