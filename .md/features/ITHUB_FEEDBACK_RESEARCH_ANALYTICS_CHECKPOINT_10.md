# ITHub Feedback & Research Analytics — Checkpoint 10

> วันที่: 10 กันยายน 2569
>
> Branch: `codex/feedback-research-analytics`
>
> Source ก่อนเริ่ม: `d924e1fe9a604100096476f1244319a7b08942df`
>
> ขอบเขต: fail-closed Pilot readiness guard และ config handoff
>
> สถานะ: technical readiness guard พร้อม; ยังรอ decision sign-off, ผู้เข้าร่วม, manual NVDA/VoiceOver และ Pilot จริง

## สิ่งที่ส่งมอบ

- เพิ่ม `pilot:research:validate` สำหรับตรวจ config ก่อนสร้างหรือเปิด campaign โดยอ่านเฉพาะไฟล์ local
- บังคับ branch `codex/feedback-research-analytics`, linked ITHub project, target `preview` และฐาน `test_e2e`
- บังคับ `data_scope=pilot`, questionnaire/notice versions ที่ระบบรองรับ, participant codes ต่อเนื่อง `P01`–`P10` และ eligible snapshot 5–10 คนที่มีจำนวนตรงกัน
- บังคับ UTC window, retention ไม่ก่อน campaign end และไม่เกิน 366 วัน, decision 11/11, owner/tester codes, quiet window, external-service review และ final approval boundary
- เพิ่ม [Pilot config ตัวอย่าง](./ITHUB_FEEDBACK_RESEARCH_ANALYTICS_PILOT_CONFIG.example.json) ที่ตั้งใจให้ blocked ด้วย `pending`, ช่อง owner/tester ว่าง และ confirmation เป็น `false`
- อัปเดต [Pilot runbook](./ITHUB_FEEDBACK_RESEARCH_ANALYTICS_PILOT_RUNBOOK.md) และ [Setup runbook](./ITHUB_FEEDBACK_RESEARCH_ANALYTICS_SETUP.md) พร้อมคำสั่ง, ขอบเขตข้อมูล และข้อจำกัดของ guard

## Privacy และ safety boundary

- Config รับเฉพาะ field ใน allowlist; field เช่น password, token หรือ secret ถูกปฏิเสธ
- Campaign label ถูกปฏิเสธหากมีรูปแบบอีเมล URL เลขต่อเนื่องอย่างน้อย 8 หลัก หรือขึ้นบรรทัดใหม่
- รายงานแสดงเฉพาะ participant codes, จำนวน, campaign metadata และ alias สังเคราะห์ เช่น `pilot_p01` / `pilot.p01@example.invalid`
- Validator ไม่เชื่อมต่อเครือข่าย ไม่อ่าน/เขียนฐานข้อมูล และไม่สร้างบัญชีหรือ campaign
- ไฟล์กรอกจริงอยู่ที่ `.vercel/release-evidence/research-pilot-config.json` ซึ่งถูก Git ignore; ตัวอย่างที่ commit ไม่มีข้อมูลคนจริง
- Guard ตรวจความครบถ้วนและความสอดคล้องของค่าที่กรอก แต่ไม่พิสูจน์ตัวตนผู้อนุมัติและไม่ทดแทน decision sheet ที่ลงนามจริง

## ผลตรวจรับ

| รายการ | ผล |
| --- | --- |
| Targeted readiness unit tests | ผ่าน 6/6 รวมการยืนยันว่า config ตัวอย่างยัง blocked |
| Unit tests รวม | ผ่าน 85/85 |
| Lint | ผ่าน |
| Next.js production build | ผ่านบน 16.3.4 |
| Existing Preview local guard | ผ่าน: branch ถูกต้อง, `test_e2e`, variables 29 รายการ |
| CLI เมื่อไม่มี config | blocked ด้วย `config_file_missing` ก่อนตรวจ target อื่น |
| CLI fixture ที่ครบ | `ready`, decision 11/11, participant/eligible 5/5; fixture ถูกลบหลังตรวจ |
| Diff whitespace check | ผ่าน; มีเฉพาะคำเตือน LF/CRLF ตาม checkout Windows |

## สิ่งที่ยังไม่อ้างว่าผ่าน

- Decision 11 หัวข้อและลายเซ็นผู้มีอำนาจยังไม่ถูกกรอก
- ยังไม่ได้เตรียมหรือเชิญผู้เข้าร่วม 5–10 คน และยังไม่มีบัญชี Pilot จริง
- NVDA ยังไม่มีบน host นี้ และ VoiceOver ต้องใช้ macOS; manual assistive-technology gate ยัง pending
- ยังไม่ได้สร้าง/open/close/lock campaign, เก็บ Evaluation/Feedback/Analytics หรือทำ Pilot session
- ยังไม่ได้ migrate, deploy หรือ promote Production และไม่ได้ execute retention

## ขั้นถัดไปที่ต้องมีคนดำเนินการ

1. ลงนาม decision sheet แล้วคัดลอก config ตัวอย่างไปยังตำแหน่ง local ที่ Git ignore
2. กรอก operator/participant codes, UTC window, retention, owner/tester และ confirmations โดยไม่ใส่ PII/secret
3. รัน `npm.cmd run pilot:research:validate` จนได้ `status: ready` แล้วให้ผู้ตรวจคนที่สองเทียบกับ decision sheet
4. เตรียมบัญชีสังเคราะห์และทำ standard, keyboard, NVDA และ VoiceOver sessions ตาม runbook
5. ตัดสิน Go/No-Go และรับรอง questionnaire หลัง Pilot ก่อนเริ่มงาน Production แยกรอบ
