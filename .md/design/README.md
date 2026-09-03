# ITHub Design Documentation

> โฟลเดอร์นี้เป็น **source of truth สำหรับงาน UI/UX ของ ITHub**

หากต้องการแก้ visual UI, UX flow, responsive layout, typography, color, motion, iconography หรือ component styling ให้เริ่มอ่านเอกสารในโฟลเดอร์นี้ก่อนทุกครั้ง ห้ามเริ่มแก้ production code จากความเห็นเฉพาะหน้าโดยไม่ตรวจแผนและข้อกำหนดที่บันทึกไว้ที่นี่

## เอกสารที่ต้องอ่าน

1. อ่าน [`REVIEW_REPORT_FOR_AGENTS.md`](../../REVIEW_REPORT_FOR_AGENTS.md) เพื่อทราบข้อบกพร่องเดิม หลักฐานการทดสอบ และข้อควรระวังของ workspace
2. อ่านแผนที่กำลังใช้งาน: [`ITHUB_REDESIGN_PLAN.md`](./ITHUB_REDESIGN_PLAN.md)
3. ก่อนแก้ Next.js หรือ Tailwind ให้ตรวจคู่มือเวอร์ชันที่ติดตั้งจริงตามคำสั่งใน [`AGENTS.md`](../../AGENTS.md)

## แผนที่กำลังใช้งาน

- **ชื่อ:** ITHub UX/UI and Theme Roadmap — Phase 1
- **สถานะ:** QA passed — Preview ready; Production release in progress
- **ทิศทาง:** Clean Technical Community with user-selectable atmosphere
- **อัปเดตล่าสุด:** 2026-09-03
- **ไฟล์:** [`ITHUB_UX_THEME_ROADMAP.md`](./ITHUB_UX_THEME_ROADMAP.md)

อ่าน [`ITHUB_REDESIGN_PLAN.md`](./ITHUB_REDESIGN_PLAN.md) ต่อด้วยเพื่อดูข้อกำหนดพื้นฐานและ implementation history เดิม

## สรุปรอบล่าสุด

- [`ITHUB_UX_THEME_ROADMAP.md`](./ITHUB_UX_THEME_ROADMAP.md) — Phase 1 สำหรับ Light mode hierarchy, 5 palettes และ checklist การตรวจรับ
- [`2026-09-02_ITHUB_94_RELEASE.md`](./2026-09-02_ITHUB_94_RELEASE.md) — moderation states/audit, notification center, mutation feedback และ visual/accessibility evidence
- [`2026-09-01_TEACHER_DELETE_UX_RELEASE.md`](./2026-09-01_TEACHER_DELETE_UX_RELEASE.md) — Teacher role, modal ยืนยันการลบ และผลวัด cascade deletion
- [`2026-09-01_UI_STABILITY_RELEASE.md`](./2026-09-01_UI_STABILITY_RELEASE.md) — Loading shell และ Spotlight Tour continuity พร้อมหลักฐานการตรวจรับ

## กติกาสำหรับงานดีไซน์

- รักษาเส้นทางใช้งาน, สิทธิ์, backend behavior, public API และ database schema เดิม เว้นแต่มีแผนอื่นอนุมัติให้เปลี่ยน
- ใช้ภาษาไทยเป็นหลัก และใช้ศัพท์อังกฤษเมื่อเป็นชื่อเทคโนโลยี ชื่อผลิตภัณฑ์ หรือ taxonomy ที่ผู้ใช้คุ้นเคย
- ใช้สีแดงเป็น brand accent หลัก สีสถานะต้องมีความหมายและห้ามใช้เพื่อการตกแต่งโดยไม่มีเหตุผล
- ใช้ Lucide icons สำหรับ navigation และ controls; ใช้ emoji ได้เฉพาะเนื้อหาหรือบริบทเชิงอารมณ์
- ห้ามเพิ่ม animation แบบวนซ้ำ เว้นแต่เป็น loading, progress หรือสถานะที่ต้องเรียกความสนใจจริง
- บนมือถือมี floating primary action ได้ไม่เกินหนึ่งรายการ และ floating UI ต้องไม่ทับ navigation หรือ content controls
- ทุกการเปลี่ยนสำคัญต้องอัปเดต checklist, หลักฐาน และบันทึกการตัดสินใจในแผนก่อนถือว่างานเสร็จ

## วิธีบันทึกความคืบหน้า

เมื่อเริ่มทำแต่ละ phase ให้เปลี่ยน checkbox ในแผนและเพิ่มบันทึกสั้น ๆ ใต้หัวข้อ `Implementation log` โดยระบุ:

- วันที่และผู้ดำเนินการ
- phase หรือหน้าที่แก้
- การตัดสินใจที่ต่างจากแผน พร้อมเหตุผล
- viewport และ theme ที่ตรวจ
- คำสั่งทดสอบและผลลัพธ์
- ประเด็นที่ยังค้างหรือถูกเลื่อนไป phase ถัดไป

เอกสารดีไซน์ใหม่ เช่น visual audit, decision record, component specification หรือผล visual QA ต้องสร้างภายใน `.md/design/` เท่านั้น
