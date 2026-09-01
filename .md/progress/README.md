# ITHub Progress Hub

โฟลเดอร์นี้เป็นศูนย์รวมรายงานสถานะการพัฒนา ITHub โดยแยกจากเอกสารแนวทางดีไซน์และรายงานตรวจระบบรุ่นก่อน

## รายงานปัจจุบัน

- [`ITHUB_PROGRESS_88_PERCENT.md`](./ITHUB_PROGRESS_88_PERCENT.md) — Teacher content moderation, delete UX/performance และหลักฐาน `_e2e`
- [`ITHUB_PROGRESS_85_PERCENT.md`](./ITHUB_PROGRESS_85_PERCENT.md) — milestone 85% พร้อมสถานะ implementation, safety gates, test evidence และ rollout blocker
- [`ITHUB_PROGRESS_75_PERCENT.md`](./ITHUB_PROGRESS_75_PERCENT.md) — ภาพรวมฟีเจอร์ สถานะ 75% ผลการทดสอบ ช่องว่าง และแผนไปสู่ 100% ณ วันที่ 31 สิงหาคม 2026

## เอกสารที่เกี่ยวข้อง

- [`../design/README.md`](../design/README.md) — source of truth สำหรับงาน UI/UX
- [`../../REVIEW_REPORT_FOR_AGENTS.md`](../../REVIEW_REPORT_FOR_AGENTS.md) — รายงานตรวจระบบตั้งต้นเมื่อ 13 สิงหาคม 2026
- [`../../IMPLEMENTATION_REPORT.md`](../../IMPLEMENTATION_REPORT.md) — รายงานการแก้ไขและ deployment รอบก่อน
- [`../test-account/README.md`](../test-account/README.md) — วิธีเตรียมบัญชีทดสอบโดยไม่เผยแพร่รหัสผ่าน

## วิธีอัปเดต

เมื่อมี release หรือ milestone ใหม่ ให้สร้างรายงานใหม่แทนการเขียนทับหลักฐานเดิม และระบุอย่างน้อย:

1. commit/branch ที่ตรวจ
2. ฟีเจอร์ที่เพิ่มหรือเปลี่ยน
3. คำสั่งทดสอบและผลจริง
4. งานค้าง ความเสี่ยง และผู้รับผิดชอบ
5. คะแนนความคืบหน้าพร้อมเกณฑ์ที่ใช้
