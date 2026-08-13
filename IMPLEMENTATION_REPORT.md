# ITHub — Implementation and Verification Report

> วันที่ดำเนินการ: 13 สิงหาคม 2026 (Asia/Bangkok)
> ขอบเขต: UX/UI, backend, security, database reproducibility, tests และ deployment readiness

## สรุปผล

ตรวจสอบรายการจาก `REVIEW_REPORT_FOR_AGENTS.md` ครบทุกข้อแล้ว พบว่าประเด็นส่วนใหญ่ยังเกิดขึ้นจริงใน source ก่อนแก้ไข ยกเว้น rich-text sanitization ซึ่งระบบปัจจุบัน sanitize ทั้งก่อนบันทึกและก่อนแสดงอยู่แล้ว

การแก้ไขในรอบนี้ครอบคลุม Pusher privacy, sidebar accessibility, profile transaction, database migrations, shared rate limiting, admin pagination, query performance, E2E reliability, dependency advisory, XP/counter consistency และ bot view filtering

## รายการบัคและผลการแก้ไข

| รายการ | สภาพก่อนแก้ | การดำเนินการ | ผลลัพธ์ |
|---|---|---|---|
| Pusher notification privacy | ใช้ public channel ที่เดา user ID ได้ | เปลี่ยนเป็น `private-user-{id}` และเพิ่ม `/api/pusher/auth` ตรวจ session/channel owner | ผู้ไม่เข้าสู่ระบบได้ 401 และผู้ใช้เข้าถึงได้เฉพาะ channel ของตน |
| Desktop sidebar overlap | sidebar fixed ทับเนื้อหา 64px | เพิ่ม desktop content offset และปรับ focus/tooltip accessibility | sidebar และ main content ไม่ซ้อนกัน ไม่มี horizontal overflow |
| Profile partial update | username/bio ถูกเขียนก่อนตรวจรหัสผ่าน | validate ก่อน mutation และครอบ update ใน transaction | รหัสเดิมผิดแล้วข้อมูลส่วนอื่นไม่เปลี่ยน |
| Database reproducibility | ไม่มี schema/migration/seed | เพิ่ม versioned migrations และคำสั่ง migrate/seed/check | setup ฐานข้อมูลใหม่จาก repository ได้ |
| Shared rate limiting | เก็บ counter ใน memory ต่อ instance | ใช้ตาราง `rate_limits` พร้อม atomic increment และ fallback ช่วงก่อน migrate | รองรับหลาย Vercel instances หลังใช้ migration |
| Playwright reliability | parallel tests ใช้ฐานข้อมูลร่วมกัน | ปิด full parallel, ใช้ worker เดียว และ cleanup topic ที่สร้าง | cross-browser run นิ่งและไม่มี race ที่ตรวจพบ |
| Auth tests silently skipped in CI | config ไม่โหลด `.env` และไม่ fail | โหลด env ด้วย Next loader และบังคับ CI มี `ITHUB_E2E_*` | CI ไม่สามารถผ่านโดยข้าม authenticated flows แบบเงียบ ๆ |
| Admin over-fetch | `SELECT *` รวม password hash และไม่มี pagination | เลือกเฉพาะ field ที่ UI ใช้และเพิ่ม pagination | ลดข้อมูล sensitive ใน memory และรองรับข้อมูลจำนวนมากขึ้น |
| Home query waterfall | count/topics/stats ทำต่อกัน | เริ่ม independent queries พร้อมกันด้วย `Promise.all` | ลดเวลารอฐานข้อมูลตามลำดับ |
| Rich-text XSS defense | รายงานระบุว่า render เชื่อข้อมูลเดิม | ตรวจ source พบ sanitize ก่อน write และ sanitize legacy rows ก่อน render | ประเด็นนี้ถูกแก้ไว้แล้วและยังคง server sanitization |
| Quill advisory | dependency มี low-severity XSS advisory | override Quill เป็น `2.0.2` และคง server sanitizer | `npm audit --omit=dev` เหลือ 0 vulnerabilities |
| Lint scope | ESLint scan workspace กว้างเกิน | จำกัด lint เฉพาะ app/components/lib/tests/scripts/config | lint จบได้ตามปกติ |
| XP/counter drift | ย้าย/ลบ solution หรือเนื้อหาไม่คืน XP | transfer/deduct XP ใน transaction และเพิ่ม reconciliation script | event ใหม่รักษา invariant; มีเครื่องมือตรวจ/ซ่อมข้อมูลเดิม |
| Automated/bot views | browser automation เพิ่ม views | ข้าม bot, crawler, HeadlessChrome, Lighthouse และ prefetch | E2E/bot ไม่ทำให้ยอดดูเพิ่ม |
| Topic image LCP warning | browser เตือนรูปเหนือ fold โหลดช้า | กำหนด eager loading ให้ภาพหลักของกระทู้ | ตรวจซ้ำแล้ว console ไม่มี warning/error |

