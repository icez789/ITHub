# ITHub — System Review Handoff

> วันที่ตรวจ: 2026-08-13 (Asia/Bangkok)
> ผู้ตรวจ: Codex
> สถานะ: ตรวจแบบ read-only เป็นหลัก ไม่มีการแก้ production code
> โปรดอ่านไฟล์นี้ก่อนเริ่มแก้ระบบ และตรวจ `git status` ก่อนทุกครั้ง เพราะ workspace มีงานอื่นที่ยังไม่ถูก track

## 1. Executive summary

ระบบ build ได้และ critical public flows ทำงานได้ครบเมื่อรันแบบ serial บน Chromium, Firefox และ WebKit แต่ยังไม่ควรถือว่า production-ready จนกว่าจะแก้ประเด็นสำคัญต่อไปนี้:

1. **P1 — Privacy:** realtime notification ใช้ Pusher public channel (`user-{id}`) ทำให้ client อื่นสามารถเดา user ID แล้ว subscribe เพื่ออ่านข้อความแจ้งเตือนได้
2. **P1 — UX desktop:** sidebar แบบ `fixed` วางทับ content 64px; หัวข้อ ปุ่มย้อนกลับ และขอบซ้ายของ banner ถูกบังบน desktop
3. **P1 — Data integrity:** หน้าแก้โปรไฟล์ update username/bio ก่อนตรวจรหัสผ่านเดิมและยืนยันรหัสผ่านใหม่ จึงเกิด partial write ได้แม้ flow เปลี่ยนรหัสผ่านล้มเหลว
4. **P1 — Reproducibility:** repository ไม่มี schema/migration/seed ของฐานข้อมูล ทำให้ setup ระบบใหม่จาก source อย่างเดียวไม่ได้
5. **P2 — Test reliability:** Playwright ถูกตั้งให้ parallel กับ shared DB; parallel run ล้มเหลว/timeout แต่ serial run ผ่าน ทำให้ CI/local result ไม่นิ่ง

ผลตรวจหลัก:

- `next build`: **ผ่าน** (Next.js 16.3.0, 19 routes)
- scoped ESLint (`app components lib tests ...`): **ผ่าน**
- `npm run lint`: **ค้างเกิน 100 วินาที** เพราะ script scan กว้างและ workspace มี output จำนวนมาก
- Playwright serial, 3 engines: **27 passed, 9 skipped** (3 authenticated tests × 3 engines ถูก skip เพราะไม่มี E2E credentials)
- Playwright Chromium serial: **9 passed, 3 skipped**
- browser smoke test: desktop + mobile + topic detail; console **ไม่มี warning/error**
- `npm audit --omit=dev`: **1 low severity** (`quill` XSS advisory GHSA-v3m3-f69x-jf25)
- `npm ls --depth=0`: **ผ่าน**, ไม่มี invalid/missing dependency

## 2. Architecture and user story

ITHub เป็น community board บน Next.js App Router:

```text
Browser UI
  -> Server Components (reads)
  -> Server Actions (mutations)
  -> MySQL/TiDB
  -> Pusher (realtime), Cloudinary (images), Gemini (AI)
  -> RSC/redirect/revalidation กลับสู่ UI
```

Flow สำคัญที่ตรวจ:

- guest: home, search, category filter, topic detail, information pages, dark mode, responsive navigation, AI chat shell
- auth guard: notifications และ create redirect ไป login
- engagement: signed-out controls disabled และ expired-session error แสดงในจุดเดิม
- backend review: auth/session, validation, sanitization, SQL, transactions, moderation, uploads, rate limiting, realtime notifications, AI calls
- admin review: role checks, ban/promote, reports, delete cascade

## 3. Findings ordered by priority

### P1 — Pusher notification channels are public

Evidence:

- `components/NotificationBell.js:22` subscribe ที่ `user-${currentUserId}`
- `app/topic/[id]/page.js:194`, `:254`, `:343` trigger เข้า channel รูปแบบเดียวกัน
- ไม่มี private/presence channel, channel authorization route หรือ server-side subscription authorization ใน repository
- `NEXT_PUBLIC_PUSHER_KEY` และ cluster ต้องเปิดเผยที่ client ตามปกติ ดังนั้นชื่อ public channel ที่เดาได้จาก sequential user ID ไม่ใช่ access control

