# ITHub Feedback & Research Analytics — Checkpoint 05

> วันที่: 9 กันยายน 2569
>
> ขอบเขต: Phase 4 Dashboard, metrics, subgroup suppression และ Chapter 4–5 export
>
> สถานะ: ผ่าน local verification บน isolated `test_e2e`; ยังไม่ผ่าน Preview/Pilot/Production gates

## สิ่งที่ส่งมอบ

- `/admin/analytics` แสดง Dashboard และ campaign management ในหน้าเดียว พร้อม filter campaign, วันที่ UTC, ประเภทผู้ตอบ, ประสบการณ์ และอุปกรณ์
- Metric core เดียวกันคำนวณ response rate, session/activity, search-to-open 5 นาที, topic/comment success, engagement/feed, SUS, task comparison และ Feedback aggregate ให้ทั้งหน้า, CSV และ tests
- ทุก rate มี numerator, denominator, ช่วง UTC และกฎ deduplication; subgroup ที่ไม่มี denominator snapshot แสดง `unavailable`
- `n < 5` ถูก suppress หลังใช้ filter และทั้ง breakdown จะถูก suppress หากค่าที่เหลืออาจใช้ลบเพื่ออนุมานกลุ่มเล็ก
- `GET /api/admin/research/export` ตรวจ `requireAdmin()` ซ้ำและส่ง ZIP แบบ no-store ที่มีไฟล์ตาม allowlist 7 รายการ
- CSV ใช้ UTF-8 BOM, CRLF/RFC 4180, header order คงที่ และ formula-injection guard; export ไม่ใช้ raw evaluation/feedback text, internal note หรือ identifier

## สิทธิ์และ privacy evidence

- Guest ได้ `401`, Teacher ได้ `403` ที่ export endpoint และถูก redirect ออกจากหน้า Admin
- Metric DAL อ่านข้อมูลใน transaction เดียวและคืนเฉพาะ controlled demographics, aggregate counts และคะแนนที่จำเป็น
- E2E ใส่ formula/PII canary ใน open feedback, Feedback details และ internal note แล้วไม่พบใน DOM หรือ ZIP
- Observed task แยก `observed`, `not_observed`, `unavailable`; ผู้ไม่มี active consent ไม่ถูกตีความเป็น failure

## ผลตรวจ

- `npm.cmd run lint` — ผ่าน
- `npm.cmd run test:unit` — 73/73 ผ่าน
- `npm.cmd run build` — ผ่านบน Next.js 16.3.4; `/api/admin/research/export` เป็น dynamic route
- `npm.cmd run test:e2e -- tests/research-dashboard.spec.js` — 6/6 ผ่านบน Chromium, Firefox และ WebKit ใน 1.0 นาที
- `npm.cmd run test:e2e -- tests/research.spec.js tests/research-analytics.spec.js tests/research-dashboard.spec.js` — regression Phase 2–4 ผ่าน 27/27 ใน 4.4 นาที
- Visual/geometry: 375×812 Light และ 1280×800 Dark ผ่าน overflow/no-error assertions ทุก engine; ตรวจภาพ Chromium ด้วยตาแล้ว
- `npm.cmd run test:research:metrics-performance:e2e` — fixture 100,000 events ผ่านบน `test_e2e`
  - complete metric read: 2,735.48 ms
  - event aggregate: 268.35 ms
  - search-to-open: 479.99 ms
  - `EXPLAIN`: พบ `idx_analytics_events_campaign_name_time` และ `idx_analytics_events_subject_session_time`
- หลัง cleanup: performance/E2E campaign และ user ทุก prefix เหลือ 0; `db:check:e2e` ผ่าน 11/11 tables และ integrity counters ทุกค่าเป็น 0

ระหว่าง intentional redirects/download มี `ECONNRESET` หรือ `destination stream closed early` เป็นครั้งคราวเหมือนรอบก่อน แต่ assertions, ZIP checksum, DOM/database checks และ cleanup ผ่านครบ จึงบันทึกเป็น non-blocking test-runner noise

## Visual decision record

รายละเอียด hierarchy, responsive behavior และหลักฐานภาพอยู่ที่ [Research Analytics Dashboard design record](../design/2026-09-09_RESEARCH_ANALYTICS_DASHBOARD.md)

## ขอบเขตถัดไป

Phase 5–6 ยังเหลือ palette matrix 5 ชุด, keyboard/Screen Reader QA แบบเต็ม, Privacy/Terms/setup docs, combined regression, isolated Preview variables/smoke และ pilot จริง 5–10 คน Decision gates เรื่อง questionnaire translation/version, denominator population, session definition, retention owner/deadline และ key rotation ยังเปิดอยู่ จึงคงระบบไว้ที่ `pilot` และไม่แตะ Production

ยังไม่มีการ push, deploy หรือ Production migration จาก checkpoint นี้
