# ITHub Personalized Discovery — Phase 2

| รายการ | ค่า |
| --- | --- |
| สถานะ | Implementation 2.1/2.2 และ full regression ผ่าน — Phase 2.1 Preview READY/smoke ผ่าน; Production รอยืนยัน database target |
| วันที่เริ่ม | 2026-09-03 |
| ผู้ดำเนินการ | Codex |
| Release 2.1 | Follow, Following feed และ Notification preferences |
| Release 2.2 | For You แบบ rule-based และอธิบายเหตุผลได้ |

## Product decisions

- หน้าแรกยังใช้ Community feed ตามล่าสุดเป็นค่าเริ่มต้น
- รายการติดตามเป็นข้อมูลส่วนตัว ไม่แสดงจำนวนหรือรายชื่อผู้ติดตามต่อสาธารณะ
- For You ใช้เฉพาะหมวดและผู้เขียนที่ผู้ใช้เลือกติดตาม ไม่ใช้ประวัติการอ่านหรือ AI
- Comment, Like และ Solution notifications เปิดตามค่าเริ่มต้น; Follow notifications ปิดตามค่าเริ่มต้น
- Guest ใช้ Community feed เดิม และ personalized feed แสดง Login CTA โดยไม่อ่านข้อมูลส่วนบุคคล
- หมวดหมู่ยังคงเป็น `Hardware`, `Software`, `Network`, `AI & Data`, `General`

## Checklist

### Milestone 0 — เอกสารและ Baseline

- [x] ตรวจ Home feed, Topic, Authentication และ Notifications ปัจจุบัน
- [x] ยืนยันหมวดคงที่ 5 ค่าและ product decisions
- [x] แบ่งการเปิดตัวเป็น Phase 2.1 และ Phase 2.2
- [x] สร้างเอกสาร source of truth และ implementation log
- [x] เชื่อมแผนจาก `.md/design/README.md`
- [x] อ้างอิงภาพ baseline Home/Topic จาก `.codex-artifacts/ithub-progress-redesign/assets/`
- [ ] เก็บ baseline หน้า Notifications เพิ่มเติม
- [x] บันทึก query timing และ `EXPLAIN` ของ Community feed เดิม

### Milestone 1 — Migration 004 และ Data Layer

- [x] สร้าง `004_personalized_discovery.sql`
- [x] เพิ่ม `user_category_follows`, `user_author_follows` และ `notification_preferences`
- [x] เพิ่ม primary keys, indexes และ foreign keys แบบ `ON DELETE CASCADE`
- [x] เพิ่ม migration 004 state และ integrity checks ใน database tooling
- [x] รองรับ fresh database, upgrade จาก 003 และ partial migration detection
- [x] สร้าง discovery DAL แบบ `server-only` และคืนเฉพาะ safe DTO
- [x] ตรวจ migration และ additive rollback compatibility บน isolated E2E database

### Milestone 2 — Follow System

- [x] เพิ่ม idempotent actions `setCategoryFollow` และ `setAuthorFollow`
- [x] ตรวจ session, input, rate limit, self-follow, banned/missing author และเพดาน 200 คน
- [x] เพิ่มปุ่มติดตามหมวดบน category result
- [x] เพิ่มปุ่มติดตามผู้เขียนบน Topic detail
- [x] เพิ่ม Guest Login CTA พร้อม `next` URL
- [x] รองรับ `aria-pressed`, pending/error state และป้องกันการกดซ้อน

### Milestone 3 — Following Feed และหน้าจัดการ

- [x] เพิ่ม `feed=following` โดยรักษา `search`, `category`, `sort`, `page`
- [x] Deduplicate กระทู้ที่ตรงทั้งหมวดและผู้เขียน
- [x] เพิ่ม personalized empty/sign-in states
- [x] เพิ่ม `/profile/following` พร้อมหมวดทั้งหมดและผู้เขียนหน้าละ 20 คน
- [x] เพิ่มทางเข้าจาก Profile โดยไม่เพิ่ม Bottom Navigation item
- [x] ตรวจ query ไม่มี N+1 และใช้ indexes

