# ITHub Feedback & Research Analytics — Implementation Checklist

> แผนต้นทาง: [`ITHUB_FEEDBACK_RESEARCH_ANALYTICS_PLAN.md`](./ITHUB_FEEDBACK_RESEARCH_ANALYTICS_PLAN.md)
>
> Checkpoint ล่าสุด: [`ITHUB_FEEDBACK_RESEARCH_ANALYTICS_CHECKPOINT_10.md`](./ITHUB_FEEDBACK_RESEARCH_ANALYTICS_CHECKPOINT_10.md)
>
> สถานะ: Phase 1–5, isolated Vercel Preview verification, ชุดดำเนิน Pilot และ fail-closed readiness guard พร้อมแล้ว; รอ decision sign-off, ผู้เข้าร่วม, manual assistive-technology check และ Production gates
>
> อัปเดตล่าสุด: 10 กันยายน 2569
>
> หลักการ: ติ๊ก `[x]` เฉพาะเมื่อมีโค้ด ผลทดสอบ หรือหลักฐานตรวจรับรองรับ

## 1. Readiness snapshot

- [x] อ่านแผน Feedback, Evaluation, Research Analytics และเกณฑ์สำเร็จครบ
- [x] อ่าน `REVIEW_REPORT_FOR_AGENTS.md` และข้อควรระวังด้าน privacy, role, database, tests และ workspace hygiene
- [x] อ่าน `.md/design/README.md` และ contract ที่เกี่ยวข้องจากแผน redesign/theme/discovery
- [x] ตรวจคู่มือ Next.js 16.3.4 ใน `node_modules/next/dist/docs/` สำหรับ data security, Server Actions, forms, Route Handlers และ Playwright
- [x] สำรวจโครงสร้างปัจจุบัน: App Router, Server Actions, `server-only` DAL, TiDB migrations, role helpers, shared rate limit และ E2E safety guard
- [x] ยืนยัน migration ปัจจุบันสิ้นสุดที่ `004_personalized_discovery.sql`; หมายเลขถัดไปคือ `005`
- [x] ยืนยัน role boundary ปัจจุบัน: `admin`/`super_admin` ใช้ `requireAdmin()`, campaign management ใช้ `requireSuperAdmin()`, และ `teacher` ไม่ผ่านทั้งสอง guard
- [x] รัน baseline `npm.cmd run lint` ผ่าน
- [x] รัน baseline `npm.cmd run test:unit` ผ่าน 15/15; มีเฉพาะคำเตือน `MODULE_TYPELESS_PACKAGE_JSON` เดิม
- [x] รัน baseline `npm.cmd run build` ผ่านบน Next.js 16.3.4
- [x] รัน baseline `npm.cmd run db:check:e2e` ผ่าน: application tables 11/11 และ integrity counters ทุกค่าเป็น 0
- [x] ระบุงานเอกสาร Phase 2 และ artifacts ที่ค้างอยู่เป็นรายการห้าม stage แล้วรักษาไว้ครบก่อนเปลี่ยน branch
- [x] สร้าง branch `codex/feedback-research-analytics` จาก commit `5b18aba2762857856388c8dacd9c3331640607e5`
- [x] เพิ่ม Preview guard สำหรับ `codex/feedback-research-analytics` แบบ project/team/branch allowlist, `_e2e` identity, Preview-only target และ local dry-run โดยไม่แก้ helper Discovery เดิม

### Workspace guard

ก่อนเริ่มงาน worktree อยู่ที่ `codex/ithub-94-milestone` และมี tracked/untracked งานอื่น ได้แก่ release summary, `.md/design/README.md`, presentation artifacts, `output/` และ `tmp/` ปัจจุบันไฟล์เหล่านี้ยังอยู่ครบและถูกแยกออกจาก staging allowlist ของฟีเจอร์นี้

## 2. Decision gates

รายการกลุ่มนี้ไม่ขวางการเริ่มเขียน data contract และ tests แต่ต้องปิดก่อน pilot หรือก่อนเก็บข้อมูลจริง

- [ ] ให้อาจารย์รับรองข้อความ SUS ไทย–อังกฤษ ลำดับข้อ และทิศทาง positive/negative หลัง pilot 5–10 คน
- [ ] กำหนดประชากรที่มีสิทธิ์ตอบและ denominator ของ response rate แบบ snapshot ต่อ campaign เพื่อไม่ให้ตัวหารเปลี่ยนย้อนหลัง
- [x] ยืนยันขอบเขต Analytics เป็นสมาชิกที่เข้าสู่ระบบและกดยินยอมเท่านั้น เพื่อให้ถอน consent และลบ raw events ได้แน่นอน
- [ ] กำหนด session: ค่าเริ่มต้นแนะนำเป็นรหัสสุ่มต่อ browser session และหมดช่วงหลังไม่มี activity 30 นาที โดยไม่ใช้ IP หรือ User-Agent
- [ ] กำหนดความหมาย observed success/failure และ denominator ของแต่ละ funnel รวมถึง search-to-open ภายใน 5 นาที
- [ ] ตัดสินใจการถอนแบบประเมิน: เก็บ tombstone ว่าเคยถอนและห้ามตอบซ้ำ หรืออนุญาตให้ส่งใหม่; ต้องสอดคล้องกับ “หนึ่งครั้งต่อ campaign”
- [ ] กำหนดนโยบายข้อความปลายเปิดที่ผู้ตอบอาจพิมพ์ PII เอง; ค่าเริ่มต้นแนะนำให้ไม่ส่ง raw text ออกใน ZIP และ export เฉพาะ theme ที่ผู้ดูแลจัดหมวดแล้ว
- [ ] กำหนดวันสิ้นสุดโครงการ เขตเวลา และผู้รับผิดชอบ retention job สำหรับ raw events 180 วัน และ Evaluation/Feedback ไม่เกินหนึ่งปีหลังโครงการ
- [ ] กำหนด HMAC key version/rotation; ต้องยังลบ events เก่าของผู้ถอน consent ได้หลังหมุน secret
- [ ] กำหนด consent/privacy notice version ที่จะบันทึกเป็นหลักฐานพร้อม `consented_at`/`withdrawn_at`
- [x] เลือก aggregate-only deterministic stored ZIP จาก Node.js GET Route; จำกัดขนาด/เวลาใน unit test และไม่ส่ง binary ผ่าน Server Action return payload

