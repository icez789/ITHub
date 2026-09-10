# ITHub Feedback & Research Analytics — Pilot Runbook

> วันที่จัดทำ: 10 กันยายน 2569
>
> ปรับปรุงล่าสุด: 11 กันยายน 2569
>
> สถานะ: มี Preview-bound fail-closed readiness guard แล้วและพร้อมดำเนินการหลัง decision sign-off; เอกสารนี้ไม่ใช่หลักฐานว่า Pilot หรือ manual screen-reader test ผ่านแล้ว
>
> Environment: protected Vercel Preview ของ `codex/feedback-research-analytics` + isolated `test_e2e` เท่านั้น

## 1. Hard stops

ห้ามเปิด campaign หรือเริ่มเก็บข้อมูลจนกว่ารายการเหล่านี้ครบ:

- [ ] อาจารย์/เจ้าของงานลงชื่ออนุมัติ decision sheet ในหัวข้อ 2 สำหรับใช้ทดสอบ Pilot; การรับรองฉบับสุดท้ายทำอีกครั้งหลัง Pilot
- [ ] มีผู้เข้าร่วม 5–10 คนและกำหนด participant code `P01`–`P10` โดยไม่ใส่ชื่อในเอกสารนี้
- [ ] Preview ล่าสุดเป็น READY, ยังเปิด Vercel Authentication และ branch variables 29 รายการยังชี้ `test_e2e`
- [ ] บัญชี Pilot เป็นบัญชีแยกที่ไม่มีชื่อจริง รหัสนักศึกษา หรืออีเมลจริงใน username/email
- [ ] ผู้ดำเนินการยืนยันว่า Pusher, Gemini และ Cloudinary ที่ถูกปิดไม่กระทบ 5 งานที่ใช้ทดสอบ
- [ ] กำหนดผู้รับผิดชอบ incident, retention และไฟล์ export แล้ว
- [ ] จองช่วง Pilot ที่ไม่มี Playwright, seed, migration smoke, performance fixture หรือ cleanup job รันกับ `test_e2e`
- [ ] `npm.cmd run pilot:research:validate` คืน `status: ready` จากไฟล์ที่ผู้รับผิดชอบกรอกหลัง sign-off จริง

ห้ามใช้ Production URL/ฐานข้อมูล, ห้าม promote Preview นี้ และห้ามนำ fixture/Pilot rows ไปคัดลอกเข้าฐานจริง

## 2. Decision sign-off sheet

กรอก `อนุมัติสำหรับ Pilot / แก้ไข / ไม่อนุมัติ`, ผู้อนุมัติ และวันที่ทุกแถวก่อนสร้าง campaign:

| เรื่อง | ค่า Pilot ที่ระบบรองรับอยู่ | ผลตัดสิน/เหตุผล | ผู้อนุมัติ/วันที่ |
| --- | --- | --- | --- |
| SUS ภาษาไทย | 10 ข้อใน `sus-th-pilot-v1`; ข้อคี่ positive และข้อคู่ negative | [กรอก] | [กรอก] |
| กลุ่มผู้มีสิทธิ์ตอบ | สมาชิก Pilot 5–10 คน; snapshot ตัวหารเมื่อเปิด campaign | [กรอก] | [กรอก] |
| Analytics scope | เฉพาะสมาชิกที่ login และ opt-in; ไม่ยินยอมแล้วยังใช้งานหลักได้ | [กรอก] | [กรอก] |
| Session | UUID ต่อ browser session; เริ่มใหม่เมื่อ inactive 30 นาที; ไม่ใช้ IP/User-Agent | [กรอก] | [กรอก] |
| Observed task | ใช้นิยามในหัวข้อ 3 และไม่ตีความ event ที่ unavailable เป็น failure | [กรอก] | [กรอก] |
| ถอน Evaluation | เก็บ tombstone ขั้นต่ำ ล้างคำตอบ และห้ามตอบซ้ำใน campaign เดิม | [กรอก] | [กรอก] |
| ข้อความปลายเปิด | เก็บตาม retention แต่ไม่ออก ZIP; export เฉพาะ controlled issue theme แบบ aggregate | [กรอก] | [กรอก] |
| สถิติ | SUS ใช้ sample SD; subgroup `n < 5` ถูก suppress | [กรอก] | [กรอก] |
| เวลา/retention | UTC; raw events 180 วัน; Evaluation/Feedback ตาม deadline ไม่เกินหนึ่งปีหลังจบโครงการ | [กรอก] | [กรอก] |
| HMAC | key version `1`; ระบุ owner และแผน rotation/deletion ก่อนเก็บข้อมูลจริง | [กรอก] | [กรอก] |
| Notice versions | Evaluation `research-notice-pilot-v1`; Analytics `research-analytics-pilot-v1` | [กรอก] | [กรอก] |