### Milestone 4 — Notification Preferences

- [x] เพิ่ม `updateNotificationPreferences` และ UI บน `/notifications`
- [x] ใช้ค่า default โดยไม่สร้างแถวจนกว่าผู้ใช้แก้ไข
- [x] ตรวจ preferences ก่อนสร้าง Comment, Like และ Solution notifications
- [x] เพิ่ม notification type `solution` และ `follow_topic`
- [x] ทำ follow fan-out หลังสร้างกระทู้ด้วย `after()` และ recipient แบบ `DISTINCT`
- [x] Deduplicate ผู้รับที่ตรงทั้งหมวดและผู้เขียน
- [x] ส่ง realtime ผ่าน private channel โดย failure ไม่ rollback กระทู้
- [x] คง Report/Moderation notifications โดยไม่ใช้ member preferences

### Milestone 5 — For You Feed

- [x] เตรียม `feed=for-you` และแท็บ ล่าสุด/กำลังติดตาม/สำหรับคุณหลัง release switch
- [x] ใช้คะแนน Author +60, Category +40, Freshness 0–30, Engagement 0–10
- [x] Tie-break ด้วย `created_at DESC`, `topic.id DESC`
- [x] แสดง recommendation reason บน Topic Card
- [x] ซ่อน sort และไม่ส่ง `sort` ต่อใน For You
- [x] เพิ่ม inline onboarding 5 หมวดเมื่อยังไม่มี follow
- [x] แยก trending สูงสุด 3 กระทู้และห้ามซ้ำกับ personalized results รวมหน้าถัดไป

### Milestone 6 — Automated QA

- [x] เพิ่ม unit tests สำหรับ validation, preferences และ recommendation score
- [x] เพิ่ม E2E สำหรับ follow, limits, feeds, ranking, fallback และ notifications
- [x] ทดสอบ unauthenticated, self-follow, banned author และ duplicate request
- [x] ทดสอบ private Pusher channel authorization และ moderation notification invariants
- [x] รัน lint, production build, unit tests และ Playwright ทุก browser

### Milestone 7 — Visual และ Accessibility QA

- [x] ตรวจ 5 palettes × Light/Dark ที่ 390, 768, 1024 และ 1440px
- [x] ตรวจ overflow, contrast, keyboard, accessibility semantics และ reduced motion
- [x] ที่ 390×844 เห็นชื่อและ metadata ของกระทู้แรกโดยไม่เลื่อน
- [x] Feed tabs ใช้ `aria-current`; Follow controls ใช้ `aria-pressed`
- [x] เก็บ screenshots ของ Community, Following, For You และ Notification settings

### Milestone 8 — Preview และ Production Release

- [ ] ยืนยันว่า connection และ backup/snapshot เป็นของ Production จริง ก่อน migration 004
- [ ] รัน migration 004 และ post-migration integrity check
- [x] Deploy Phase 2.1 Preview บน `test_e2e` หลังผู้ใช้อนุมัติ
- [x] Smoke และ error/warning log check Phase 2.1 Preview
- [x] Commit หลัง Preview ผ่าน (`aad419a`)
- [ ] Deploy/Smoke/Log check Phase 2.1 บน Production
- [ ] เริ่ม Phase 2.2 หลัง Phase 2.1 ผ่าน Production smoke
- [ ] Deploy/Smoke/Log check Phase 2.2 บน Preview แล้ว Production
- [ ] บันทึก commit SHA, migration result และ URLs

## Interface contract

- URL: ไม่มี `feed` คือ Community; รองรับ `feed=following` และ `feed=for-you`
- Route ใหม่: `/profile/following`
- Reads ใช้ Server Components กับ discovery DAL; mutations ใช้ Server Actions ไม่มี REST API ใหม่
- Action response จำกัดเป็น `{ success, following?, message }`
- Community และ Following รองรับ `latest`, `popular`, `likes`; For You ใช้ recommendation order เท่านั้น

