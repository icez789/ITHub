# ITHub Feedback & Research Analytics — Checkpoint 01

> สถานะ: Database/privacy foundation slice ผ่านการตรวจรับในเครื่องและฐาน `_e2e`
>
> Branch: `codex/feedback-research-analytics`
>
> Base commit: `5b18aba2762857856388c8dacd9c3331640607e5`
>
> วันที่: 7 กันยายน 2569

## ผลลัพธ์

- เพิ่ม data/privacy contract ที่กำหนด field sensitivity, retention, campaign lifecycle, event allowlist, metric defaults, export exclusions และ threat/control matrix
- เพิ่ม additive migration `005_feedback_and_research_analytics.sql` โดยไม่แก้ migration 001–004
- เพิ่ม schema fingerprint, state `absent / partial / complete`, checksum แบบไม่แปรตาม LF/CRLF และ integrity checks ของ migration 005; เครื่องมือซ่อม migration 002 ใช้ checksum และ conditional integrity scope เดียวกัน
- เพิ่ม HMAC-SHA-256 subject/session key แบบ versioned โดยใช้ secret แยกเฉพาะงาน Analytics
- เพิ่ม consent grant/withdraw transaction; การถอนเปลี่ยนสถานะและลบ raw events ใน transaction เดียวกัน
- เพิ่ม utility ที่ทดสอบแล้วสำหรับ SUS, statistics, event allowlist, route normalization และ CSV formula-injection protection

## Schema map

```text
users
 ├── 1 : 0..1 ── analytics_consents
 │                  └── 1 : many ── analytics_events
 ├── 1 : many ──── evaluation_responses ──── many : 1 ── evaluation_campaigns
 ├── 1 : many ──── feedback_submissions ──── many : 0..1 ── evaluation_campaigns
 ├── 1 : many ──── evaluation_campaigns.created_by / updated_by
 └── 1 : many ──── feedback_submissions.updated_by

evaluation_campaigns
 └── 1 : many ──── analytics_events (optional campaign scope)
```

`analytics_events` เชื่อม consent ด้วย `subject_key` และไม่มี `user_id` ส่วน Evaluation/Feedback เก็บ `user_id` เฉพาะ operational ownership แต่ห้ามส่ง identifier ออก Dashboard หรือ research export

## Verification evidence

| คำสั่ง/กรณี | ผล |
| --- | --- |
| `npm.cmd run lint` | ผ่าน |
| `npm.cmd run test:unit` | ผ่าน 33/33 |
| `npm.cmd run build` | ผ่านบน Next.js 16.3.4 |
| `npm.cmd run test:research:consent:e2e` | ผ่าน grant → event insert → withdrawal → raw-event deletion → cleanup |
| upgrade migration 004 → 005 บน `_e2e` | ผ่าน |
| รัน migration 005 ซ้ำ | ผ่านและรายงาน `skip 005_feedback_and_research_analytics.sql` |
| fresh migrations 001–005 บนฐานชั่วคราว `_e2e` | ผ่าน พร้อม `db-check` |
| partial migration 005 บนฐานชั่วคราว `_e2e` | tooling หยุดด้วย expected safety error และไม่เติม schema ต่อ |
| post-smoke `db:check:e2e` | ผ่าน; migration 005 integrity counters ทั้ง 15 ค่าเป็น 0 |
| final `db:preflight:e2e` | ผ่าน; migrations 002–005 เป็น `complete` และ integrity counters เป็น 0 |

ฐาน fresh/partial ใช้ชื่อสุ่มตาม pattern ที่จำกัดและถูกลบใน `finally` ฐาน `_e2e` หลักได้รับ migration 005 แล้ว แต่ไม่มี consent/event ทดสอบตกค้าง

## ปัญหาที่พบและการแก้

Migration 003–004 ใน checkout Windows ใช้ CRLF แต่ checksum ที่บันทึกเดิมคำนวณจาก LF ทำให้ upgrade หยุดอย่างปลอดภัยก่อน migration 005 จึงเพิ่ม canonical checksum ที่แปลงเฉพาะ line endings เป็น LF; unit tests ยืนยันว่า LF/CRLF ให้ checksum เดียวกัน แต่การแก้เนื้อหาอื่นยังเปลี่ยน checksum

## ขอบเขตที่ยังไม่เริ่ม

- Evaluation/Feedback Server Actions, หน้า `/feedback` และ Admin UI
- Analytics ingestion endpoint และ client instrumentation
- Retention cleanup job, Dashboard, metrics queries และ ZIP export
- Preview variables/deployment และ Production migration

## ต้องยืนยันก่อน Phase 2/pilot

- ข้อความ SUS ไทย–อังกฤษและ controlled vocabularies
- นิยาม eligible population และเวลา snapshot ของ denominator
- อนุญาตให้ส่งแบบประเมินใหม่หลังถอนหรือไม่
- session timeout 30 นาทีและการใช้ sample standard deviation
- วันสิ้นสุดโครงการและ retention deadline จริง
- consent/privacy notice version ที่อนุมัติ

ไม่มีการแตะ Production, สร้าง Preview, deploy, push หรือ commit ใน checkpoint นี้
