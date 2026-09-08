# ITHub Feedback & Research Analytics — Phase 2 UI

> สถานะ: Phase 2 UI ผ่าน local browser verification
>
> วันที่: 8 กันยายน 2569
>
> แผนฟีเจอร์: [`../features/ITHUB_FEEDBACK_RESEARCH_ANALYTICS_PLAN.md`](../features/ITHUB_FEEDBACK_RESEARCH_ANALYTICS_PLAN.md)

## Interface decisions

- หน้า `/feedback` ใช้ภาษาไทยเป็นหลักและแยก 3 งานเป็น section ชัดเจน: แบบประเมินอย่างเป็นทางการ, Feedback ทั่วไป และความยินยอม Research Analytics
- ข้อความ SUS บนหน้าจอเป็น **ฉบับนำร่อง** จนกว่าอาจารย์จะรับรองคำแปล ลำดับ และ questionnaire version; ระบบเปิดได้เฉพาะ campaign `pilot`
- แบบประเมินแสดง SUS 10 ข้อ, งานทดลอง 5 งาน และข้อมูลกลุ่มตัวอย่างขั้นต่ำ โดยไม่ขอชื่อ อีเมล หรือรหัสนักศึกษา
- Feedback ทั่วไปไม่ปะปนกับคำตอบแบบประเมิน และแนบเฉพาะ pathname ที่ normalize แล้ว ไม่มี query/hash
- สมาชิกเห็นเฉพาะสถานะและข้อมูลสรุปของรายการตนเอง ไม่เห็นข้อความภายในของผู้ดูแล
- Research Analytics consent แยกจากการส่งแบบประเมินและ Feedback อย่างชัดเจน การไม่ยินยอมไม่ขวางสองงานดังกล่าว
- ทางเข้าบน desktop อยู่ใน “พื้นที่ของฉัน”; บน mobile อยู่ในหน้าโปรไฟล์และ footer โดยไม่เพิ่ม Bottom Navigation item หรือ floating action
- `/admin/feedback` ใช้สำหรับ triage โดยไม่แสดงตัวระบุสมาชิก; `/admin/analytics` รอบนี้ใช้จัดการ campaign เท่านั้น ส่วน metrics/export อยู่ Phase 4
- Admin/Super Admin ดูสองหน้าผู้ดูแลได้ แต่ campaign create/edit/transition แสดงเฉพาะ Super Admin; Teacher ไม่มีทางเข้าและถูกปฏิเสธฝั่ง server

## Visual and accessibility contract

- ใช้ semantic tokens เดิม, Lucide icons, surface/border/shadow ระดับปกติ และสีสถานะเฉพาะเมื่อสื่อความหมาย
- แต่ละกลุ่มคำถามใช้ `fieldset`/`legend`; ทุก control มี label; ผลสำเร็จใช้ `role=status` และข้อผิดพลาดใช้ `role=alert`
- ทุก mutation มี pending state และปิดปุ่มระหว่างส่งเพื่อกัน double-submit
- ลำดับ keyboard เดินตามลำดับเนื้อหา: ข้อมูลกลุ่มตัวอย่าง → SUS → งานทดลอง → คำถามปลายเปิด → ส่ง
- ตรวจรับที่ 375×812 และ 1280×800 อย่างน้อย Light/Dark และตรวจว่า floating chat/bottom navigation ไม่ทับ control

## Implementation log

### 8 กันยายน 2569 — Phase 2 UI start — Codex

- อ่าน design source-of-truth และคู่มือ Forms/Server Actions ของ Next.js 16.3.4 ก่อนเริ่มแก้ UI
- เลือก Server Components สำหรับ reads และ Client Components เฉพาะ form state; mutation ทุกจุดผ่าน Server Actions ที่ re-authenticate ใน `server-only` DAL
- ยังไม่เปลี่ยน Bottom Navigation, Analytics instrumentation, Dashboard metrics, export, Preview หรือ Production
- Viewport/theme และ browser QA จะบันทึกหลัง implementation พร้อม

### 8 กันยายน 2569 — Phase 2 UI verification — Codex

- Playwright แบบ serial ผ่าน 12/12: Chromium, Firefox และ WebKit อย่างละ 4 เส้นทาง
- ตรวจ route guard, member evaluation/withdrawal, Feedback submission, consent grant/withdraw, Admin triage, direct Server Action replay และ Super Admin campaign lifecycle
- Consent checkbox ไม่พึ่ง browser validation อย่างเดียว: server ตรวจ acknowledgement ซ้ำและเลือก notice version ที่รองรับเอง
- ตรวจภาพ viewport 375×812 Light และ 1280×800 Dark ครบทั้งสาม browser engines; ไม่พบ horizontal overflow, framework error overlay หรือ control ที่ถูก bottom navigation/floating chat บังจนใช้งานไม่ได้
- แบบสอบถามแสดงป้าย `PILOT RESEARCH` และเตือนว่า `sus-th-pilot-v1` ต้องให้อาจารย์รับรองก่อนเก็บข้อมูลจริง
- Metrics, export, 5 palettes × Light/Dark, manual Screen Reader pass, Preview และ Production ยังไม่อยู่ในผลตรวจรับรอบนี้
