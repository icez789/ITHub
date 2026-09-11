# ITHub Feedback & Research Analytics — Checkpoint 13

> วันที่: 11 กันยายน 2569
>
> Branch: `codex/feedback-research-analytics`
>
> Implementation commit: `49e0a579baac8125280030e171786574a24a7448`
>
> Preview evidence: `dpl_2XFWF7Cm383EJ8P25yd9T8yjLCWX` — `https://it-mgkdz0977-thiraphat-s-projects.vercel.app`
>
> ขอบเขต: Full-story Pilot rehearsal ด้วยบัญชีและข้อมูลสังเคราะห์ P01–P05 บน protected isolated Preview
>
> สถานะ: ผ่าน technical Pilot rehearsal และ cleanup แล้ว; ยังไม่ใช่ human research หรือ manual NVDA/VoiceOver และยังไม่ได้อนุญาตให้ deploy Production

## ผลลัพธ์หลัก

- Pilot readiness guard ผ่าน `ready`: decision 11/11, participant code 5/5, owner codes 3 รายการ, quiet window, protected Preview, branch variables 29 รายการ และฐาน `test_e2e`
- Playwright พา P01–P05 ผ่าน flow จริงคนละ browser context: login → opt-in Analytics → ทำ 5 งาน → ส่ง Evaluation/SUS → ส่ง Feedback
- Super Admin สร้างและเปิด campaign ผ่าน UI, ตรวจ Dashboard/ZIP, จากนั้นปิดและล็อก campaign ผ่าน UI
- ชุดทดสอบยืนยัน response 5, Feedback 5, active consent 5, observed participant 5, Analytics มีข้อมูล และ ZIP มีครบ 7 ไฟล์ตาม allowlist
- ผลอ้างอิง local รอบสุดท้ายได้ SUS mean 80 และ Analytics 120 events; รอบ protected Preview ผ่าน assertion ชุดเดียวกันและมี `.last-run.json` สถานะ `passed`
- หลังจบ test ลบ synthetic accounts, active consents และ campaign fixtures จน quiet-window counters เป็น 0

## เส้นทางที่ตรวจครบ

1. UI campaign lifecycle: `draft → open → closed → locked`
2. Member consent และ pseudonymous Analytics โดยไม่ใช้ชื่อ/อีเมลจริง
3. งาน 5 รายการ: search/open, create topic, comment, like/bookmark และ follow + Following feed
4. Evaluation/SUS และ Feedback submission พร้อม success analytics
5. TiDB → Dashboard metrics → aggregate-only ZIP 7 ไฟล์
6. Final cleanup และ database referential-integrity check

## Defect ที่พบและแก้ก่อนผ่าน

- Evaluation/Feedback บันทึกข้อมูลหลักสำเร็จ แต่ success event อาจหายเมื่อ `revalidatePath('/feedback')` ทำให้ component ถูกถอดก่อน `useEffect`; แก้ให้ callback รอ analytics delivery หลัง Server Action สำเร็จก่อนคืน state
- Campaign ช่วงเวลา UTC ทำงานบนหน้าสมาชิก แต่ Dashboard อ่าน metric เป็นศูนย์เมื่อ host อยู่ Asia/Bangkok; แก้ mysql2 pool เป็น `timezone: 'Z'` เพื่อไม่เลื่อน `DATETIME` เจ็ดชั่วโมง
- Vercel Toolbar ส่ง CSP แบบ report-only สำหรับ `https://vercel.live/`; test จัดเป็น infrastructure noise ด้วยข้อความ exact-match เท่านั้น โดยไม่ลดความเข้มของ CSP และยัง fail เมื่อมี console/app error อื่น

## หลักฐานตรวจรับ

| รายการ | ผล |
| --- | --- |
| Preview identity | READY, target `null`, branch ถูกต้อง, source `49e0a57`, Vercel Authentication protected |
| Vercel build | ผ่าน; Build Completed ใน 11 วินาที |
| Synthetic full-story Preview | ผ่าน 1/1 บน Chromium; P01–P05 ครบและ Dashboard screenshot ถูกสร้าง |
| Synthetic full-story local | ผ่าน 1/1 ใน 1.7 นาที; production build 25 routes ผ่าน |
| Unit tests | ผ่าน 89/89 |
| Lint | ผ่าน |
| Database post-check | application tables 11/11; integrity counters ทุกค่า 0 |
| Export | 7 entries; ไม่มี raw open text, email, username, user ID, pseudonym หรือ internal note |
| Preview runtime scan | ไม่พบ error/fatal, HTTP 4xx หรือ 5xx ในช่วง 24 ชั่วโมง แต่ Vercel ไม่คืน request status breakdown จึงยังมี observability gap |
| Workspace hygiene | stage เฉพาะ test/docs ของฟีเจอร์; design/presentation/output/tmp ของผู้ใช้ไม่ถูกแตะ |

## ความหมายต่อ Production

โค้ดผ่าน technical gate บน isolated Preview แล้ว แต่รอบนี้ไม่ได้ migrate, deploy, promote หรือเปลี่ยน Production variables/database การขึ้น Production ต้องเป็นรอบแยกที่ระบุ target ชัดเจน พร้อม backup, migration checksum, restore plan, Production-scoped configuration และ post-deploy smoke/cleanup

ผลสังเคราะห์ใช้พิสูจน์ความพร้อมทางเทคนิคเท่านั้น หากรายงานต้องอ้างประสบการณ์ผู้ใช้หรือผลวิจัย ต้องทำ Pilot กับมนุษย์จริง 5–10 คน หากต้องอ้างการรองรับ screen reader ต้องทำ manual NVDA และ VoiceOver; รหัส `SIM-*` ใน local config เป็นเพียงตัวแทนสำหรับให้ automation ผ่าน contract และไม่ใช่หลักฐานการทดสอบด้วยคน

## คำสั่งหลักสำหรับตรวจซ้ำ

```powershell
npm.cmd run preview:research:validate
npm.cmd run pilot:research:validate
npm.cmd run test:research:simulated-pilot:e2e
npm.cmd run test:unit
npm.cmd run lint
npm.cmd run build
npm.cmd run db:check:e2e
```

ห้ามรันชุด synthetic Pilot ระหว่างมี human Pilot campaign สถานะ `open` เพราะใช้ฐาน `test_e2e` ร่วมกันและชุดทดสอบมี cleanup fixtures ตาม prefix ที่กำหนด
