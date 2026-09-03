'use client';

import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { ASSIGNABLE_ROLES, roleLabel } from '../lib/roles';

export default function RoleAssignmentForm({ userId, username, initialRole, action }) {
  const [role, setRole] = useState(initialRole);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submitRole(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const formData = new FormData();
      formData.set('userId', String(userId));
      formData.set('role', role);
      const result = await action(formData);
      if (result?.success === false) setError(result.message || 'เปลี่ยนสิทธิ์ไม่สำเร็จ');
    } catch (submitError) {
      console.error('Role assignment failed:', submitError);
      setError('เปลี่ยนสิทธิ์ไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submitRole} className="flex items-center gap-1.5">
      <label className="sr-only" htmlFor={`role-${userId}`}>สิทธิ์ของ {username}</label>
      <select
        id={`role-${userId}`}
        name="role"
        value={role}
        disabled={pending}
        onChange={(event) => setRole(event.target.value)}
        className="rounded border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1.5 text-xs text-[var(--app-text)] disabled:opacity-60"
      >
        {ASSIGNABLE_ROLES.map((optionRole) => (
          <option key={optionRole} value={optionRole}>{roleLabel(optionRole)}</option>
        ))}
      </select>
      <button disabled={pending} className="inline-flex min-w-24 items-center justify-center gap-1 rounded border border-[var(--app-border)] px-3 py-1.5 text-xs transition hover:bg-[var(--app-surface-subtle)] disabled:cursor-wait disabled:opacity-60">
        {pending ? <LoaderCircle aria-hidden="true" size={13} className="animate-spin motion-reduce:animate-none" /> : null}
        {pending ? 'กำลังบันทึก…' : 'บันทึกสิทธิ์'}
      </button>
      {error ? <span role="alert" className="sr-only">{error}</span> : null}
    </form>
  );
}
