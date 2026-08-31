# ITHub Design Redesign Plan

| รายการ | ค่า |
| --- | --- |
| สถานะ | Implemented — core verification complete; baseline archive pending |
| ทิศทาง | Clean Technical Community |
| วันที่จัดทำ | 2026-08-26 |
| Source of truth | `.md/design/` |
| ขอบเขต | Visual UI, UX hierarchy, responsive layout, typography, color, motion, iconography และ internal UI composition |

## 1. เป้าหมาย

ปรับ ITHub จากหน้าตาที่ผสมระหว่าง landing page, news gallery และ forum ให้เป็นชุมชนเทคนิคที่อ่านง่าย ค้นหากระทู้ได้เร็ว และมีภาษาภาพเดียวกันทั้งระบบ โดยรักษาแบรนด์แดง–ดำ, dark mode, routes, authorization, backend behavior, public API และ database schema เดิม

ผลลัพธ์ที่ต้องการ:

- ผู้ใช้เข้าใจทันทีว่า ITHub คือชุมชนถาม–ตอบและแบ่งปันความรู้ด้านไอที
- เนื้อหากระทู้เป็นสิ่งแรกที่เด่น ไม่ใช่ภาพตกแต่งหรือเอฟเฟกต์
- Navigation มีโครงสร้างชัด ไม่มีส่วนใดขยายมาบังเนื้อหา
- Light และ dark mode ใช้ระบบสี ระยะ เงา และลำดับชั้นแบบเดียวกัน
- Desktop, tablet และ mobile ใช้ภาษาภาพเดียวกัน แต่ปรับ density ให้เหมาะกับพื้นที่
- UI ลดสิ่งที่แย่งความสนใจ และใช้ motion เฉพาะเมื่อช่วยอธิบายสถานะ

## 2. Baseline และหลักฐานปัจจุบัน

ตรวจหน้า Home, Topic detail, Login, Leaderboard และ Help ใน light/dark mode ที่ desktop 1440×900 และ mobile 390×844 เมื่อวันที่ 2026-08-26

### ปัญหาที่วัดได้

- Desktop sidebar ยุบกว้าง 64px และ content เริ่มที่ `x=64`; เมื่อ hover/focus sidebar ขยายเป็น 256px แต่ content ยังเริ่มที่เดิม จึงบังเนื้อหา 192px
- Mobile header สูงประมาณ 126px, hero สูง 288px และการ์ดแรกเริ่มประมาณ `y=601`; รูปบนการ์ดสูง 208px ทำให้ชื่อกระทู้แรกอยู่ต่ำกว่าหน้าจอสูง 844px
- Topic detail ใช้พื้นที่อ่านกว้างประมาณ 1,216px และเนื้อหาถูกกำหนด `min-height: 200px` จึงเกิดบรรทัดยาวและพื้นที่ว่างมากเมื่อกระทู้สั้น
- ปุ่มแชท mobile ขนาด 60px อยู่เหนือ bottom navigation เพียงเล็กน้อยและทับพื้นที่การ์ดหรือ controls ระหว่างเลื่อน
- Dark mode ใช้พื้นดำสนิทหลายชั้น ทำให้ surface hierarchy แบน ขณะที่สถานะและองค์ประกอบตกแต่งใช้แดง ส้ม ชมพู เหลือง เขียว และน้ำเงินพร้อมกัน
- Emoji ถูกใช้เป็น navigation icon, action icon, badge และ decoration จึงมีน้ำหนักและรูปร่างไม่สม่ำเสมอระหว่างระบบปฏิบัติการ
- Motion หลายชนิดทำงานพร้อมกัน ได้แก่ global click ring, ripple, spring cards, hover lift, hero pulse, crown bounce, notification pulse, loader glow และ chat glow
- หน้า Help และ onboarding มี hierarchy กับ spacing ที่เป็นระบบกว่าหน้า Home และ Topic detail จึงใช้เป็น visual reference ได้ แต่ onboarding แบบ modal สี่ขั้นบังคับผู้ใช้เร็วเกินไป

### สิ่งที่ต้องรักษา

- Brand recognition จากโลโก้ IT และสีแดง
- Search, category filtering, sorting, responsive navigation และ dark mode
- Accessibility foundation ที่มีอยู่ เช่น skip link, focus-visible และ reduced-motion rule
- Flow สำคัญของ guest, member และ admin
- หน้า Help เป็น reference สำหรับการจัดหัวข้อ ระยะ และ CTA hierarchy

