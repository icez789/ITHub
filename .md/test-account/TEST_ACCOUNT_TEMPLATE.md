# Test Account Template — ห้ามใส่รหัสจริงในไฟล์นี้

คัดลอกไฟล์นี้เป็น `credentials.local.md` ก่อนกรอกข้อมูลจริง ไฟล์ปลายทางถูก `.gitignore` ภายในโฟลเดอร์นี้

## Environment

- ชื่อ environment: `<local / preview / dedicated-e2e>`
- Base URL: `<http://127.0.0.1:3000>`
- Database: `<ชื่อฐานข้อมูลทดสอบ ห้ามใช้ production>`
- วันที่สร้าง: `<YYYY-MM-DD>`
- ผู้ดูแลข้อมูลทดสอบ: `<ชื่อ/ช่องทางติดต่อ>`

## Member account

- Username: `<test username>`
- Email: `<test email>`
- Password: `<กรอกเฉพาะใน credentials.local.md>`
- Role: `user`
- ข้อจำกัดหรือข้อมูลที่ห้ามแก้: `<ถ้ามี>`

## Admin account (optional)

- Username: `<test admin username>`
- Email: `<test admin email>`
- Password: `<กรอกเฉพาะใน credentials.local.md>`
- Role: `<admin หรือ super_admin>`
- ขอบเขตที่อนุญาตให้ทดสอบ: `<ระบุให้ชัด>`

## Cleanup

- ลบข้อมูลทดสอบได้หรือไม่: `<ได้/ไม่ได้>`
- วิธี reset database: `<คำสั่งหรือผู้รับผิดชอบ>`
- วันหมดอายุ/วันหมุนรหัส: `<YYYY-MM-DD>`

