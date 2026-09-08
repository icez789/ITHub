# ITHub Feedback & Research Analytics — Data and Privacy Contract

> สถานะ: Implementation contract สำหรับ migration 005, consented Analytics, Dashboard metrics และ Chapter 4–5 export
>
> แผนต้นทาง: [`ITHUB_FEEDBACK_RESEARCH_ANALYTICS_PLAN.md`](./ITHUB_FEEDBACK_RESEARCH_ANALYTICS_PLAN.md)
>
> อัปเดตล่าสุด: 9 กันยายน 2569

## 1. ขอบเขตและหลักการ

- Behavioral Analytics เก็บเฉพาะสมาชิกที่เข้าสู่ระบบและมี consent สถานะ `active`
- การ grant consent ต้องมี acknowledgement ที่ตรวจซ้ำฝั่ง server และ server เป็นผู้กำหนด notice version; ห้ามเชื่อ version จาก hidden field/client payload
- Server คำนวณ subject/session key เอง Client ห้ามส่ง user ID, subject key หรือ role มาเป็น authority
- `analytics_events` ไม่มีชื่อ อีเมล username IP full User-Agent ข้อความค้นหา เนื้อหากระทู้/ความคิดเห็น หรือข้อความ AI
- Evaluation และ Feedback อาจมี `user_id` ใน operational table เพื่อบังคับสิทธิ์ ความเป็นเจ้าของ และป้องกันคำตอบซ้ำ แต่ทุก Dashboard DTO และ export ต้องตัด identifier ออก
- Pilot และ Production แยกด้วย `data_scope` และ campaign; ห้ามรวมโดยปริยาย
- Raw Analytics เก็บไม่เกิน 180 วัน ส่วน Evaluation/Feedback ใช้ `retention_until` ที่ไม่เกินหนึ่งปีหลังสิ้นสุดโครงการ
- Open-ended text และ Feedback details ถือเป็นข้อมูลที่ผู้ตอบอาจใส่ PII เอง จึงไม่ออกในชุดข้อมูลบทที่ 4–5
- ทุก rate ต้องมี numerator, denominator, ช่วงเวลา และกฎ deduplication เดียวกันระหว่าง Dashboard, CSV และ tests

## 2. Implementation defaults

ค่าเหล่านี้ทำให้เริ่มพัฒนาและทดสอบได้ แต่รายการที่เกี่ยวกับระเบียบวิธีต้องให้อาจารย์ยืนยันก่อน pilot จริง

| เรื่อง | ค่าเริ่มต้น |
| --- | --- |
| Campaign lifecycle | `draft → open → closed → locked` |
| Data scope | `pilot` หรือ `production`; ค่าเริ่มต้น `pilot` |
| Analytics identity | HMAC-SHA-256 แบบ versioned จาก `ITHUB_ANALYTICS_SECRET` |
| Secret minimum | 32 ตัวอักษร, ปฏิเสธ placeholder, ไม่มี fallback ไป secret อื่น |
| Browser session | UUID แบบสุ่ม; server แปลงเป็น HMAC session key |
| Session timeout | inactivity 30 นาที; ต้องยืนยันก่อนทำ metrics |
| Evaluation uniqueness | หนึ่ง record ต่อ `(campaign_id, user_id)` และมี client submission UUID |
| Evaluation withdrawal | เก็บ tombstone แต่ล้าง answers, demographics และ open text; ยังไม่อนุญาตตอบซ้ำจนกว่าจะยืนยัน policy |
| Pilot questionnaire UI | `sus-th-pilot-v1`; เปิด campaign ได้เฉพาะ version นี้จนกว่าอาจารย์รับรอง version จริง |
| Pilot evaluation notice | `research-notice-pilot-v1`; เปิด campaign ได้เฉพาะ version ที่ UI แสดงตรงกัน |
| Pilot analytics notice | `research-analytics-pilot-v1`; server เป็นผู้เลือกและบันทึกเมื่อ acknowledgement ผ่าน |
| Standard deviation | sample SD; ต้องระบุใน `methodology.md` และยืนยันก่อน pilot |
| Subgroup privacy | ไม่แสดง/ส่งออกเมื่อ `n < 5` |
| Time storage | UTC; แปลงเวลาเฉพาะ presentation/export |