การแก้ข้อความ SUS, notice, controlled vocabulary หรือนิยาม metric ต้องออก version ใหม่และทดสอบใหม่ ห้ามแก้ความหมายของ version ที่เปิดรับคำตอบแล้ว

## 3. นิยาม 5 งานที่ใช้เหมือนกันทุก session

ผู้ดำเนินการอ่านเฉพาะคำสั่ง ห้ามบอกตำแหน่งปุ่มระหว่างจับเวลา หากช่วยเหลือต้องบันทึกและให้ผล self-reported ตามที่ผู้เข้าร่วมเลือกเอง

| งาน | คำสั่งให้ผู้เข้าร่วม | Observed success ที่ระบบคำนวณ |
| --- | --- | --- |
| 1 | ค้นหาและเปิดกระทู้ที่ตรงกับสิ่งที่ต้องการ | `search_performed` ตามด้วย `search_result_opened` ของ subject/session เดียวกันภายใน 5 นาที |
| 2 | สร้างกระทู้หนึ่งรายการโดยไม่ใช้ข้อมูลส่วนตัว | มี `topic_created` outcome `success` ในช่วง campaign |
| 3 | แสดงความคิดเห็นหรือตอบกลับหนึ่งครั้ง | มี `comment_created` outcome `success` ในช่วง campaign |
| 4 | กดถูกใจหรือบันทึกกระทู้หนึ่งรายการ | มี `like_changed` หรือ `bookmark_changed` ที่ `active=true` |
| 5 | ติดตามหมวดหรือผู้เขียน แล้วเปิด Following หรือ For You | มี follow event ที่ `active=true` และ `feed_viewed` เป็น `following`/`for_you` |

Self-reported ใช้ `สำเร็จ / สำเร็จบางส่วน / ไม่สำเร็จ / ไม่ได้ลอง` พร้อม difficulty 1–5 แยกจาก Observed เสมอ

## 4. Campaign preparation sheet

| Field | ค่าที่ต้องกรอก |
| --- | --- |
| ชื่อรอบ | [กรอกชื่อที่ไม่มีข้อมูลบุคคล] |
| Slug | `pilot-2569-[รหัสรอบ]` |
| Data scope | `pilot` เท่านั้น |
| Questionnaire version | `sus-th-pilot-v1` |
| Consent notice version | `research-notice-pilot-v1` |
| Analytics notice version | `research-analytics-pilot-v1` จาก server constant |
| Eligible member count | [จำนวนบัญชีที่เชิญ ณ เวลาก่อนเปิด] |
| Starts at / Ends at | [UTC] / [UTC] |
| Retention until | [UTC และไม่เกิน policy ที่อนุมัติ] |
| Super Admin ผู้เปิด/ปิด | [participant-independent operator code] |
| Incident owner | [กรอก] |
| Retention/export owner | [กรอก] |

ขั้นตอน:

1. สร้างเป็น `draft` และตรวจค่ากับ decision sheet
2. บันทึก eligible-member snapshot จากจำนวนบัญชีที่เชิญจริง
3. ให้ผู้ตรวจคนที่สองทวน version, UTC window, retention และ `data_scope=pilot`
4. เปลี่ยน `draft -> open` เมื่อพร้อมเริ่มเท่านั้น
5. หลัง session สุดท้ายเปลี่ยน `open -> closed`; ตรวจผล/ข้อผิดพลาดก่อน `closed -> locked`

Lifecycle เดินหน้าอย่างเดียว ห้ามย้อนสถานะและห้ามแก้ questionnaire หลังเปิด

## 5. Technical preflight

สร้างไฟล์ทำงานที่ถูก Git ignore จาก [ตัวอย่าง Pilot config](./ITHUB_FEEDBACK_RESEARCH_ANALYTICS_PILOT_CONFIG.example.json) แล้วกรอกตาม decision sheet:

