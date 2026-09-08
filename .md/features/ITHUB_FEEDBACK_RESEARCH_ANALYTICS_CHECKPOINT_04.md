# ITHub Feedback & Research Analytics — Checkpoint 04

> สถานะ: Phase 3 consent-gated Analytics ingestion ผ่าน local verification
>
> Branch: `codex/feedback-research-analytics`
>
> วันที่: 9 กันยายน 2569

## ผลลัพธ์

- เพิ่ม `POST /api/analytics/events` แบบ dynamic และ `no-store` รับเฉพาะ same-origin JSON
- จำกัด body 32 KiB แบบอ่าน stream, ไม่เกิน 20 events ต่อ batch และ properties ไม่เกิน 1,024 UTF-8 bytes
- ตรวจ authentication และ shared database rate limit ใน `server-only` data layer ทุก request
- ตรวจ event/property/failure-code/route/campaign/time ด้วย allowlist ทั้งก่อนส่งจาก client และซ้ำฝั่ง server
- Lock consent row และ campaign row ภายใน transaction เดียวกับ insert จึง serialize กับการถอน consent และการเปลี่ยนสถานะ campaign
- ใช้ subject key ที่สร้างฝั่ง server และ HMAC session UUID ก่อนบันทึก; `analytics_events` ไม่มี user ID และไม่เก็บ browser session UUID ตรง ๆ
- Duplicate `(subject_key, event_id)` คืน accepted response แบบ idempotent โดยไม่เพิ่มข้อมูลซ้ำ
- Client fail closed เมื่อ guest, no consent หรือ consent bootstrap ล้มเหลว; ไม่สร้าง session/ส่ง request ก่อน consent และล้าง session เมื่อถอน
- Instrument event v1 ครบ page, search, result open, create, comment, like, bookmark, follow, feed, onboarding, evaluation และ feedback

## Request และ privacy boundary

| ขอบเขต | พฤติกรรม |
| --- | --- |
| Session/consent | ยึด authenticated user ฝั่ง server และต้องพบ consent `active` ใต้ row lock |
| Origin | ใช้ exact `Origin` หรือ same-origin `Referer` fallback และปฏิเสธ cross-site fetch metadata |
| Authority | ไม่รับ `userId`, role, subject key หรือ session key ที่ผ่าน HMAC แล้วจาก client |
| Route | เก็บเฉพาะ family allowlist; query/hash และ topic/edit ID ถูกตัด |
| Campaign | การอ้าง campaign ต้องเป็น `open`, `pilot` และอยู่ในช่วงเวลา; evaluation events ต้องมี campaign |
| Time | รับ client time ย้อนหลังไม่เกิน 24 ชั่วโมงและล้ำหน้าไม่เกิน 5 นาที; หากไม่ส่งใช้ server time |
| Response/log | คืนเฉพาะ code และ accepted/duplicate counts; ไม่มี identifier, raw payload หรือ arbitrary error |

Browser session 30 นาทีเป็นค่าเริ่มต้นสำหรับ pilot และยังต้องรับรองในระเบียบวิธี เมื่อหมดช่วงหรือถอน consent ระบบสร้าง session ใหม่โดยไม่ใช้ IP หรือ User-Agent

## Verification evidence

| กรณี | ผล |
| --- | --- |
| Unit tests รวม | ผ่าน 59/59 |
| Lint | ผ่าน |
| Production build | ผ่านบน Next.js 16.3.4; route `/api/analytics/events` เป็น dynamic |
| Analytics E2E | ผ่าน 9/9 แบบ serial: 3 scenarios × Chromium/Firefox/WebKit |
| Phase 2+3 regression | ผ่านรวม 21/21 ในรอบเดียวบน Chromium/Firefox/WebKit |
| Negative request | guest 401, no consent 403, cross-origin 403, invalid payload 400, oversized 413, non-JSON 415 |
| Idempotency | batch แรก accepted 2; retry event ID เดิม accepted 0/duplicates 2; DB คง 2 rows |
| Pseudonym/PII canary | route ถูก normalize, session เป็น HMAC 64 hex, raw session/query canary ไม่อยู่ใน DB หรือ response |
| Withdrawal | ลบ raw events เหลือ 0, request ถัดไป 403 และ client ไม่ส่ง request หลัง UI ยืนยันการถอน |
| Fail closed | consent bootstrap rejection คืน disabled; ก่อน consent ไม่มี request ไป research endpoint |
| Fixture cleanup | หลังรอบสุดท้าย user prefix และ campaign prefix เหลือ 0; integrity counters ทุกค่าเป็น 0 |

ระหว่าง intentional redirect และการยกเลิก oversized request stream มี log `destination stream closed early` เป็นครั้งคราวเหมือนรอบก่อน แต่ response assertion, DOM, database assertion และ cleanup ผ่านครบ จึงบันทึกเป็น non-blocking test-runner noise

## ขอบเขตถัดไป

Phase 4 คือ metric functions ที่ใช้ contract เดียวกันระหว่าง Dashboard/CSV/tests, suppression เมื่อ `n < 5`, filter campaign/date/demographics, observed-vs-self-reported result และ ZIP export ที่ไม่มี PII พร้อม performance fixture 100,000 events

Decision gates เรื่องคำแปล SUS, denominator, session definition, withdrawal policy, notice version, retention owner/deadline และ key rotation ยังเปิดอยู่ ระบบจึงยังเป็น `pilot` เท่านั้น

ยังไม่ได้สร้าง Preview, แตะ Production, deploy หรือ push และต้องเพิ่ม branch-scoped Preview guard/isolated variables ก่อน push ครั้งแรก