## For You ranking

```text
Author follow     +60
Category follow   +40
Freshness         +0..30 ลดลงวันละ 1
Engagement        +0..10 จาก likes, comments และ views
```

เมื่อไม่มี follow ให้แสดง inline category onboarding และ trending แยกต่างหาก เมื่อ personalized results ไม่เต็มหน้า ให้คงผลลัพธ์จริงไว้และแสดง trending สูงสุด 3 รายการใน section รองโดยไม่ปะปนคะแนน

## Status update rules

เปลี่ยน `[ ]` เป็น `[x]` เฉพาะรายการที่ผ่านการตรวจแล้ว ทุก milestone ต้องบันทึกวันที่ ผู้ดำเนินการ ไฟล์/ฐานข้อมูลที่เปลี่ยน viewport/theme/browser คำสั่งและจำนวน tests ที่ผ่าน รวมถึง blocker ห้ามปิด milestone ถ้า lint, build หรือ test ที่เกี่ยวข้องยังไม่ผ่าน

## Release switch และ rollback

- `ITHUB_DISCOVERY_FOR_YOU_ENABLED` เป็น server-only environment flag; ค่าเริ่มต้น `false`
- Phase 2.1 เปิด Follow/Following/Preferences โดยยังไม่มีแท็บ For You; URL `feed=for-you` ที่เปิดก่อน release จะกลับแสดง Community
- Phase 2.2 เปิด flag เป็น `true` หลัง Production 2.1 smoke ผ่านเท่านั้น
- โค้ด For You ถูกเตรียมใน workspace ระหว่างการทำงานก่อนหน้า ยังไม่ถือว่า released; ลำดับ release ยังคง 2.1 → 2.2
- Migration 004 เพิ่มเพียง 3 ตาราง โค้ดรุ่นก่อนอ่านตารางเดิมได้ จึง rollback แอปได้โดยเก็บตารางและข้อมูลติดตามไว้ ห้ามลบตารางใหม่เพื่อ rollback แอป
- `scripts/db-backup.mjs` เก็บ SQL backup + row-count manifest + SHA-256 ใน `.vercel/backups/` ซึ่งไม่ติดตามโดย Git และไม่อัปโหลดพร้อม deployment