```powershell
New-Item -ItemType Directory -Force -Path .vercel/release-evidence | Out-Null
Copy-Item -LiteralPath .md/features/ITHUB_FEEDBACK_RESEARCH_ANALYTICS_PILOT_CONFIG.example.json -Destination .vercel/release-evidence/research-pilot-config.json
```

- ตัวอย่างตั้ง decision เป็น `pending`, owner/tester ว่าง และ confirmation เป็น `false` โดยตั้งใจ จึงต้องถูกบล็อกจนกว่าจะกรอกข้อมูลที่ได้รับอนุมัติจริง
- ใช้สถานะ decision เป็น `approved_for_pilot`, operator code แทนชื่อ และเวลา UTC เท่านั้น ห้ามใส่ชื่อ อีเมล รหัสนักศึกษา password, token หรือ secret ใน config
- Participant codes ต้องเรียงต่อเนื่อง `P01` เป็นต้นไป จำนวน 5–10 รหัส และต้องเท่ากับ `eligibleMemberCount`
- Alias ที่คำสั่งแสดง (`pilot_p01`, `pilot.p01@example.invalid`) ใช้เป็นแนวทางตั้งบัญชีสังเคราะห์ได้ แต่ให้สร้าง password แยกในช่องทางลับและห้ามบันทึก password ลง config/Git
- กรอก `previewEvidence` จาก Vercel metadata แบบ read-only เท่านั้น: deployment ID, immutable URL ที่ไม่มี path/query/share token, full source SHA 40 ตัว, `state=READY`, `vercelTarget=null`, branch variables 29 รายการ, `authenticationProtected=true` และเวลา `verifiedAt` แบบ UTC
- `previewEvidence.sourceCommit` ต้องตรงกับ `git rev-parse HEAD`; หากมี commit ใหม่ต้องรอ Preview ใหม่และตรวจ metadata ใหม่ก่อนรัน guard อีกครั้ง

ตัวตรวจนี้อ่านเฉพาะ config, Git branch/HEAD, `.vercel/project.json` และชื่อฐานจาก environment ไม่เชื่อมต่อ Vercel/เครือข่าย ไม่อ่าน/เขียนฐานข้อมูล และไม่สร้างบัญชีหรือ campaign ผล `ready` ยืนยันเพียงว่าหลักฐานที่ผู้ตรวจกรอกครบและสอดคล้องกัน ไม่ได้พิสูจน์ว่า Vercel metadata เป็นข้อมูลจริง ไม่ได้พิสูจน์ตัวตนผู้อนุมัติ และไม่ทดแทนลายเซ็นใน decision sheet จึงต้องมีผู้ตรวจคนที่สองเทียบกับหน้า Vercel จริงก่อนเปิด campaign

บันทึกผลและเวลา ห้ามคัดลอก secret ลงเอกสาร:

```powershell
git status --short --branch
git rev-parse HEAD
npm.cmd run preview:research:validate
npm.cmd run pilot:research:validate
npm.cmd run test:unit
npm.cmd run lint
npm.cmd run build
npm.cmd run db:check:e2e
```

ตรวจบน Vercel แบบ metadata-only ว่า deployment มาจาก branch นี้, target เป็น Preview, state เป็น READY และ branch overrides ยังครบ 29 รายการ ห้ามรัน remote configuration helper ซ้ำเมื่อ branch มี overrides อยู่แล้ว

รัน preflight ให้เสร็จก่อนเปิด campaign และรัน post-check หลังปิด campaign ระหว่างสถานะ `open` ต้องหยุด automated E2E, database smoke, seed, performance fixture และ cleanup job ทุกชุด เพราะใช้ฐาน `test_e2e` ร่วมกันและอาจรบกวนข้อมูล Pilot

ผล preflight:

| รายการ | ผล/เวลา/หลักฐาน |
| --- | --- |
| Source commit | [กรอก] |
| Deployment ID + immutable URL | [กรอก; ห้ามใส่ share token] |
| Branch variables 29/29 | [กรอก] |
| Pilot readiness guard | [กรอก `ready`, Preview SHA ตรง HEAD, 29 variables, authentication, 11/11 decisions และ participant/eligible count; ห้ามคัดลอก secret] |
| Unit / lint / build | [กรอก] |
| DB check 11/11 + counters 0 | [กรอก] |
| Backup/restore requirement | ไม่ใช้กับ `test_e2e` Pilot; Production ยังถูก block |