## 3. Phase 0 — Contract, safety และ branch setup

- [x] ปิด workspace guard และตรวจ `git status --short --branch` อีกครั้ง
- [x] สร้าง/switch ไป branch `codex/feedback-research-analytics` โดยรักษาไฟล์ผู้ใช้อื่นทั้งหมด
- [x] บันทึก baseline SHA, migration state, test counts และข้อจำกัดที่ยังค้างใน Implementation log
- [x] เขียน data dictionary ระดับ field ก่อนเขียน migration โดยระบุ purpose, type, allowed values, sensitivity, retention และ export policy
- [x] กำหนด event contract แบบ versioned: event name, allowed properties, failure code, route normalization และ maximum payload/batch size
- [x] กำหนด metric contract พร้อม numerator, denominator, time window, deduplication และกรณีข้อมูลไม่ครบทุกค่า
- [x] กำหนด campaign lifecycle อย่างน้อย `draft → open → closed → locked` และ transition ที่อนุญาต
- [x] ทำ threat/privacy review สำหรับ consent bypass, forged events, IDOR, CSRF/origin, PII leakage, CSV injection และ subgroup inference
- [x] วาง commit scope และ staging allowlist; tests ที่เกี่ยวข้องต้องไปกับแต่ละ feature commit ไม่รอรวมเฉพาะท้ายงาน

## 4. Phase 1 — Database และ privacy foundation

### Migration 005

- [x] เพิ่ม additive migration `database/migrations/005_feedback_and_research_analytics.sql` โดยไม่แก้ migrations 001–004
- [x] เพิ่มตาราง `analytics_consents`
- [x] เพิ่มตาราง `analytics_events`
- [x] เพิ่มตาราง `evaluation_campaigns`
- [x] เพิ่มตาราง `evaluation_responses`
- [x] เพิ่มตาราง `feedback_submissions`
- [x] ใส่ foreign keys และ delete policy ที่สอดคล้องกับ retention/withdrawal; ห้าม cascade แล้วทำลายหลักฐานที่จำเป็นโดยไม่ตั้งใจ
- [x] ใส่ unique constraint ป้องกัน evaluation ซ้ำต่อ `(campaign, respondent)` แม้เกิด double-submit หรือ concurrent requests
- [x] ใส่ idempotency key สำหรับ analytics retry และ submission ที่ต้องป้องกันการบันทึกซ้ำ
- [x] ใส่ indexes สำหรับ campaign/status/date, pseudonym/event/time, consent/user และ feedback/status/priority
- [x] ใช้ enum/check strategy ที่ตรวจได้กับ TiDB/MySQL และสะท้อน allowlist เดียวกับ application code
- [x] กำหนด timestamp เป็น UTC และแปลง timezone เฉพาะตอนแสดงผล/ส่งออก

### Database tooling

- [x] เพิ่ม 5 ตารางใหม่ใน migration 005 fingerprint โดยคง `applicationTables` เป็น baseline schema เดิม 11 ตาราง
- [x] เพิ่ม `migration005Tables`, columns, indexes และ foreign keys ใน `scripts/db-schema.mjs`
- [x] เพิ่ม state `absent / partial / complete` และ `assertMigration005Complete()`
- [x] ขยาย `db-migrate.mjs` ให้รองรับ apply, adopt, checksum และปฏิเสธ partial 005
- [x] ขยาย `db-preflight.mjs` และ `db-check.mjs` ให้รายงาน migration 005
- [x] เพิ่ม integrity checks สำหรับ invalid status/value, duplicate active response, orphan rows, consent/event mismatch และ retention boundary
- [x] ทดสอบฐาน `_e2e` แบบ upgrade 004 → 005
- [x] ทดสอบ fresh database ด้วย migrations 001–005
- [x] จำลอง partial 005 และยืนยันว่า tooling หยุดอย่างปลอดภัย
- [x] รัน `db:check:e2e` หลังทุก migration test และยืนยัน counters เป็น 0

### Privacy core

- [x] เพิ่มโมดูล `server-only` สำหรับ pseudonym ด้วย HMAC-SHA-256 จาก `ITHUB_ANALYTICS_SECRET`
- [x] ตรวจ secret ขั้นต่ำ, placeholder และ environment; ห้าม fallback ไป `DB_PASSWORD` หรือ secret อื่น
- [x] แยก stable subject key, session key และ public event id โดยห้ามส่ง `user_id` ให้ client ใช้เป็น authority
- [x] เก็บ key version/subject key ที่จำเป็นต่อ deletion โดยไม่ใส่ PII ใน `analytics_events`
- [x] ทำ consent grant/withdraw เป็น transaction; withdrawal ต้องหยุดการเขียนใหม่และลบ raw events ที่เชื่อมโยงได้
- [x] เพิ่ม retention cleanup แบบ idempotent, dry-run ได้, มี row counts และ audit output ที่ไม่เผยข้อมูลส่วนบุคคล
- [x] ป้องกัน logs จาก raw payload, search text, form text, email, username, IP, full User-Agent และ AI content
- [x] Unit test HMAC determinism/separation, secret validation, consent states, withdrawal และ retention cutoff