## 3. Design direction: Clean Technical Community

### หลักการ

1. **Content first:** ชื่อกระทู้ สาระ และสัญญาณจากชุมชนต้องเด่นกว่าภาพและ decoration
2. **One visual language:** component ทุกหน้าต้องใช้ token, icon, radius, shadow และ motion ชุดเดียวกัน
3. **Thai first:** ใช้ภาษาไทยเป็นหลัก และใช้ภาษาอังกฤษเฉพาะชื่อเทคโนโลยีหรือคำที่เป็นมาตรฐาน
4. **Calm by default:** หน้าปกติควรนิ่ง ใช้สีและ motion เพื่อบอกความหมาย ไม่ใช้เพื่อเรียกความสนใจพร้อมกันหลายจุด
5. **Responsive by intent:** เปลี่ยนโครงสร้างตามพื้นที่ ไม่เพียงย่อขนาดจาก desktop
6. **Accessible interaction:** ห้ามพึ่ง hover เพียงอย่างเดียว และ disabled state ต้องยังอ่านความหมายได้

### สิ่งที่ห้ามเพิ่ม

- Emoji ใหม่ใน navigation, buttons, form controls หรือ status controls
- Gradient ใหม่ที่ไม่ใช่ hero, brand moment หรือข้อมูลที่มีเหตุผลชัดเจน
- Infinite animation นอก loading, progress หรือ urgent status
- Floating primary action มากกว่าหนึ่งรายการบน mobile
- Hover behavior ที่เปลี่ยน layout หรือบัง content
- เงาระดับ `shadow-xl/2xl` หลายชั้นในหน้าปกติ

## 4. Design foundation

### 4.1 Typography

- ฟอนต์หลัก: **IBM Plex Sans Thai** ผ่าน `next/font` โดยมี system sans-serif เป็น fallback
- ใช้น้ำหนัก 400 สำหรับ body, 500 สำหรับ labels/metadata, 600 สำหรับ controls และ 700 สำหรับ headings
- หลีกเลี่ยง `font-black` ยกเว้น brand display ที่อนุมัติไว้
- Body desktop 16px/1.65, body mobile 15–16px/1.6
- Metadata 12–14px และต้องไม่ใช้สีอ่อนจนอ่านไม่ได้
- จำกัดแนวอ่านข้อความยาวด้วย `max-width` หรือประมาณ 65–80 ตัวอักษรต่อบรรทัด

### 4.2 Semantic colors

ค่าตั้งต้นที่ต้องใช้เป็น design tokens:

| Token | Light | Dark | การใช้งาน |
| --- | --- | --- | --- |
| Background | `#f7f7f8` | `#09090b` | พื้นหลังแอป |
| Surface | `#ffffff` | `#18181b` | Card, navbar, dialog |
| Surface subtle | `#f4f4f5` | `#27272a` | Hover, secondary area |
| Text | `#18181b` | `#fafafa` | เนื้อหาหลัก |
| Text muted | `#71717a` | `#a1a1aa` | Metadata |
| Border | `#e4e4e7` | `#3f3f46` | เส้นแบ่งและกรอบ |
| Primary | `#dc2626` | `#ef4444` | Brand และ primary action |
| Primary hover | `#b91c1c` | `#dc2626` | Hover/pressed |

- Green, amber, blue และ pink ใช้เฉพาะ success, warning, information และ reaction ที่มีความหมาย
- ห้ามใช้สีสถานะเป็น decoration ของ card ทั่วไป
- Dark mode ห้ามใช้ดำสนิทกับทุก surface; ต้องเห็นความต่างระหว่าง background, surface และ elevated surface

### 4.3 Spacing, radius และ shadow

- ใช้ spacing base 4px; ระยะหลักคือ 4, 8, 12, 16, 24, 32, 48 และ 64px
- Page gutter: mobile 16px, tablet 24px, desktop 32px
- Radius: small 8px, control 10–12px, card 16px, feature surface/dialog 24px
- Card ปกติใช้ border และ shadow ระดับ subtle เท่านั้น
- `shadow-xl/2xl` สงวนไว้สำหรับ dialog, dropdown และ elevated overlay

### 4.4 Icons และ motion