Impact:

- ผู้ใช้ที่รู้ public key/cluster สามารถ subscribe `user-1`, `user-2`, ... และอ่านข้อความ notification ของผู้อื่นได้
- payload มี username, link และในกรณี report มี reason ซึ่งอาจเป็นข้อมูลที่ไม่ควรเผยแพร่

Recommended fix:

1. เปลี่ยนเป็น `private-user-${id}`
2. เพิ่ม Pusher auth endpoint/Route Handler ที่อ่าน session บน server และอนุญาตเฉพาะ `session.user.id === channel user id`
3. ห้ามรับ user ID/role จาก client มาเป็นหลักฐานสิทธิ์
4. เพิ่ม integration test: user A subscribe channel A ได้ แต่ channel B ถูก 403

### P1 — Fixed desktop sidebar obscures content

Evidence:

- `components/Sidebar.js:75`: sidebar เป็น `fixed`, `w-16`, hover เป็น `w-64`
- `app/layout.js:48`: content column ไม่ได้เผื่อ `md:ml-16` หรือวาง sidebar ใน normal flex flow
- browser ที่ 1280×720: `#main-content` เริ่ม `x=0`; heading หน้าแรกเริ่ม `x=32`; sidebar ครอบช่วง `x=0..64`
- ภาพที่ตรวจจริงเห็นตัวอักษรซ้ายของ “รายการกระทู้”, ปุ่ม “กลับหน้าหลัก” และขอบซ้ายของ hero/topic card ถูกบัง
- mobile 375×812 ไม่พบ horizontal overflow เพราะ sidebar ถูกซ่อนที่ breakpoint นี้

Recommended fix:

- ทางเลือกง่าย: เพิ่ม `md:ml-16` ให้ content shell และกำหนด behavior ตอน sidebar expand ว่าจะ overlay หรือ push content
- ทางเลือกโครงสร้าง: เอา `fixed` ออกและให้ sidebar เป็น flex child ที่ `shrink-0`
- เพิ่ม visual assertion ว่า bounding box ของ main content มี `x >= sidebar collapsed width`

Accessibility ที่เกี่ยวข้อง:

- DOM snapshot อ่าน accessible name ซ้ำ เช่น “หน้าแรก หน้าแรก” เพราะ label และ tooltip อยู่ใน accessibility tree พร้อมกัน
- expansion ใช้เฉพาะ `group-hover`; sighted keyboard user ไม่เห็น label เมื่อ focus
- ใส่ `aria-hidden="true"` ให้ tooltip และรองรับ `group-focus-within`/focus-visible

### P1 — Profile update can partially commit

Evidence:

- `app/profile/edit/page.js:46` update username/bio ก่อน
- เริ่มตรวจ password flow ที่ `:54`
- ตรวจ password confirmation ที่ `:70`

Reproduction logic:

1. กรอก username/bio ใหม่
2. กรอกรหัสผ่านเดิมผิด หรือ confirm รหัสผ่านใหม่ไม่ตรง
3. action redirect กลับ error แต่ username/bio ถูก update ไปแล้ว

Impact:

- UI แจ้งว่าการแก้ไขล้มเหลว แต่ข้อมูลบางส่วนเปลี่ยนจริง
- ถ้า username ใหม่ชน unique constraint จะไม่เข้า password flow เลย

Recommended fix:

- validate ทุก field และ verify old password ก่อน mutation ใด ๆ
- หรือครอบ profile + password updates ใน transaction เดียวแล้ว commit เมื่อทุกเงื่อนไขผ่าน
- expected validation errors ควร return structured state ให้ UI แทนการใช้ redirect ทุกกรณี
- เพิ่ม integration test ยืนยัน rollback เมื่อ old password ผิด/confirmation ไม่ตรง

### P1 — Database cannot be reproduced from repository

Evidence:

- ไม่พบ `CREATE TABLE`, migration, schema, seed หรือ foreign-key/index definition นอก `node_modules`
- README บอกให้ “สร้างฐานข้อมูล MySQL/TiDB” แต่ไม่มี DDL
- correctness หลายส่วนพึ่ง unique/foreign keys เช่น likes, bookmarks, poll votes, reports, topic/comment cascades

