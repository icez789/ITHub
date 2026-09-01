const loadingRows = [0, 1, 2];

export default function Loading() {
  return (
    <section
      data-testid="route-loading-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="ithub-page-container py-5 pb-24 sm:py-6 md:pb-8 lg:py-8"
    >
      <span className="sr-only">กำลังโหลดหน้า</span>

      <div className="animate-pulse motion-reduce:animate-none">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-3 w-24 rounded-full bg-[var(--app-surface-subtle)]" />
            <div className="h-8 w-full max-w-sm rounded-xl bg-[var(--app-surface-subtle)]" />
          </div>
          <div className="hidden h-10 w-32 shrink-0 rounded-xl bg-[var(--app-surface-subtle)] sm:block" />
        </div>

        <div className="ithub-card overflow-hidden p-4 sm:p-5">
          <div className="space-y-3 border-b border-[var(--app-border)] pb-5">
            <div className="h-4 w-28 rounded-full bg-[var(--app-surface-subtle)]" />
            <div className="h-5 w-full max-w-2xl rounded-lg bg-[var(--app-surface-subtle)]" />
            <div className="h-4 w-2/3 max-w-xl rounded-lg bg-[var(--app-surface-subtle)]" />
          </div>

          <div className="divide-y divide-[var(--app-border)]">
            {loadingRows.map((row) => (
              <div key={row} className="flex min-w-0 gap-4 py-5 first:pt-5 last:pb-1">
                <div className="h-10 w-10 shrink-0 rounded-full bg-[var(--app-surface-subtle)]" />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="h-4 w-32 rounded-full bg-[var(--app-surface-subtle)]" />
                  <div className="h-5 w-full max-w-3xl rounded-lg bg-[var(--app-surface-subtle)]" />
                  <div className="h-4 w-4/5 max-w-2xl rounded-lg bg-[var(--app-surface-subtle)]" />
                </div>
                <div className="hidden h-16 w-24 shrink-0 rounded-xl bg-[var(--app-surface-subtle)] sm:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