- ใช้ Lucide icons ขนาด 16, 20 หรือ 24px; stroke width 2
- Icon ต้องมี accessible name จาก control หรือซ่อนด้วย `aria-hidden` เมื่อเป็น decoration
- Interaction motion 150ms สำหรับสี/opacity และ 220ms สำหรับ transform/layout
- Card hover ยกได้สูงสุด 2–4px
- ยกเลิก global click effect, hero pulse และ crown bounce
- Ripple ไม่ใช้เป็น global pattern; ถ้าคงไว้ต้องจำกัดเฉพาะ primary action และเคารพ reduced motion

## 5. Navigation และ page shell

### Desktop และ tablet

- ตั้งแต่ 1280px ขึ้นไป sidebar เปิดกว้างเริ่มต้นที่ 232px พร้อม icon และ label
- ช่วง 768–1279px sidebar ยุบเริ่มต้นที่ 72px
- มีปุ่มย่อ–ขยายที่เห็นชัด ใช้เมาส์และคีย์บอร์ดได้ และเก็บ preference ใน local storage ได้
- Main content ต้องอยู่ใน layout flow และเปลี่ยน offset/column width พร้อม sidebar เสมอ
- ห้ามขยาย sidebar ด้วย hover หรือ focus
- Navbar คง logo, search, theme, notification และ account actions; primary “สร้างกระทู้” มีเพียงจุดเดียว
- Right rail ห้ามมี CTA ที่ซ้ำกับ navbar/sidebar

### Mobile

- ใช้ bottom navigation ต่ำกว่า 768px โดยคง safe-area padding
- Primary action มีหนึ่งรายการ; ปุ่มสร้างกระทู้เป็น primary action หลัก
- Chat เป็น secondary action ขนาด 48px ไม่มี glow และอยู่เหนือ bottom navigation อย่างน้อย 16px รวม safe area
- ถ้าพื้นที่เสี่ยงทับ content control ให้ซ่อนหรือย้าย chat action เข้าเมนู Help

### Page container

- App content ใช้ max width 1280px พร้อม gutter ตาม breakpoint
- หน้าที่อ่านเนื้อหายาวต้องมี inner reading column แยกจาก page container
- Header, sidebar, main scroll container, bottom navigation และ floating UI ต้องมี z-index scale ที่กำหนดร่วมกัน

## 6. หน้าแรก

### Hero

- Desktop สูง 180px; mobile สูงไม่เกิน 160px
- ใช้ข้อความต้อนรับชุมชนและ value proposition ที่สอดคล้องกับทุกหมวด ไม่ผูกหน้าแรกกับ AI เพียงเรื่องเดียว
- มี CTA หลักหนึ่งรายการและ category shortcuts หรือ community stats ที่มีข้อมูลจริง
- ยกเลิก pulse, glow และ decoration ที่เคลื่อนไหว

### Community feed

- ใช้ feed หนึ่งคอลัมน์ในพื้นที่หลัก แทน image-first grid
- Desktop แต่ละรายการแสดง thumbnail ด้านข้างขนาดประมาณ 144×96px เมื่อมีภาพ
- Mobile ใช้ thumbnail ประมาณ 88×66px ด้านข้างหรือซ่อนเมื่อพื้นที่ไม่พอ; ห้ามวางภาพใหญ่ก่อนชื่อ
- กระทู้ไม่มีภาพไม่สร้าง placeholder ขนาดใหญ่
- ข้อมูลขั้นต่ำของแต่ละรายการ:
  - Category
  - Title ไม่เกินสองบรรทัด
  - Plain-text excerpt ไม่เกินสองบรรทัด
  - Author และวันที่
  - Views, comment count และ like count
- Internal read model ของหน้า Home เพิ่ม `category`, excerpt, `comment_count` และ `like_count` ได้โดยไม่เปลี่ยน public API หรือ schema

### Sort และ right rail

- Sort ใช้ segmented control พร้อม Lucide icons หรือข้อความ ไม่ใช้ emoji
- Active state ใช้ primary/neutral token เดียวกันทุกตัวเลือก
- Right rail แสดง community stats และ trending categories เท่านั้น
- ซ่อน right rail ต่ำกว่า 1280px และย้ายข้อมูลสำคัญเป็น compact section ใน feed

## 7. หน้ารายละเอียดกระทู้

