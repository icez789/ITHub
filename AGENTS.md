<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project review handoff

Before changing ITHub, read `REVIEW_REPORT_FOR_AGENTS.md` at the repository root. It contains the 2026-08-13 UX/UI, backend, security, test evidence, prioritized defects, and workspace-hygiene notes.

## Git publishing policy

After completing and verifying any feature, always commit the scoped changes and push the current feature branch to `origin`. Treat commit and push as required final steps unless the user explicitly says not to publish or GitHub authentication/remote access is unavailable. Never stage unrelated workspace files or user-owned artifacts.
