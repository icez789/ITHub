# ITHub UI Stability Release — 2026-09-01

## สรุป

รอบนี้แก้ความไม่ต่อเนื่องของ UI ระหว่างเปลี่ยนหน้าและเปลี่ยนขั้น Spotlight Tour โดยคง App Shell เดิมไว้ตลอดการนำทาง ลดความพร่าของฉากหลัง และทำให้ tooltip/spotlight เคลื่อนจากตำแหน่งเดิมไปยังเป้าหมายใหม่โดยไม่แวบกลางจอ

## สิ่งที่เปลี่ยน

### Loading shell

- เปลี่ยน route loading fallback ให้แสดงเฉพาะ skeleton ของเนื้อหา ไม่สร้าง Navbar, Sidebar หรือ scroll container ซ้ำ
- ใช้ semantic surface tokens และรองรับ `prefers-reduced-motion`
- ป้องกัน duplicated shell, horizontal overflow และ layout shift ระหว่างกดลิงก์จาก Sidebar

### Spotlight Tour

- แยกขั้นที่แสดงอยู่จากขั้นที่กำลังค้นหา target ผ่านสถานะ `locating`, `transitioning`, `settled` และ `fallback`
- คง tooltip และ spotlight เดิมไว้จน target ใหม่พร้อม แล้ว commit เนื้อหาและ geometry พร้อมกัน
- ยกเลิก centered placement ระหว่างรอและกรณี target หาย; fallback จะคงตำแหน่งล่าสุดและซ่อน spotlight
- ลด backdrop จาก blur 10px/หรี่ 58% เป็น blur 4px/หรี่ 42% พร้อม brightness 88%; browser ที่ไม่รองรับ filter ใช้พื้นดำโปร่ง 64%
- ใช้ motion 300ms แบบไม่มี overshoot, content fade-through 120ms และยกเลิก pointer animation แบบเด้งวน
- เปลี่ยนการรอ scroll จาก delay คงที่เป็นตรวจ target ที่หยุดเคลื่อนที่จริง และรองรับ Reduced Motion

## Compatibility

- ไม่เปลี่ยน route, public API, database schema, authorization flow หรือ local-storage key ของ onboarding
- รักษาเนื้อหา Spotlight Tour เดิมทั้ง 6 ขั้น
- รองรับ Light, Dark และ `prefers-reduced-motion`

## หลักฐานการตรวจรับ

- ESLint ผ่าน
- Next.js production build ผ่านครบ 20 routes
- Playwright Spotlight Tour ผ่าน 27/27 บน Chromium, Firefox และ WebKit
- ตรวจครบ 6 ขั้นที่ 390×844, 768×900, 1024×900 และ 1440×1000
- ครอบคลุม forward/backward, delayed target, missing target, backdrop fallback, focus trap, URL/history restoration และ member target
- Loading shell regression ผ่าน 3/3 และ responsive regression ผ่าน 15/15 บน Chromium, Firefox และ WebKit

## ไฟล์หลัก

- `app/loading.js`
- `components/OnboardingProvider.js`
- `tests/ithub-flow.spec.js`
- `.md/design/ITHUB_REDESIGN_PLAN.md`

## ข้อควรทำเมื่อแก้ต่อ

- อ่าน `.md/design/README.md` และแผนปัจจุบันก่อนแก้ visual UI หรือ UX flow
- รักษา pending-step transaction เพื่อไม่ให้ tooltip กลับไปตำแหน่งกลางจอ
- หากเปลี่ยน blur, dim หรือ motion timing ต้องอัปเดต Playwright assertions และ Implementation log พร้อมกัน