- Page max width ประมาณ 1100px และ reading column 760–860px
- Optional aside กว้างประมาณ 240px ใช้กับ metadata หรือ related topics บนจอกว้าง
- ยกเลิก `min-height: 200px` ของเนื้อหากระทู้
- Header แสดง category, title, author, role, date และ views เป็น hierarchy เดียวกัน
- Actions ใช้ component pattern เดียวกันและไม่ใช้ emoji
- Guest ไม่เห็นปุ่ม disabled จาง ๆ; แสดงข้อความหรือลิงก์ “เข้าสู่ระบบเพื่อถูกใจและบันทึก” ที่พาไป `/login?next=<current-topic>`
- Accepted answer ใช้ surface ปกติพร้อม left border สี success และ badge ขนาดเล็ก ไม่ใช้พื้นเขียวเต็มกล่อง
- ความคิดเห็นจำกัดแนวอ่านตาม reading column และแสดง reply hierarchy ด้วย indentation/border ที่ไม่ลดพื้นที่ mobile มากเกินไป
- Related topics ใช้ compact list ไม่ใช้ image-first card ซ้ำ

## 8. หน้ารอง

### Login และ Register

- ใช้ shared auth layout และ form card กว้างสูงสุดประมาณ 440px
- ใช้ spacing, label, input, error และ button pattern เดียวกัน
- Desktop อาจมี brand/value panel แบบนิ่งหนึ่งด้าน; mobile เหลือ form card เดียว
- ห้ามใช้ footer ขนาดใหญ่จนแย่งความสนใจจาก auth task

### Leaderboard

- คง podium แต่ลดความสูง card และ decoration
- ใช้ Lucide Trophy/Medal แทน emoji และยกเลิก crown bounce
- เปลี่ยนข้อความเป็นไทย เช่น “อันดับสมาชิก” และ “จำนวนกระทู้” โดยเก็บชื่อ rank ที่เป็น taxonomy เท่านั้น
- Avatar ที่โหลดไม่ได้ต้องมี fallback ที่มีขนาดและ contrast คงที่

### Onboarding และ Help

- ยกเลิก modal onboarding สี่ขั้นแบบเดิม
- **Addendum 2026-08-31:** แผน milestone 85% ที่ผู้ใช้อนุมัติให้แทน welcome prompt ด้วย Spotlight Tour v2 แบบ 6 ขั้น ซึ่งหรี่และเบลอฉากหลังแต่คง target จริงให้คม โดยล็อก interaction และไม่แก้ข้อมูลจริง
- เก็บคู่มือฉบับเต็มและตัวเรียก onboarding ไว้ในหน้า Help
- ใช้หน้า Help เป็น reference ของ section hierarchy, content width และ CTA grouping แต่ปรับ token ให้ตรงกับ foundation ใหม่

### Profile, Notifications, Create/Edit และ Admin

- ย้ายเข้าสู่ token/component system หลัง shell, Home และ Topic detail เสถียรแล้ว
- ห้ามเปลี่ยน authorization, mutation flow หรือข้อมูลที่แสดงโดยไม่เกี่ยวกับงาน visual
- Admin เน้น density และการสแกนข้อมูลมากกว่า decorative cards

## 9. Internal UI contracts

ไม่มีการเปลี่ยน public API, route contract หรือ database schema แผนนี้อนุญาตเฉพาะ internal UI primitives และ read-model enrichment ที่จำเป็น

ชุด primitive เป้าหมาย:

- `AppShell`/page shell behavior สำหรับ navbar, sidebar, main และ mobile navigation
- `PageContainer` และ `ReadingColumn`
- `Button`, `IconButton`, `SegmentedControl`, `Badge` และ `Surface`
- `SectionHeader`
- `TopicFeedCard` ที่รับข้อมูล `id`, `title`, `category`, `excerpt`, `imageUrl`, `username`, `createdAt`, `views`, `commentCount` และ `likeCount`
- Shared auth form styles และ shared empty/error/loading states

ชื่อ component จริงอาจคงไฟล์เดิมเพื่อจำกัด diff แต่ behavior และ props ต้องเป็นไปตาม contract นี้

## 10. Implementation phases

### Phase 0 — Baseline และ documentation

- [x] สร้าง `.md/design/` และกำหนดเป็น source of truth
- [x] บันทึก baseline findings และ acceptance criteria
- [ ] เก็บ screenshot baseline ของ Home, Topic, Login, Leaderboard และ Help ที่ 390, 768, 1024 และ 1440px ใน light/dark mode
- [x] ระบุ locator/test-id ที่จำเป็นสำหรับ visual assertions