## 3. Database contract

Migration ใช้ไฟล์ `005_feedback_and_research_analytics.sql` และเพิ่ม 5 ตารางโดยไม่แก้ migrations 001–004

### `evaluation_campaigns`

| กลุ่ม field | หน้าที่ |
| --- | --- |
| `id`, `slug`, `name` | รหัสภายในและชื่อ campaign; slug ไม่ซ้ำ |
| `status` | `draft`, `open`, `closed`, `locked` |
| `data_scope` | `pilot`, `production` |
| `questionnaire_version` | เวอร์ชันข้อความ/โครงสร้างแบบสอบถาม |
| `consent_notice_version` | เวอร์ชัน notice ที่ใช้กับ campaign |
| `eligible_member_count` | snapshot denominator ของ response rate; ห้ามคำนวณย้อนหลังจากจำนวนสมาชิกปัจจุบัน |
| `starts_at`, `ends_at` | ช่วงเก็บข้อมูล |
| `retention_until` | วันลบ Evaluation ของ campaign |
| `opened_at`, `closed_at`, `locked_at` | audit timestamps ของ lifecycle |
| `created_by`, `updated_by` | Super Admin ผู้ดำเนินการ; FK แบบ `SET NULL` เมื่อบัญชีถูกลบ |

### `analytics_consents`

| กลุ่ม field | หน้าที่ |
| --- | --- |
| `user_id` | PK/FK สำหรับตรวจสิทธิ์และถอน consent; ไม่ออกจาก server DTO |
| `subject_key` | HMAC hex 64 ตัวและ unique; ใช้เชื่อม raw events โดยไม่ใส่ user ID |
| `key_version` | รองรับ secret rotation และ deletion ของข้อมูลเดิม |
| `notice_version` | เวอร์ชัน notice ที่ผู้ใช้ยอมรับ |
| `status` | `active`, `withdrawn` |
| `consented_at`, `withdrawn_at` | หลักฐานเวลาให้/ถอน consent |

การถอน consent ต้อง lock row, เปลี่ยนสถานะก่อน แล้วลบ raw events ภายใน transaction เดียวกัน Ingestion ต้อง lock/check consent ก่อน insert เพื่อไม่ให้มี event แทรกระหว่าง withdrawal

### `analytics_events`

| กลุ่ม field | หน้าที่ |
| --- | --- |
| `event_id` | UUID จาก client สำหรับ idempotent retry |
| `subject_key` | FK ไป consent; `ON DELETE CASCADE`, ไม่มี user ID |
| `session_key` | HMAC ของ browser-session UUID |
| `campaign_id`, `data_scope` | แยก pilot/production และผูก analysis window |
| `event_name`, `event_version` | ชื่อใน allowlist และ schema version |
| `outcome`, `failure_code` | `attempt/success/failure`; failure code จำกัด 4 ค่า |
| `route_path` | route family ที่ normalize แล้ว เช่น `/topic/[id]`; ไม่มี query/hash |
| `properties` | JSON ขนาดเล็กและ allowlist แยกต่อ event |
| `occurred_at`, `received_at` | เวลา client/server สำหรับ funnel และ retention |

Unique `(subject_key, event_id)` ป้องกัน network retry ซ้ำ Index หลักรองรับ campaign/event/time, event/time, subject/session/time และ retention cleanup

### `evaluation_responses`

| กลุ่ม field | หน้าที่ |
| --- | --- |
| `campaign_id`, `user_id` | ownership และ unique response ต่อ campaign |
| `client_submission_id` | idempotency ของ double-submit/retry |
| `response_status` | `submitted`, `withdrawn` |
| `respondent_type`, `experience_level`, `primary_device` | controlled vocabulary ที่ต้องอนุมัติก่อน pilot |
| `sus_answers`, `sus_score` | คำตอบ 10 ข้อและคะแนนที่ server คำนวณ |
| `task_results` | self-reported 5 งาน; แยกจาก observed analytics |
| `open_feedback` | ข้อความปลายเปิด; ไม่ออกใน research ZIP |
| `submitted_at`, `withdrawn_at` | เวลา lifecycle ของคำตอบ |

