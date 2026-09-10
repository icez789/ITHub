# ITHub Feedback & Research Analytics — Checkpoint 08

> วันที่: 10 กันยายน 2569
>
> Branch: `codex/feedback-research-analytics`
>
> ขอบเขต: branch-scoped environment isolation, protected Vercel Preview และ release verification
>
> สถานะ: technical Preview gate ผ่าน; รอ pilot, manual assistive-technology check และ Production authorization gates

## สรุปผล

สร้างและตรวจ isolated Preview สำเร็จโดยไม่ให้ Git deployment เริ่มก่อนตั้งค่า branch-specific environment ครบ ระบบ Preview ใช้ฐาน `test_e2e` และ secret คนละชุดกับ local/Production จากนั้น full Chromium smoke ผ่าน 11/11, runtime ไม่พบ error/fatal/5xx และฐานทดสอบสะอาดหลังจบ

Production ไม่ถูก migrate, deploy, promote หรือรัน retention ในรอบนี้

## Environment isolation

- Bootstrap branch บน remote โดยปิด Git deployment สำหรับ branch นี้ชั่วคราว; ยืนยันว่า bootstrap push ไม่สร้าง deployment
- ตั้ง variables 29 รายการเฉพาะ branch `codex/feedback-research-analytics` และ target `preview`
- Metadata readback ตรงครบ 29/29: ไม่มี missing, unexpected, duplicate, wrong branch หรือ wrong target
- Vercel จัดประเภทเป็น encrypted 13 รายการและ sensitive 16 รายการ; ไม่มีค่าจริงหรือ secret ถูกบันทึกในเอกสาร
- `DB_NAME=test_e2e`; session, Server Action และ Analytics HMAC secrets เป็นค่า Preview ใหม่แยกกัน
- `ITHUB_E2E_ALLOW_WRITES=false`, retention write flags เป็น `false` และ Pusher/Gemini/Cloudinary ถูกปิดสำหรับ smoke
- หลัง isolation พร้อมแล้วจึงเอา temporary deployment block ออกและ push commit เปิด Preview

## Deployment ที่ใช้ตรวจเต็ม

- Source commit: `ea8dfa5244fe1dba97e4b8d00a672697da200271`
- Deployment ID: `dpl_5f2pGBEohdTp5a3anKgLt6UVCsTx`
- Immutable URL: `https://it-h15ls1bh5-thiraphat-s-projects.vercel.app`
- Branch alias: `https://ithub-git-codex-feedback-research-a-a91a77-thiraphat-s-projects.vercel.app`
- State: `READY`
- Framework/runtime: Next.js, Lambdas, region `iad1`
- Build เสร็จใน 26 วินาที; error-only log ไม่มี build error และมีเพียงคำเตือน dependency allow-scripts
- Vercel Authentication ยังคงเปิดอยู่ ชุดทดสอบใช้ temporary share access โดยไม่ปิด protection และไม่บันทึก token ลง Git

## ผลทดสอบ Preview

Full Chromium smoke ผ่าน 11/11 ใน 4.0 นาที ครอบคลุม:

- API rejection, same-origin/consent security และ payload limits
- Pseudonymous storage, duplicate retry และ consent withdrawal/raw-event deletion
- Client consent gate ก่อนและหลังถอน consent
- Dashboard/export role guards, filter guards, metric suppression และ ZIP allowlist 7 ไฟล์ที่ไม่มี PII
- Guest, member, teacher, admin และ super-admin boundaries
- Evaluation, Feedback, offline retry/deduplication และ Admin feedback triage โดยไม่รั่ว identity
- Super Admin campaign lifecycle `draft -> open -> closed -> locked`
- 5 palettes × Light/Dark และ viewports 375×812 / 1280×800 โดยไม่เกิด horizontal overflow หรือ error overlay

Harness สำหรับ remote Preview เพิ่มข้อจำกัดดังนี้:

- รับเฉพาะ HTTPS immutable ITHub deployment URL และ temporary access URL ที่ origin ตรงกัน
- สร้าง consent ผ่าน Preview UI เพื่อใช้ remote Analytics HMAC secret จริง โดยอ่านกลับเฉพาะ subject key จากฐาน `test_e2e`
- ใช้ timeout และ database polling ที่เหมาะกับ Server Action/cold-start latency โดยไม่ลด assertion ด้านสถานะหรือสิทธิ์
- ลบเฉพาะ application session cookie ระหว่าง role transitions เพื่อคง Vercel Authentication cookie ไว้

## Verification และ cleanup

- `npm.cmd run test:unit` — 79/79 ผ่าน
- `npm.cmd run lint` — ผ่านทั้งโปรเจกต์
- `npm.cmd run build` — ผ่านบน Next.js 16.3.4 จำนวน 25 routes
- Local focused cross-browser verification ก่อนหน้า — 22 ผ่าน และตั้งใจ skip palette matrix 2 ครั้งใน Firefox/WebKit
- Post-smoke `npm.cmd run db:check:e2e` — required tables 11/11 และ integrity counters ทุกค่าเป็น 0
- Fixture cleanup — users 0 และ campaigns 0 สำหรับ prefix ของ research/analytics/dashboard suites
- Runtime status scan — ไม่พบ `error`, `fatal` หรือ `5xx`; `4xx` ที่พบตรงกับ negative authorization, origin, content-type, payload และ conflict tests ตามตั้งใจ

## Commit trail

- `9994c8f` — database/privacy foundation
- `f015498` — Evaluation/Feedback workflows
- `ade8d49` — consent-gated Analytics ingestion
- `b300d94` — Dashboard/export
- `234735a` — rollout verification
- `dffbbc0` — release documentation
- `c990d5a` — isolated Preview preparation
- `ceba970` — safe branch bootstrap
- `ea8dfa5` — isolated Preview deployment enabled

## Release boundary และงานถัดไป

Technical Preview gate ผ่าน แต่ยังไม่ใช่ Production approval งานที่เหลือคือ:

1. ทำ manual NVDA/VoiceOver check และ pilot 5–10 คน
2. ให้อาจารย์ยืนยัน SUS translation, denominator, session/funnel definitions, withdrawal policy, open-text policy และ retention/key ownership
3. ล็อก questionnaire/campaign หลัง pilot
4. ก่อน Production migration/deploy ต้องขออนุญาตแยกรอบ พร้อมยืนยัน target, backup, migration checksum และ restore plan
5. ห้าม promote Preview นี้ไป Production เพราะผูกฐาน `test_e2e`

หากต้อง rollback ก่อน Production ให้ปิด/ลบ branch Preview หรือย้อน application commit โดยไม่แก้ migration 005 ที่เผยแพร่แล้ว และอย่าลบตารางเพื่อ rollback
