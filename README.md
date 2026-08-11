# ByteBoard / IT Hub

เว็บบอร์ดชุมชนไอทีที่สร้างด้วย Next.js App Router, MySQL/TiDB, Pusher, Cloudinary และ Gemini มีระบบกระทู้ คอมเมนต์ โพล ไลก์ บุ๊กมาร์ก การแจ้งเตือน XP และเครื่องมือดูแลระบบ

## เริ่มต้นใช้งาน

1. ใช้ Node.js 20 ขึ้นไป และสร้างฐานข้อมูล MySQL/TiDB
2. คัดลอก `.env.example` เป็น `.env` แล้วกำหนดค่าที่จำเป็น
3. สร้าง `SESSION_SECRET` แบบสุ่มความยาวอย่างน้อย 32 ตัวอักษร ห้ามใช้ค่าเดียวกับรหัสผ่านฐานข้อมูลใน production
4. ติดตั้งและเปิดแอป

```bash
npm install
npm run dev
```

แอปทำงานที่ `http://localhost:3000`

## คำสั่งตรวจสอบ

```bash
npm run lint
npm run build
npm run test:e2e
npm run check
```

Playwright จะเปิด development server ให้อัตโนมัติ การทดสอบ login/create ต้องกำหนด `BYTEBOARD_E2E_EMAIL` และ `BYTEBOARD_E2E_PASSWORD` เป็นบัญชีทดสอบที่แยกจากผู้ดูแลระบบ

## ความปลอดภัย

- Session cookie ถูกเซ็นด้วย HMAC และเก็บเฉพาะ user ID; role และสถานะ ban โหลดจากฐานข้อมูลทุกครั้ง
- Server actions ทุกตัวต้องตรวจ user/role ภายใน action ห้ามเชื่อ user ID หรือ role จาก form
- Rich text ถูก sanitize ด้วย allowlist ก่อนบันทึกและก่อนแสดงข้อมูลเก่า
- รูปภาพรองรับเฉพาะ JPG, PNG, WebP และ GIF ขนาดไม่เกิน 5MB และจัดเก็บใน Cloudinary
- Login, comment, report, poll, create topic และ AI chat มี rate limit ระดับแอป การ deploy หลาย instance ควรเปลี่ยน store เป็น Redis/KV

## Environment variables

ดูรายการทั้งหมดใน `.env.example` ตัวแปรที่ต้องระวังเป็นพิเศษ:

- `SESSION_SECRET`: secret สุ่มอย่างน้อย 32 ตัวอักษร
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`: คีย์ base64 ที่ถอดแล้วมีขนาด 32 bytes สำหรับให้ Server Actions ใช้คีย์เดียวกันทุก instance
- `SERVER_ACTION_ALLOWED_ORIGINS`: hostname ที่อนุญาต คั่นด้วย comma
- `BYTEBOARD_E2E_EMAIL`, `BYTEBOARD_E2E_PASSWORD`: ใช้เฉพาะชุดทดสอบ

อย่า commit `.env`, test credentials หรือไฟล์ upload ลง Git
