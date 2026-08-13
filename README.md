# ITHub

ITHub คือเว็บบอร์ดชุมชนด้านไอทีสำหรับตั้งคำถาม แบ่งปันความรู้ และพูดคุยเรื่อง Hardware, Software, Network, AI & Data และหัวข้อทั่วไป พัฒนาด้วย Next.js App Router และรองรับระบบสมาชิก กระทู้ คอมเมนต์ โพล การถูกใจ บุ๊กมาร์ก การแจ้งเตือนแบบเรียลไทม์ XP และเครื่องมือผู้ดูแลระบบ

## ความสามารถหลัก

- สมัครสมาชิก เข้าสู่ระบบ แก้ไขโปรไฟล์ และเปลี่ยนรหัสผ่านแบบ transaction
- สร้าง แก้ไข ค้นหา กรอง และจัดเรียงกระทู้
- Rich-text editor พร้อม code block และการเลือกภาษา
- คอมเมนต์แบบตอบกลับ เลือกคำตอบที่ถูกต้อง และระบบ XP
- โพล การถูกใจ บุ๊กมาร์ก รายงานเนื้อหา และการแจ้งเตือน
- Pusher private channel ที่ตรวจสิทธิ์ด้วย session ของผู้ใช้
- หน้าผู้ดูแลสำหรับสมาชิก กระทู้ คอมเมนต์ และรายงาน พร้อม pagination
- Dark mode, responsive navigation, skip link และ keyboard accessibility
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
| `ITHUB_E2E_EMAIL`, `ITHUB_E2E_PASSWORD` | บัญชี E2E แยกจากบัญชีจริง |
| `ITHUB_SEED_EMAIL`, `ITHUB_SEED_PASSWORD`, `ITHUB_SEED_USERNAME` | บัญชีเริ่มต้นสำหรับ development |

ห้าม commit `.env`, credentials, token หรือไฟล์ข้อมูลส่วนตัวขึ้น Git

## ฐานข้อมูล

Migration แบบเรียงลำดับอยู่ใน `database/migrations` และบันทึกประวัติในตาราง `schema_migrations`

```bash
npm run db:migrate     # ใช้ migration ที่ยังไม่เคยรัน
npm run db:check       # ตรวจตารางและข้อมูลกำพร้า
npm run db:seed        # สร้าง/อัปเดตบัญชี development จาก ITHUB_SEED_*
```

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
npm run build     # production build
npm run test:e2e  # Chromium, Firefox และ WebKit แบบ serial
npm run check     # lint และ build
```

Playwright โหลด `.env` ด้วย Next environment loader ใน CI จะหยุดทันทีหากไม่มี `ITHUB_E2E_EMAIL` หรือ `ITHUB_E2E_PASSWORD` เพื่อป้องกัน critical authenticated tests ถูกข้ามโดยไม่ตั้งใจ

## โครงสร้างสำคัญ

```text
app/                    Next.js routes, pages, layouts และ API routes
components/             UI และ client components
lib/                    auth, database, actions, validation และ integrations
database/migrations/    versioned database migrations
scripts/                migrate, seed, check และ reconciliation tools
tests/                  Playwright end-to-end tests
```

## แนวทางความปลอดภัย

- Session เก็บใน HttpOnly cookie และลงนามด้วย HMAC
- Server Actions และ Route Handlers ตรวจสิทธิ์ภายใน server ทุกครั้ง
- Notification ใช้ `private-user-{id}` และอนุญาตเฉพาะเจ้าของ channel
- SQL input ใช้ parameter binding และ dynamic values ใช้ allowlist
- Rich text sanitize ทั้งก่อนบันทึกและก่อนแสดงข้อมูลเก่า
- รูปภาพจำกัดชนิดและขนาดก่อนส่งไป Cloudinary
- Rate limit ใช้ shared database table และ fallback ชั่วคราวหากยังไม่ได้ migrate
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
