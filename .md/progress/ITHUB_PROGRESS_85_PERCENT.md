# ITHub — รายงาน Milestone 85%

> วันที่: 31 สิงหาคม 2026 (Asia/Bangkok)
> สาขา: `codex/ithub-85-milestone`
> Pull Request: `https://github.com/icez789/ITHub/pull/1`
> Vercel Preview: `https://ithub-git-codex-ithub-85-milestone-thiraphat-s-projects.vercel.app`
> Preview deployment: `dpl_CDcQkPtCywnByB1635A4YXFWSbdT` จาก SHA `2e87560`
> สถานะ: Local acceptance, PR, Preview isolation และ Preview smoke test ผ่าน; Production rollout ยังรอ safety prerequisites

## สรุป

โค้ดของ milestone 85% ปิดช่องว่างหลักด้านฐานทดสอบ, migration safety, search/data minimization และ Animated Spotlight Tour v2 แล้ว โดยออกแบบให้คำสั่งที่เขียนข้อมูลหยุดทันทีหาก environment ไม่ใช่ฐาน `_e2e` ที่ยืนยันสิทธิ์เขียนไว้

Local acceptance ผ่านแล้วบนฐาน `test_e2e`: migration/check/reconcile สำเร็จ และ Playwright ผ่าน 90/90 แบบ serial ครบสาม browser โดยไม่มี skip หลังจากนั้นเปิด PR #1, ผูกค่าทดสอบแบบ branch-scoped เฉพาะ `codex/ithub-85-milestone` และ redeploy Preview จาก SHA เดียวกันสำเร็จ Smoke test ทั้ง guest/member ผ่านและไม่มี runtime error แต่ยังไม่ rollout Production จนกว่าจะยืนยัน restore point ของ TiDB และตรวจข้อมูลกำพร้าเดิม 14 แถวก่อน migration

## สิ่งที่เปลี่ยน

### Test และ database safety

- เพิ่ม `.env.e2e.example` และ ignore `.env.e2e.local`
- เพิ่ม guard ตรวจ credentials, `ITHUB_E2E_ALLOW_WRITES=true`, ชื่อฐานลงท้าย `_e2e` และห้าม environment production
- เพิ่ม `e2e:setup`, `db:create:e2e`, `db:preflight:e2e`, `db:migrate:e2e`, `db:seed:e2e`, `db:check:e2e`, `db:reconcile:e2e`
- seed สมาชิกและกระทู้ baseline แบบ idempotent โดยไม่สร้าง ITHub Bot หรือเรียก Gemini
- migration runner บันทึก SHA-256, adopt migration 002 ที่ครบ และ abort เมื่อ partial/fingerprint mismatch
- Playwright และ test spec fail-fast เมื่อ config ไม่ครบ; authenticated tests ไม่มี `test.skip`
- runner build แอปแล้วใช้ `next start`, ไม่ reuse server เก่า และอนุญาต local non-Secure cookie/rate-limit bypass เฉพาะเมื่อ guard `_e2e` ครบทุกข้อ

### Search และ data minimization

- ค้นทั้ง `topics.title` และ rich-text `topics.content` ด้วย `INSTR`
- `%` และ `_` ถูกมองเป็นตัวอักษรจริง ไม่ใช่ SQL wildcard
- count และ topic query ใช้ predicate/parameters ชุดเดียวกัน
- ยกเลิก `SELECT *` ใน app/components/lib ที่ตรวจพบ รวม leaderboard, notifications, login, profile, edit topic, topic detail, poll และ engagement lookups

### Animated Spotlight Tour v2

- ใช้ key `ithub_onboarding_v2` โดยไม่ลบ v1
- guided tour 6 ขั้นบน UI จริง: search → feed → auth/create → engagement → personal navigation → AI/safety
- overlay สี่แผง หรี่ 58%, blur 10px และ fallback ทึบ 82%
- target คมแต่คลิกไม่ได้, background `inert`, focus trap, Escape, Reduced Motion และ live progress
- ใช้ `router.replace()` และคืน URL, query, hash, scroll และ focus เดิมเมื่อปิดหรือจบ
- รองรับ target หาย, route ช้า, ไม่มีหัวข้อ และ localStorage ถูกบล็อก
- หน้า `/help` เปิด tour ซ้ำได้โดยไม่รีเซ็ต automatic status

## หลักฐานที่รันแล้ว

