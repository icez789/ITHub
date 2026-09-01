# ITHub Teacher Role และ Delete UX Release

> วันที่ตรวจรับ: 2 กันยายน 2026
> สาขา: `codex/teacher-role-delete-ux`
> Production: ยังไม่เผยแพร่

## ขอบเขต UI/UX

- เปลี่ยน browser confirmation ทุกจุดเป็น native `<dialog>` ภาพลักษณ์ ITHub
- แสดงชื่อรายการ ผลกระทบ ปุ่มยกเลิก/ยืนยัน สถานะ “กำลังลบ…” และข้อผิดพลาดภายใน modal
- ปิดการกดซ้ำ ปุ่มปิด backdrop และ Escape ขณะกำลังส่งคำสั่ง
- คืน focus ให้ปุ่มต้นทางหลังยกเลิกหรือปิด และล็อก body scroll ระหว่างเปิด modal
- ใช้ `aria-modal`, `aria-labelledby`, `aria-describedby`, `aria-busy`, `aria-live` และ `data-pending`
- รองรับ Dark Mode, mobile width, keyboard และ Reduced Motion

จุดที่ใช้ component ร่วมกัน ได้แก่ ลบกระทู้หน้ารายละเอียด, ลบกระทู้/ความคิดเห็นใน Admin, ลบเนื้อหาที่ถูกรายงาน, ลบความคิดเห็นในกระทู้ และล้างประวัติ ITHub Bot

## Teacher experience

- Navbar ใช้ข้อความ “ศูนย์ดูแลเนื้อหา” สำหรับ Teacher
- Dashboard ของ Teacher แสดงเฉพาะรายงาน กระทู้ และความคิดเห็น โดยไม่ query หรือ render รายชื่อสมาชิก
- badge “อาจารย์” ใช้ `GraduationCap` และมีลำดับเหนือ badge จาก XP ในกระทู้ ความคิดเห็น โปรไฟล์ และ leaderboard
- หน้าจัดการสมาชิกแสดงชื่อ role ภาษาไทยและ controlled selector สำหรับ Super Admin

## หลักฐานการใช้งาน

| รายการ | ผล |
|---|---|
| เปิด/ยกเลิก/Escape/backdrop/focus restoration | ผ่าน |
| pending และป้องกัน submit ซ้ำ | ผ่าน |
| mutation error ค้าง modal, แสดงข้อความ และลองใหม่/ปิดได้ | ผ่าน 3/3 บน Chromium/Firefox/WebKit |
| ล้างประวัติ ITHub Bot | ผ่าน |
| Teacher เข้า dashboard/topics/comments | ผ่าน |
| Teacher เข้า users หรือแก้กระทู้ผู้อื่น | ถูกปฏิเสธ |
| Super Admin สลับ user → teacher → admin → user | ผ่าน |
| Dark/Reduced Motion และ responsive regression | ผ่านชุด Playwright เดิม |

## Performance evidence

fixture มี accepted comment, like, bookmark, notification, topic/comment reports และ poll/options/vote ครบ ระบบคืน XP/post count และลบ dependent rows เป็นศูนย์ทุกตาราง

| Browser | Feedback pending | ลบและ redirect |
|---|---:|---:|
| Chromium | 5ms | 572ms |
| Firefox | 10ms | 597ms |
| WebKit | 41ms | 536ms |
| Median | 10ms | 572ms |

ฝั่งแอปใช้คำสั่งภายใน transaction จำนวนคงที่: lock กระทู้, ตรวจ `foreign_key_checks`, aggregate update ผู้ใช้ และลบ parent topic รวม 4 query calls โดยจำนวนไม่เพิ่มตามผู้ร่วมกระทู้ จากนั้น FK `ON DELETE CASCADE` จัดการ dependent rows

Playwright production-mode รอบสุดท้ายของ full suite ผ่าน 111/111 แบบ serial ครบ Chromium, Firefox และ WebKit โดยไม่มี skip หรือ failure และชุด error-recovery ที่เพิ่มภายหลังผ่านอีก 3/3

## Preview handoff

- Push สาขา `codex/teacher-role-delete-ux` แล้ว
- Vercel Preview ใช้ alias <https://ithub-git-codex-teacher-role-delete-ux-thiraphat-s-projects.vercel.app>
- ตั้งค่า DB/session/Pusher เฉพาะสาขา Preview รวม 10 รายการ โดยผ่าน guard ว่าฐานลงท้าย `_e2e`
- ตรวจ public routes แบบ read-only ได้ HTTP 200 ครบ และไม่พบ runtime error log
- Production ไม่ถูก deploy หรือ promote ในรอบนี้
