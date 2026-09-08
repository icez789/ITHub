# Research Analytics Dashboard — Visual Decision Record

> วันที่: 9 กันยายน 2569
>
> หน้า: `/admin/analytics`
>
> สถานะ: Phase 4 local visual/geometry verification ผ่าน; palette/accessibility matrix แบบเต็มยังค้าง

## Direction

- วาง Dashboard ก่อน campaign management เพื่อให้ Admin เห็น evidence task หลักก่อน ส่วน Super Admin ยังจัดการ lifecycle ได้ในหน้าเดิม
- ใช้ card, border, surface และ semantic status tokens ที่มีอยู่ ไม่เพิ่ม gradient, emoji, chart library หรือ animation ตกแต่ง
- ใช้ภาษาไทยเป็นหลักและ Lucide icons; คำมาตรฐานเชิงวิจัย เช่น SUS, observed และ denominator แสดงพร้อมคำอธิบายใกล้ผลลัพธ์
- Filter เป็น native GET form เพื่อรองรับ keyboard, URL ที่แชร์/ตรวจซ้ำได้ และไม่ต้องเพิ่ม client state
- ตารางกว้างอยู่ใน container ที่เลื่อนเฉพาะแนวนอน ไม่ขยาย document viewport

## Privacy in the interface

- กลุ่มต่ำกว่า 5 แสดงข้อความ “ข้อมูลยังไม่พอ (n < 5)” โดยไม่ส่งค่าจริงไว้ใน DOM
- Rate card แสดง numerator/denominator, UTC window และ deduplication โดยตรง ไม่ซ่อนเฉพาะ tooltip
- เมื่อกรอง demographic และไม่มี denominator รายกลุ่ม ระบบแสดงว่า “ยังคำนวณไม่ได้” แทนการใช้ denominator ทั้ง campaign อย่างทำให้เข้าใจผิด
- Observed task แยก Not observed กับ Unavailable และอธิบายว่า consent ที่ขาดไม่ใช่ failure

## Responsive and theme evidence

- Playwright: Chromium, Firefox และ WebKit ที่ 375×812 Light และ 1280×800 Dark ผ่าน document-overflow และ Next.js error-overlay assertions
- ตรวจภาพ Chromium ด้วยตา:
  - Mobile Light: header, export action และ filter hierarchy อ่านต่อเนื่อง; ปุ่มหลักไม่ลอยซ้ำกับ primary action ของ app shell
  - Desktop Dark: content อยู่ใน layout flow ข้าง sidebar, surfaces แยกชั้นชัด และ text/status contrast อ่านได้
- หลักฐาน local อยู่ใต้ `.vercel/release-evidence/research-phase4-dashboard-final/` และไม่บันทึก fixture identity หรือ screenshots ลง Git

## Remaining visual gates

- ตรวจ surfaces/statuses ใหม่ครบ 5 palettes × Light/Dark
- ตรวจ keyboard order, visible focus และ Screen Reader flow ของ filters, tables และ download
- ตรวจ loading/error/retry ในสภาวะ network/database failure จริง
- ทำ Preview visual smoke หลังตั้ง branch-scoped isolated variables แล้วเท่านั้น
