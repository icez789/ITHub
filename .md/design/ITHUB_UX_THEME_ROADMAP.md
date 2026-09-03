# ITHub UX/UI and Theme Roadmap — Phase 1

| รายการ | ค่า |
| --- | --- |
| สถานะ | Implementation committed — Production blocked by migration 003 |
| วันที่เริ่ม | 2026-09-02 |
| ผู้ดำเนินการ | Codex |
| ขอบเขต | UX/UI บนพฤติกรรมเดิม และ 5 palettes × Light/Dark |
| ไม่รวม | Personalized Discovery, API และ database schema changes |

## เป้าหมาย

ทำให้ Light mode แยก canvas, surface และ controls ได้ชัด เพิ่มธีมเต็มรูปแบบ 5 ชุดโดยรักษาโลโก้ ITHub สีแดง และทำให้ทุกหน้าหลักใช้ semantic tokens เดียวกันโดยไม่เปลี่ยน route, authentication, authorization หรือ backend behavior

## Theme contract

- Mode: `system`, `light`, `dark`
- Palette: `classic`, `ocean`, `forest`, `violet`, `amber`
- DOM: `html.dark`, `html[data-mode]`, `html[data-palette]`
- Storage: คง `theme` สำหรับ mode และเพิ่ม `ithub_palette_v1` สำหรับ palette
- Context: `mode`, `resolvedMode`, `palette`, `setMode`, `setPalette`, `resetTheme`
- Brand: โลโก้และ wordmark ใช้ brand red เดิม; accent ของ controls เปลี่ยนตาม palette
- Status: success, warning, danger และ information คงความหมายข้ามทุก palette

Semantic tokens หลัก: background/canvas, surface, surface-subtle, surface-elevated, text, text-muted, border, border-strong, primary, primary-hover, primary-contrast, accent-text, primary-soft, focus-ring และ shadow-color

## Baseline evidence

- ใช้ visual evidence เดิมของ Home และ Topic จาก `.codex-artifacts/ithub-progress-redesign/assets/` และ baseline matrix ใน `ITHUB_REDESIGN_PLAN.md`
- ตรวจ source พบการใช้ semantic tokens ปนกับ `bg-white`, `bg-gray-50`, `border-gray-*` และ `red-*` ใน Navbar, Sidebar, forms, Profile, Notifications, Help, Admin และ shared components
- Light เดิมใช้ background `#f7f7f8`, surface `#ffffff`, subtle `#f4f4f5` และ border `#e4e4e7` ซึ่งมีระยะความสว่างใกล้กันเกินไป
- การเก็บ baseline ใหม่ผ่าน localhost ถูก browser policy ปฏิเสธหลัง dev server restart จึงใช้หลักฐานเดิมและจะเก็บ after-state ใหม่ผ่าน Playwright เมื่อ implementation พร้อม

## Checklist

### Milestone 0 — เอกสารและ Baseline

- [x] สร้าง roadmap และ theme contract
- [x] เชื่อม roadmap จาก README
- [x] ระบุ 5 theme IDs และ semantic tokens
- [x] อ้างอิง baseline Home/Topic เดิมที่ mobile/desktop และ Light/Dark
- [x] บันทึกรายการ hard-coded color families ที่ต้องย้าย

### Milestone 1 — Theme Engine

- [x] เพิ่ม semantic tokens และ palettes ครบ 5 ชุด
- [x] รองรับ system/light/dark และการเปลี่ยน OS theme แบบสด
- [x] แยก brand red ออกจาก theme accent
- [x] ขยาย ThemeProvider contract
- [x] รองรับ storage เดิมและ `ithub_palette_v1`
- [x] ป้องกัน theme flash ก่อน hydration

### Milestone 2 — Theme Picker

- [x] เพิ่ม Desktop popover และ Mobile bottom sheet
- [x] เพิ่ม mode controls และ palette previews
- [x] เพิ่ม reset, Escape, outside click และ focus restoration
- [x] รองรับ radio semantics และ keyboard navigation