เมื่อถอนคำตอบ ให้คงเฉพาะ campaign/user/idempotency/status/timestamps เป็น tombstone และตั้ง demographics, SUS, task results และ open text เป็น `NULL`

### `feedback_submissions`

| กลุ่ม field | หน้าที่ |
| --- | --- |
| `user_id`, `client_submission_id` | ownership และ idempotency |
| `campaign_id`, `data_scope` | แยก pilot/production; campaign เป็น optional |
| `category` | `bug`, `ux_ui`, `feature`, `content`, `other` |
| `rating`, `details`, `route_path` | rating 1–5 optional, details 10–2,000, same-site pathname ไม่มี query/hash |
| `status` | `new`, `reviewing`, `planned`, `resolved`, `declined` |
| `priority` | `low`, `normal`, `high`, `urgent` |
| `issue_theme` | controlled label ที่ใช้ทำ `feedback_themes.csv` |
| `internal_note`, `updated_by` | ใช้เฉพาะ Admin; ไม่คืนให้สมาชิกและไม่ export |
| `resolved_at`, `retention_until` | terminal state และ retention deadline |

## 4. Event contract v1

| Event | Properties ที่อนุญาต |
| --- | --- |
| `page_viewed` | ไม่มี |
| `search_performed` | ไม่มีข้อความค้นหา |
| `search_result_opened` | `resultPosition` 1–100 |
| `topic_created` | ไม่มีเนื้อหา |
| `comment_created` | `reply` boolean |
| `like_changed` | `active` boolean |
| `bookmark_changed` | `active` boolean |
| `category_follow_changed` | `active`, category จาก 5 ค่าปัจจุบัน |
| `author_follow_changed` | `active`; ไม่มี author ID |
| `feed_viewed` | `community`, `following`, `for_you` |
| `onboarding_completed` | ไม่มี |
| `evaluation_started`, `evaluation_submitted` | campaign ใช้ envelope field |
| `feedback_submitted` | category เท่านั้น |

Envelope รับเฉพาะ `eventId`, `sessionId`, `eventName`, `eventVersion`, `outcome`, `failureCode`, `route`, `campaignId`, `properties`, `occurredAt` Unknown field/property ต้องถูกปฏิเสธ

Ingestion contract จำกัด JSON request body 32 KiB, ไม่เกิน 20 events ต่อ batch และ `properties` ไม่เกิน 1,024 bytes ต่อ event โดยนับ UTF-8 bytes ฝั่ง server

- รับเฉพาะสมาชิกที่ session ยังใช้ได้และ consent เป็น `active`; ingestion lock consent row ก่อนตรวจ campaign และ insert เพื่อ serialize กับ withdrawal
- Request ต้องเป็น same-origin JSON: ตรวจ `Origin` แบบ exact เมื่อมี หรือใช้ same-origin `Referer` fallback สำหรับ browser ที่ไม่ส่ง `Origin`; ปฏิเสธ `Sec-Fetch-Site` ที่ไม่ใช่ `same-origin`
- Client สร้าง UUID หลัง consent เท่านั้นและเริ่ม session ใหม่เมื่อไม่มี activity 30 นาที; การถอนหรือ bootstrap ที่ล้มเหลวทำให้ปิด gate และล้าง session ฝั่ง browser ค่านี้ยังเป็น pilot default ที่ต้องรับรองในระเบียบวิธี
- Server ใช้ subject/key version จาก consent ที่ผูกกับ authenticated user และคำนวณ `session_key` ด้วย HMAC; client ไม่ส่ง authority field ใด ๆ
- Event ที่ไม่ส่ง `occurredAt` ใช้เวลารับของ server; เวลาจาก client ต้องไม่เก่ากว่า 24 ชั่วโมงและไม่ล้ำหน้า server เกิน 5 นาที
- `evaluation_started` และ `evaluation_submitted` ต้องมี `campaignId`; campaign ที่อ้างถึงทุก event ต้องเป็น `open`, `pilot` และอยู่ในช่วงเวลา โดย lock row ก่อน insert
- Route ตอบเฉพาะ status/code/count แบบคงที่ ไม่คืน identifier และไม่ log raw body หรือ arbitrary error; duplicate `(subject_key, event_id)` นับเป็น retry โดยไม่ insert ซ้ำ

