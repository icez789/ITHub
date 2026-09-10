# ITHub Feedback & Research Analytics — Checkpoint 09

> วันที่: 10 กันยายน 2569
>
> Branch: `codex/feedback-research-analytics`
>
> Source ก่อนเริ่ม: `176e299b38f63ca62f2fe2ebffad6228705eae98`
>
> ขอบเขต: Pilot execution readiness และ manual accessibility handoff
>
> สถานะ: ชุดดำเนินงานพร้อม; ยังไม่ทำ Pilot หรืออ้างผล NVDA/VoiceOver

## สิ่งที่ส่งมอบ

- เพิ่ม [`ITHUB_FEEDBACK_RESEARCH_ANALYTICS_PILOT_RUNBOOK.md`](./ITHUB_FEEDBACK_RESEARCH_ANALYTICS_PILOT_RUNBOOK.md)
- รวม decision sign-off 11 หัวข้อ, campaign preparation sheet, technical preflight, session script และ participant record แบบไม่เก็บชื่อ
- กำหนดคำสั่ง 5 งานและนิยาม observed success ให้ตรงกับ metric implementation ปัจจุบัน
- เพิ่ม manual NVDA/VoiceOver checklist แยก member และ Admin/Super Admin พร้อมรูปแบบ evidence ที่ต้องบันทึก
- เพิ่ม Go/No-Go, post-pilot evidence, retention/export handling และ incident boundary

## Checklist audit

ปิดรายการที่ implementation และ test evidence มีอยู่แล้ว แต่เช็กลิสต์ยังไม่สะท้อน:

- Analytics จำกัดเฉพาะ authenticated member ที่ opt-in
- ZIP สร้างจาก Node.js GET Route เป็น aggregate-only deterministic stored archive พร้อม unit budget
- Self-reported แยกจาก `observed / not_observed / unavailable` ใน schema, Dashboard และ export
- Internal note ไม่ออก member DTO, Analytics, audit metadata หรือ export และมี canary tests

รายการเชิงระเบียบวิธี เช่น SUS translation, denominator, session/funnel definition, withdrawal/open-text policy, retention/key owner และ notice version ยังรอผู้มีอำนาจรับรองใน decision sheet

## Host capability check

- Google Chrome: พบในเครื่อง
- Microsoft Edge: พบในเครื่อง
- Windows Narrator: พบในเครื่อง แต่ไม่ใช้แทน NVDA evidence
- NVDA: ไม่พบในเครื่อง
- VoiceOver: ต้องใช้ macOS และไม่พร้อมบนเครื่อง Windows นี้

ดังนั้น manual assistive-technology gate ยังคงเป็น `pending/blocked by tool availability` จนมีผู้ทดสอบใช้ NVDA และ VoiceOver จริง ผล automated accessibility ก่อนหน้าไม่ถูกนำมาอ้างแทน

## Safety boundary

- ยังไม่ได้สร้าง เปิด ปิด หรือล็อก campaign ใหม่
- ยังไม่ได้สร้างบัญชี/เชิญผู้เข้าร่วม Pilot
- ยังไม่มีการเก็บคำตอบหรือ Analytics เพิ่มจากคนจริง
- Preview ยังคงผูก `test_e2e`; ห้าม promote ไป Production
- ไม่มี Production migration/deploy, retention execute หรือการเปลี่ยน Production environment

## ขั้นถัดไปที่ต้องมีคน/การอนุมัติ

1. กรอกและลงนาม decision sheet
2. เตรียมบัญชี Pilot แบบไม่ใช้ PII และ participant codes 5–10 คน
3. สร้าง draft campaign ตาม preparation sheet แล้วให้ผู้ตรวจคนที่สองทวนก่อนเปิด
4. ทำ standard, keyboard, NVDA และ VoiceOver sessions พร้อมบันทึกผล
5. ปิด campaign, ตรวจ logs/database/export และตัดสิน Go/No-Go ก่อนล็อก
