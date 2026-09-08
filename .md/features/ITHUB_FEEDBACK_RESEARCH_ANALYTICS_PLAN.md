# ITHub Feedback & Research Analytics

> สถานะ: กำลังพัฒนา — Phase 3 consent-gated Analytics ingestion ผ่าน local E2E แล้ว; Phase 4 Dashboard/Export ยังไม่เริ่ม
>
> เป้าหมาย: สร้างข้อมูลที่ตรวจสอบได้สำหรับโครงงานบทที่ 4–5
>
> อัปเดตล่าสุด: 9 กันยายน 2569
>
> เช็กลิสต์การลงมือทำ: [`ITHUB_FEEDBACK_RESEARCH_ANALYTICS_CHECKLIST.md`](./ITHUB_FEEDBACK_RESEARCH_ANALYTICS_CHECKLIST.md)
>
> Data/privacy contract: [`ITHUB_FEEDBACK_RESEARCH_ANALYTICS_DATA_CONTRACT.md`](./ITHUB_FEEDBACK_RESEARCH_ANALYTICS_DATA_CONTRACT.md)
>
> Checkpoint ล่าสุด: [`ITHUB_FEEDBACK_RESEARCH_ANALYTICS_CHECKPOINT_04.md`](./ITHUB_FEEDBACK_RESEARCH_ANALYTICS_CHECKPOINT_04.md)

## 1. เป้าหมาย

เพิ่มระบบรับความคิดเห็นและวิเคราะห์การใช้งานโดยแยกข้อมูลออกเป็น 3 ส่วน:

1. **แบบประเมินอย่างเป็นทางการ** — SUS 10 ข้อ งานทดลอง และคำถามปลายเปิด
2. **Feedback ทั่วไป** — แจ้งบัค ปัญหา UX/UI และข้อเสนอแนะฟีเจอร์
3. **Research Analytics** — เก็บเหตุการณ์สำคัญแบบนามแฝงหลังผู้ใช้ยินยอม

Vercel Analytics ยังคงใช้ดู Page View และผู้เยี่ยมชมภาพรวม แต่ข้อมูลสำหรับวิเคราะห์โครงงานจะเก็บใน TiDB เพื่อควบคุมวิธีคำนวณ การส่งออก และระยะเวลาจัดเก็บได้เอง

## 2. ข้อตกลงผลิตภัณฑ์

- แบบประเมินเปิดให้สมาชิกทุกบัญชี และตอบได้หนึ่งครั้งต่อหนึ่งรอบประเมิน
- หน้า `/feedback` แยกแบบประเมินออกจากช่องแจ้งปัญหาอย่างชัดเจน
- เก็บข้อมูลกลุ่มตัวอย่างขั้นต่ำ ได้แก่ ประเภทผู้ตอบ ประสบการณ์ และอุปกรณ์หลัก โดยไม่เก็บชื่อหรือรหัสนักศึกษาในไฟล์วิจัย
- Behavioral Analytics เป็นแบบ opt-in ผู้ใช้ต้องยินยอมก่อน และถอนความยินยอมได้
- Admin และ Super Admin เท่านั้นที่ดู Dashboard และส่งออกข้อมูลได้
- Super Admin เป็นผู้เปิด ปิด และล็อกรอบประเมิน
- Teacher ไม่มีสิทธิ์เข้าถึงข้อมูลวิจัยหรือ Server Action ที่เกี่ยวข้อง

## 3. แบบประเมินและงานทดลอง

ใช้ System Usability Scale (SUS) 10 ข้อ แบบ Likert 1–5 โดยคงลำดับและทิศทางข้อคำถามเดิม ต้องตรวจฉบับแปลไทย–อังกฤษกับอาจารย์และทดลองกับกลุ่มนำร่อง 5–10 คนก่อนเปิดเก็บข้อมูลจริง

งานทดลอง 5 งาน:

1. ค้นหาและเปิดกระทู้ที่ต้องการ
2. สร้างกระทู้
3. แสดงความคิดเห็นหรือตอบกลับ
4. กดถูกใจหรือบันทึกกระทู้
5. ติดตามหมวด/ผู้เขียนและเปิด Following หรือ For You

