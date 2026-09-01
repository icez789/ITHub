'use client';

import { ShieldCheck, Undo2 } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

export default function UserBanButton({ action, userId, username, isBanned, className = '' }) {
  async function updateAccountStatus() {
    const formData = new FormData();
    formData.set('userId', String(userId));
    return action(formData);
  }

  return <ConfirmDialog
    trigger={<span className="inline-flex items-center gap-1.5">{isBanned ? <Undo2 aria-hidden="true" size={14} /> : <ShieldCheck aria-hidden="true" size={14} />}{isBanned ? 'ปลดระงับ' : 'ระงับ'}</span>}
    triggerAriaLabel={`${isBanned ? 'ปลดระงับ' : 'ระงับ'}บัญชี ${username}`}
    triggerClassName={className}
    title={`${isBanned ? 'ปลดระงับ' : 'ระงับ'}บัญชี “${username}”?`}
    description={isBanned ? 'บัญชีนี้จะกลับมาเข้าสู่ระบบและใช้งานชุมชนได้' : 'Session ปัจจุบันของบัญชีนี้จะหมดผล และจะไม่สามารถเข้าสู่ระบบได้จนกว่าจะปลดระงับ'}
    confirmLabel={isBanned ? 'ยืนยันการปลดระงับ' : 'ยืนยันการระงับ'}
    pendingLabel="กำลังบันทึก…"
    onConfirm={updateAccountStatus}
    testId="confirm-user-status-dialog"
  />;
}