Failure code v1: `validation`, `rate_limited`, `network`, `server_error`

## 5. Route and export contract

- Feedback route รับเฉพาะ same-site pathname สูงสุด 255 ตัวอักษรและตัด query/hash ฝั่ง server
- Analytics route เก็บเฉพาะ route family allowlist; `/topic/123` เป็น `/topic/[id]` และ `/edit/123` เป็น `/edit/[id]`
- CSV sanitize ค่าที่อาจเริ่ม formula (`=`, `+`, `-`, `@`, tab, carriage return) ก่อน quote/escape
- CSV ทุกไฟล์ใช้ UTF-8 BOM และ column order แบบ deterministic
- ZIP ห้ามมี name, email, username, user ID, pseudonym, event ID, internal note, raw open text หรือ raw Feedback details
- `feedback_themes.csv` ใช้เฉพาะ controlled `issue_theme` และ aggregate count หลังใช้กฎ `n >= 5`

## 6. Metric contract ที่ต้องปิดก่อน Dashboard

- Response rate: submitted responses ÷ `eligible_member_count` snapshot ของ campaign
- Search-to-open: `search_performed` แล้วมี `search_result_opened` ใน subject/session เดียวกันภายใน 5 นาที
- Create success: success ÷ attempts; event ซ้ำถูกตัดด้วย unique event ID
- Observed task result: แสดง `observed`, `not_observed`, `unavailable`; ห้ามตีความ consent ขาดหรือ event หายเป็น failure
- SUS: count, mean, median, sample SD, min, max และ distribution จาก response สถานะ submitted
- Subgroup: ถ้า filtered group มีน้อยกว่า 5 responses ให้ suppress ทั้ง Dashboard และ export

Implementation Phase 4 ใช้ช่วงเวลาแบบ half-open `[start, endExclusive)` ใน UTC โดยตัดช่วงให้อยู่ภายใน campaign และไม่เกินเวลาสร้างผลลัพธ์ ข้อกำหนดเพิ่มเติมมีดังนี้:

- จำนวน consent คือ consent สถานะ `active` ที่ grant ก่อนปลายช่วง; เมื่อใช้ demographic filter จะนับเฉพาะ active consent ที่เชื่อมกับ submitted response ใน campaign เดียวกัน
- Behavioral events ที่ไม่มี `campaign_id` ถูกผูกกับ campaign เพื่อการวิเคราะห์ด้วย data scope และช่วง UTC ที่เลือก จึงต้องระวัง campaign ที่มีช่วงเวลาทับกันและระบุข้อจำกัดนี้ใน `methodology.md`
- Demographic filter ใช้ cohort จาก submitted response แล้ว join ไปยัง consent/event ฝั่ง server; Dashboard/Export ไม่คืน identifier ที่ใช้ join
- Response rate หลังกรอง demographic เป็น `unavailable` เพราะ `eligible_member_count` เป็น snapshot ทั้ง campaign ไม่ใช่ denominator รายกลุ่ม
- ถ้า breakdown มีแถวใด `0 < n < 5` ให้ suppress ทุกแถวใน breakdown เดียวกันเพื่อป้องกันการอนุมานด้วยผลต่าง
- Read path ใช้ transaction เดียวต่อผลลัพธ์ และ export ใช้ metric DTO เดียวกับ Dashboard ก่อนสร้าง aggregate-only ZIP

## 7. Retention operation contract

