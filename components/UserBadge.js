import { Code2, Crown, GraduationCap, Rocket, ShieldCheck, Sprout } from 'lucide-react';

export default function UserBadge({ role, xp = 0 }) {
  if (role === 'admin' || role === 'super_admin') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        <ShieldCheck aria-hidden="true" size={11} /> Admin
      </span>
    );
  }

  if (role === 'teacher') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
        <GraduationCap aria-hidden="true" size={11} /> อาจารย์
      </span>
    );
  }

  let label = 'สมาชิกใหม่';
  let Icon = Sprout;
  let color = 'border-[var(--app-border)] bg-[var(--app-surface-subtle)] text-[var(--app-text-muted)]';

  if (xp >= 500) {
    label = 'Tech Lead';
    Icon = Crown;
    color = 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300';
  } else if (xp >= 200) {
    label = 'Senior Dev';
    Icon = Rocket;
    color = 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300';
  } else if (xp >= 50) {
    label = 'Junior Dev';
    Icon = Code2;
    color = 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300';
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${color}`}>
      <Icon aria-hidden="true" size={11} /> {label}
      <span className="opacity-60">{xp} XP</span>
    </span>
  );
}
