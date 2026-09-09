# Research Analytics Dashboard — Visual Decision Record

> วันที่: 9 กันยายน 2569
>
> หน้า: `/admin/analytics`
>
> สถานะ: Phase 5 local visual/accessibility verification ผ่าน; Preview และ manual assistive-technology QA ยังค้าง

## Direction

- วาง Dashboard ก่อน campaign management เพื่อให้ Admin เห็น evidence task หลักก่อน ส่วน Super Admin ยังจัดการ lifecycle ได้ในหน้าเดิม
- ใช้ card, border, surface และ semantic status tokens ที่มีอยู่ ไม่เพิ่ม gradient, emoji, chart library หรือ animation ตกแต่ง
- ใช้ภาษาไทยเป็นหลักและ Lucide icons; คำมาตรฐานเชิงวิจัย เช่น SUS, observed และ denominator แสดงพร้อมคำอธิบายใกล้ผลลัพธ์
- Filter เป็น native GET form เพื่อรองรับ keyboard, URL ที่แชร์/ตรวจซ้ำได้ และไม่ต้องเพิ่ม client state
- ตารางกว้างอยู่ใน container ที่เลื่อนเฉพาะแนวนอน ไม่ขยาย document viewport
- ตารางเลื่อนแนวนอนเป็น keyboard-focusable region พร้อมชื่อและ visible focus เพื่อให้ผู้ใช้รู้ว่าพื้นที่นี้เลื่อนได้
- ฟอร์มและ Server Action ใช้ persistent live region, `aria-busy` และย้าย focus ไป error ใหม่ โดยไม่ล้าง draft เมื่อ offline
- Route error ของ Feedback/Dashboard ใช้หัวข้อที่รับ focus, retry state และทางกลับหน้าแรกโดยไม่แสดง arbitrary error detail

## Privacy in the interface

- กลุ่มต่ำกว่า 5 แสดงข้อความ “ข้อมูลยังไม่พอ (n < 5)” โดยไม่ส่งค่าจริงไว้ใน DOM
- Rate card แสดง numerator/denominator, UTC window และ deduplication โดยตรง ไม่ซ่อนเฉพาะ tooltip
- เมื่อกรอง demographic และไม่มี denominator รายกลุ่ม ระบบแสดงว่า “ยังคำนวณไม่ได้” แทนการใช้ denominator ทั้ง campaign อย่างทำให้เข้าใจผิด
- Observed task แยก Not observed กับ Unavailable และอธิบายว่า consent ที่ขาดไม่ใช่ failure

## Responsive and theme evidence

- Playwright: Chromium, Firefox และ WebKit ที่ 375×812 Light และ 1280×800 Dark ผ่าน document-overflow และ Next.js error-overlay assertions
- Chromium: `classic`, `ocean`, `forest`, `violet`, `amber` × Light/Dark ผ่านครบทั้ง Dashboard และ Feedback รวม 20 screenshots
- สี text, muted, accent, primary และ semantic status เทียบ surface ผ่าน automated contrast assertion อย่างน้อย 4.5:1 ทุก palette/mode
- ตรวจภาพ Chromium ด้วยตา:
  - Mobile Light: header, export action และ filter hierarchy อ่านต่อเนื่อง; ปุ่มหลักไม่ลอยซ้ำกับ primary action ของ app shell
  - Desktop Dark: content อยู่ใน layout flow ข้าง sidebar, surfaces แยกชั้นชัด และ text/status contrast อ่านได้
- ตรวจเพิ่ม Dashboard ครบ 10 palette/mode images และหน้า Feedback ตัวแทน 6 images ไม่พบ overlap, clipping หรือ hierarchy regression
- หลักฐาน local อยู่ใต้ `.vercel/release-evidence/research-phase4-dashboard-final/` และ `.vercel/release-evidence/research-phase5-palettes/`; ไม่บันทึก fixture identity หรือ screenshots ลง Git

## Accessibility evidence

- Chromium, Firefox และ WebKit ผ่าน accessible name ของ Evaluation/Feedback/admin forms, fieldset/legend และ filter
- ตารางมี caption, column scopes และ focusable overflow region; export อธิบายว่าเป็น aggregate-only ZIP 7 ไฟล์
- keyboard order และ focus outline อย่างน้อย 2 px ผ่าน automation
- consent/filter/offline errors ผูกกับ form, ใช้ assertive live region และรับ focus เมื่อเกิดข้อความใหม่
- หลักฐานนี้ตรวจ semantic accessibility tree ที่ browser ส่งให้ assistive technology; manual NVDA/VoiceOver ยังไม่ถูกอ้างว่าผ่าน

## Remaining visual gates

- ตรวจ manual NVDA/VoiceOver หรือ assistive technology ที่ใช้จริงใน Preview/pilot
- inject database/runtime failure บน isolated Preview เพื่อยืนยัน route retry กับระบบจริง; local build และ offline/retry flow ผ่านแล้ว
- ทำ Preview visual smoke หลังตั้ง branch-scoped isolated variables แล้วเท่านั้น