Impact:

- agent/developer ใหม่ setup local/CI database ไม่ได้จาก source
- ไม่สามารถยืนยัน constraints ที่ transaction code คาดหวัง
- schema drift ระหว่าง local, test และ production มีโอกาสสูง

Recommended fix:

- เพิ่ม versioned migrations และ seed ขั้นต่ำ
- ระบุ indexes/constraints อย่างน้อย:
  - unique users email/username
  - unique likes `(user_id, topic_id)`
  - unique bookmarks `(user_id, topic_id)`
  - unique poll votes `(poll_id, user_id)`
  - foreign keys และ delete policy ของ topics/comments/polls/notifications/reports
- เพิ่มคำสั่ง `db:migrate`, `db:seed`, `db:check` ใน `package.json`

### P2 — Playwright suite is flaky under configured parallelism

Evidence:

- `playwright.config.js:18` ใช้ `fullyParallel: true`
- `playwright.config.js:24` local workers ใช้ default (ครั้งนี้ 8 workers)
- suite ใช้ shared database และมี test ที่ mutate state (`tests/ithub-flow.spec.js:28` create topic; authenticated tests toggle likes/bookmarks)
- configured parallel run: timeout หลัง 240s, search assertion fail, Firefox context failures และ DB `EACCES` ใน sandbox
- rerun Chromium 8 workers นอก sandbox: 1 search failure, 8 passed, 3 skipped
- rerun search isolated 3 รอบ: 6/6 related cases passed
- serial Chromium: 9 passed, 3 skipped
- serial 3 engines: 27 passed, 9 skipped

Conclusion:

- search defect ไม่ reproduce เมื่อ isolated/serial
- suite/config มี shared-state/load flakiness ชัดเจน

Recommended fix:

- จนกว่าจะ isolate DB ต่อ worker ให้ตั้ง `fullyParallel: false` และ `workers: 1` สำหรับ suite นี้
- แยก test data ด้วย worker-specific account/schema/database
- test create topic ต้อง cleanup record ที่สร้าง
- หลีกเลี่ยง assertion timeout 5s กับ debounce + server render โดยรอ authoritative URL/network state ที่เหมาะสม

### P2 — Authenticated E2E tests are silently skipped in normal local command

Evidence:

- Playwright config มี dotenv import/config ถูก comment ที่ `playwright.config.js:8-10`
- `.env` ไม่มี `ITHUB_E2E_EMAIL/PASSWORD`
- `.env.example` ประกาศสอง key แต่เป็นค่าว่าง
- test อ่าน `process.env` โดยตรง จึงไม่อาศัย env loading ของ Next.js
- ผล: login/create/like-bookmark ถูก skip รวม 9 cases ใน cross-browser run

Recommended fix:

- โหลด `.env.test`/`.env` ใน Playwright config อย่างชัดเจน หรือกำหนด credentials ใน CI secret store
- ใน CI ให้ fail-fast ถ้า credential ไม่มี แทน skip critical authenticated flows
- ใช้บัญชี test แยกจาก admin ตาม README และอย่า commit ค่า credential

### P2 — Realtime/rate-limit architecture is not multi-instance safe

Evidence:

- `lib/rateLimit.js:3-4` เก็บ buckets ใน process memory
- README ยอมรับว่าหลาย instance ควรเปลี่ยนเป็น Redis/KV

Impact:

- limit แยกต่อ instance และ reset เมื่อ cold start/redeploy
- attacker กระจาย request ข้าม instance ได้

Recommended fix:

- ย้าย login/comment/report/poll/create-topic/AI limits ไป shared store ที่รองรับ atomic increment + TTL
- กำหนด trusted proxy policy ก่อนเชื่อ `x-forwarded-for` ใน AI chat (`lib/actions.js:308`)

### P2 — Admin queries over-fetch sensitive rows and do not paginate

Evidence:

- `app/admin/page.js:39` ใช้ `SELECT * FROM users` และโหลดทุก user
- `app/admin/users/page.js:21` ใช้ `SELECT * FROM users` และโหลดทุก user
- row มี password hash ตาม code login/profile แต่ UI ไม่ได้ใช้ password

Impact:

- ดึง password hash และคอลัมน์ที่ไม่จำเป็นเข้าหน่วยความจำ
- dashboard latency/memory โตตามจำนวน user
- ขัดหลัก minimal DTO/DAL ของ Next.js data security guide

Recommended fix:

- ระบุเฉพาะ `id, username, email, role, avatar_url, is_banned, created_at`
- เพิ่ม pagination + total count
- ย้าย query/authorization/DTO ไป DAL ที่ import `server-only`

### P2 — Home page has avoidable DB waterfall

Evidence:

- `app/page.js:74` รอ count
- `app/page.js:90` จึงรอ topic rows
- `app/page.js:91` จึงเริ่ม site stats + categories

Recommended fix:

- สร้าง query promises แล้ว `Promise.all` สำหรับ count, topics, stats และ categories เพราะเป็น independent reads
- ตรวจ index สำหรับ category, created_at, views, user_id และ likes topic_id
- พิจารณา cache เฉพาะ aggregate ที่ stale ได้; user/search-dependent reads ไม่ควร cache แบบกว้าง

### P2 — Rich HTML is trusted again at render time

Evidence:

- create/update/comment paths sanitize ก่อน write (`lib/content.js`)
- render ใช้ `dangerouslySetInnerHTML` ตรงที่ `app/topic/[id]/page.js:412` และ `components/CommentItem.js:145`
- browser test กับ title ที่มี `<script>` ยืนยันว่า React escape title ถูกต้อง และ `.view-ql-editor script` เป็น 0

Risk:

- current write paths ปลอดภัยกว่าของเดิมมาก แต่ legacy rows, direct SQL imports, compromised DB หรือ future write path ที่ลืม sanitize จะกลายเป็น stored XSS ทันที
- README ระบุว่า sanitize “ก่อนแสดงข้อมูลเก่า” แต่ implementation ไม่ได้ sanitize ตอน read/render

Recommended fix:

- ทำ one-time migration sanitize legacy content และบังคับ write ทุกทางผ่าน content service
- ถ้าต้องรองรับข้อมูลเก่า ให้ sanitize ตอน read ชั่วคราวจน migration เสร็จ
- เพิ่ม unit tests สำหรับ script, event handler, `javascript:` URL, target/rel และ malformed HTML

### P3 — Dependency advisory: Quill XSS (low)

Evidence:

- `npm audit --omit=dev`: `quill = 2.0.3`, advisory GHSA-v3m3-f69x-jf25, fix available

Recommended fix:

- ทดสอบ `npm audit fix` ใน branch แยก
- regression test HTML export/editor flow หลัง upgrade
- server sanitization ต้องคงอยู่ แม้ dependency จะถูก patch

### P3 — Lint command scans too broadly

Evidence:

- `package.json:9`: `"lint": "eslint"`
- root มี `deliverables/`, `output/`, `tools/` จำนวนมากและ ESLint ignore ไม่ครอบคลุมโฟลเดอร์เหล่านี้
- `npm run lint` ไม่เสร็จภายในมากกว่า 100s; scoped command ผ่านใน 11.1s

Recommended fix:

- ใช้ script เช่น `eslint app components lib tests next.config.mjs playwright.config.js`
- หรือเพิ่ม `deliverables/**`, `output/**`, `tools/**` ใน global ignores ตาม intent ของ repository

### P3 — Business counters/XP can drift

Static review observations:

- เปลี่ยน accepted solution: `markAsSolution` award XP เฉพาะเมื่อเดิมไม่มี solution; การย้าย solution ไป comment คนใหม่ไม่ transfer/reconcile XP
- ลบ solution/comment/topic ไม่ reconcile XP ที่เคย award
- view tests และ browser visit เรียก `incrementView`; metric เป็น cookie-based และเพิ่มจาก automation/bots ได้

Recommended fix:

- เขียน invariant ของ XP/post_count/view_count ให้ชัด
- ใช้ ledger/event table สำหรับ XP หรือ transaction ที่ย้อนคะแนนได้
- เพิ่ม reconciliation job/test และแยก analytics bot traffic หาก view count ใช้เชิงธุรกิจ

## 4. What is working well