## 5. Phase 2 — Evaluation และ Feedback

### Data layer และ authorization

- [x] สร้าง DAL แบบ `server-only` และคืนเฉพาะ DTO ที่แต่ละหน้าต้องใช้
- [x] ตรวจ session/role ภายในทุก Server Action ที่เพิ่มใน Phase 2 ไม่พึ่ง page-level gating; Route Handler ของ Phase 3 ยังไม่เริ่ม
- [x] ใช้ `requireUser()` สำหรับสมาชิก, `requireAdmin()` สำหรับ campaign read/Feedback admin และ `requireSuperAdmin()` สำหรับ campaign mutations/transitions
- [x] เพิ่ม negative tests ยืนยันว่า guest, user และ teacher เข้า admin pages หรือ replay admin Server Action โดยตรงไม่ได้
- [x] เพิ่ม shared database rate limit สำหรับ evaluation, feedback, consent และ analytics ingestion

### Campaign และ Evaluation

- [x] เพิ่ม Server Actions สำหรับสร้าง/แก้ draft, เปิด, ปิด และล็อก campaign ตาม transition allowlist
- [x] ป้องกันการแก้แบบสอบถาม/นิยามคะแนนหลัง campaign ถูกเปิด และบังคับ questionnaire version ที่ UI รองรับก่อนเปิด
- [x] เพิ่มแบบประเมิน SUS 10 ข้อ Likert 1–5 โดยเก็บลำดับและทิศทางเดิม พร้อมป้ายชัดเจนว่าเป็นฉบับนำร่อง
- [x] เพิ่มงานทดลอง 5 งาน พร้อมผล `success / partial / failed / not_attempted` และ difficulty 1–5
- [x] เก็บ respondent type, experience และ primary device ด้วย controlled vocabulary แบบ pilot
- [x] แยก self-reported result ออกจาก `observed / not_observed / unavailable` อย่างชัดเจนใน schema, UI, metrics และ export
- [x] คำนวณ SUS ฝั่ง server จากคำตอบต้นทาง และทดสอบช่วงคะแนน 0–100
- [x] ป้องกัน double-submit ด้วย database constraint, client submission UUID และ structured action state; ยังไม่อ้างว่าผ่าน stress test แบบ concurrent
- [x] รองรับการถอนคำตอบตามค่าเริ่มต้นแบบ tombstone ล้างเนื้อหาและห้ามส่งใหม่ใน campaign เดิม
- [x] ตรวจการยืนยัน consent ซ้ำฝั่ง server และใช้ notice version จากค่าคงที่ฝั่ง server แทนค่าที่ client แก้ได้

### Feedback ทั่วไป

- [x] ทำหน้า `/feedback` แยก “แบบประเมิน” กับ “แจ้งปัญหา/ข้อเสนอแนะ” ด้วย heading, description และ form ที่ไม่สับสน
- [x] จำกัด category ด้วย allowlist, rating 1–5 แบบ optional และรายละเอียด 10–2,000 ตัวอักษร
- [x] sanitize/normalize route ฝั่ง server: รับเฉพาะ same-site pathname และตัด query/hash
- [x] ให้สมาชิกดูเฉพาะรายการของตนและสถานะที่กำหนด
- [x] ทำ `/admin/feedback` สำหรับ priority, issue theme, status และ internal note โดย Admin/Super Admin เท่านั้น
- [x] ไม่ใส่ internal note ใน member DTO, analytics event, audit metadata หรือ export และมี canary tests รองรับ
- [x] เพิ่ม transaction/audit log เมื่อผู้ดูแลเปลี่ยน status/priority/theme โดยไม่คัดลอก internal note ลง audit metadata
- [x] ใช้ `useActionState`/pending/error/success state และปิดปุ่มระหว่างส่ง

## 6. Phase 3 — Analytics ingestion

- [x] เพิ่ม `POST /api/analytics/events` เป็น Route Handler แบบ dynamic และไม่ cache
- [x] บังคับ authentication, active consent, JSON content type, body/batch limit, rate limit และ origin policy
- [x] Server เป็นผู้คำนวณ pseudonym จาก session; ไม่เชื่อ subject/user/role ที่ client ส่งมา
- [x] ใช้ event-name allowlist และ property schema แยกต่อ event; ปฏิเสธ unknown key และ oversized value
- [x] เก็บ failure code ได้เฉพาะ `validation`, `rate_limited`, `network`, `server_error`
- [x] ไม่รับ search query, topic/comment/AI text, email, username, IP หรือ full User-Agent
- [x] normalize route เป็น route family ที่อนุญาต และหลีกเลี่ยง identifier ที่ไม่จำเป็น
- [x] รองรับ idempotent retry โดยไม่เพิ่ม event ซ้ำ
- [x] Instrument page/search/open/create/comment/like/bookmark/follow/feed/onboarding/evaluation/feedback ตาม allowlist เท่านั้น
- [x] ยืนยันด้วย test ว่าไม่มี network event ก่อน consent, หลัง withdrawal หรือเมื่อ consent lookup ล้มเหลว
- [x] แยก event `attempt / success / failure` และใช้ pseudonymous session/time สำหรับ correlation โดยไม่เก็บเนื้อหา
- [x] แยก pilot campaign/data scope ออกจากข้อมูลจริงอย่างตรวจสอบได้
- [x] เพิ่ม PII canary tests ทั้ง payload, database row, logs และ export

## 7. Phase 4 — Dashboard, metrics และ export

### Metrics

