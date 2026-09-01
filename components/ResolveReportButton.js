'use client';

import { useState, useTransition } from 'react';
import { Eye, LoaderCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ResolveReportButton({ action, reportId }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function resolveReport() {
    if (isPending) return;
    setError('');
    const formData = new FormData();
    formData.set('reportId', String(reportId));
    startTransition(async () => {
      try {
        const result = await action(formData);
        if (!result?.success) {
          setError(result?.message || 'ปิดรายงานไม่สำเร็จ กรุณาลองใหม่');
          return;
        }
        toast.success(result.message || 'ปิดรายงานแล้ว');
      } catch (actionError) {
        console.error('Resolve report action failed:', actionError);
        setError('ปิดรายงานไม่สำเร็จ กรุณาลองใหม่');
      }
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        aria-label="ปิดรายงานโดยไม่ลบเนื้อหา"
        aria-describedby={error ? `resolve-report-error-${reportId}` : undefined}
        disabled={isPending}
        onClick={resolveReport}
        className="rounded-lg bg-gray-100 p-2 text-gray-600 transition hover:bg-gray-200 disabled:cursor-wait disabled:opacity-60 dark:bg-neutral-700 dark:text-gray-300 dark:hover:bg-neutral-600"
        title="ปิดรายงาน"
      >
        {isPending ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" size={16} /> : <Eye aria-hidden="true" size={16} />}
      </button>
      {error ? <span id={`resolve-report-error-${reportId}`} role="alert" className="max-w-48 text-right text-xs text-red-600 dark:text-red-300">{error}</span> : null}
    </span>
  );
}
