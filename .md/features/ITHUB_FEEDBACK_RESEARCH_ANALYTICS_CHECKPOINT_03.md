# ITHub Feedback & Research Analytics — Checkpoint 03

> สถานะ: Phase 2 Evaluation/Feedback ผ่าน local verification
>
> Branch: `codex/feedback-research-analytics`
>
> วันที่: 8 กันยายน 2569

## ผลลัพธ์

- เพิ่ม `server-only` data layer และ Server Actions ที่ตรวจ session/role ซ้ำทุก mutation
- สมาชิกใช้ `/feedback` เพื่อส่งแบบประเมินนำร่อง, ส่ง Feedback, ดูสถานะของตน และจัดการ Research Analytics consent แยกจากกัน
- SUS 10 ข้อและงานทดลอง 5 งานผ่าน validation ฝั่ง server; คะแนน SUS คำนวณจากคำตอบต้นทางฝั่ง server
- แบบประเมินตอบได้หนึ่งครั้งต่อ campaign ด้วย unique constraint และ client submission UUID
- การถอนแบบประเมินใช้ค่าเริ่มต้นแบบ tombstone: คงสถานะ/เวลา แต่ล้าง demographics, SUS, task results และข้อความปลายเปิด และยังไม่อนุญาตตอบซ้ำ
- Admin/Super Admin ใช้ `/admin/feedback` เพื่อ triage โดย DTO และ audit metadata ไม่เปิดเผยตัวระบุสมาชิกหรือ internal note
- Super Admin ใช้ `/admin/analytics` เพื่อสร้าง/แก้ draft และเดิน lifecycle `draft → open → closed → locked`; Admin อ่านรายการได้แต่แก้ campaign ไม่ได้
- เปิดได้เฉพาะ campaign `pilot` ที่ใช้ questionnaire version `sus-th-pilot-v1`; ข้อความยังเป็นฉบับนำร่องและต้องให้อาจารย์รับรองก่อนเก็บข้อมูลจริง
- Analytics consent ตรวจ acknowledgement ซ้ำและกำหนด notice version ฝั่ง server จึงไม่เชื่อค่าที่แก้ได้จาก hidden field; campaign opening ล็อกทั้ง questionnaire และ evaluation-notice version ที่ UI รองรับ

## Authorization matrix ที่ตรวจแล้ว

| งาน | Member | Teacher | Admin | Super Admin |
| --- | --- | --- | --- | --- |
| ส่ง/ถอน Evaluation และส่ง Feedback ของตน | ได้ | ได้ในฐานะสมาชิก | ได้ในฐานะสมาชิก | ได้ในฐานะสมาชิก |
| ดู/triage Feedback ฝั่งผู้ดูแล | ไม่ได้ | ไม่ได้ | ได้ | ได้ |
| ดู campaign management page | ไม่ได้ | ไม่ได้ | อ่านได้ | อ่านได้ |
| สร้าง/แก้/เปลี่ยนสถานะ campaign | ไม่ได้ | ไม่ได้ | ไม่ได้ | ได้ |

ทุก Server Action เรียก guard ใน DAL อีกครั้ง ไม่พึ่งเฉพาะการซ่อนปุ่มหรือ page redirect การทดสอบ replay คำสั่ง triage เดิมหลังลด role เป็น `user`, `teacher` และล้าง session เป็น guest ยืนยันว่าไม่มี mutation/audit เพิ่มและ internal note ไม่อยู่ใน response อีกชุดคงปุ่มสร้าง campaign จากหน้าเดิมไว้แล้วลด role เป็น `user`, `teacher`, `admin` เพื่อยืนยันว่า server ยังปฏิเสธก่อนคืน role เป็น `super_admin`

## Verification evidence

| กรณี | ผล |
| --- | --- |
| Unit tests รวม | ผ่าน 49/49 |
| Workflow database smoke | ผ่าน campaign, duplicate/idempotency, withdrawal tombstone, Feedback triage/audit และ cleanup |
| Chromium Phase 2 E2E | ผ่าน 4/4 |
| Chromium + Firefox + WebKit | ผ่าน 12/12 แบบ serial บน isolated `_e2e` |
| Responsive visual | 375×812 Light และ 1280×800 Dark ครบ 3 browser engines; ไม่พบ horizontal overflow/error overlay |
| Direct admin action replay | guest/user/teacher ถูกปฏิเสธโดยไม่มี mutation หรือ PII canary ใน response/audit |
| Consent bypass | ถอด browser `required` แล้วส่งโดยไม่ติ๊กถูกปฏิเสธ และไม่เกิด consent row |
| Fixture cleanup | campaign prefix `research-ui-%` = 0 และ user prefix `playwright.research.%` = 0 |
| Production build ใน E2E runner | ผ่านบน Next.js 16.3.4; routes ใหม่ถูกสร้างครบ |

ระหว่าง Playwright มี server log `destination stream closed early`/`ECONNRESET` บางครั้งตรงจังหวะ intentional redirect หรือปิด page context แต่ทั้ง request outcome, DOM, database assertion และ error-overlay assertion ผ่านครบ จึงบันทึกเป็น non-blocking test-runner noise สำหรับติดตาม ไม่ใช่หลักฐานว่า runtime flow ล้มเหลว

## ขอบเขตและความเป็นส่วนตัว

- Member DTO ผูก ownership จาก session และไม่คืน `user_id`, อีเมล, username, open text หรือ internal note
- Admin Feedback DTO มีเนื้อหาที่ต้องใช้ triage แต่ไม่มีตัวระบุสมาชิก
- Route ของ Feedback ถูก normalize เป็น same-site pathname และตัด query/hash ฝั่ง server
- Research Analytics ยังเป็น opt-in แยกต่างหาก; Phase 2 ทำ consent UI/transaction แต่ยังไม่เพิ่ม event ingestion
- ไม่มีการสร้างข้อมูลจำลองหรือแก้ migration/ข้อมูลบน Production

## ขอบเขตถัดไป

Phase 3 คือ consent-gated Analytics ingestion: authenticated same-origin Route Handler, payload/batch limits, event/property allowlist, server-derived pseudonym/session key, idempotent retry, rate limit และ PII canary tests จากนั้นจึงทำ Phase 4 metrics/Dashboard/export

Decision gates เรื่องคำแปล SUS, controlled vocabulary, denominator, session definition, withdrawal policy, notice version, retention owner/deadline และ ZIP strategy ยังเปิดอยู่ ระบบจึงต้องคง `pilot` เท่านั้น

ยังไม่ได้สร้าง Preview, แตะ Production, deploy หรือ push และต้องเพิ่ม branch-scoped Preview guard/isolated variables ก่อน push ครั้งแรก
