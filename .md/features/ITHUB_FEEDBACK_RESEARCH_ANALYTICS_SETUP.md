# ITHub Feedback & Research Analytics — Setup and Release Runbook

> วันที่: 10 กันยายน 2569
>
> Branch: `codex/feedback-research-analytics`
>
> สถานะ: ฟีเจอร์, local verification, isolated Vercel Preview verification และชุดดำเนิน Pilot พร้อมแล้ว; ยังไม่ทำ pilot, migrate/deploy Production หรือ execute retention

## 1. ขอบเขตข้อมูล

ระบบแยกช่องทางออกจากกันอย่างชัดเจน:

1. Evaluation — SUS 10 ข้อ, งานทดลอง 5 งาน และข้อความปลายเปิด
2. Feedback — ปัญหา UX/UI, บัค, ข้อเสนอแนะ และสถานะติดตาม
3. Research Analytics — event allowlist แบบ opt-in เท่านั้น

TiDB/MySQL เป็นแหล่งข้อมูลวิจัยหลัก ส่วน Vercel Analytics ใช้ดู Page View/ผู้เยี่ยมชมภาพรวมและไม่ใช่แหล่งของ Dashboard หรือ ZIP บทที่ 4–5

## 2. สิทธิ์

| งาน | Member | Teacher | Admin | Super Admin |
| --- | --- | --- | --- | --- |
| ตอบ/ถอน Evaluation ของตน | ได้ | ได้ในฐานะสมาชิก | ได้ในฐานะสมาชิก | ได้ในฐานะสมาชิก |
| ส่ง/ดูสถานะ Feedback ของตน | ได้ | ได้ | ได้ | ได้ |
| ยินยอม/ถอน Research Analytics ของตน | ได้ | ได้ | ได้ | ได้ |
| Triage Feedback | ไม่ได้ | ไม่ได้ | ได้ | ได้ |
| ดู Dashboard/ดาวน์โหลด aggregate ZIP | ไม่ได้ | ไม่ได้ | ได้ | ได้ |
| สร้าง/เปลี่ยนสถานะ campaign | ไม่ได้ | ไม่ได้ | ไม่ได้ | ได้ |

ทุก mutation และ export ตรวจ session/role ฝั่ง server ซ้ำ ไม่อาศัยการซ่อนปุ่มใน UI

## 3. Environment ที่ต้องมี

อย่าใส่ค่าจริงในเอกสาร, issue, screenshot หรือ Git