แต่ละงานเลือกผลได้เป็น `สำเร็จ`, `สำเร็จบางส่วน`, `ไม่สำเร็จ` หรือ `ไม่ได้ลอง` พร้อมคะแนนความยาก 1–5 ระบบต้องแสดงผลที่ผู้ใช้รายงานและผลที่ตรวจพบจาก Analytics แยกกัน

สูตร SUS:

- ข้อคี่: คะแนนที่ตอบ − 1
- ข้อคู่: 5 − คะแนนที่ตอบ
- รวมแล้วคูณ 2.5 เพื่อได้คะแนน 0–100
- รายงานจำนวนผู้ตอบ ค่าเฉลี่ย มัธยฐาน ส่วนเบี่ยงเบนมาตรฐาน ค่าต่ำสุด และค่าสูงสุด

## 4. Feedback ทั่วไป

สมาชิกส่ง Feedback ได้จาก `/feedback` โดยระบุ:

- ประเภท: บัค, UX/UI, ข้อเสนอแนะฟีเจอร์, เนื้อหา หรืออื่น ๆ
- คะแนนความพึงพอใจ 1–5 แบบไม่บังคับ
- รายละเอียด 10–2,000 ตัวอักษร
- route ที่พบปัญหา โดยตัด query string และข้อมูลในฟอร์มออก

สมาชิกดูสถานะรายการของตนเองได้ ได้แก่ `ใหม่`, `กำลังตรวจสอบ`, `วางแผนแก้`, `แก้แล้ว` และ `ไม่ดำเนินการ` ส่วน Admin สามารถกำหนดความสำคัญ หมวดประเด็น และบันทึกภายในได้

## 5. Research Analytics และ Privacy

เก็บเฉพาะเหตุการณ์ใน allowlist เช่น:

- การเปิดหน้าและการค้นหา
- การเปิดผลการค้นหา
- การพยายาม/สำเร็จ/ล้มเหลวในการสร้างกระทู้และความคิดเห็น
- Like, Bookmark และ Follow
- การเปิด Community, Following และ For You
- การจบ Onboarding
- การเริ่มและส่งแบบประเมิน
- การส่ง Feedback

ข้อกำหนดด้านข้อมูล:

- ใช้ HMAC จาก `ITHUB_ANALYTICS_SECRET` สร้างรหัสนามแฝง
- ไม่บันทึก IP, User-Agent เต็ม, อีเมล, username, ข้อความค้นหา, เนื้อหากระทู้, ความคิดเห็น หรือข้อความ AI
- Failure event เก็บเฉพาะรหัสทั่วไป เช่น `validation`, `rate_limited`, `network` และ `server_error`
- ถอน consent แล้วหยุดเก็บและลบ raw events ที่เชื่อมกับรหัสนามแฝง
- เก็บ raw events 180 วัน และเก็บแบบประเมิน/Feedback ไม่เกินหนึ่งปีหลังสิ้นสุดโครงการ

## 6. Database และ Interface

เพิ่ม additive migration `005_feedback_and_research_analytics.sql` ประกอบด้วย:

- `analytics_consents`
- `analytics_events`
- `evaluation_campaigns`
- `evaluation_responses`
- `feedback_submissions`

Interface หลัก:

- `/feedback`
- `/admin/feedback`
- `/admin/analytics`
- `POST /api/analytics/events`
- Server Actions สำหรับส่ง/ถอนแบบประเมิน ส่ง Feedback เปลี่ยนสถานะ และจัดการ campaign

ต้องเพิ่ม migration fingerprint, database preflight, `db:check`, integrity checks, indexes ตาม campaign/event/time และ unique constraint ป้องกันการตอบซ้ำใน campaign เดียวกัน

## 7. Dashboard และข้อมูลสำหรับบทที่ 4–5

Dashboard ต้องกรองตาม campaign ช่วงวันที่ ประเภทผู้ตอบ ประสบการณ์ และอุปกรณ์ พร้อมแสดง:

