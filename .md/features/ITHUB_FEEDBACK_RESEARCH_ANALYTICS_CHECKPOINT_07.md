# ITHub Feedback & Research Analytics — Checkpoint 07

> วันที่: 9 กันยายน 2569
>
> Branch: `codex/feedback-research-analytics`
>
> ขอบเขต: Phase 6 local preparation สำหรับ branch-scoped isolated Preview variables
>
> สถานะ: Preview configuration guard ผ่าน local dry-run; ยังไม่ได้เรียก Vercel API, push หรือ deploy

## สิ่งที่ส่งมอบ

- `scripts/configure-research-preview-branch.mjs` มีสองโหมด:
  - `--dry-run` ตรวจ local project/branch/database/allowlist โดยไม่เรียก Vercel
  - remote write ต้องระบุ Vercel CLI entrypoint และ confirmation token `--confirm-branch-preview-write`
- `scripts/research-preview-config-core.mjs` ล็อก branch `codex/feedback-research-analytics` และ ITHub project/team ที่เชื่อมอยู่
- CLI arguments มี target `preview` และ `--git-branch` แบบคงที่ ไม่มี Production target หรือ branch parameter ให้เปลี่ยน
- Remote path ตรวจ `env ls` ก่อนเสมอและปฏิเสธถ้า branch มี override อยู่แล้ว; ไม่มี `--force` จึงไม่หมุน secret โดยปริยาย
- ฐานต้นทางต้องผ่าน E2E safety guard: ชื่อลงท้าย `_e2e`, environment ไม่ใช่ Production, write opt-in และค่าฐานจริงครบ
- Runtime Preview ถูกตั้งแบบ fail-closed: `ITHUB_E2E_ALLOW_WRITES=false`, retention write flags เป็น `false` และ environment เป็น `preview`

## Variable isolation

Allowlist มี 29 variables:

- Database 5 ค่า จาก isolated `_e2e`; mark เป็น sensitive ทั้งหมด
- `SESSION_SECRET`, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`, `ITHUB_ANALYTICS_SECRET` สุ่มใหม่คนละค่าและห้ามซ้ำกับค่าที่โหลดเข้ามา
- `ITHUB_ANALYTICS_KEY_VERSION=1` และเปิด `ITHUB_DISCOVERY_FOR_YOU_ENABLED=true` เพื่อทดสอบ instrumented personalized-feed flow
- E2E/retention write opt-ins ปิดทั้งหมดใน runtime Preview
- E2E email/username/base URL ถูกแทนด้วยค่าปิดใช้งาน และ E2E password สุ่มใหม่เพื่อไม่ inherit credential ที่ project scope
- Pusher, Gemini และ Cloudinary ใช้ค่าปิดบริการสำหรับ smoke ที่ไม่ต้องพึ่ง provider ภายนอก
- Legacy `PUSHER_KEY`/`PUSHER_CLUSTER` ถูก override เพิ่ม แม้ application runtime ปัจจุบันใช้ `NEXT_PUBLIC_PUSHER_*`

ค่าทุกตัวถูกส่งเข้า Vercel CLI ผ่าน stdin ไม่อยู่ใน command arguments หลักฐาน local เก็บเฉพาะชื่อ variables, branch, ชื่อฐาน E2E, database identity hash, เวลา และสถานะ โดยไม่เก็บ credential หรือ generated secrets

## ผลตรวจ

- Targeted ESLint — ผ่าน
- `node --test tests/unit/research-preview-config.test.mjs` — 4/4 ผ่าน
- `npm.cmd run test:unit` — 77/77 ผ่าน
- `npm.cmd run lint` — ผ่านทั้งโปรเจกต์
- `npm.cmd run build` — ผ่านบน Next.js 16.3.4
- `npm.cmd run preview:research:validate` — ผ่าน:
  - branch: `codex/feedback-research-analytics`
  - database: `test_e2e`
  - variable count: 29
  - status: `validated-local-only`

หลักฐานถูกเขียนที่ `.vercel/release-evidence/research-branch-preview-config.json` ซึ่งถูก ignore จาก Git และไม่มี secret

## Read-only Vercel audit

- Current branch-specific Preview overrides: 0
- Project-level Preview keys: 22
- ทั้ง 22 keys ดังกล่าวมี scope ร่วม `preview` + `production` รวม DB, session, service และ E2E credentials
- Other-branch overrides: 39 และไม่ถูกแตะต้อง

ดังนั้น Git-triggered Preview ของ branch นี้จะเสี่ยง inherit ตัวแปรที่แชร์กับ Production หาก push ก่อนตั้ง override ชุดใหม่ การ push ยังคงถูก block และ audit รอบนี้ไม่มีการแก้ค่าใดบน Vercel

## ขอบเขตถัดไป

ก่อน execute helper จริงต้อง:

1. ตรวจรายการ branch-scoped Preview variables บน Vercel แบบ read-only
2. ขออนุญาตเปลี่ยน environment ภายนอกสำหรับรอบนี้
3. หาก preflight พบ override หรือการตั้งค่าล้มกลางทาง ให้หยุดและทำ recovery plan แยก ห้าม force/rotate เอง
4. อ่านค่ากลับโดยไม่แสดง secret และยืนยันว่าไม่มี Production DB/secret inheritance
5. จึง push เพื่อสร้าง Preview แล้วทำ smoke/accessibility/runtime-log/cleanup checks

ยังไม่มี remote environment mutation, commit push, Preview deployment, Production migration, retention execute หรือ Production deployment จาก checkpoint นี้