- [x] สร้าง metric functions ที่มี contract เดียวระหว่าง Dashboard, CSV และ tests
- [x] แสดง numerator/denominator และช่วงเวลาในทุก rate
- [x] คำนวณ consent count, response count และ response rate จาก campaign snapshot ที่ตกลงแล้ว
- [x] คำนวณ sessions และกิจกรรมสำคัญตาม session contract
- [x] คำนวณ search-to-open ภายใน 5 นาทีใน subject/session เดียวกันโดยไม่ต้องเก็บคำค้น
- [x] คำนวณ create topic/comment success rate จาก attempt events ที่ valid
- [x] สรุป Like, Bookmark, Follow และ Community/Following/For You usage
- [x] คำนวณ SUS count, mean, median, standard deviation ตาม metric contract, min, max และ distribution
- [x] เทียบ self-reported tasks กับ observed eventsโดยแสดง `observed`, `not_observed`, `unavailable` แยก และไม่ตีความ consent/event ที่ขาดเป็น failure
- [x] สรุป Feedback ตาม category, priority, status และ controlled issue themes
- [x] บังคับ subgroup suppression เมื่อ `n < 5` ทั้งหน้า Dashboard และไฟล์ export
- [x] ป้องกัน filter combination หรือ row ที่เปิดเผยบุคคลโดยตรง โดย suppress ทั้ง breakdown เมื่ออาจอนุมานกลุ่มเล็กด้วยการลบ

### Admin UI

- [x] ทำ `/admin/analytics` พร้อม filter campaign/date/respondent type/experience/device
- [x] ใช้ `requireAdmin()` ทั้ง page reads, metric DAL และ export endpoint; `teacher` ได้ redirect/403 ตาม contract
- [x] เพิ่ม loading, empty, invalid-filter, partial-data และ query-error states
- [x] แสดง “ข้อมูลยังไม่พอ (n < 5)” แทนค่าที่ถูก suppress
- [x] แสดง methodology/denominator ใกล้กราฟหรือตาราง ไม่ซ่อนไว้เฉพาะ tooltip
- [x] ตรวจ query ด้วย fixture 100,000 events และ `EXPLAIN` บน `test_e2e`: event aggregate 268.35 ms, search-to-open 479.99 ms; พบ campaign และ subject/session indexes

### Chapter 4–5 export

- [x] ทำ endpoint ดาวน์โหลด ZIP ที่ตรวจ Admin/Super Admin ซ้ำฝั่ง server
- [x] สร้าง `chapter4_summary.csv`
- [x] สร้าง `sus_results.csv`
- [x] สร้าง `task_results.csv`
- [x] สร้าง `analytics_funnels.csv`
- [x] สร้าง `feedback_themes.csv`
- [x] สร้าง `methodology.md`
- [x] สร้าง `data_dictionary.md`
- [x] ใส่ UTF-8 BOM ในทุก CSV และ quote field ตาม RFC 4180
- [x] ป้องกัน CSV formula injection สำหรับค่าที่ขึ้นต้นด้วย `=`, `+`, `-`, `@`, tab หรือ carriage return
- [x] ไม่ export name, email, username, user ID, pseudonym, raw event ID, secrets, internal notes หรือ raw open text ที่อาจมี PII
- [x] ใส่ campaign, generated-at, filters, denominator, suppression rule และข้อจำกัดของข้อมูลใน methodology
- [x] ทดสอบ ZIP entries, encoding, CSV parser round-trip, deterministic headers และ memory/time budget

## 8. Phase 5 — UX, accessibility และ documentation

- [x] กำหนดทางเข้า `/feedback` ที่ไม่เพิ่ม floating primary action ตัวที่สองและไม่ทำลาย Bottom Navigation contract
- [x] ใช้ภาษาไทยเป็นหลัก, Lucide icons, semantic design tokens และ status colors ตาม `.md/design/`
- [x] ตรวจ 5 palettes × Light/Dark สำหรับ Dashboard/Feedback รวม 20 screenshots พร้อม contrast assertion อย่างน้อย 4.5:1
- [x] ตรวจ keyboard order, visible focus, labels, fieldset/legend, error association, live region และ focus restoration
- [x] ตรวจ semantic flow ที่ Screen Reader ใช้ของ Evaluation, Feedback, filters, tables และ export ผ่าน roles/names/captions/live regions บน Chromium/Firefox/WebKit; manual NVDA/VoiceOver ยังคงเป็น Preview/pilot gate
- [x] ตรวจ 375×812 และ 1280×800 ใน Light/Dark บน Chromium/Firefox/WebKit; ไม่พบ horizontal overflow หรือ error overlay
- [x] ตรวจ pending/error/retry/double-submit/offline-like failure โดย draft ไม่หายและฐานมี Feedback เพียง 1 row หลัง retry ซ้ำ
- [x] อัปเดต Privacy Policy ด้วย consent purpose, event categories, retention, withdrawal, processors และ contact
- [x] อัปเดต Terms, root README, `.env.example` และเอกสาร setup โดยไม่ใส่ secret จริง
- [x] บันทึก implementation decisions, viewport/theme/browser และผลทดสอบไว้ใน `.md/features/`
- [x] บันทึก decision/evidence ของ visual/UX ที่ `.md/design/` ตาม design handoff

## 9. Phase 6 — Verification, pilot และ rollout