## 6. Session script

ทำทีละคนเพื่อลดการชนกันของข้อมูลทดสอบ และใช้ browser profile/session ใหม่ต่อ participant:

1. เปิด protected Preview ด้วย temporary access ที่ส่งแบบส่วนตัว ห้ามคัดลอก share token ลง session record, screenshot หรือแชตสาธารณะ
2. บันทึก participant code, อุปกรณ์, browser และเวลาเริ่ม โดยไม่บันทึกชื่อ/อีเมล
3. แจ้งวัตถุประสงค์, ข้อมูลที่เก็บ, Analytics แบบ opt-in, วิธีถอน และสิทธิ์หยุดได้ทุกเมื่อ
4. ให้ผู้เข้าร่วม login แล้วตัดสินใจ consent เอง ห้ามผู้ดำเนินการกดยินยอมแทน
5. ให้ทำ 5 งานตามหัวข้อ 3; บันทึกเฉพาะเวลา, จำนวนครั้งที่ขอความช่วยเหลือ, blocker และ issue theme ที่ไม่ระบุตัวบุคคล
6. ให้ตอบ task result/difficulty และ SUS 10 ข้อหลังทำงาน ห้ามชี้นำคำตอบ
7. ทดลองส่ง Feedback อย่างน้อยหนึ่งรายการโดยใช้ข้อความจำลองที่ไม่มี PII
8. ถ้ารวม withdrawal test ให้ใช้บัญชีที่กำหนดไว้ล่วงหน้าและบันทึกว่าคำตอบ/event ถูกลบตาม contract
9. logout/ปิด profile แล้วจึงเริ่ม participant ถัดไป

### Session record template

| Field | ค่า |
| --- | --- |
| Participant code | `P__` |
| วันที่/เวลา UTC | [กรอก] |
| Device / browser / viewport | [กรอก] |
| Analytics choice | `opt-in / declined / withdrawn` |
| Task 1–5 | [เวลา, help count, blocker theme; ไม่ใส่คำพูดที่มี PII] |
| Evaluation submitted | `yes / no / withdrawn` |
| Feedback submitted | `yes / no` |
| Accessibility mode | `standard / keyboard / NVDA / VoiceOver` |
| Incident/issue IDs | [กรอก] |
| Facilitator code | [กรอก] |

## 7. Manual accessibility script

Automated roles/names/keyboard/overflow checks ผ่านแล้ว แต่รายการนี้ต้องให้มนุษย์ฟังและใช้งานจริงก่อนติ๊กผ่าน:

- Windows: NVDA เวอร์ชันที่บันทึกไว้ + Chrome หรือ Edge
- macOS: VoiceOver เวอร์ชัน OS ที่บันทึกไว้ + Safari
- ทดสอบที่ zoom 100% และ 200% อย่างน้อยหนึ่งรอบ; keyboard only แยกอีกหนึ่งรอบ

Host audit วันที่ 10 กันยายน 2569 พบ Chrome/Edge และ Windows Narrator แต่ไม่พบ NVDA; VoiceOver ต้องใช้เครื่อง macOS จึงต้องจัดหาเครื่องมือ/ผู้ทดสอบทั้งสองชุดก่อนปิด gate และห้ามใช้ Narrator แทนหลักฐาน NVDA

เส้นทางสมาชิก:

- [ ] Login และไป `/feedback` โดยใช้ landmarks/headings
- [ ] Consent checkbox/button อ่านชื่อ สถานะ pending/success/error และถอน consent ได้
- [ ] ข้อมูลกลุ่มตัวอย่างและ SUS อ่าน legend, label, required และตัวเลือก 1–5 ตามลำดับ
- [ ] Task result/difficulty อ่านเป็นกลุ่มและรู้ข้อผิดพลาดที่สัมพันธ์กับ field
- [ ] Focus ไปยัง error summary/live region หลัง submit ไม่ครบ และ draft ไม่หาย
- [ ] Feedback form, success status และรายการสถานะอ่านเข้าใจโดยไม่พึ่งสี

