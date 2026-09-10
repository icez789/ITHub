# ITHub Feedback & Research Analytics — Checkpoint 12

> วันที่: 11 กันยายน 2569
>
> Branch: `codex/feedback-research-analytics`
>
> Implementation commit: `094ad8ee5d83ee516149b5fd295e6b2fcced311c`
>
> Preview evidence: `dpl_GTqwPwbfQpTMc797d9EQkqq8mgHj` — `https://it-83bfvywwe-thiraphat-s-projects.vercel.app`
>
> ขอบเขต: exact 5-task Pilot smoke เมื่อปิด Pusher, Gemini และ Cloudinary
>
> สถานะ: technical external-service gate ผ่าน; readiness guard เหลือ human/operational gates 17 รายการก่อน Pilot

## สิ่งที่ส่งมอบ

- เพิ่ม `test:research:pilot-tasks:e2e` ซึ่งสร้างบัญชีสังเคราะห์ในฐาน `test_e2e`, opt-in Analytics, ทำ 5 งานตาม Pilot contract, ตรวจ events จากฐาน และลบ fixture หลังจบ
- ทำ Pusher server/client เป็น no-op เมื่อ config ถูกปิด, ไม่เปิด Notification realtime connection และให้ auth route ตอบอย่างปลอดภัยเมื่อ realtime unavailable
- ให้ Gemini คืน fallback โดยไม่เรียก network เมื่อปิด config; งานสร้างหัวข้อแบบไม่มีรูปไม่พึ่ง Cloudinary
- ให้ create topic/comment รอผลส่ง analytics สำเร็จก่อนเปลี่ยนหน้า/refresh โดยมี timeout และไม่ทำให้ business write ที่สำเร็จย้อนกลับ
- แก้ `normalizeAnalyticsRoute()` ให้ idempotent สำหรับ `/topic/[id]` และ `/edit/[id]` หลังพบว่า client normalize แล้ว server normalize ซ้ำจน event ถูกปฏิเสธ

## 5 งานที่ตรวจบน Preview

1. ค้นหาและเปิดหัวข้อ
2. สร้างหัวข้อโดยไม่แนบรูป
3. แสดงความคิดเห็น
4. Like และ Bookmark
5. Follow ผู้เขียนและเปิด Following feed

ทุกงานผ่านบน protected immutable Preview และพบ analytics outcome ครบตาม contract โดยไม่ใช้ข้อมูลบุคคลจริง

## ผลตรวจรับ

| รายการ | ผล |
| --- | --- |
| Preview identity | READY, target `null`, branch ถูกต้อง, source `094ad8e`, authentication protected |
| Vercel build | ผ่าน; completed in 12s |
| Exact 5-task Preview smoke | ผ่าน 1/1 บน Chromium ใน 1.1 นาที |
| Exact 5-task local smoke | ผ่าน 1/1; production build 25 routes ผ่าน |
| Unit tests รวม | ผ่าน 89/89 |
| Lint | ผ่าน |
| Database post-check | application tables 11/11; integrity counters ทุกค่า 0 |
| Preview runtime logs | ไม่พบ error/fatal หรือ HTTP 5xx หลัง smoke |
| Pilot readiness | blocked เหลือ 17 human/operational gates; ไม่มี `external_services_review` แล้ว |

## ข้อค้นพบและขอบเขตความปลอดภัย

- Regression ที่พบไม่ใช่ database write failure: การทำงานหลักสำเร็จ แต่ event บางชนิดได้ HTTP 400 เพราะ route family ถูก normalize ซ้ำ การแก้รอบนี้ครอบด้วย unit regression และ exact flow จริง
- temporary Preview share token ใช้เฉพาะใน process ทดสอบและไม่ถูกบันทึกใน Git, checkpoint หรือ config evidence
- test ใช้ identity/เนื้อหาสังเคราะห์, รันแบบ serial และ cleanup แล้ว; post-check ไม่พบ orphan/invalid/expired rows
- ไฟล์ design, presentation, `.codex-artifacts/`, `output/` และ `tmp/` ที่อยู่นอก scope ไม่ถูก stage
- รอบนี้ไม่เปิด campaign, ไม่ใช้ผู้เข้าร่วมจริง, ไม่เปลี่ยน Production variables/database, ไม่ deploy/promote Production และไม่ execute retention

## Gate ที่ยังต้องมีคนดำเนินการ

- อนุมัติ decision sheet 11 หัวข้อ
- กำหนด incident, retention และ export owner codes 3 รายการ
- กำหนดผู้ทดสอบ NVDA และ VoiceOver แล้วทำ manual test
- ยืนยัน quiet window ก่อนเปิด campaign
- ทำ Pilot 5–10 คนและ Go/No-Go; จากนั้นจึงวางแผน Production migration/deploy แยกรอบพร้อม backup/restore approval