- [x] Unit: SUS, statistics, HMAC, consent, allowlist, route normalization, denominator, suppression, retention, CSV และ ZIP
- [x] Integration: campaign transitions, duplicate/concurrent retry, withdrawal, consent deletion, retention และ role matrix ผ่าน unit + isolated DB smoke + E2E
- [x] E2E: Evaluation, Feedback, Admin triage, Dashboard และ Export บน Chromium/Firefox/WebKit
- [x] E2E ยืนยัน guest/user/teacher เข้า admin page และ replay admin Server Action โดยตรงไม่ได้; Analytics endpoint ปฏิเสธ guest, no-consent และ cross-origin แล้ว
- [x] E2E ยืนยันไม่มี event ก่อน consent และไม่มี PII ใน event/export
- [x] รัน `npm.cmd run lint`
- [x] รัน `npm.cmd run test:unit` ผ่าน 85/85 หลังเพิ่ม Preview/Pilot readiness guards และ protected-access tests
- [x] รัน `npm.cmd run build`
- [x] รัน migration/preflight/check บน isolated `_e2e`
- [x] รัน `npm.cmd run preview:research:validate` แบบ local-only ผ่าน: branch/project/ฐาน `_e2e` และตัวแปร allowlist 29 รายการ
- [x] รัน Playwright Phase 2 แบบ serial ด้วย isolated `_e2e` ผ่าน 12/12, Phase 3 Analytics ผ่าน 9/9 และ Phase 4 Dashboard/Export ผ่าน 6/6 บน Chromium/Firefox/WebKit พร้อม cleanup fixture; ยังไม่เปิด parallel จนกว่าจะมี per-worker isolation
- [x] รัน Phase 5 focused clean reruns ผ่านรวม 22 tests และตั้งใจ skip palette matrix 2 ครั้งใน Firefox/WebKit; fixture users/campaigns หลังจบเหลือ 0
- [ ] ทำ pilot 5–10 คน แยก campaign/data จากรอบจริง และบันทึกข้อแก้ไขคำถาม
- [ ] ล็อก questionnaire/campaign หลังผ่าน pilot ก่อนเก็บข้อมูลจริง
- [x] สร้าง Preview branch-scoped variables 29 รายการสำหรับ `codex/feedback-research-analytics` โดยใช้ `test_e2e`, secret แยก, ปิด runtime write opt-ins และปิด external services ที่ไม่จำเป็น
- [x] อ่าน metadata กลับและยืนยันว่าทั้ง 29 variables อยู่เฉพาะ branch + Preview โดยไม่มี missing, duplicate, wrong branch หรือ wrong target ก่อนเปิด Git deployment
- [x] รัน protected Preview smoke บน Chromium ผ่าน 11/11 รวม role/security, consent/evaluation/feedback, Dashboard/export, 5 palettes × Light/Dark และ responsive 375×812/1280×800
- [x] ตรวจ Preview build/runtime logs: build สำเร็จ, ไม่พบ error/fatal หรือ 5xx; รหัส 4xx ที่พบมาจาก negative security/validation tests ตามตั้งใจ
- [x] รัน post-smoke `db:check:e2e` ผ่าน 11/11 และทุก integrity counter เป็น 0; fixture users/campaigns เหลือ 0
- [x] ยืนยันรอบนี้ว่าไม่ได้ promote E2E Preview, ย้าย test rows, migrate/deploy Production หรือ execute retention
- [x] เตรียม Pilot runbook, decision sign-off sheet, session record, manual accessibility script, Go/No-Go และ incident/cleanup boundary แล้ว
- [x] เพิ่ม local-only `pilot:research:validate`, config ตัวอย่างที่เริ่มแบบ blocked และ tests เพื่อบังคับ branch/project/`test_e2e`, 11 decisions, 5–10 participant codes, versions, UTC/retention, owner/tester และ quiet-window gates ก่อนเปิด campaign
- [ ] ทำ manual NVDA/VoiceOver check ใน Preview/pilot และบันทึกผล
- [ ] ก่อน Production migration ต้องยืนยัน target, backup, checksum/restore plan และได้รับอนุญาตเฉพาะรอบนั้น
- [ ] หลัง Production deploy ให้ smoke consent/evaluation/feedback/admin/export ด้วยข้อมูล QA ที่ติดป้ายและ cleanup ได้
- [x] บันทึก Preview source commit, deployment ID/URLs, test counts, database cleanup, known limits และ rollback boundary ใน Checkpoint 08
- [ ] บันทึก Production migration/deployment URL และผลหลัง deploy เมื่อผ่าน pilot และได้รับอนุญาตแล้วเท่านั้น

## 10. Commit plan

1. `feat: add feedback analytics database and privacy core`
2. `feat: add evaluation and feedback workflows`
3. `feat: add consent-gated research analytics ingestion`
4. `feat: add consented analytics dashboard and export`
5. `test: verify feedback research analytics rollout`
6. `docs: document feedback research analytics release`
7. `chore: prepare isolated research preview configuration`
8. `chore: bootstrap isolated research preview branch`
9. `chore: enable isolated research preview deployment`
10. `test: verify protected research preview release`
11. `docs: prepare research pilot execution pack`
12. `test: add research pilot readiness guard`

ทุก commit ให้ stage เฉพาะไฟล์ใน scope และมี scoped tests ที่เกี่ยวข้อง ห้ามรวม presentation artifacts, `output/`, `tmp/`, `.codex-artifacts/` หรือเอกสาร Phase 2 ที่ยังไม่ได้ตัดสินใจ

## 11. First implementation slice

เริ่มงานรอบแรกเฉพาะ database/privacy foundation เพื่อให้ review ง่ายและย้อนกลับแอปได้:

- [x] ปิด decision เรื่อง field sensitivity, retention และ campaign lifecycle ที่กระทบ schema
- [x] เขียน unit tests ของ SUS/HMAC/allowlist/CSV sanitizer ก่อน utility implementation
- [x] เพิ่ม migration 005 และ schema fingerprint/integrity tooling
- [x] เพิ่ม consent/pseudonym modules แบบ `server-only` พร้อม tests
- [x] ทดสอบ fresh, upgrade และ partial migration บนฐานชั่วคราว/`_e2e`
- [x] ส่ง checkpoint พร้อม diff, test results, schema diagram แบบข้อความ และประเด็นที่ต้องยืนยันก่อน Phase 2