- ฐานข้อมูล: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- Application security: `SESSION_SECRET`, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`
- Research privacy: `ITHUB_ANALYTICS_SECRET` เป็นคีย์เฉพาะอย่างน้อย 32 ตัวอักษร และ `ITHUB_ANALYTICS_KEY_VERSION`
- E2E guard: `ITHUB_E2E_ALLOW_WRITES=true`, `ITHUB_E2E_ENVIRONMENT=e2e` และบัญชีสังเคราะห์ครบ
- Retention execute: `ITHUB_RESEARCH_RETENTION_ALLOW_WRITES=true` เฉพาะรอบที่อนุมัติ
- Production retention execute: ต้องเพิ่ม `ITHUB_RESEARCH_RETENTION_ALLOW_PRODUCTION=true`

ข้อกำหนดสำคัญ:

- `.env.e2e.local` ต้องถูก Git ignore และ `DB_NAME` ต้องลงท้าย `_e2e`
- E2E, Preview และ Production ต้องใช้ฐาน, session key, Server Action key และ Analytics HMAC secret คนละชุด
- อย่าใช้ `SESSION_SECRET` หรือ `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` ซ้ำเป็น `ITHUB_ANALYTICS_SECRET`
- การเปลี่ยน `ITHUB_ANALYTICS_KEY_VERSION` ต้องมาพร้อมแผนหมุนคีย์/retention ที่อนุมัติแล้ว เพราะข้อมูลเดิมใช้ key version เดิม

## 4. เตรียมฐาน E2E แบบแยก

จาก repository root:

```powershell
npm.cmd run e2e:setup
npm.cmd run db:create:e2e
npm.cmd run db:preflight:e2e
npm.cmd run db:migrate:e2e
npm.cmd run db:seed:e2e
npm.cmd run db:check:e2e
```

Safety guard ต้องหยุดคำสั่งก่อนเชื่อมต่อ/เขียน หากฐานไม่ลงท้าย `_e2e`, environment เป็น Production, write opt-in ไม่ครบ หรือบัญชีทดสอบไม่พร้อม

## 5. ชุดตรวจ local

```powershell
npm.cmd run lint
npm.cmd run test:unit
npm.cmd run build
npm.cmd run test:research:migrations:e2e
npm.cmd run test:research:consent:e2e
npm.cmd run test:research:workflows:e2e
npm.cmd run test:research:retention:e2e
npm.cmd run test:research:metrics-performance:e2e
npm.cmd run test:e2e -- tests/research.spec.js tests/research-analytics.spec.js tests/research-dashboard.spec.js
npm.cmd run db:check:e2e
```

Playwright ใช้ฐานร่วมและรันแบบ serial จนกว่าจะมี per-worker database isolation การเปิด workers เพิ่มเองอาจทำให้ fixture ของแต่ละเคสลบกัน

Performance fixture สร้าง 100,000 events เฉพาะฐาน `_e2e` และต้อง cleanup campaign/user หลังทดสอบ

## 6. เปิด campaign นำร่อง

ก่อนเปิดรับข้อมูลจริง ต้องยืนยันกับอาจารย์/เจ้าของงาน:

- ข้อความ SUS ไทย–อังกฤษและ `questionnaire_version`
- controlled vocabulary ของ respondent type, experience และ primary device
- จำนวนผู้มีสิทธิ์ตอบและเวลาที่ snapshot denominator
- session inactivity 30 นาที, sample standard deviation และนิยาม observed task
- กติกาตอบใหม่หลังถอน Evaluation
- วันสิ้นสุดโครงการ, `retention_until`, retention owner และรอบ cleanup
- HMAC key owner และแผนหมุนคีย์

Lifecycle เป็นทางเดียว:

```text
draft -> open -> closed -> locked
```

- ใช้ `data_scope=pilot` จนกว่ารายการข้างต้นจะอนุมัติ
- ทดลองกับ 5–10 คนโดยใช้บัญชี/campaign ที่ติดป้ายและ cleanup ได้
- ห้ามนำ fixture, คำตอบจำลอง หรือผล pilot ไปปะปนกับรอบวิจัยจริง
- หลังตรวจคำถามและผล pilot แล้วจึงสร้าง/ยืนยัน campaign จริงและล็อกเมื่อเก็บข้อมูลเสร็จ

## 7. Consent และการถอน

- Client ไม่สร้าง research session หรือส่ง event ก่อน consent
- Server ตรวจ active consent ภายใน transaction เดียวกับ event insert
- การถอน consent เปลี่ยนสถานะก่อนลบ raw events ภายใต้ row lock และปิด client gate
- การถอน Evaluation ล้าง demographics, SUS, task results และ open text เหลือ tombstone ขั้นต่ำเพื่อคงกติกาการตอบซ้ำ
- Feedback ทั่วไปไม่ถือเป็น consent ให้ Research Analytics และการปฏิเสธ Analytics ไม่ลดสิทธิ์ใช้งาน

## 8. Retention

ตรวจแบบไม่ลบข้อมูลก่อนเสมอ:

```powershell
npm.cmd run research:retention
npm.cmd run research:retention:e2e
```

เกณฑ์ปัจจุบัน:

- Raw Analytics: ลบเมื่อเก่ากว่า 180 วัน
- Evaluation: ลบเมื่อถึง `campaign.retention_until`
- Feedback ที่ผูก campaign: ใช้ deadline ของ campaign
- Feedback ทั่วไป: 365 วัน

เมื่อตรวจ backup, target, UTC cutoff และ dry-run แล้ว และได้รับอนุญาตเฉพาะรอบ จึงเปิด write opt-in และรัน:

```powershell
node --env-file-if-exists=.env scripts/research-retention.mjs --execute
```

Production ต้องมี opt-in ชั้นที่สอง `ITHUB_RESEARCH_RETENTION_ALLOW_PRODUCTION=true` การ execute ทำใน transaction เดียวและ rollback หากการลบกลุ่มใดล้มเหลว แต่ backup/restore plan ยังเป็นข้อบังคับก่อนรัน

## 9. Preview gate และรอบที่ตรวจผ่านแล้ว

ทุกครั้งที่สร้าง branch Preview ใหม่ต้องตรวจครบก่อนเปิด Git deployment:

- สร้าง variables แบบ branch-scoped สำหรับ `codex/feedback-research-analytics`
- `DB_NAME` ชี้ฐาน `test_e2e` หรือฐาน isolated ที่ชื่อลงท้าย `_e2e`; ห้าม inherit Production database variables
- ใช้ session/action/analytics secrets ชุด Preview โดยเฉพาะ
- ตั้ง `ITHUB_E2E_ALLOW_WRITES=false` และ `ITHUB_E2E_ENVIRONMENT=preview` ใน runtime Preview
- ปิด/จำกัด Pusher, Cloudinary และ Gemini หากไม่จำเป็นต่อ smoke
- ตรวจ project/team/branch target ก่อนบันทึกค่า และอ่านค่ากลับโดยไม่แสดง secret

ตรวจ guard แบบ local-only ก่อน คำสั่งนี้อ่าน project/ฐาน E2E, สร้างหลักฐานที่ไม่มีค่า secret และไม่เรียก Vercel:

```powershell
npm.cmd run preview:research:validate
```

ผลที่คาดหวังคือ branch `codex/feedback-research-analytics`, ฐานที่ลงท้าย `_e2e`, ตัวแปร allowlist 29 รายการ และสถานะ `validated-local-only`

ก่อนเขียนค่าจริง ให้ตรวจรายการ branch-scoped variables ที่มีอยู่บน Vercel เมื่อได้รับอนุญาตให้เปลี่ยนค่าบน Vercel แล้วเท่านั้น ให้ส่ง path ของ Vercel CLI entrypoint พร้อม confirmation token เข้า helper:

```powershell
node --env-file-if-exists=.env.e2e.local scripts/configure-research-preview-branch.mjs <path-to-vercel-cli-entrypoint> --confirm-branch-preview-write
```

Helper นี้ล็อก project/team/branch, รับเฉพาะ target `preview`, ส่งค่าผ่าน stdin, สร้าง session/action/analytics secrets และ disabled E2E password ใหม่คนละค่า, ปิด E2E/retention writes, override legacy Pusher/E2E variables ที่อาจ inherit จาก project scope และไม่พิมพ์ค่า sensitive ลงหลักฐาน

ก่อนเขียนค่า helper จะเรียก `env ls` แบบ metadata-only และปฏิเสธหาก branch มี override แม้แต่รายการเดียว คำสั่งภายในใช้ `--force` เฉพาะเพื่อสร้าง branch override ที่มีชื่อซ้ำกับ project-level variable หลัง preflight ยืนยันว่า branch ยังว่าง จึงไม่ใช่การอนุญาตให้หมุนค่าของ branch ที่ตั้งไว้แล้ว หากรอบก่อนล้มกลางทาง ให้หยุด ตรวจ partial overrides และวางแผน recovery แยก; ห้ามลบ/ทับหรือเพิ่ม key version เอง ส่วน `scripts/configure-discovery-preview-branch.mjs` ยังคงล็อกไว้สำหรับ branch Discovery เดิมและห้ามใช้กับ release นี้

หลัง Preview พร้อม ให้ตรวจ guest/member/teacher/admin/super-admin, consent/evaluation/feedback, Dashboard/export, 375×812 และ 1280×800, keyboard/assistive technology, runtime error logs และ `db:check:e2e` หลัง cleanup ห้าม promote Preview ที่ผูก E2E ไป Production

รอบที่ตรวจเมื่อ 10 กันยายน 2569:

- ตั้ง branch-scoped Preview variables ครบ 29 รายการบน `codex/feedback-research-analytics`; metadata readback ตรง branch/target ทุกค่าและไม่มีรายการขาด เกิน หรือซ้ำ
- ใช้ฐาน `test_e2e`, Preview-only secrets และปิด E2E/retention writes กับบริการภายนอกที่ไม่จำเป็น
- Preview จาก source commit `ea8dfa5` อยู่สถานะ READY และยังเปิด Vercel Authentication
- การทดสอบ protected Preview ใช้ temporary share URL เฉพาะ process; ห้ามบันทึก token ลง `.env`, Git, checkpoint หรือ test output
- Chromium smoke ผ่าน 11/11; build/runtime ไม่พบ error/fatal/5xx; post-smoke database check และ fixture cleanup ผ่าน
- รายละเอียด deployment, counts และข้อจำกัดอยู่ใน Checkpoint 08; manual NVDA/VoiceOver และ pilot ยังเป็น gate ถัดไป

## 10. Export และการจัดการไฟล์

- ZIP มีเฉพาะ 7 ไฟล์ใน allowlist และสร้างจาก metric DTO เดียวกับ Dashboard
- ไม่มี name, email, username, user ID, pseudonym, raw event ID, internal note หรือ open text
- CSV ใช้ UTF-8 BOM, RFC 4180 และ formula-injection guard
- กลุ่ม `n < 5` ถูก suppress หลังใช้ filter และอาจ suppress breakdown ทั้งชุดเพื่อป้องกัน subtraction inference
- ไฟล์ที่ดาวน์โหลดแล้วอยู่นอกการควบคุมของระบบ ให้จัดเก็บ/แชร์ตามผู้รับที่อนุมัติและลบทิ้งเมื่อหมดความจำเป็น

## 11. Rollback boundary

- ก่อน Production migration: rollback ได้ด้วยการย้อน application commits โดยยังไม่มี schema/data จริงต้องเปลี่ยน
- หลัง migration 005: migration เป็น additive ให้ย้อน app ได้โดยคงตารางไว้ ห้าม `DROP TABLE` หรือแก้ migration ที่เผยแพร่แล้วเป็นวิธีย้อนกลับ
- หากพบปัญหาระหว่าง pilot ให้ปิด campaign จาก `open` เป็น `closed`; อย่าแก้กลับไปสถานะก่อนหน้า
- หาก consent/privacy ผิดปกติ ให้หยุด ingest ก่อน ตรวจ audit แบบ aggregate แล้วใช้ withdrawal/retention ตามขอบเขตที่อนุมัติ
- Production migration/deploy/retention execute ต้องได้รับอนุญาตแยกรอบ พร้อม target, backup, checksum, restore plan และหลักฐานหลังดำเนินการ

## 12. เอกสารหลักฐาน

- แผน: [`ITHUB_FEEDBACK_RESEARCH_ANALYTICS_PLAN.md`](./ITHUB_FEEDBACK_RESEARCH_ANALYTICS_PLAN.md)
- เช็กลิสต์: [`ITHUB_FEEDBACK_RESEARCH_ANALYTICS_CHECKLIST.md`](./ITHUB_FEEDBACK_RESEARCH_ANALYTICS_CHECKLIST.md)
- Data/privacy contract: [`ITHUB_FEEDBACK_RESEARCH_ANALYTICS_DATA_CONTRACT.md`](./ITHUB_FEEDBACK_RESEARCH_ANALYTICS_DATA_CONTRACT.md)
- Pilot runbook: [`ITHUB_FEEDBACK_RESEARCH_ANALYTICS_PILOT_RUNBOOK.md`](./ITHUB_FEEDBACK_RESEARCH_ANALYTICS_PILOT_RUNBOOK.md)
- Checkpoint ล่าสุด: [`ITHUB_FEEDBACK_RESEARCH_ANALYTICS_CHECKPOINT_09.md`](./ITHUB_FEEDBACK_RESEARCH_ANALYTICS_CHECKPOINT_09.md)
- Visual decision: [`../design/2026-09-09_RESEARCH_ANALYTICS_DASHBOARD.md`](../design/2026-09-09_RESEARCH_ANALYTICS_DASHBOARD.md)