### Milestone 3 — Light Mode และ App Shell

- [x] แยก canvas/surface/border hierarchy
- [x] ปรับ Navbar, Sidebar, Bottom Navigation, inputs และ selected states
- [x] ตรวจ Loading Shell, Spotlight Tour และ floating safe areas

### Milestone 4 — เส้นทางหลัก

- [x] ปรับ Home hero, feed, filters และ empty/search states
- [x] ปรับ Topic Card และ thumbnail behavior
- [x] ตรวจ first topic metadata ที่ 390×844
- [x] ตรวจ Topic detail reading column, metadata, engagement และ guest CTA

### Milestone 5 — หน้ารองและ Components

- [x] ปรับ Auth, Create/Edit, Profile, Notifications, Help และ Admin
- [x] แทน hard-coded theme presentation colors ด้วย semantic tokens โดยคง brand และ status colors ตามความหมาย
- [x] ถอด ripple/decorative motion ที่ไม่จำเป็นและตรวจ reduced motion

### Milestone 6 — QA และ Release readiness

- [x] ตรวจ 5 palettes × Light/Dark ที่ 390, 768, 1024 และ 1440px
- [x] ตรวจ contrast, overflow, theme persistence และ no-flash behavior
- [x] ตรวจ Theme Picker keyboard/focus behavior
- [x] เก็บ after screenshots ของ Home และ Topic
- [x] lint ผ่าน
- [x] production build ผ่าน
- [x] Playwright full suite ผ่าน
- [x] Preview deployment READY และ visual smoke ของ App Shell, Theme Picker และ Help ผ่าน
- [ ] Preview data smoke ของ Home/Topic — ถูกบล็อกเพราะ database target ยังไม่ครบ migration 003
- [x] Commit implementation หลัง QA และ Preview visual smoke
- [ ] Deploy Production หลังตรวจรับครบ
- [x] บันทึก commit SHA, Preview URL, production attempt และ rollback evidence

## Phase 2 backlog

Personalized Discovery จะทำภายหลัง: การติดตามหมวด/ผู้เขียน, ฟีด “สำหรับคุณ/กำลังติดตาม” และ notification preferences งานส่วนนี้ไม่รวมใน Phase 1 และไม่มี database migration ในรอบนี้

## Implementation log

### 2026-09-02 — Milestone 0 — Codex

- เปลี่ยนแปลง: สร้าง roadmap, theme contract, checklist และ baseline inventory
- การตัดสินใจ/เหตุผล: ใช้ 5 full-atmosphere palettes × Light/Dark; เก็บค่าในอุปกรณ์; โลโก้คงแดง; status colors คง semantic meaning
- Viewport/theme ที่ตรวจ: อ้างอิง baseline เดิม 390×844 และ 1440×900 ทั้ง Light/Dark; after-state จะตรวจครบ matrix ใน Milestone 6
- Tests: ตรวจ source และ Git state แบบ read-only
- ค้างอยู่: Milestone 1–6

### 2026-09-03 — Milestone 1–5 — Codex

- เปลี่ยนแปลง: เพิ่ม theme engine และ Theme Picker สำหรับ `classic`, `ocean`, `forest`, `violet`, `amber`; แต่ละ palette รองรับ `system`, `light`, `dark` และเปลี่ยนตาม OS แบบสด
- เปลี่ยนแปลง: เพิ่ม semantic tokens สำหรับ canvas/surfaces/text/border/accent/state, แยก brand red ของโลโก้ และย้าย App Shell, Home, Topic, Auth, Create/Edit, Profile, Notifications, Help, Admin และ shared components เข้าระบบ token
- เปลี่ยนแปลง: ป้องกัน theme flash ด้วย initialization ก่อน hydration, รองรับค่า `theme` เดิม, เพิ่ม `ithub_palette_v1`, reset และ fallback เมื่อ storage ไม่ถูกต้อง
- เปลี่ยนแปลง: Theme Picker เป็น popover บน desktop และ bottom sheet บน mobile พร้อม radio semantics, arrow/Home/End, Escape, outside click, focus trap และ focus restoration
- เปลี่ยนแปลง: ลด decorative ripple, คง animation วนซ้ำเฉพาะสถานะ loading/progress และรักษา Loading Shell/Spotlight Tour geometry กับ mobile safe area
- การตัดสินใจ/เหตุผล: สี accent ของแต่ละ palette ใช้กับ interaction; โลโก้ยังแดง; success/warning/danger/information ไม่เปลี่ยนความหมายตาม palette; สีคงที่ที่เหลือจำกัดไว้กับ brand, status และพื้น hero ที่ต้องรักษา contrast
- ค้างอยู่: Personalized Discovery ย้ายไป Phase 2 ตามขอบเขตเดิม