ยังไม่เริ่ม UI, instrumentation, Vercel configuration, Production migration หรือ deployment ใน slice แรก

## Implementation log

### 7 กันยายน 2569 — Planning และ readiness — Codex

- อ่านแผนฟีเจอร์, review handoff, design contracts และคู่มือ Next.js ที่ติดตั้งจริง
- ตรวจ current branch/HEAD และพบงานเอกสารกับ artifacts อื่นค้างอยู่ จึงยังไม่สร้างหรือ switch branch
- ยืนยัน code baseline: lint ผ่าน, unit 15/15, production build ผ่านบน Next.js 16.3.4
- ยืนยัน isolated database baseline: `db:check:e2e` ผ่าน 11/11 tables และ integrity counters ทุกค่าเป็น 0
- ยังไม่มี production code/database/environment/deployment change และยังไม่มี commit/push จากการเตรียมรอบนี้

### 7 กันยายน 2569 — Checkpoint 01 database/privacy foundation — Codex

- สร้าง branch `codex/feedback-research-analytics` จาก baseline commit โดยรักษา dirty/untracked artifacts เดิมทั้งหมด
- เพิ่ม data/privacy contract, migration 005 จำนวน 5 ตาราง, schema fingerprint และ integrity checks โดยไม่แก้ migration 001–004
- เพิ่ม SUS/statistics/event/route/CSV utilities, HMAC privacy core และ transactional consent grant/withdraw พร้อม tests
- แก้ migration checksum ให้คงที่ข้าม LF/CRLF; เนื้อหาอื่นยังถูกตรวจจับว่า checksum เปลี่ยน
- ยืนยัน lint ผ่าน, unit 33/33 และ production build ผ่านบน Next.js 16.3.4
- ยืนยัน isolated `_e2e`: upgrade 004 → 005, idempotent rerun, consent withdrawal smoke, fresh install และ partial-schema guard ผ่าน; temporary databases และ smoke rows ถูก cleanup
- `db:check:e2e` หลัง smoke ผ่าน โดย migration 005 integrity counters ทั้ง 15 ค่าเป็น 0
- ยังไม่เริ่ม UI/API instrumentation/retention job/Preview/Production และยังไม่มี commit, push หรือ deployment

### 8 กันยายน 2569 — Checkpoint 02 retention และ safe audit — Codex

- เพิ่ม retention cleanup สำหรับ raw Analytics 180 วัน, Evaluation ตาม campaign deadline และ Feedback ตาม record deadline โดยใช้เวลา UTC จากฐานข้อมูล
- ค่าเริ่มต้นเป็น dry-run; execute ใช้ transaction/rollback, write opt-in และ Production opt-in ชั้นที่สอง
- เพิ่ม safe aggregate audit formatter และ PII canary tests; arbitrary payload/error message ไม่ถูกส่งออก log
- Unit tests รวมผ่าน 40/40, lint ผ่าน และ production build ผ่านบน Next.js 16.3.4
- E2E ผ่าน dry-run, selective deletion, 179-day/future survivor, idempotent rerun และ fixture cleanup
- Post-cleanup `db:check:e2e` ผ่านและ integrity counters ทุกค่าเป็น 0
- ยังไม่ตั้ง schedule, แตะ Production, สร้าง Preview, deploy, commit หรือ push

### 8 กันยายน 2569 — Checkpoint 03 Evaluation/Feedback workflows — Codex

- เพิ่ม `server-only` DAL, Server Actions และ role boundary สำหรับ member, Admin และ Super Admin โดยตรวจสิทธิ์ซ้ำในทุก mutation
- เพิ่มหน้า `/feedback`, `/admin/feedback` และ `/admin/analytics` สำหรับ campaign management; metrics/export ยังไม่เริ่ม
- เพิ่ม SUS 10 ข้อและงานทดลอง 5 งานแบบ pilot, validation ฝั่ง server, SUS calculation, idempotency และ evaluation withdrawal แบบ tombstone
- เพิ่ม Feedback submission/triage, member-safe/admin-safe DTO และ audit metadata ที่ไม่เก็บ internal note
- ปิด consent bypass ของ UI โดยตรวจ acknowledgement ฝั่ง server และล็อก questionnaire/evaluation notice version ที่ UI รองรับก่อนเปิด campaign
- Unit tests ผ่าน 49/49; workflow database smoke ผ่าน; Playwright แบบ serial ผ่าน 12/12 บน Chromium, Firefox และ WebKit
- ตรวจภาพ 375×812 Light และ 1280×800 Dark ครบสาม browser engines ไม่พบ horizontal overflow หรือ error overlay; fixture E2E ถูก cleanup เหลือ 0
- ยังไม่เริ่ม analytics ingestion, Dashboard metrics, ZIP export, Preview, Production, deployment หรือ push

### 9 กันยายน 2569 — Checkpoint 04 consent-gated Analytics ingestion — Codex

