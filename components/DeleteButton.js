'use client';

import ConfirmDialog from './ConfirmDialog';

export default function DeleteButton({
  action,
  id,
  idName,
  reportId,
  className,
  children,
  ariaLabel = 'ลบข้อมูล',
  title = 'ยืนยันการลบข้อมูล?',
  description = 'ข้อมูลนี้และรายการที่เกี่ยวข้องจะถูกลบถาวร การกระทำนี้ไม่สามารถย้อนกลับได้',
  successMessage = 'ลบข้อมูลสำเร็จ',
}) {
  async function submitDelete() {
    const formData = new FormData();
    formData.set(idName, String(id));
    if (reportId) formData.set('reportId', String(reportId));
    return action(formData);
  }

  return (
    <ConfirmDialog
      trigger={children}
      triggerAriaLabel={ariaLabel}
      triggerClassName={className}
      title={title}
      description={description}
      successMessage={successMessage}
      onConfirm={submitDelete}
    />
  );
}
