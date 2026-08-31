# ITHub — รายงาน Milestone 85%

> วันที่: 31 สิงหาคม 2026 (Asia/Bangkok)
> สาขา: `codex/ithub-85-milestone`
> Vercel Preview: `https://ithub-git-codex-ithub-85-milestone-thiraphat-s-projects.vercel.app`
> สถานะ: Local implementation และ E2E acceptance ผ่าน; PR, Preview isolation และ Production rollout รอ safety prerequisites

## สรุป

โค้ดของ milestone 85% ปิดช่องว่างหลักด้านฐานทดสอบ, migration safety, search/data minimization และ Animated Spotlight Tour v2 แล้ว โดยออกแบบให้คำสั่งที่เขียนข้อมูลหยุดทันทีหาก environment ไม่ใช่ฐาน `_e2e` ที่ยืนยันสิทธิ์เขียนไว้

Local acceptance ผ่านแล้วบนฐาน `test_e2e`: migration/check/reconcile สำเร็จ และ Playwright ผ่าน 90/90 แบบ serial ครบสาม browser โดยไม่มี skip อย่างไรก็ตามยังไม่ประกาศว่า rollout 85% เสร็จจนกว่า Vercel Preview จะถูกแยกไปใช้ฐาน `_e2e`, PR ผ่านการตรวจ และยืนยัน restore point ของ TiDB ก่อน migration Production

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
| Git push | PASS — branch `origin/codex/ithub-85-milestone` ถูก push แล้ว; commit ผลทดสอบรอบสุดท้ายรอส่งพร้อมรายงานนี้ |
| Vercel Preview build | PASS — deployment ของ `efce139` แสดงสถานะ Ready |
| Vercel Preview isolation | BLOCKED — พบ `DB_NAME` แต่ไม่พบหลักฐาน suffix `_e2e`; ไม่พบ `ITHUB_E2E_ALLOW_WRITES`, `ITHUB_E2E_EMAIL` และ `ITHUB_E2E_PASSWORD` |
| ฐานที่ `.env` ชี้อยู่: preflight แบบ read-only | BLOCKED ตามคาด — พบ `rate_limits` หาย, migration 002 ยัง absent, orphan likes 5 และ orphan notifications 9 |

## Safety gate และ rollout

1. Local `.env.e2e.local`, ฐาน `test_e2e`, migration, seed, check และ reconcile ผ่านแล้ว
2. Playwright serial ผ่านครบ Chromium, Firefox และ WebKit ที่ 90/90 โดย 0 skip/0 failure
3. Branch ถูก push และ Preview build เดิมผ่านแล้ว; commit รอบสุดท้ายต้อง push เพื่อสร้าง Preview ใหม่
4. ต้องแยกตัวแปร Preview ให้ชี้ฐาน `_e2e` ก่อนเปิดแอปหรือรัน smoke test บน URL ภายนอก
5. ยืนยัน automatic TiDB snapshot ที่ restore ได้ก่อนแตะ Production
6. Preflight ของฐานที่ `.env` ชี้อยู่พบข้อมูลกำพร้าที่ migration 002 ถูกออกแบบให้ลบ จึงต้องยืนยันว่าเป็น Production, มี backup evidence และ review จำนวน 14 rows ก่อนรัน
7. หลัง migration/check ผ่าน ให้ merge และสร้าง Production deployment ใหม่จาก SHA เดียวกับที่ตรวจ Preview

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