- เพิ่ม `POST /api/analytics/events` แบบ dynamic/no-store พร้อม same-origin JSON policy, streaming 32 KiB cap, 20-event batch cap และ generic error response
- ตรวจ session และ shared database rate limit ใน `server-only` DAL จากนั้น lock active consent และ campaign ภายใน transaction เดียวกับ event insert
- ใช้ subject key จาก consent ที่สร้างฝั่ง server และ HMAC browser-session UUID ก่อนบันทึก; ไม่รับ user/role/subject/IP/User-Agent หรือข้อความจาก client
- เพิ่ม client gate แบบ fail-closed: ไม่สร้าง session หรือส่ง request ก่อน consent, ล้าง session เมื่อถอน และตรวจ allowlist ฝั่ง client ซ้ำก่อน network
- Instrument event v1 ครบ page/search/open/create/comment/like/bookmark/follow/feed/onboarding/evaluation/feedback; create/comment แยก attempt/success/failure
- จำกัด `occurredAt` ไม่เก่ากว่า 24 ชั่วโมงและไม่เกินเวลา server มากกว่า 5 นาที; evaluation event ต้องผูก open pilot campaign ที่อยู่ในช่วงเวลา
- Unit tests ผ่าน 59/59; production build/lint ผ่าน; Analytics Playwright ผ่าน 9/9 และ regression Phase 2+3 รอบสุดท้ายผ่านรวม 21/21 แบบ serial บน Chromium, Firefox และ WebKit
- E2E ยืนยัน no network ก่อน consent/หลัง withdrawal, PII/authority field rejection, route normalization, HMAC session key, duplicate retry และ raw-event deletion
- ยังไม่เริ่ม Dashboard metrics, ZIP export, Preview, Production, deployment หรือ push

### 9 กันยายน 2569 — Checkpoint 05 Dashboard, metrics และ Chapter 4–5 export — Codex

- เพิ่ม metric core และ read-snapshot DAL สำหรับ campaign/date/demographic filters โดย Dashboard/CSV/tests ใช้ DTO และนิยามเดียวกัน
- แสดง numerator, denominator, ช่วง UTC และ deduplication ใกล้ทุก rate; subgroup response rate แสดง unavailable เมื่อไม่มี denominator snapshot รายกลุ่ม
- เพิ่ม search-to-open 5 นาที, create success, sessions, engagement/feed, SUS sample SD/distribution, self-reported เทียบ observed และ Feedback aggregate
- บังคับ `n < 5` suppression หลัง filter และ suppress ทั้ง breakdown เมื่อการแสดงแถวอื่นอาจใช้อนุมานกลุ่มเล็ก
- เพิ่มหน้า Dashboard, loading/empty/invalid/partial/query-error states และ ZIP 7 entries ที่เป็น aggregate-only พร้อม UTF-8 BOM, RFC 4180 และ formula-injection guard
- Unit tests รวมผ่าน 73/73; production build/lint ผ่าน; Dashboard/Export Playwright ผ่าน 6/6 บน Chromium, Firefox และ WebKit
- Regression รวม Phase 2–4 ผ่าน 27/27 ใน 4.4 นาทีบน Chromium, Firefox และ WebKit; post-run fixture user/campaign เหลือ 0
- Performance fixture 100,000 events บน `test_e2e`: complete metric read 2,735.48 ms, event aggregate 268.35 ms, search-to-open 479.99 ms; `EXPLAIN` พบ indexes ที่ตั้งใจและ primary queries ต่ำกว่า 2 วินาที
- ตรวจภาพ 375×812 Light และ 1280×800 Dark จาก Chromium ด้วยตา และทุก engine ผ่าน overflow/no-error assertions; fixture performance/E2E ถูก cleanup เหลือ campaign/user 0 และ `db:check:e2e` ผ่าน integrity ทุกค่าเป็น 0
- ยังไม่ตรวจ 5 palettes, Screen Reader แบบเต็ม, Preview, pilot หรือ Production และยังไม่มี push/deploy

### 9 กันยายน 2569 — Checkpoint 06 accessibility, failure UX และ release docs — Codex

- เพิ่ม shared Server Action feedback สำหรับ pending, persistent live region, error focus และ offline retry โดยไม่ล้าง draft
- เพิ่ม nested error boundary ของ `/feedback` และ `/admin/analytics`; Dashboard tables รองรับ keyboard scroll/focus และ export มีคำอธิบาย aggregate-only 7 ไฟล์
- ตรวจ 5 palettes × Light/Dark ครบ 20 screenshots บน Chromium; contrast token pairs สำคัญผ่าน 4.5:1 และไม่พบ horizontal overflow
- ตรวจ roles/names, fieldset/legend, table captions, error association/live region, keyboard order และ focus restoration บน Chromium/Firefox/WebKit; manual NVDA/VoiceOver ยังรอ Preview/pilot
- Offline + reconnect + double-submit E2E ยืนยันฐานเหลือ Feedback 1 row; Server-side idempotency ยังเป็นชั้นป้องกันหลัก
- Focused clean cross-browser reruns ผ่าน 22 tests และ skip palette matrix 2 ครั้งตามตั้งใจ; Firefox browser-close glitch จากรอบแรกไม่เกิดซ้ำในการแยกรัน
- Lint, unit 73/73, production build และ `db:check:e2e` ผ่าน; fixture users/campaigns ของชุดวิจัยเหลือ 0
- อัปเดต Privacy, Terms, README, `.env.example`, setup/release runbook, data contract และ visual decision record โดยไม่ใส่ secret จริง
- Phase 5 อยู่ใน commit `234735a`; ยังไม่ push, deploy, migrate Production หรือ execute retention

### 9 กันยายน 2569 — Checkpoint 07 isolated Preview configuration guard — Codex