| การตรวจ | ผล |
|---|---|
| `npm run lint` | PASS |
| `npm run build` | PASS — Next.js 16.3.0, 20 routes |
| E2E guard เมื่อไม่มี `.env.e2e.local` | PASS — หยุดก่อนเปิด server พร้อมแจ้ง DB suffix, write opt-in และ credentials ที่ขาด |
| Playwright discovery | PASS — พบ 90 tests (30 ต่อ browser) และไม่มี `test.skip` |
| สร้างฐาน `test_e2e` | PASS — schema ว่างก่อน initialize และไม่แตะฐานเดิม |
| E2E preflight → migrate → seed | PASS — migration 001/002 และ seed idempotent สำเร็จ |
| E2E `db:check` | PASS — 11/11 tables, duplicate username 0 และ orphan ทุกชนิด 0 |
| E2E reconcile dry-run | PASS — counter drift 0 |
| Authenticated Playwright Chromium/Firefox/WebKit | PASS — 90/90, serial, 0 skip, 0 failure บน production-mode server |
| Test cleanup | PASS — cleanup assertion ผ่าน และ post-run check/reconcile ยังเป็น 0 |
| Git push และ PR | PASS — branch `origin/codex/ithub-85-milestone` ถูก push และเปิด PR #1 แล้ว |
| Vercel Preview build | PASS — deployment `dpl_CDcQkPtCywnByB1635A4YXFWSbdT` จาก `2e87560` เป็น Ready |
| Vercel Preview isolation | PASS — override 18 ตัวแปรเฉพาะ Preview branch; `DB_NAME` ชี้ฐาน `_e2e` และ Production values เดิมยังแยกอยู่ |
| Preview guest smoke | PASS — หน้าแรกโหลด baseline 1 กระทู้, Tour ครบ 6 ขั้นและคืน URL เดิม |
| Preview search smoke | PASS — ค้น `content-only-needle` จากเนื้อหาได้ 1 ผล และเปิด `/topic/1` โดยไม่ย้อนกลับหน้าค้นหา |
| Preview member smoke | PASS — login บัญชี E2E, like และ bookmark ทำงาน พร้อมคืนสถานะเดิม |
| Preview logs | PASS — ไม่พบ runtime error/warning/fatal จาก deployment; build สำเร็จ มีเพียง dependency/install-script warnings |
| Post-smoke database check | PASS — 11/11 tables, duplicate/orphan ทุกชนิด 0 และ reconcile drift 0 |
| ฐานที่ `.env` ชี้อยู่: preflight แบบ read-only | BLOCKED ตามคาด — พบ `rate_limits` หาย, migration 002 ยัง absent, orphan likes 5 และ orphan notifications 9 |

## Safety gate และ rollout

1. Local `.env.e2e.local`, ฐาน `test_e2e`, migration, seed, check และ reconcile ผ่านแล้ว
2. Playwright serial ผ่านครบ Chromium, Firefox และ WebKit ที่ 90/90 โดย 0 skip/0 failure
3. Branch ถูก push, PR #1 เปิดแล้ว และ Preview จาก SHA `2e87560` ผ่าน build/smoke test
4. ตัวแปร Preview ถูกจำกัดไว้ที่ branch `codex/ithub-85-milestone` และชี้ฐาน `test_e2e`; Production values ไม่ถูกแก้
5. ยืนยัน automatic TiDB snapshot ที่ restore ได้ก่อนแตะ Production
6. Preflight ของฐานที่ `.env` ชี้อยู่พบข้อมูลกำพร้าที่ migration 002 ถูกออกแบบให้ลบ จึงต้องยืนยันว่าเป็น Production, มี backup evidence และ review จำนวน 14 rows ก่อนรัน
7. หลัง migration/check ผ่าน ให้ merge และสร้าง Production deployment ใหม่จาก SHA เดียวกับที่ตรวจ Preview

## ข้อสังเกตจาก Preview

- การ toggle bookmark สำเร็จและคืนสถานะเดิมได้ แต่รอบหนึ่งใช้เวลาหลายวินาทีบน Preview ควรเก็บ latency metric และพิจารณา optimistic feedback ใน milestone ถัดไป
- Vercel build แจ้งเตือน `lodash.isequal` deprecated และ `unrs-resolver` install script ยังไม่อยู่ใน allow list; ไม่ทำให้ build ล้ม แต่ควรทบทวน dependency ในรอบ 86–95%

## Rollback point

- Code rollback: Vercel deployment ก่อนหน้าและ commit ก่อน milestone นี้
- Database rollback: restore automatic snapshot ไป TiDB instance ใหม่ แล้วสลับ Production environment variables
- ห้าม migrate Production หากยังไม่มี snapshot ที่พร้อม restore

## งานหลัง 85%

- session-version revocation หลังเปลี่ยนรหัสผ่าน
- login rate limit แบบ IP + account
- self-host IBM Plex Sans Thai
- GitHub Actions และ unit/integration test pyramid
- admin E2E, SEO metadata, CSP/HSTS และ visual baseline matrix เต็มชุด
