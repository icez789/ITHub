# ITHub Feedback & Research Analytics — Checkpoint 02

> สถานะ: Phase 1 retention cleanup และ safe audit logging ผ่านการตรวจรับ
>
> Branch: `codex/feedback-research-analytics`
>
> วันที่: 8 กันยายน 2569

## ผลลัพธ์

- เพิ่ม retention core ที่ใช้เวลาจาก `UTC_TIMESTAMP(3)` ของฐานข้อมูลเพียงจุดเดียวต่อ transaction
- Raw Analytics หมดอายุเมื่อ `received_at` เก่ากว่า 180 วันแบบ exclusive
- Evaluation หมดอายุตาม `evaluation_campaigns.retention_until <= as-of`
- Feedback หมดอายุตาม `feedback_submissions.retention_until <= as-of`
- Dry-run เป็นค่าเริ่มต้นและรายงานเฉพาะ aggregate counts โดยไม่ลบข้อมูล
- Execute ลบทั้งสามกลุ่มใน transaction เดียว, rollback เมื่อคำสั่งใดล้มเหลว และรันซ้ำได้อย่าง idempotent
- เพิ่ม safe audit formatter ที่ไม่รับ raw payload หรือ arbitrary error message และมี PII canary tests
- Execute นอก E2E ต้องใช้ write opt-in; Production ต้องใช้ opt-in ชั้นที่สอง

Retention ไม่ลบ campaign metadata หรือ consent record โดยอัตโนมัติ การลบ response/feedback/event เท่านั้นทำให้ policy ตรวจสอบได้และไม่ทำลาย campaign definition โดยไม่ตั้งใจ

## คำสั่งใช้งาน

```powershell
# อ่านอย่างเดียวจาก environment ปกติ
npm.cmd run research:retention

# อ่านอย่างเดียวจากฐาน isolated E2E
npm.cmd run research:retention:e2e

# Execute ต้องตั้ง write opt-in เอง; ไม่มี npm shortcut เพื่อลดการสั่งพลาด
$env:ITHUB_RESEARCH_RETENTION_ALLOW_WRITES = 'true'
node --env-file-if-exists=.env scripts/research-retention.mjs --execute
```

ถ้า environment เป็น `production`, `prod` หรือ `live` ต้องตั้ง `ITHUB_RESEARCH_RETENTION_ALLOW_PRODUCTION=true` เพิ่มด้วย การกำหนด schedule/ผู้รับผิดชอบยังเป็น decision gate และยังไม่ได้เปิดใช้งาน

## Verification evidence

| กรณี | ผล |
| --- | --- |
| Retention/audit unit tests | ผ่าน 7/7 |
| Unit tests รวม | ผ่าน 40/40 |
| `npm.cmd run lint` | ผ่าน |
| `npm.cmd run build` | ผ่านบน Next.js 16.3.4 |
| `_e2e` dry-run ก่อน fixture | 0/0/0 และไม่มี DELETE |
| `_e2e` fixture dry-run | eligible 1/1/1, deleted 0/0/0 |
| `_e2e` fixture execute | eligible 1/1/1, deleted 1/1/1 |
| Survivor check | event อายุ 179 วันและ records ที่ deadline ยังไม่ถึงอยู่ครบ |
| Idempotent rerun | eligible/deleted 0/0/0 |
| Execute โดยไม่มี write opt-in | ถูกบล็อกด้วย safe `CONFIGURATION_ERROR` ก่อน query |
| Post-cleanup `db:check:e2e` | ผ่าน; integrity counters ทุกค่าเป็น 0 |

Fixture ใช้ user/campaign/event/response/feedback ที่สร้างเฉพาะรอบทดสอบและถูก cleanup แล้ว Audit output ไม่มี email, username, search/form text, identifier หรือ error message

## ขอบเขตถัดไป

Phase 1 database/privacy foundation ปิดครบตาม checklist แล้ว งานถัดไปคือ Phase 2 data layer และ authorization โดยยังใช้ค่าเริ่มต้น `pilot` จนกว่า decision gates ด้าน questionnaire, denominator, withdrawal policy, session และ retention deadline จะได้รับการยืนยัน

ไม่มีการแตะ Production, ตั้ง schedule, สร้าง Preview, deploy, push หรือ commit ใน checkpoint นี้