- ใช้ `UTC_TIMESTAMP(3)` จากฐานข้อมูลเป็น as-of เดียวตลอด transaction ไม่อิง timezone ของเครื่องรัน
- ลบ `analytics_events` เมื่อ `received_at < as-of - 180 วัน`; event ที่ตรง boundary พอดียังไม่ถูกลบจนกว่ารอบถัดไปจะผ่าน boundary
- ลบ `evaluation_responses` เมื่อ campaign มี `retention_until <= as-of`
- ลบ `feedback_submissions` เมื่อ record มี `retention_until <= as-of`
- ไม่ลบ `evaluation_campaigns` หรือ `analytics_consents` อัตโนมัติ
- Dry-run รายงาน eligible counts แต่ deleted counts เป็นศูนย์
- Execute ลบทั้งสามกลุ่มใน transaction เดียวและ rollback ทั้งหมดหากกลุ่มใดล้มเหลว
- Audit output มีเฉพาะ operation/mode/UTC cutoff และ aggregate counts; ห้ามมี raw row, identifier, payload หรือ arbitrary error message
- Execute ต้องมี explicit write opt-in และ Production ต้องมี opt-in ชั้นที่สอง การตั้ง schedule และ owner ต้องปิด decision gate ก่อน

## 8. Threat and privacy review

| ความเสี่ยง | Control ที่บังคับใช้ | สถานะ |
| --- | --- | --- |
| Consent bypass | Grant ตรวจ acknowledgement และเลือก notice version ฝั่ง server; ingestion ล็อก consent row และตรวจ `active` ใน transaction เดียวกับ insert | ผ่าน no-consent E2E และ unit rollback; client ไม่ส่ง network ก่อน consent |
| Withdrawal/ingestion race | Withdrawal เปลี่ยน status ก่อนลบ events ภายใต้ row lock; ingestion ใช้ lock เดียวกัน | ผ่าน transaction-order unit และ E2E ลบ raw events/ปฏิเสธการเขียนหลังถอน |
| Forged user/role/subject | ยึด session ฝั่ง server และคำนวณ subject/session key เอง; ไม่รับ authority fields จาก client | ผ่าน guest/authority-field negative E2E และตรวจ DB ไม่มี raw session/user identifier |
| IDOR | Member query ต้องผูก `user_id` จาก session; Admin/Super Admin actions ต้องตรวจ role ภายใน action/handler ทุกครั้ง | Phase 2 DTO/action boundary และ guest/user/teacher negative tests ผ่าน |
| CSRF/cross-origin event | Server Actions ใช้ origin protection ของ framework; Route Handler รับ same-origin JSON เท่านั้น | ผ่าน cross-origin, wrong content type และ browser-origin E2E ครบสาม engines |
| PII ใน payload/log | Client/server event allowlist, route family normalization, byte limits และห้าม log raw body | PII canary ถูกปฏิเสธและไม่ปรากฏใน response/DB/runtime output; export test รอ Phase 4 |
| CSV formula injection | Sanitize formula prefix ก่อน RFC 4180 escaping และไม่ export raw identifiers/text | Utility unit test ผ่าน; ZIP round-trip รอ Phase 4 |
| Subgroup inference | Suppress หลังใช้ filter ทุกชุดเมื่อ `n < 5`; ห้าม raw-row export และห้ามเปิด pseudonym | Contract พร้อม; metric tests รอ Phase 4 |
| Retention overrun | Cleanup ต้อง idempotent, dry-run ได้, รายงานเฉพาะ row counts และใช้ UTC cutoff | Unit/E2E ผ่าน; ยังไม่ตั้ง schedule จนกว่าจะยืนยัน owner/deadline |

## 9. Pending academic/product confirmation

- ข้อความ SUS ไทย–อังกฤษและ questionnaire version ที่ผ่านอาจารย์
- controlled vocabulary ของ respondent type, experience และ primary device
- นิยาม eligible population และวัน snapshot
- อนุญาตให้ตอบใหม่หลังถอน evaluation หรือไม่
- session inactivity 30 นาทีและ sample SD เหมาะกับระเบียบวิธีหรือไม่
- วันสิ้นสุดโครงการและ retention deadline ที่ใช้จริง

จนกว่ารายการเหล่านี้จะยืนยัน ระบบต้องเปิดเฉพาะ campaign `pilot` และห้ามสร้างสถิติจำลองบน Production