| Release | Commit | Preview | Production | สถานะ |
| --- | --- | --- | --- | --- |
| Phase 2.1 | `aad419a0816346fd15d04296f0388c5b5323faea` | [READY](https://it-epupdu523-thiraphat-s-projects.vercel.app) — isolated `test_e2e` | ยังไม่ deploy — ต้องยืนยัน database target | Preview smoke ผ่าน 2 รอบติดต่อกัน; local commit แล้ว |
| Phase 2.2 | รอ 2.1 smoke | ยังไม่ deploy | ยังไม่ deploy | ปิด release switch |

## Implementation log

### 2026-09-03 — Planning และ Milestone 0 — Codex

- ตรวจโครงสร้างจริง: Home เป็น Server Component ที่ query MySQL โดยตรง, หมวดเป็น allowlist 5 ค่า, mutations ใช้ Server Actions และ notification realtime ใช้ private Pusher channel
- เลือกใช้ migration 004 แบบ additive, DAL แบบ `server-only` และ rollout สองช่วง
- Baseline Home/Topic ใช้ภาพ Phase 1 ที่เก็บไว้แล้ว; Notifications และ query evidence ยังรอตรวจใน Milestone 0
- ยังไม่มีการเปลี่ยน database หรือ production environment

### 2026-09-03–04 — Implementation และ isolated database QA — Codex

- เพิ่ม migration 004, schema-state detection `absent / partial / complete` และ checks สำหรับ orphan follows/preferences, self-follow, category allowlist และ boolean preferences ใน `scripts/db-*.mjs`
- ทดสอบ upgrade ฐาน `test_e2e` จาก 003 → 004; integrity checks ทุกค่าเป็น 0
- ทดสอบฐานใหม่ `ithub_phase2_fresh_e2e` ด้วย migrations 001–004; จำลอง partial โดยถอดตาราง preferences แล้วเครื่องมือปฏิเสธอย่างถูกต้องที่ 15/25 objects จากนั้นลบเฉพาะฐานชั่วคราวนี้
- Community query warm samples: 66.36, 61.51, 84.07ms; Following cold sample 100.47ms บน isolated E2E
- EXPLAIN: follow tables ใช้ IndexJoin/TableRangeScan และ PK/index ที่กำหนด; topics ยัง full scan บน fixture ขนาดเล็กและ pseudo statistics จึงยังไม่อ้างผลด้าน scalability ของข้อมูลจริงขนาดใหญ่
- เพิ่ม DAL/actions ใน `lib/discovery*.js`, Follow controls, `/profile/following`, Notification preferences, feed tabs/reasons และ fan-out ด้วย `after()`; ไม่มี REST API ใหม่
- Snapshot หน้า Notifications ก่อนเปลี่ยนยังไม่มี authenticated baseline; คง checkbox ไว้ไม่ติ๊กและใช้ภาพหลัง implementation เป็นหลักฐาน QA โดยไม่อ้างว่าเป็นภาพก่อนแก้

### 2026-09-05 — Correctness, UX และ release preparation — Codex

- แก้ `ToastProvider` ให้ใช้ native history สำหรับลบ `notify` โดยรักษา filter/hash และไม่เริ่ม navigation แข่งกับหน้าที่ผู้ใช้เลือก
- ปุ่ม Follow reset ตาม target เมื่อเปลี่ยนหมวด, มี network-error feedback และ immediate pending guard; strict boolean validation ปฏิเสธ malformed mutation
- Serialize author follow limit ด้วย row locks; ยังเลิกติดตามบัญชีที่ถูกระงับได้ผ่านหน้าส่วนตัว และไม่ log รายการติดตามหรือ SQL error payload
- Trending ใช้ exclusion จาก follow ทั้งหมด ไม่ซ้ำกับ personalized results หน้าถัดไป; follow recipient deduplicate และ include notification ID ใน realtime payload
- Unit: `npm run test:unit` ผ่าน 13/13; lint และ production build ผ่านก่อน full regression
- Focused Phase 2: functional 22 passed ครบ Chromium/Firefox/WebKit; 4 intentional skips คือ data-layer cap/visual matrix ที่ตรวจครั้งเดียวบน Chromium
- Visual matrix: `npm run test:e2e -- tests/discovery.spec.js --project=chromium --grep "keeps discovery surfaces"` ผ่าน 1/1; 5 palettes × Light/Dark × 390/768/1024/1440, text contrast ≥4.5:1, overflow, first-topic metadata และ reduced motion
- เพิ่ม coverage ส่ง action ซ้ำ, self/missing/guest validation, author pagination 20 คน, follow defaults off, solution preferences off และ moderation notification bypass; full suite ล่าสุดยังรอผล จึงยังไม่ปิด Milestone 6 หรือ release
- Preflight ของฐานที่กำหนดใน `.env` (`test`) ผ่าน; migration 002/003 complete, 004 absent; public topic IDs `840001`, `810001` ตรงกับ Production
- Backup ก่อน migration: `.vercel/backups/phase2-2026-09-05T08-02-20-905Z.sql`, 14 tables, 19,152 bytes, SHA-256 `dfd6c111b780aa5f6eeeb977c91fc7b5cf1fc1ba6027578e80783c9fdc390970`; ยังไม่อ้างว่าได้ทดสอบ restore บนฐานใหม่
- Vercel CLI ปัจจุบันดึง sensitive Production env เป็น placeholders; ใช้ connection ที่มีอยู่ในโปรเจกต์ตรวจแบบอ่านอย่างเดียว ไม่แทนค่า secrets ด้วย placeholders

### 2026-09-06 — Final QA และ release guard — Codex

- Full regression รอบก่อน: 160 passed, 4 intentional skips, 1 failed (Tour breakpoint matrix บน Firefox); ไม่อ้างว่าชุดเต็มผ่านทั้งหมด
- ตรวจซ้ำ Notification preferences ครบ 3 browser และ visual matrix 40 combinations ผ่าน; พบ checkbox ด้านขวาบนมือถืออาจอยู่ใต้ปุ่ม Chat จึงจัด checkbox ไว้ด้านซ้ายที่ mobile และเพิ่ม hit-test assertion
- Tour matrix ใช้ `test.step` แยก viewport/step, รอสถานะ `settled` และ focus handoff ก่อน mouse click, เก็บ screenshot/geometry เมื่อผิดพลาด; ไม่แก้ production Tour หรือใช้ forced click ข้าม actionability
- Tour เฉพาะจุดผ่าน 1/1 Firefox แบบ trace และ 4/4 เมื่อทดสอบซ้ำ Firefox/WebKit อย่างละ 2 รอบ; ชุดเต็มหลังเพิ่ม focus assertion ผ่านครบทั้ง 3 browser
- Final full regression: `npm run test:e2e -- --reporter=line --output=.vercel/release-evidence/phase2-full-2026-09-06` **161 passed / 4 intentionally skipped / 0 failed** ใน 16.3 นาที; Chromium 55 passed, Firefox 53 passed + 2 skips, WebKit 53 passed + 2 skips (cap 200 และ full visual matrix ตรวจหนึ่งครั้งบน Chromium)
- Phase 2.1 release-switch check: ตั้ง `ITHUB_DISCOVERY_FOR_YOU_ENABLED=false` เฉพาะ subprocess แล้วรัน `npm run test:e2e -- tests/discovery.spec.js --grep "keeps personalized data behind authentication" --reporter=line --output=.vercel/release-evidence/phase21-gate-2026-09-06` **3/3 passed** (24.6 วินาที): ซ่อนแท็บ For You, URL `feed=for-you` กลับแสดง Community, Following/Following management ยังป้องกัน Guest; คืนค่า environment หลังทดสอบแล้ว
- `npm run lint` ผ่าน; `npm run test:unit` ผ่าน 15/15 รวม guard ปฏิเสธ Production URL, non-E2E database, missing opt-in และ sensitive placeholders
- `npm run db:check:e2e` ผ่าน: required tables 11/11 และ integrity checks ทั้งหมด 0 บน `test_e2e`; ไม่มี migration 004 บน Production
- แยก `tests/unit/**` ออกจาก Playwright discovery ใน `playwright.config.js`; unit tests ใช้ Node test runner เท่านั้น ป้องกันการนำเข้า environment guard ผ่านตัวแปลงโมดูลผิดระบบ
- หลักฐาน visual รอบล่าสุดอยู่ที่ `.vercel/release-evidence/phase2-full-2026-09-06/discovery-Phase-2-personal-0473e-palette-and-target-viewport-chromium/`: 20 For You screenshots (5 palettes × 2 modes × mobile/desktop) และอีก 8 screenshots ของ Community/Following/Notifications/Following management; ตรวจภาพ mobile 390×844 และ desktop 1440×1000 แล้ว รวมทั้ง checkbox hit-test บนมือถือผ่าน
- เตรียม `deploy-discovery-preview.mjs`, `discovery-preview-safety.mjs` และ `discovery-release-smoke.mjs`: บังคับ isolated `_e2e`, project/team ID, Preview URL และ fingerprint ของ database connection ตรงกับ deployment manifest; ไม่รับ Production URL หรือ production option
- Preview ที่เตรียมใช้ Phase 2.1 (`ITHUB_DISCOVERY_FOR_YOU_ENABLED=false`), session/encryption keys แยก, secure cookies และ rate limits ตามจริง; บังคับ `ITHUB_E2E_ALLOW_WRITES=false` และ environment เป็น `preview` เพื่อไม่รับ test opt-in ที่อาจค้างใน project settings และไม่ใช้ credentials ของ Pusher/Gemini/Cloudinary จริง จึงยังไม่อ้างว่าตรวจ live realtime/AI/media บน Preview แล้ว
- ลบเฉพาะ `.env.phase2-production.local` ที่ดึงมาชั่วคราวและใช้เชื่อมต่อไม่ได้แล้ว; `.env`, `.env.local`, `.env.e2e.local` และ SQL backup เดิมไม่ถูกลบ สามารถดึง temporary env ใหม่ได้ภายหลัง

### 2026-09-06 — Authorized isolated Preview — Codex

- ผู้ใช้อนุมัติส่ง source และ connection ของ `test_e2e` ไป Vercel ITHub สำหรับ Preview เท่านั้น; ไม่เปลี่ยน project-wide env หรือ Production
- Deployment ครั้งแรกตอบ `Not authorized`; ตรวจ `whoami`, project และ team แบบอ่านอย่างเดียวผ่าน จึงระบุ `--scope` เป็น linked team ID ใน helper แล้ว retry สำเร็จ (ไม่ยืนยันว่า scope เป็นสาเหตุทั้งหมดของครั้งแรก)
- Preview: `https://it-epupdu523-thiraphat-s-projects.vercel.app`; deployment ID `dpl_3Bgq6PTssp5ADkKWpU5nnSuviTf7`, Next.js 16.3.4, remote build ผ่านในประมาณ 39 วินาที, สถานะ READY
- ใช้ database `test_e2e` ซึ่ง migration 004 complete แล้ว; ไม่รัน migration บนฐานจริง ไม่มีข้อมูลสมาชิกจริงจาก Production ใน workflow นี้
- Guarded Chromium smoke: สมัคร/เข้าสู่ระบบด้วยบัญชีชั่วคราว, ยืนยันบัญชีตรงกับ database manifest, Guest CTA, category/author follow, Following dedup, หน้าจัดการ และ notification preference persistence ผ่าน; For You ไม่มีแท็บตาม release switch
- รอบแรก timeout ขณะรอปุ่ม follow พร้อมใช้งาน (ยังไม่ยืนยัน root cause); เพิ่ม stage/failure screenshot และตั้ง assertion budget 20 วินาทีให้ตรงกับ browser actions สำหรับ remote latency จากนั้นผลสองรอบถัดมาผ่านติดต่อกัน โดยรอบสุดท้ายใช้ budget ใหม่ ไม่มีการแก้ production feature code ระหว่างรอบ
- Visual smoke แต่ละรอบ: 390×844 และ 1440×1000 × Light/Dark × Following/Following management/Notifications รวม 12 screenshots; overflow assertions ผ่านและตรวจภาพ mobile light/dark กับ desktop management แล้ว
- หลักฐานรอบผ่าน: `.vercel/release-evidence/2.1-de676e4f273241a9/` และ `.vercel/release-evidence/2.1-983881d5b3324695/`; บัญชี QA เฉพาะแต่ละรอบถูกลบพร้อมข้อมูล follow/preferences ผ่าน FK cascade สำเร็จ
- `vercel logs <preview> --level error --level warning --since 30m --limit 50` ไม่พบรายการในช่วงที่ตรวจ; ไม่ใช่การรับประกันว่าไม่มีปัญหาในอนาคต และยังไม่อ้างผล live Pusher/Gemini/Cloudinary ที่ตั้งเป็น preview-disabled
- `npm run lint` ผ่าน; `npm run test:unit` 15/15 ผ่านหลังปรับ helper; full regression เดิม 161 passed / 4 intentional skips และ Phase 2.1 gate 3/3 ยังคงเป็นหลักฐานของ feature code ที่ deploy
- เปิด Preview ผ่าน official temporary share URL โดยไม่ปิด deployment protection; ไม่เก็บ share token, database credentials หรือ screenshots ของบัญชี QA ใน Git
- Post-smoke `npm run db:check:e2e` ผ่าน: required tables 11/11, integrity counters ทั้งหมด 0; staged secret-value scan และ `git diff --cached --check` ผ่าน
- Feature commit `aad419a0816346fd15d04296f0388c5b5323faea` บน `codex/ithub-94-milestone` รวม 36 ไฟล์ Phase 2 เท่านั้น; Preview สร้างจาก workspace ก่อน commit โดย feature source ตรงกัน (หลัง deploy แก้เฉพาะ smoke diagnostics/docs); ยังไม่ได้ push

### 2026-09-06 — Production target recheck หลังผู้ใช้ให้ทำต่อ — Codex

- ตรวจ Vercel project/team และ domain `ithub-puce.vercel.app` ถูกต้อง; Preview ล่าสุดยังเป็น `it-epupdu523-thiraphat-s-projects.vercel.app` และ READY
- `vercel env ls production --scope team_DzUs49ePhJqJD0veBMIPnY11` ยืนยันว่ามี `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` ใน Production แต่ทุกค่าเป็นชนิด Secret/Hidden จึงเปรียบเทียบ connection กับ `.env` ไม่ได้ ไม่พยายามเปิดเผยหรือข้ามการปกปิด secrets
- `node --env-file=.env scripts/db-preflight.mjs` ผ่านแบบอ่านอย่างเดียว: application tables 11/11, migrations 002/003 complete, 004 absent และ integrity counters ทั้งหมด 0; ผลนี้ยืนยันความพร้อมของฐานที่ตั้งใน `.env` เท่านั้น ไม่ยืนยันว่าเป็น Production
- ต้องการคำยืนยันจากเจ้าของระบบว่า connection ใน `C:\client\.env` ซึ่งใช้ `DB_NAME=test` เป็นฐานของ Production `ithub-puce.vercel.app` หรือให้ระบุไฟล์ connection ที่ถูกต้องในเครื่อง โดยไม่ส่งรหัสผ่านในแชต
- ยังไม่รัน migration 004, ไม่สร้าง Production QA account, ไม่เปลี่ยน env บน Vercel และไม่ deploy/push; ข้อจำกัดนี้เป็นการยืนยัน database target ไม่ใช่การขออนุญาต Preview ซ้ำ

#### Release blockers ที่ยังไม่ผ่าน

1. **Production smoke:** automatic approval ปฏิเสธการสร้าง QA account บนเว็บจริง เพราะยังยืนยันไม่ได้ว่า `.env` ที่ใช้ database ชื่อ `test` เป็นฐานเดียวกับ Production สำหรับ cleanup; topic IDs ที่ตรงกันไม่เพียงพอ จึงยังไม่สร้างบัญชี ไม่รัน migration 004 และไม่ deploy Production
2. **Isolated Preview — resolved:** ข้อจำกัด approval เดิมได้รับการอนุมัติจากผู้ใช้แล้ว; Preview READY และ smoke ผ่านตาม log ข้างต้น
3. **Commit — resolved:** commit เฉพาะ Phase 2 code/tests/docs แล้ว; ไม่รวม presentation/artifacts ของผู้ใช้ และไม่ push ซึ่งอาจเริ่ม deployment ที่ใช้ environment คนละชุด

ขั้นต่อไป: ยืนยัน Production connection/backup แยกต่างหากก่อน migration 004 และ Production release; ห้าม promote Preview ที่ผูก `_e2e` เป็น Production

## ไม่รวม

Public author profiles, follower counts, email/browser push, AI/ML ranking, implicit behavior tracking, หมวดใหม่ และการเปลี่ยน Theme Engine
