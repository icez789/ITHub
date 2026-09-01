# ITHub 94 — Moderation, Notification และ Mutation UX

> วันที่ตรวจ: 2 กันยายน 2026
> สาขา: `codex/ithub-94-milestone`

## เป้าหมาย

ทำให้การดูแลชุมชนและ action สำคัญมีสถานะที่เข้าใจได้ ปลอดภัยต่อการกดซ้ำ ใช้งานได้ด้วยคีย์บอร์ด และไม่ทำให้ข้อมูล realtime ซ้ำหรือหน้ากระโดดระหว่าง Server Action refresh

## การตัดสินใจด้าน UX

- กระทู้ปักหมุดใช้ badge สีอำพันและอยู่เหนือรายการปกติในหน้า feed; Search ยังเคารพ sort ของผู้ใช้
- กระทู้ล็อกแสดงสถานะชัดและปิดเฉพาะ Comment/Reply; การอ่าน Like และ Bookmark ยังใช้ได้
- action ที่ทำลายข้อมูลใช้ native dialog ของ ITHub พร้อม focus restoration, Escape, pending และ inline error
- action ที่ไม่ทำลายข้อมูล เช่น ปิดรายงาน ใช้ปุ่ม pending พร้อม toast และ error สำหรับ Screen Reader
- Notification แบ่งหน้า 20 รายการ มี action รายชิ้น/ทั้งหมด และ disable action ที่ขัดกันระหว่าง mutation
- realtime notification ใช้ stable key dedupe และ sync state ใหม่เมื่อเปลี่ยนหน้า เพื่อไม่ค้างรายการจากหน้าเดิม

## Accessibility และ responsive

- ใช้ `aria-label`, `aria-live`, `role="alert"`, disabled semantics และ focus restoration
- spinner ทุกจุดเคารพ `prefers-reduced-motion`
- ตรวจ matrix 375×812, 390×844, 768×900, 1024×900, 1280×800 และ 1440×1000 ทั้ง Light/Dark
- Spotlight Tour และ dialog ไม่สร้าง horizontal overflow และไม่ทับ Navbar, Sidebar, BottomNav หรือ ITHub Bot

## หลักฐาน

- ESLint: ผ่าน
- Production build: ผ่านบน Next.js 16.3.4 รวม 21 routes
- Unit: 8/8
- Playwright serial: 129/129 บน Chromium, Firefox, WebKit
- Final report/notification regression: 6/6 ครบสาม engine
- Delete feedback: 7ms / 13ms / 95ms
- Delete completion: 991ms / 854ms / 896ms

## ขอบเขตที่ไม่เปลี่ยน

- ไม่เปลี่ยน route สาธารณะเดิม
- ไม่สร้างเนื้อหาตัวอย่างใน Production
- Teacher ยังไม่เห็น audit log หรือเครื่องมือบัญชี
- รูป legacy ที่ไม่มี Cloudinary public ID จะไม่ถูกเดาหรือลบอัตโนมัติ