### Phase 1 — Foundation

- [x] เพิ่ม font และ semantic design tokens
- [x] กำหนด shared spacing, radius, shadow, icon และ motion rules
- [x] สร้างหรือปรับ shared UI primitives
- [x] ลบ global click effect และ infinite decorative animation

### Phase 2 — Navigation และ shell

- [x] ปรับ sidebar เป็น explicit toggle และให้ main layout เปลี่ยนตามจริง
- [x] จัด navbar และ primary CTA ใหม่
- [x] ปรับ bottom navigation, safe area และ chat action
- [x] ตรวจ keyboard, focus และ reduced motion

### Phase 3 — Home

- [x] ลดและเขียน hero ใหม่
- [x] เพิ่มข้อมูล feed ที่จำเป็นใน internal query
- [x] เปลี่ยน Topic Card เป็น compact community feed
- [x] ปรับ sort และ right rail
- [x] ตรวจ first viewport บน mobile

### Phase 4 — Topic detail

- [x] จำกัด reading width และจัด article hierarchy
- [x] ปรับ engagement/guest prompt
- [x] ปรับ comment และ accepted answer surfaces
- [x] ปรับ related topics

### Phase 5 — Secondary pages

- [x] Shared auth layout
- [x] Leaderboard cleanup
- [x] Welcome prompt และ Help alignment
- [x] Profile, Notifications, Create/Edit และ Admin alignment

### Phase 6 — Visual QA และ rollout

- [x] เพิ่ม Playwright layout assertions และ visual screenshot captures
- [x] ตรวจ light/dark, keyboard, reduced motion และ contrast
- [x] รัน lint, build และ E2E แบบ serial
- [x] ตรวจ diff ของทุก breakpoint และอัปเดต implementation log

## 11. Acceptance criteria

### Layout และ responsive

- ไม่มี horizontal overflow ที่ viewport 390, 768, 1024 และ 1440px
- Sidebar ทุกสถานะไม่บัง heading, banner, cards, back button หรือ content และใช้งานด้วยคีย์บอร์ดได้
- ที่ 390×844 ผู้ใช้เห็นชื่อและ metadata อย่างน้อยของกระทู้แรกโดยไม่ต้องเลื่อน
- Chat action ไม่ทับ bottom navigation, CTA, form control หรือ engagement control
- Sticky/fixed UI เคารพ safe area และไม่สร้างพื้นที่เลื่อนปลอม

### Readability และ visual system

- Topic body และ comments อยู่ใน reading column 760–860px บนจอกว้าง
- Light/dark mode แยก background, surface และ elevated surface ได้ชัด
- UI controls ไม่มี emoji และใช้ Lucide icon scale เดียวกัน
- ไม่มี decorative infinite animation และทุก motion เคารพ `prefers-reduced-motion`
- Primary action ต่อ section มีหนึ่งรายการที่เด่นที่สุดอย่างชัดเจน
- Disabled, muted และ metadata text ผ่าน contrast ที่เหมาะกับพื้นหลัง

### Automated verification

- Playwright ตรวจ bounding box ของ main content เทียบ sidebar ทั้งสถานะเปิดและยุบ
- Playwright ตรวจ `scrollWidth <= clientWidth` ทุก breakpoint
- Playwright ตรวจ first topic title/metadata อยู่ใน mobile viewport
- Playwright ตรวจ chat และ bottom navigation bounding boxes ไม่ซ้อนกัน
- มี screenshot baseline อย่างน้อย Home และ Topic detail ใน light/dark ที่ mobile กับ desktop
- คำสั่งต่อไปนี้ผ่านหลังแต่ละ phase:

```powershell
npm.cmd run lint
npm.cmd run build
node_modules\.bin\playwright.cmd test --workers=1 --reporter=line
```

## 12. ขอบเขตที่ไม่รวม

- การเปลี่ยน authentication, authorization, moderation หรือ session behavior
- การเปลี่ยน public API, URL contract หรือ database schema
- การแก้ security/backend defects ที่ระบุใน review report เว้นแต่จำเป็นโดยตรงต่อ UI phase และมีแผนแยก
- การเปลี่ยนเนื้อหากระทู้หรือข้อมูลผู้ใช้จริง
- การเปิด Playwright parallel ก่อนแยก test data สำเร็จ