- เพิ่ม helper เฉพาะ branch `codex/feedback-research-analytics` โดยล็อก ITHub project/team และไม่มี Production target
- บังคับ source database เป็น isolated `_e2e` ผ่าน safety guard เดิม และสร้าง database identity แบบ hash โดยไม่บันทึก credential
- สร้าง Preview-only session, Server Action และ Analytics HMAC secrets ใหม่คนละค่า; ไม่ reuse ค่าจาก local/Production
- ตั้ง runtime Preview ให้ E2E writes และ retention writes เป็น `false`; เปิด For You สำหรับตรวจ instrumented flow และปิด Pusher/Gemini/Cloudinary ด้วย placeholder
- ส่งค่าตัวแปรผ่าน stdin ให้ Vercel CLI, mark sensitive fields และหลักฐาน local เก็บเฉพาะชื่อ 29 ตัวแปร/branch/database/hash/status
- Read-only Vercel audit พบ branch นี้มี override 0 รายการ ขณะที่ project-level Preview มี 22 keys ที่ share scope กับ Production จึงยืนยันว่าต้องตั้ง branch overrides ก่อน push
- Unit tests ครอบคลุม branch/project rejection, variable isolation, no Production CLI target, secret reuse และฐานที่ไม่ลงท้าย `_e2e`
- Remote-write path ไม่มี `--force` และมี metadata preflight ที่ปฏิเสธ branch ซึ่งมี override อยู่แล้ว เพื่อไม่หมุน secrets/key version โดยปริยาย
- `npm.cmd run preview:research:validate` ผ่านบน project link ปัจจุบันด้วยสถานะ `validated-local-only`; ยังไม่ได้เรียก Vercel API หรือเปลี่ยน environment ภายนอก
- ยังไม่ push, deploy, migrate Production หรือ execute retention

### 10 กันยายน 2569 — Checkpoint 08 isolated Preview verification — Codex

- สร้าง branch บน remote แบบปิด Git deployment ชั่วคราวก่อน แล้วตั้ง variables 29 รายการเฉพาะ `codex/feedback-research-analytics` + Preview โดยไม่สร้าง deployment ที่อาจ inherit Production
- ยืนยัน metadata หลังตั้งค่า: 29/29, ไม่มี missing/unexpected/duplicate/wrong-branch/wrong-target; ฐานคือ `test_e2e`, secret แยก และ runtime E2E/retention writes เป็น `false`
- เปิด Git deployment หลัง isolation พร้อมแล้ว; deployment `dpl_5f2pGBEohdTp5a3anKgLt6UVCsTx` จาก `ea8dfa5` อยู่สถานะ READY และยังเปิด Vercel Authentication
- เพิ่ม harness สำหรับ temporary protected-Preview access โดยจำกัด origin ให้ตรง immutable deployment และไม่เก็บ share token ใน Git
- Full Preview Chromium smoke ผ่าน 11/11 ใน 4.0 นาที ครอบคลุม security/roles, consent/evaluation/feedback, Dashboard/export, visual matrix และ responsive assertions
- Runtime scan ไม่พบ error/fatal หรือ 5xx; post-smoke database check ผ่าน 11/11, integrity counters เป็น 0 และ fixture users/campaigns เหลือ 0
- Local unit ผ่าน 79/79, lint ผ่าน และ build ผ่านบน Next.js 16.3.4; Production ยังไม่ถูก migrate, deploy, promote หรือรัน retention

### 10 กันยายน 2569 — Checkpoint 09 Pilot execution readiness — Codex

- เพิ่ม Pilot runbook ที่รวม decision sign-off, campaign sheet, participant/session record, task script, manual NVDA/VoiceOver procedure, Go/No-Go และ incident boundary
- ตรวจ checklist drift แล้วปิดรายการที่มีหลักฐาน implementation/test แล้ว: member opt-in Analytics scope, bounded GET-route ZIP, self-reported/observed separation และ internal-note exclusion
- กำหนดให้ใช้ participant code `P01`–`P10`, campaign scope `pilot`, ฐาน `test_e2e` และห้ามคัดลอกชื่อ/อีเมล/รหัสนักศึกษาลง session record
- บันทึกข้อจำกัดเครื่องปัจจุบัน: Chrome/Edge พร้อม แต่ไม่มี NVDA; VoiceOver ต้องใช้ macOS จึงยังไม่อ้างผล manual assistive-technology
- ยังไม่สร้าง/เปิด campaign, เชิญผู้เข้าร่วม, lock questionnaire, migrate/deploy Production หรือ execute retention

### 10 กันยายน 2569 — Checkpoint 10 fail-closed Pilot readiness guard — Codex

- เพิ่ม config contract แบบ strict และ validator ที่อ่านเฉพาะไฟล์ local เพื่อหยุดก่อนเริ่ม Pilot หาก branch/project/ฐาน, scope/version, participant snapshot, UTC/retention, decision/owner/tester หรือ quiet window ไม่ครบ
- ตัวอย่าง config ตั้ง decision เป็น `pending`, owner/tester ว่าง และ confirmation เป็น `false` โดยตั้งใจ; ไฟล์ใช้งานจริงอยู่ใต้ `.vercel/release-evidence/` ซึ่งถูก Git ignore
- รายงานแสดงเฉพาะ participant codes และบัญชี alias สังเคราะห์ ไม่รับ password/token/secret หรือ field นอก allowlist และไม่เชื่อมต่อเครือข่าย/ฐานข้อมูล
- Targeted tests ผ่าน 6/6, unit รวม 85/85, lint ผ่าน; คำสั่งจริงบล็อกเมื่อ config หาย และผ่าน `ready` 11/11 ด้วย fixture ที่ครบก่อนลบ fixture ทิ้ง
- Guard ตรวจความครบถ้วนของข้อมูลที่กรอก ไม่ได้พิสูจน์ตัวตนหรือลายเซ็นผู้อนุมัติ; decision sign-off, ผู้เข้าร่วม, NVDA/VoiceOver และ Pilot จริงยังคงรอคนดำเนินการ
- ยังไม่ได้สร้างบัญชี/campaign, เขียนฐานข้อมูล, เรียกบริการภายนอก, migrate/deploy/promote Production หรือ execute retention
