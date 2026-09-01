# ITHub

ITHub คือเว็บบอร์ดชุมชนด้านไอทีสำหรับตั้งคำถาม แบ่งปันความรู้ และพูดคุยเรื่อง Hardware, Software, Network, AI & Data และหัวข้อทั่วไป พัฒนาด้วย Next.js App Router และรองรับระบบสมาชิก กระทู้ คอมเมนต์ โพล การถูกใจ บุ๊กมาร์ก การแจ้งเตือนแบบเรียลไทม์ XP และเครื่องมือผู้ดูแลระบบ

## ความสามารถหลัก

- สมัครสมาชิก เข้าสู่ระบบ แก้ไขโปรไฟล์ และเปลี่ยนรหัสผ่านแบบ transaction
- สร้าง แก้ไข ค้นหา กรอง และจัดเรียงกระทู้
- Rich-text editor พร้อม code block และการเลือกภาษา
- คอมเมนต์แบบตอบกลับ เลือกคำตอบที่ถูกต้อง และระบบ XP
- โพล การถูกใจ บุ๊กมาร์ก รายงานเนื้อหา และศูนย์การแจ้งเตือนแบบแบ่งหน้า/อ่าน/ลบรายชิ้น
- Pusher private channel ที่ตรวจสิทธิ์ด้วย session ของผู้ใช้
- Teacher content moderation, การปักหมุด/ล็อกกระทู้ และ audit log สำหรับ Admin/Super Admin
- Dark mode, responsive navigation, skip link และ keyboard accessibility
- Animated Spotlight Tour 6 ขั้นที่พาไปยัง UI จริง พร้อม blur, focus trap, route restoration และหน้าคู่มือฉบับเต็มที่ `/help`
- AI assistant ผ่าน Gemini และรูปภาพผ่าน Cloudinary

## เทคโนโลยี

- Next.js 16 App Router และ React 19
- MySQL/TiDB ผ่าน `mysql2`
- Pusher Channels
- Cloudinary
- Google Gemini
- Tailwind CSS 4
- Playwright สำหรับ End-to-End testing
- Vercel Analytics และ Vercel Hosting

## ความต้องการของระบบ

- Node.js 20 ขึ้นไป
- npm
- ฐานข้อมูล MySQL 8 หรือ TiDB
- บัญชี Pusher, Cloudinary และ Gemini สำหรับความสามารถที่เกี่ยวข้อง

## เริ่มต้นใช้งาน

1. ติดตั้ง dependencies

```bash
npm install
```

2. คัดลอก `.env.example` เป็น `.env` แล้วกำหนดค่าที่จำเป็น

3. สร้างโครงสร้างฐานข้อมูลและตรวจสอบ integrity

```bash
npm run db:migrate
npm run db:check
```

4. เปิด development server

```bash
npm run dev
```

เปิด `http://localhost:3000`

## Environment variables

| ตัวแปร | การใช้งาน |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | การเชื่อมต่อ MySQL/TiDB |
| `SESSION_SECRET` | คีย์สุ่มอย่างน้อย 32 ตัวอักษรสำหรับลงนาม session |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | คีย์ base64 ขนาด 32 bytes สำหรับ Server Actions หลาย instance |
| `SERVER_ACTION_ALLOWED_ORIGINS` | hostname เพิ่มเติมที่อนุญาตผ่าน proxy คั่นด้วย comma |
| `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER` | การเชื่อมต่อ Pusher ฝั่ง browser |
| `PUSHER_APP_ID`, `PUSHER_SECRET` | การส่ง event และ authorize private channel ฝั่ง server |
| `GEMINI_API_KEY` | AI assistant |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | อัปโหลดรูปภาพ |
| `ITHUB_E2E_ALLOW_WRITES` | ต้องเป็น `true` เพื่อยืนยันการเขียนลงฐาน E2E |
| `ITHUB_E2E_ENVIRONMENT` | ต้องไม่เป็น `production`, `prod` หรือ `live` |
| `ITHUB_E2E_EMAIL`, `ITHUB_E2E_PASSWORD`, `ITHUB_E2E_USERNAME` | บัญชี E2E แยกจากบัญชีจริง |
| `ITHUB_ENVIRONMENT` | ระบุ `production` สำหรับ safety guard ของงานดูแลระบบ |
| `ITHUB_MEDIA_CLEANUP_ALLOW_PRODUCTION` | ต้องเป็น `true` เมื่อตั้งใจ retry Cloudinary cleanup บน Production |
| `ITHUB_SEED_EMAIL`, `ITHUB_SEED_PASSWORD`, `ITHUB_SEED_USERNAME` | บัญชีเริ่มต้นสำหรับ development |

ห้าม commit `.env`, credentials, token หรือไฟล์ข้อมูลส่วนตัวขึ้น Git

## ฐานข้อมูล

Migration แบบเรียงลำดับอยู่ใน `database/migrations` และบันทึกประวัติในตาราง `schema_migrations`

```bash
npm run db:migrate     # ใช้ migration ที่ยังไม่เคยรัน
npm run db:check       # ตรวจตารางและข้อมูลกำพร้า
npm run db:seed        # สร้าง/อัปเดตบัญชี development จาก ITHUB_SEED_*
```