เส้นทาง Admin/Super Admin:

- [ ] Dashboard filters, partial/empty/error states และ denominator notes อ่านได้
- [ ] ตารางทุกชุดมี caption/header relationship และเลื่อนด้วย keyboard ได้
- [ ] Export control อธิบายว่าเป็น aggregate-only 7 ไฟล์
- [ ] Campaign actions อ่านชื่อ/สถานะ lifecycle ถูกต้องและ focus ไม่หลุดหลัง Server Action

บันทึกต่อรายการ: `Pass / Fail / Blocked`, browser + screen reader version, route, ขั้นตอนทำซ้ำ, expected/actual และ issue ID โดยไม่บันทึกเสียงหรือข้อความที่มี PII หากยังไม่มี NVDA/VoiceOver ให้ระบุ `Blocked — tool unavailable`; ห้ามใช้ผล automated แทน

## 8. Go / No-Go

Go เพื่อจบ Pilot และล็อก questionnaire ได้เมื่อ:

- [ ] มี session ที่ใช้ได้ 5–10 คน และ denominator ตรงจำนวนที่เชิญ
- [ ] ไม่มี P0/P1 ด้าน consent, data leak, role bypass, duplicate submission หรือข้อมูลสูญหาย
- [ ] Self-reported กับ observed ถูกแสดงแยก และ unavailable ไม่ถูกนับเป็น failure
- [ ] Export มี 7 ไฟล์ตาม allowlist, ไม่มี PII/internal note/open text และ suppression ทำงาน
- [ ] Manual NVDA และ VoiceOver ไม่มี blocker; issue รองมี owner/กำหนดแก้
- [ ] Post-pilot `db:check:e2e` ผ่าน 11/11 และ counters ทุกค่าเป็น 0
- [ ] อาจารย์รับรองข้อความ/นิยามฉบับสุดท้ายและกำหนด version ใหม่หากมีการแก้

No-Go ทันทีเมื่อพบ consent bypass, raw PII ใน Analytics/export, admin access จาก role ที่ห้าม, Production target, DB ไม่ใช่ `_e2e`, lifecycle/retention ผิด หรือ integrity counter ไม่เป็น 0

## 9. ปิดรอบและเก็บหลักฐาน

1. ปิด campaign ก่อน หากมี incident ห้าม lock จนกว่าจะตรวจผลกระทบ
2. สแกน Preview build/runtime error logs และบันทึกเฉพาะ counts/route/code ที่ไม่ระบุตัวบุคคล
3. รัน `npm.cmd run db:check:e2e`; ตรวจ test fixture prefixes แยกจาก Pilot rows
4. เก็บ export ในพื้นที่จำกัดสิทธิ์ ระบุผู้รับและวันลบ; ห้าม commit ZIP/CSV ลง Git
5. สรุปจำนวน invited/completed/withdrawn/invalid โดยใช้ participant code เท่านั้น
6. บันทึกข้อแก้ไข questionnaire/notice/metrics เป็น version ใหม่ แล้ว rerun unit/build/Preview smoke
7. เมื่ออนุมัติผล Pilot จึงเปลี่ยน `closed -> locked`; อย่าลบ Pilot rows นอก retention/withdrawal ที่อนุมัติ

Production migration/deploy เป็นงานคนละรอบ ต้องมี target, backup, migration checksum, restore plan และคำอนุญาตเฉพาะรอบก่อนดำเนินการ

## 10. Incident boundary

- Consent/privacy ผิดปกติ: ปิด ingest/ปิด campaign, เก็บ aggregate audit เท่านั้น และใช้ withdrawal/retention ตามสิทธิ์ที่อนุมัติ
- Role bypass หรือ export leak: No-Go, เก็บ response header/status และ reproduction ที่ไม่มี payload จริง
- DB/integrity ผิด: หยุดทดสอบ, ห้าม repair แบบเดา และเก็บผล `db:check:e2e` ให้ผู้รับผิดชอบตรวจ
- Accessibility blocker: เปิด issue พร้อม route/ขั้นตอน/เวอร์ชันเครื่องมือ แล้ว rerun manual case หลังแก้
- ห้ามแก้ migration 005 ที่ commit แล้วหรือ `DROP TABLE` เพื่อ rollback