- ใช้ Next.js 16 async APIs ถูกต้อง: `await params`, `await searchParams`, `await cookies()`, `await headers()`
- production build ผ่านทุก route
- Server Actions สำคัญตรวจ auth/role ภายใน action ไม่เชื่อ render-time gating เพียงอย่างเดียว
- SQL user input ใช้ parameter binding เป็นหลัก; dynamic sort/category ถูก allowlist ก่อนประกอบ query
- auth cookie เป็น HttpOnly, SameSite=Lax, Secure ใน production และ HMAC signed
- role/is_banned โหลดใหม่จาก DB ทุก request แทนใส่ role ใน cookie
- topic/comment rich text มี allowlist sanitizer ก่อน write
- image type/size จำกัดที่ 5MB และ Cloudinary allowed formats ถูกจำกัด
- transaction ถูกใช้กับ create topic+poll, vote, like/bookmark, accepted solution และ cascade deletes
- expected external failures ของ Pusher/Gemini ส่วนใหญ่ degrade gracefully
- error.js, global-error.js, not-found.js, loading.js มีครบ
- `next/image` ใช้กับ user content/avatar และกำหนด remote patterns
- responsive public UI โดยรวมดี; mobile ไม่มี horizontal overflow, bottom nav/chat ไม่ชนกัน
- skip link, focus-visible styles, labels, alt text และ reduced-motion rule มีอยู่
- browser console ที่ตรวจไม่มี warning/error
- headers มี nosniff, referrer policy, permissions policy และ frame denial

## 5. Test evidence

### Commands that passed

```powershell
node_modules\.bin\eslint.cmd app components lib tests next.config.mjs playwright.config.js
npm.cmd run build
npm.cmd ls --depth=0
node_modules\.bin\playwright.cmd test --project=chromium --workers=1 --reporter=line
node_modules\.bin\playwright.cmd test --workers=1 --reporter=line
```

Cross-browser serial result:

```text
36 total
27 passed
9 skipped (authenticated flows; credentials absent)
0 failed
duration 1.6m
```

Browser visual/runtime evidence:

- desktop 1280×720: sidebar overlap reproduced on home and topic detail
- mobile 375×812: width 375, document scrollWidth 375, no horizontal overflow
- mobile main scroll container: clientHeight ~686, scrollHeight ~5118
- AI chat button ends above bottom navigation
- topic title containing literal `<script>` rendered as text; no script node inside rich content
- console warning/error count: 0 in inspected browser session

### Checks that did not fully cover behavior

- authenticated login/create/like/bookmark flows were skipped because no E2E credentials are configured
- no unit/integration test suite exists for auth token, authorization, validation, sanitization, transactions, Pusher auth, rate limits or moderation invariants
- no production deployment/log/observability check was performed
- no load, accessibility-standard (axe), visual regression or database migration test exists
- Gemini generation itself was intentionally not called by the E2E test

### Test side effects

- E2E/browser visits to topic pages can increment `views` through `ViewCounter`
- no authenticated topic was created during this review because E2E credentials were absent
- no source code was fixed as part of this review

## 6. Recommended execution order for the next agent

1. Fix Pusher notification privacy and add authorization integration tests
2. Fix desktop sidebar layout + keyboard/accessibility behavior; add desktop visual assertion
3. Make profile update atomic and add rollback tests
4. Add schema migrations/seed/constraints so CI/local setup is reproducible
5. Stabilize Playwright data isolation and credential loading
6. Add backend unit/integration tests (auth, sanitizer, validation, moderation, XP invariants)
7. Remove admin over-fetch/paginate; parallelize home reads
8. Upgrade Quill and tighten CSP/security hardening

After each fix run:

```powershell
npm.cmd run build
node_modules\.bin\eslint.cmd app components lib tests next.config.mjs playwright.config.js
node_modules\.bin\playwright.cmd test --workers=1 --reporter=line
```

Do not turn parallel Playwright back on until each worker has isolated data and cleanup.

## 7. Workspace hygiene at handoff

Before this review, `git status --short --branch` already showed these untracked user-owned directories:

```text
?? deliverables/
?? output/
?? tools/
```

They were not modified as part of the code/system review. The review intentionally adds only:

- `REVIEW_REPORT_FOR_AGENTS.md`
- a pointer in root `AGENTS.md`

Do not delete, reset or include unrelated untracked files in a future commit without explicit confirmation.
