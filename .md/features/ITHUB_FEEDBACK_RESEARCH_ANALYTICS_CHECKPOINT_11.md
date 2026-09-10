# ITHub Feedback & Research Analytics — Checkpoint 11

> วันที่: 11 กันยายน 2569
>
> Branch: `codex/feedback-research-analytics`
>
> Source ก่อนเริ่ม: `8a9aad24f650a76f74407723d1c014a09a790ad9`
>
> ขอบเขต: ผูก Pilot readiness กับ protected Preview evidence และ source HEAD
>
> สถานะ: technical guard พร้อม; ยังรอ decision sign-off, ผู้เข้าร่วม, manual NVDA/VoiceOver และ Pilot จริง

## สิ่งที่ส่งมอบ

- เพิ่ม `previewEvidence` ใน Pilot config contract และบังคับ field allowlist แบบ strict
- เปรียบเทียบ full `sourceCommit` 40 ตัวกับ `git rev-parse HEAD` เพื่อป้องกันการนำหลักฐาน Preview เก่ามาใช้กับ source ใหม่
- บังคับ deployment ID, immutable `https://*.vercel.app` URL ที่ไม่มี path/query, state `READY`, `vercelTarget=null`, branch variables 29 รายการ, Vercel Authentication และ `verifiedAt` แบบ UTC
- ปฏิเสธ URL ที่มี `_vercel_share` หรือ query อื่น รวมทั้ง field เช่น `shareToken`, password, token และ secret
- อัปเดต [Pilot config ตัวอย่าง](./ITHUB_FEEDBACK_RESEARCH_ANALYTICS_PILOT_CONFIG.example.json), [Pilot runbook](./ITHUB_FEEDBACK_RESEARCH_ANALYTICS_PILOT_RUNBOOK.md), [Setup runbook](./ITHUB_FEEDBACK_RESEARCH_ANALYTICS_SETUP.md), แผน และ checklist

## ขอบเขตที่ guard ตรวจและไม่ตรวจ

Guard ตรวจความครบถ้วนและความสอดคล้องของหลักฐานที่ผู้ดำเนินการกรอก:

- linked project, branch, current HEAD และฐาน `test_e2e`
- Preview identity/state/target/source, variable count และ protection flag
- campaign scope/version/window/retention
- participant/eligible snapshot, decision 11 หัวข้อ, owner/tester และ operational confirmations

Guard ไม่เรียก Vercel API, ไม่พิสูจน์ว่า metadata ที่กรอกมาจาก Vercel จริง, ไม่ยืนยันตัวตนผู้อนุมัติ และไม่ทดแทนลายเซ็นหรือการตรวจของคนที่สอง นอกจากนี้ยังไม่เชื่อมต่อ/เขียนฐานข้อมูลและไม่สร้างบัญชีหรือ campaign

## ผลตรวจรับ

| รายการ | ผล |
| --- | --- |
| Targeted readiness tests | ผ่าน 7/7 |
| Unit tests รวม | ผ่าน 86/86 |
| Lint | ผ่าน |
| Next.js production build | ผ่านบน 16.3.4 |
| Existing Preview local guard | ผ่าน: branch ถูกต้อง, `test_e2e`, variables 29 รายการ |
| Synthetic ready CLI | `ready`; Preview source SHA ตรง HEAD และ decision/participant gates ครบ |
| Default CLI หลังลบ fixture | blocked ด้วย `config_file_missing` |

Build รอบแรกใน sandbox ล้มเหลวเฉพาะการ request Google Font; rerun ที่อนุญาต network แล้ว compile, TypeScript และ static generation ผ่านครบ จึงไม่ใช่ code regression

## Privacy และ workspace evidence

- Ready fixture ใช้ operator codes และบัญชี alias สังเคราะห์เท่านั้น ไม่มี PII/credential และถูกลบทันทีหลังตรวจ
- ไฟล์ config ใช้งานจริงยังไม่มีอยู่ จึงไม่เกิดการอ้างว่า decision ได้รับอนุมัติแล้ว
- ไฟล์ `.md/design/README.md`, presentation artifacts, `.codex-artifacts/`, `output/` และ `tmp/` ไม่อยู่ในขอบเขตและไม่ได้ถูกแก้หรือ stage
- ไม่มี database write, account/campaign mutation, external-service configuration, Production migration/deploy/promote หรือ retention execute

## ขั้นถัดไปที่ต้องมีคนดำเนินการ

1. ตรวจ Vercel deployment/variables/protection แบบ read-only แล้วกรอก metadata จริงพร้อม UTC timestamp
2. ลงนาม decision sheet และกรอก approver/owner/tester codes โดยไม่ใส่ PII หรือ secret
3. ให้ผู้ตรวจคนที่สองเทียบ config กับ Vercel และ decision sheet ก่อนรันจนได้ `status: ready`
4. เตรียมบัญชี Pilot และทำ standard, keyboard, NVDA และ VoiceOver sessions ตาม runbook
5. ทำ Go/No-Go หลัง Pilot; งาน Production ต้องขออนุญาตแยกรอบ