- จำนวนผู้ยินยอม จำนวนผู้ตอบ และอัตราการตอบ
- จำนวน session และกิจกรรมสำคัญ
- Search-to-open success ภายใน 5 นาที
- อัตราสำเร็จในการสร้างกระทู้และความคิดเห็น
- การใช้ Like, Bookmark, Follow และ Personalized Feed
- คะแนนและการกระจายของ SUS
- ผลงานทดลองแบบ self-reported เทียบ observed events
- Feedback แยกตามประเภท ความสำคัญ สถานะ และประเด็นที่พบซ้ำ

การแบ่งผลตามกลุ่มจะแสดงเมื่อกลุ่มมีอย่างน้อย 5 คน เพื่อลดความเสี่ยงในการระบุตัวบุคคล

ปุ่ม “สร้างชุดข้อมูลบทที่ 4–5” ต้องส่งออก ZIP ที่มี:

- `chapter4_summary.csv`
- `sus_results.csv`
- `task_results.csv`
- `analytics_funnels.csv`
- `feedback_themes.csv`
- `methodology.md`
- `data_dictionary.md`

ไฟล์ CSV ใช้ UTF-8 BOM รองรับภาษาไทย ป้องกัน CSV formula injection และไม่มีชื่อ อีเมล user ID หรือข้อมูลลับ ระบบช่วยเตรียมตารางผลและข้อจำกัด แต่ไม่สร้างข้อสรุปทางวิจัยแทนผู้จัดทำ

## 8. การทดสอบและ Rollout

- Unit test สูตร SUS, HMAC, consent, event allowlist, denominator และ CSV sanitization
- Integration test การตอบซ้ำ ถอนคำตอบ ถอน consent retention และสิทธิ์ของแต่ละ role
- E2E ครบ Chromium, Firefox และ WebKit สำหรับ Evaluation, Feedback, Dashboard และ Export
- ตรวจ keyboard, Screen Reader, Dark Mode, pending/error state และขนาด 375×812 กับ 1280×800
- ยืนยันว่าไม่มี event ก่อน consent และไม่มี PII ใน event/export
- ทดสอบ Dashboard ด้วย fixture อย่างน้อย 100,000 events โดย query หลักไม่เกิน 2 วินาที
- Migration ต้องผ่านฐาน `_e2e`, Vercel Preview และ pilot ก่อน Production
- แยกข้อมูลนำร่องออกจากข้อมูลจริง และไม่สร้างคำตอบหรือสถิติจำลองบน Production
- อัปเดต Privacy Policy, Terms, README และรายงานความคืบหน้า

การพัฒนาใช้สาขา `codex/feedback-research-analytics` และแบ่ง commit เป็น database/privacy → feedback/evaluation → analytics/dashboard → tests/docs

## 9. เกณฑ์สำเร็จ

- สมาชิกส่งแบบประเมินและ Feedback ได้ครบโดยไม่เกิดข้อมูลซ้ำ
- Consent และการถอน consent ทำงานจริง
- Dashboard คำนวณตัวเลขตรงกับข้อมูลต้นทางและระบุ denominator ทุกค่า
- Admin ส่งออกชุดข้อมูลสำหรับบทที่ 4–5 ได้โดยไม่มี PII
- Teacher และผู้ใช้ทั่วไปเข้าถึง Dashboard หรือ action ฝั่งผู้ดูแลไม่ได้
- Lint, build, unit tests, database checks และ Playwright ทุก browser ผ่าน
- Pilot ผ่านและแบบสอบถามถูกล็อกก่อนเริ่มเก็บข้อมูลจริง

## แหล่งอ้างอิงเบื้องต้น

- John Brooke, *SUS: A Quick and Dirty Usability Scale* (1996): https://hci-studies.org/methods-and-measures/downloads/SUS_Brooke1996.pdf
- Vercel Web Analytics: https://vercel.com/docs/analytics
- Vercel Analytics limits and pricing: https://vercel.com/docs/analytics/limits-and-pricing
