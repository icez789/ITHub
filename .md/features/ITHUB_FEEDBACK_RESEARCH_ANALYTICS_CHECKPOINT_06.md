# ITHub Feedback & Research Analytics — Checkpoint 06

> วันที่: 9 กันยายน 2569
>
> Branch: `codex/feedback-research-analytics`
>
> ขอบเขต: Phase 5 accessibility, failure/retry UX, palette matrix และ release documentation
>
> สถานะ: Phase 1–5 และ local verification ผ่าน; Preview/Pilot/Production gates ยังไม่ผ่าน

## สิ่งที่ส่งมอบ

- เพิ่ม feedback pattern กลางสำหรับ Server Action ที่มี pending state, persistent live region, error focus และข้อความ offline ที่ไม่ล้าง draft
- Evaluation, Feedback, consent, withdrawal, campaign และ triage forms มี accessible name, description และ `aria-busy`
- เพิ่ม nested error boundary ที่ `/feedback` และ `/admin/analytics` พร้อมย้าย focus ไปหัวข้อข้อผิดพลาด, retry state และทางกลับหน้าแรก
- ตารางกว้างของ Dashboard เป็น keyboard-focusable region มีชื่อและ visible focus โดยยังเลื่อนแนวนอนภายใน container
- ลิงก์ export ระบุชัดว่าเป็น ZIP aggregate-only จำนวน 7 ไฟล์
- อัปเดต Privacy Policy, Terms, root README, `.env.example` และ setup/release runbook โดยไม่ใส่ secret จริง

Phase 5 code อยู่ใน commit `234735a` (`test: verify feedback research analytics rollout`) ต่อจาก commits:

- `9994c8f` — database/privacy core
- `f015498` — Evaluation/Feedback workflows
- `ade8d49` — consent-gated Analytics ingestion
- `b300d94` — Dashboard และ aggregate export

## Accessibility และ UX evidence

- Chromium ตรวจ 5 palettes (`classic`, `ocean`, `forest`, `violet`, `amber`) × Light/Dark × 2 surfaces รวม 20 screenshots
- ตรวจด้วยตาครบ Dashboard 10 ภาพและตัวแทนหน้า Feedback 6 ภาพ ไม่พบการซ้อน, ตัดขอบ หรือ hierarchy ที่อ่านไม่ออก
- token pairs สำคัญ ได้แก่ text/muted/accent/primary/status เทียบ surface ผ่าน contrast assertion อย่างน้อย 4.5:1 ทุก palette/mode
- Chromium, Firefox และ WebKit ผ่าน accessible roles/names ของ form, fieldset/legend, filter, table/caption, live region และ export description
- keyboard order จากข้อมูลกลุ่มตัวอย่าง, focus outline อย่างน้อย 2 px และ focus restoration ไป error ผ่าน automation
- การทดสอบนี้ยืนยัน semantic flow ที่ assistive technology ใช้ แต่ยังไม่ได้ทำ manual NVDA/VoiceOver; ต้องทำเพิ่มใน Preview/pilot กับผู้ใช้จริง

## Failure, retry และ idempotency evidence

- เมื่อ browser offline การส่ง Feedback ถูกหยุดฝั่ง client, แจ้ง error แบบ focusable และคงค่าที่กรอกไว้; ฐานข้อมูลยังมี 0 row
- หลัง reconnect ผู้ใช้กดปุ่มเดิมเพื่อ retry ได้
- ระหว่าง request ค้าง ปุ่มแสดง pending/disabled; การเรียก `requestSubmit()` ซ้ำยังเหลือ Feedback เพียง 1 row จาก server-side idempotency
- consent acknowledgement error ใช้ assertive live region, ผูกกับ form และรับ focus
- route-level error UI มี retry ที่แสดงสถานะกำลังทำงานและไม่เปิดเผย arbitrary error; แสดงเฉพาะ framework digest หากมี

## ผลตรวจ

- `npm.cmd run lint` — ผ่านทั้งโปรเจกต์
- `npm.cmd run test:unit` — 73/73 ผ่าน
- `npm.cmd run build` — ผ่านบน Next.js 16.3.4
- Focused Chromium + WebKit — 15 passed, 1 skipped; `.last-run.json` ระบุ `passed` และไม่มี failed test
- Focused Firefox clean rerun — 7 passed, 1 skipped
- รวม clean cross-browser reruns — 22 passed, 2 skipped; palette matrix ข้ามใน Firefox/WebKit โดยตั้งใจเพราะรันครบหนึ่งรอบบน Chromium ส่วน functional/accessibility checks ยังรันทุก engine
- `npm.cmd run db:check:e2e` — application tables 11/11 และ integrity counters ทุกค่าเป็น 0
- หลังทดสอบ: fixture users ของ `playwright.research.*`/`playwright.dashboard.*` และ campaigns ของ `research-ui-*`/`research-dashboard-*` เหลือ 0

รอบ all-engine ครั้งแรกพบ Firefox protocol error ตอนปิด `browserContext` หลัง assertions ผ่าน และมี `ECONNRESET`/`destination stream closed early` เป็นครั้งคราวระหว่าง intentional redirect/download จาก Next.js test server เมื่อแยกรัน Firefox ใหม่ผ่านครบและ cleanup เป็นศูนย์ จึงจัดเป็น test-runner noise ไม่ใช่ product failure

## Privacy/documentation evidence

- Privacy อธิบายสามช่องทางที่เป็นอิสระ, opt-in purpose, event categories, HMAC pseudonym, ข้อมูลที่ห้ามเก็บ, retention, withdrawal, processors และช่องทางติดต่อ
- Terms ระบุความสมัครใจ ผลของการถอน และสถานะ pilot ที่ยังไม่ใช่แบบสอบถามวิจัยฉบับล็อก
- README แยก TiDB research source of truth ออกจาก Vercel Analytics ภาพรวม และบันทึก environment/test/retention commands
- Setup runbook กำหนด E2E/Preview isolation, role matrix, pilot lifecycle, retention guard, export handling และ rollback boundary
- Threat table อัปเดตหลักฐาน PII, ZIP round-trip และ subgroup suppression จาก Phase 4 แล้ว

## ขอบเขตที่ยังไม่ปิด

- ตั้ง branch-scoped isolated Preview variables และยืนยันว่าไม่ inherit Production ก่อน push ครั้งแรก
- Preview smoke, runtime log scan และ manual NVDA/VoiceOver หรือ assistive-technology check
- Pilot 5–10 คนและการรับรอง questionnaire translation/version, controlled demographics, eligible denominator, session definition และ sample SD
- ยืนยัน retention owner/deadline และ HMAC key rotation owner
- Production backup/checksum/restore authorization, migration, deploy และ post-deploy smoke

ยังไม่มีการ push, Preview deployment, Production migration, retention execute หรือ Production deployment จาก checkpoint นี้