## การเปลี่ยนชื่อโครงการ

- ใช้ชื่อ `ITHub` เป็นชื่อเดียวใน source, docs, tests และ configuration
- เปลี่ยน test/seed environment variables เป็น prefix `ITHUB_`
- เปลี่ยน Cloudinary folder สำหรับไฟล์อัปโหลดใหม่เป็น `ithub_topics` และ `ithub_avatars`
- เปลี่ยนชื่อ E2E spec เป็น `tests/ithub-flow.spec.js`
- รูปเดิมที่เก็บใน Cloudinary ยังคงใช้งานผ่าน URL เดิมได้

## ฐานข้อมูลที่ตรวจพบ

ตรวจ production database แบบ read-only ก่อนสร้าง migration พบว่า:

- username ยังไม่มี unique constraint
- ตารางหลักบางส่วนยังไม่มี foreign key
- orphan likes: 5 แถว
- orphan notifications: 9 แถว
- ผู้ใช้ที่ XP/post_count คลาดจากข้อมูลต้นทาง: 5 ราย

Migration `002_harden_legacy_schema.sql` ลบเฉพาะ rows ที่อ้างถึง user/topic ซึ่งไม่มีอยู่แล้วก่อนเพิ่ม constraints ส่วน `db:reconcile` เป็น dry-run โดย default และต้องส่ง `--apply` จึงจะเขียนข้อมูลจริง

## การทดสอบที่ดำเนินการ

### Static และ build checks

```text
npm run lint                         PASS
npm run build                        PASS
git diff --check                     PASS
node --check scripts/*.mjs           PASS
npm audit --omit=dev                 PASS — 0 vulnerabilities
npm ls quill --depth=2               PASS — quill@2.0.2 overridden
```

### Playwright cross-browser

รัน Chromium, Firefox และ WebKit แบบ serial:

```text
48 total
33 passed
15 skipped
0 failed
duration 1.7 minutes
```

15 skipped คือ authenticated flows 5 รายการ × 3 browsers เนื่องจากเครื่องทดสอบไม่มี `ITHUB_E2E_EMAIL` และ `ITHUB_E2E_PASSWORD` ใน CI จะ fail-fast แทน skip

### Browser runtime verification

- viewport 1280×720
- collapsed sidebar: `x=0..64`
- main content: เริ่มที่ `x=64`
- overlap: false
- horizontal overflow: false
- category `AI & Data` แสดงและเปิด topic detail ได้
- signed-out like/bookmark controls ถูก disable
- console หลังแก้ LCP: 0 warning, 0 error

## ไฟล์สำคัญที่เพิ่มหรือปรับปรุง

- `app/api/pusher/auth/route.js`
- `lib/pusherChannels.js`
- `lib/rateLimit.js`
- `lib/moderation.js`
- `database/migrations/001_initial_schema.sql`
- `database/migrations/002_harden_legacy_schema.sql`
- `scripts/db-migrate.mjs`
- `scripts/db-seed.mjs`
- `scripts/db-check.mjs`
- `scripts/db-reconcile.mjs`
- `app/admin/AdminPagination.js`
- `tests/ithub-flow.spec.js`
- `playwright.config.js`
- `README.md`

## สถานะ Deployment

Deploy production รุ่นสุดท้ายสำเร็จด้วย Vercel remote build เมื่อ 13 สิงหาคม 2026 เวลา 22:44 น. (Asia/Bangkok)

```text
Project:       thiraphat-s-projects/it_hub
Deployment ID: dpl_4Hui23zBd2E5VgaszDA8MNoungMZ
Target:        production
Status:        READY
Framework:     Next.js 16.3.0
Deployment:    https://it-5vpqy1pne-thiraphat-s-projects.vercel.app
Alias:         https://ithub-puce.vercel.app
Remote build:  PASS — 20 routes generated
```

Local `vercel build --prod` บน Windows ติด `EPERM` ขณะสร้าง symlink ของ function artifact จึงใช้ Vercel remote build ซึ่ง compile และ deploy สำเร็จ ไม่มีผลต่อ production artifact

### Post-deploy verification

- หน้าแรก production โหลดสำเร็จและแสดง topic links 9 รายการ
- category `AI & Data` แสดง heading ถูกต้องและเปิด `/topic/630002` ได้
- ไม่มี horizontal overflow
- browser console: 0 warning, 0 error
- unauthenticated `POST /api/pusher/auth`: HTTP 401
- `vercel inspect`: status READY
- Vercel error log scan หลังทดสอบ: ไม่พบ error

## งานที่ต้องทำกับ Production Database

ก่อนเปิดใช้ shared rate limit และ constraints เต็มรูปแบบ:

```bash
npm run db:migrate
npm run db:check
npm run db:reconcile
npm run db:reconcile -- --apply
```

ควรสำรองฐานข้อมูลก่อน migration/reconciliation และใช้บัญชี E2E แยกจากบัญชีผู้ใช้หรือผู้ดูแลจริง