## 13. Implementation log

เพิ่มรายการใหม่ด้านบนสุดตามรูปแบบนี้:

```text
YYYY-MM-DD — Phase N — ผู้ดำเนินการ
- เปลี่ยนแปลง:
- การตัดสินใจ/เหตุผล:
- Viewport/theme ที่ตรวจ:
- Tests:
- ค้างอยู่:
```

### 2026-08-31 — Milestone 85 Spotlight addendum — Codex

- เปลี่ยนแปลง: พอร์ต Animated Spotlight Tour v2 บน redesign ปัจจุบัน, เพิ่ม DOM contract `data-tour` 6 กลุ่ม, overlay สี่แผง blur 10px/หรี่ 58% พร้อม fallback 82%, route/scroll/focus restoration, `inert`, focus trap, Reduced Motion และ fallback เมื่อ target หาย
- การตัดสินใจ/เหตุผล: ใช้แผน milestone 85% ล่าสุดแทน welcome prompt เดิมโดยไม่ merge branch เก่าที่จะย้อนทับ redesign; ใช้ Lucide icons และ token ปัจจุบันเพื่อรักษาภาษาภาพ Clean Technical Community
- Viewport/theme ที่กำหนดทดสอบ: 375×812, 390×844, 768×900, 1024×900, 1280×800 และ 1440×1000; Light/Dark/Reduced Motion
- Tests: lint/build ผ่าน; เพิ่ม Playwright สำหรับ 6 steps, blur/fallback, target blocking, route/hash/history restoration, focus trap/restoration, guest/member และ responsive; execution รอ safe `_e2e` environment
- ค้างอยู่: ยังไม่มี `.env.e2e.local` ที่ยืนยันฐาน `_e2e` จึงไม่รัน authenticated browser suite และยังไม่เปิด Preview/Production

### 2026-08-26 — Phase 1–6 — Codex

- เปลี่ยนแปลง: วาง semantic design tokens และ IBM Plex Sans Thai, ปรับ shell/sidebar/navbar/mobile navigation, เปลี่ยนหน้าแรกเป็น community feed, จำกัด reading column ของหน้ากระทู้, ปรับ auth/leaderboard/onboarding/help/profile/notifications/create/edit/admin และแทน emoji ใน UI controls ด้วย Lucide
- การตัดสินใจ/เหตุผล: คง routes, authorization, mutation flow, public API และ database schema เดิม; ใช้ component เดิมเมื่อเปลี่ยน behavior/props ภายในได้เพื่อลดความเสี่ยงของ diff
- Viewport/theme ที่ตรวจ: 390×844, 768×900, 1024×900 และ 1440×1000; Home และ Topic มี visual captures ทั้ง light/dark บน mobile/desktop และ Home light ครบทุก breakpoint
- Tests: `npm.cmd run lint` ผ่าน; `npm.cmd run build` ผ่าน (Next.js 16.3.0, 20 routes); Playwright serial ผ่าน Chromium 19/5 skip, Firefox 19/5 skip และ WebKit 19/5 skip; responsive/visual subset ผ่าน 12/12 ครบสาม engines
- ค้างอยู่: ยังไม่มีบัญชี `ITHUB_E2E_EMAIL/PASSWORD` จึงข้าม authenticated flows 5 กรณีต่อ engine; baseline matrix แบบ pixel-diff ของ Login, Leaderboard และ Help ทุก breakpoint/theme ยังไม่จัดเก็บ แต่ visual/manual baseline เดิมและ automated layout evidence ครอบคลุม acceptance criteria หลักแล้ว

### 2026-08-26 — Phase 0 — Codex

- เปลี่ยนแปลง: สร้าง design documentation hub, baseline findings, design direction, phased checklist และ acceptance criteria
- การตัดสินใจ/เหตุผล: ใช้ `.md/design/` เป็น source of truth และใช้ `design` ที่สะกดถูกต้อง
- Viewport/theme ที่ตรวจ: 390×844 และ 1440×900, light/dark; ตรวจ Home, Topic detail, Login, Leaderboard และ Help
- Tests: ตรวจโครงสร้าง Markdown, relative links และ Git diff; ไม่มี production code change
- ค้างอยู่: baseline screenshots และการ implement Phase 1–6