Migration runner บันทึก SHA-256 ของไฟล์ migration, ตรวจ fingerprint ของ migration 002/003, adopt เฉพาะ schema ที่ครบ และหยุดเมื่อพบสถานะ partial หรือ fingerprint ไม่ตรง ห้ามแก้ไฟล์ migration ที่เคยเผยแพร่แล้ว

ตรวจคิว Cloudinary โดยไม่แก้ข้อมูล และ retry เมื่ออนุมัติแล้ว:

```bash
npm run media:cleanup
npm run media:cleanup -- --apply
```

### ฐานทดสอบ E2E แยก

สร้าง `.env.e2e.local` ที่ Git ignore จาก environment ปัจจุบัน หรือคัดลอก `.env.e2e.example` แล้วกรอกเอง จากนั้นใช้ฐานที่ชื่อจบด้วย `_e2e` เท่านั้น:

```bash
npm run e2e:setup          # สร้างค่า local และบัญชีสังเคราะห์โดยไม่แสดง secret
npm run db:create:e2e      # สร้างเฉพาะฐาน _e2e; ไม่ลบฐานที่มีอยู่
npm run db:preflight:e2e
npm run db:migrate:e2e
npm run db:seed:e2e
npm run db:check:e2e
npm run db:reconcile:e2e
npm run test:e2e
```

ทุกคำสั่ง E2E จะหยุดก่อนเชื่อมต่อหรือเขียนข้อมูล หากชื่อฐานไม่ลงท้าย `_e2e`, ไม่ได้ตั้ง `ITHUB_E2E_ALLOW_WRITES=true`, ไม่มีบัญชีทดสอบ หรือ environment ถูกระบุเป็น production

ตรวจ XP และจำนวนกระทู้ที่คลาดเคลื่อนโดยไม่แก้ข้อมูล:

```bash
npm run db:reconcile
```

หลังสำรองฐานข้อมูลและตรวจผล dry-run แล้วจึงปรับค่าจริง:

```bash
npm run db:reconcile -- --apply
```

## คำสั่งพัฒนาและทดสอบ

```bash
npm run dev       # development server
npm run lint      # ESLint เฉพาะ source/config/test/scripts
npm run test:unit # unit tests สำหรับ security, role และ media lifecycle
npm run build     # production build
npm run test:e2e  # Chromium, Firefox และ WebKit แบบ serial
npm run check     # lint และ build
```

Playwright ใช้ `.env.e2e.local` และ safety guard เดียวกับคำสั่งฐานข้อมูล ชุดทดสอบ authenticated ไม่มีการ skip เมื่อ config ไม่ครบจึง fail-fast ก่อน build และเปิด production-mode server ด้วย `next start` เพื่อให้พฤติกรรมใกล้ Vercel มากกว่า dev mode

## โครงสร้างสำคัญ

```text
app/                    Next.js routes, pages, layouts และ API routes
components/             UI และ client components
lib/                    auth, database, actions, validation และ integrations
database/migrations/    versioned database migrations
scripts/                migrate, seed, check และ reconciliation tools
tests/                  Playwright end-to-end tests
.github/workflows/      GitHub Actions quality gate
```

## แนวทางความปลอดภัย

- Session เก็บใน HttpOnly cookie ลงนามด้วย HMAC และเพิกถอนได้ด้วย `session_version`
- Server Actions และ Route Handlers ตรวจสิทธิ์ภายใน server ทุกครั้ง
- Notification ใช้ `private-user-{id}` และอนุญาตเฉพาะเจ้าของ channel
- SQL input ใช้ parameter binding และ dynamic values ใช้ allowlist
- Rich text sanitize ทั้งก่อนบันทึกและก่อนแสดงข้อมูลเก่า
- รูปภาพจำกัดชนิดและขนาดก่อนส่งไป Cloudinary
- Login rate limit แยก account/IP, hash identifier และใช้ shared database table
- CSP/HSTS และ security headers ป้องกัน browser attack surface
- Moderation actions เก็บ audit log โดย redacted metadata และ request ID
- การลบเนื้อหาและการให้ XP ทำใน transaction พร้อม reconciliation tool

## Deploy บน Vercel

1. เชื่อม project กับ Vercel และเพิ่ม environment variables สำหรับ Production/Preview
2. สำรองฐานข้อมูล แล้วรัน `npm run db:migrate` และ `npm run db:check`
3. ตรวจ `npm run check` และ `npm run test:e2e`
4. Deploy production

```bash
vercel link
vercel --prod
```

หลัง deploy ใช้ `vercel inspect <deployment-url>` และ `vercel logs <deployment-url> --level error --since 1h` เพื่อตรวจสถานะและ runtime errors

## เอกสารการตรวจระบบ

- `REVIEW_REPORT_FOR_AGENTS.md` — รายงานการตรวจครั้งแรกและหลักฐานก่อนแก้ไข
- `IMPLEMENTATION_REPORT.md` — รายการแก้ไข การทดสอบ ผลลัพธ์ และสถานะ deployment ล่าสุด