### 2026-09-03 — Milestone 6 QA — Codex

- Viewport/theme ที่ตรวจ: 390×844, 768×900, 1024×900 และ 1440×1000; 5 palettes × Light/Dark; Chromium, Firefox และ WebKit; รวม reduced motion และ live system theme
- Visual evidence: เก็บ Home และ Topic after-state ที่ 390px/1440px ครบทุก palette และ Light/Dark ผ่าน Playwright attachments บน Chromium; browser อื่นยังรัน geometry/contrast assertions ครบ
- Contrast/geometry: body text ≥ 4.5:1, control boundary ≥ 3:1, primary/contrast ≥ 4.5:1, canvas ต่างจาก surface, ไม่มี horizontal overflow, sidebar ไม่ทับ main, first topic อยู่ใน viewport ที่ 390×844 และ topic reading width ≤ 860px
- Tests: `npm.cmd run lint` ผ่าน; `npm.cmd run build` ผ่าน 21 routes; `npm.cmd run test:unit` ผ่าน 8/8 (รวมใน E2E pre-check); `npm.cmd run test:e2e` ผ่าน 138/138 ใน 14.2 นาที
- Regression hardening: locator ของ Like ยึด visible stable instance ระหว่าง route transition; login helpers รอ theme hydration/navigation; onboarding test รองรับเวลาครบหกขั้น; delete-feedback budget รองรับ WebKit runner โดยยังต่ำกว่า 250ms
- Preview: `https://it-9weiuuifc-thiraphat-s-projects.vercel.app` (`READY`, force build ไม่ใช้ stale cache)
- Preview smoke: App Shell, Ocean Light canvas `#eff6ff`, Theme Picker mode/palette/Escape/focus restoration และหน้า Help ผ่าน
- Preview environment issue: Home/Topic พบ `ER_BAD_FIELD_ERROR: Unknown column topics.is_pinned`; deployment production เดิมยังโหลดหน้าได้ แต่ artifact ใหม่ยืนยันว่า schema ปัจจุบันยังไม่ครบ migration 003 จึงไม่แก้ database ตามขอบเขต Phase 1
- Implementation commit: `501835a` (`feat: add multi-palette theme system`)
- Production attempt: deployment `dpl_1CiC7foZLz3fYcjiAqD24kB5Zz6P` build ผ่านและ READY แต่ Home smoke test ไม่ผ่านด้วย `ER_BAD_FIELD_ERROR: Unknown column topics.is_pinned`
- Recovery: rollback alias `https://ithub-puce.vercel.app` ไป `dpl_424HhbXWgdknsSAbmVAXes8im8hi`; ตรวจแล้ว Home/community feed กลับมาใช้งานได้
- การตัดสินใจ/เหตุผล: ไม่ promote Preview artifact เพราะใช้ Preview DB เก่า และไม่แก้ production schema โดยไม่มีอำนาจขยายขอบเขต; migration ที่ต้องประเมินคือ `database/migrations/003_security_moderation_and_media.sql`
- ค้างอยู่: อนุมัติและทำ production migration 003 ด้วย workflow สำรองข้อมูล/ตรวจ preflight แล้วจึง deploy commit `501835a` ใหม่และทำ production smoke test
