# ITHub — รายงานความคืบหน้า 75%

> วันที่ตรวจ: 31 สิงหาคม 2026 (Asia/Bangkok)  
> สาขา: `main`  
> Commit ที่ตรวจ: `7d050042179049f92b31841c14b1bbc6b67c9142` (`feat: redesign ITHub interface`)  
> สถานะ Git ก่อนจัดทำเอกสาร: `main` ตรงกับ `origin/main`; พบ `output/` และ `tmp/` เป็นไฟล์ untracked เดิมและไม่ได้แก้ไข

## สรุปสำหรับตัดสินใจ

ITHub มีแกนผลิตภัณฑ์เว็บบอร์ดใช้งานได้ค่อนข้างครบแล้ว ทั้งสมาชิก กระทู้ คอมเมนต์ โพล การถูกใจ บุ๊กมาร์ก การแจ้งเตือน ผู้ดูแล AI และ responsive UI โครงสร้างสำคัญใช้ Server Components/Server Actions ของ Next.js 16 และมีการตรวจสิทธิ์ฝั่ง server, sanitize rich text, transaction สำหรับ mutation สำคัญ และ private Pusher channel

สถานะรวมประเมินที่ **75%** โดยเป็นคะแนนความพร้อมส่งมอบ ไม่ใช่ code coverage จุดที่หักคะแนนมากที่สุดคือฐานข้อมูลของ environment ปัจจุบันยัง migrate ไม่ครบ, authenticated E2E ยังถูกข้ามเพราะไม่มีบัญชีทดสอบ, spotlight onboarding รุ่นใหม่ยังไม่อยู่บน `main`, และยังไม่มี CI/test database ที่แยกจากข้อมูลใช้งานจริง

## เกณฑ์คะแนน

| ด้าน | น้ำหนัก | ได้ | เหตุผลย่อ |
|---|---:|---:|---|
| ฟังก์ชันเว็บบอร์ดหลัก | 20 | 18 | flow หลักครบ; การค้นหาจริงยังค้นเฉพาะชื่อหัวข้อ |
| บัญชีและความปลอดภัย | 15 | 12 | session, role, ban, rate limit และ validation มีแล้ว; migration และ session revocation ยังไม่สมบูรณ์ |
| การมีส่วนร่วมและผู้ดูแล | 15 | 13 | like, bookmark, poll, report, notification และ admin ครบ; flow ที่ต้องล็อกอินยังไม่มีผลทดสอบรอบนี้ |
| UX, responsive และ accessibility | 15 | 12 | redesign และ layout regression ผ่าน; onboarding บน main ยังเป็น modal v1 และ baseline archive ยังไม่ครบ |
| ฐานข้อมูลและการปฏิบัติการ | 15 | 8 | มี migration/check/reconcile แต่ฐานข้อมูลที่ตรวจขาด 2 ตารางและ build ยังพึ่ง Google Fonts ภายนอก |
| คุณภาพโค้ด การทดสอบ และเอกสาร | 20 | 12 | lint/build และ public E2E ผ่าน; 15 tests ถูกข้าม ไม่มี CI workflow และไม่มี unit/integration suite |
| **รวม** | **100** | **75** | **พร้อมใช้งานระดับ beta แต่ยังไม่ควรถือว่า production-complete** |

## ฟีเจอร์ที่มีอยู่จริงบน `main`

### 1. หน้าแรกและการค้นหา

- feed กระทู้พร้อม pagination หน้าละ 9 รายการ
- กรองหมวด Hardware, Software, Network, AI & Data และ General
- เรียงตามล่าสุด ยอดดู และจำนวนถูกใจ
- แสดงจำนวนกระทู้ สมาชิก สมาชิกใหม่ 7 วัน และหมวดหมู่ยอดนิยม
- ช่องค้นหาแบบ debounce และแก้ปัญหากดผลค้นหาแล้วถูกพากลับหน้าค้นหา
- responsive topic card, desktop right rail และ empty state

ข้อจำกัดปัจจุบัน: placeholder และหน้าคู่มือระบุว่าค้นหา “หัวข้อหรือเนื้อหา” แต่ SQL ใน `app/page.js` ค้นเฉพาะ `topics.title`

### 2. บัญชีและโปรไฟล์

- สมัครสมาชิก เข้าสู่ระบบ ออกจากระบบ และ redirect กลับหน้าที่ตั้งใจเข้าหลังล็อกอิน
- รหัสผ่าน hash ด้วย bcrypt และ session cookie แบบ HttpOnly/SameSite/Secure ใน production
- ตรวจบัญชีถูกแบนและ role `user`, `admin`, `super_admin`
- หน้าโปรไฟล์ แก้ username/bio เปลี่ยนรหัสผ่าน และอัปโหลด avatar
- การเปลี่ยนโปรไฟล์/รหัสผ่านทำใน transaction เพื่อป้องกัน partial update
- หน้ากระทู้ที่ผู้ใช้สร้างและหน้ากระทู้ที่บันทึกไว้
- XP, badge, จำนวนโพสต์ คำตอบที่ยอมรับ และ leaderboard

### 3. กระทู้และเนื้อหา

- สร้าง แก้ไข และลบกระทู้ พร้อมตรวจเจ้าของหรือผู้ดูแลฝั่ง server
- rich-text editor, heading, list, link, image และ code block 14 ภาษา
- sanitize HTML ก่อนบันทึกและ sanitize ข้อมูลเก่าอีกครั้งก่อน render
- แนบรูปผ่าน Cloudinary โดยจำกัดชนิดและขนาด 5 MB
- metadata รายกระทู้, view counter แบบ cookie และตัด bot/prefetch ออกจากยอดดู
- หน้า error, global error, loading และ not-found

### 4. การมีส่วนร่วมในชุมชน

- คอมเมนต์และตอบกลับเป็นลำดับชั้น
- เจ้าของกระทู้เลือก accepted solution และระบบปรับ XP ใน transaction
- ถูกใจและยกเลิกถูกใจ พร้อมยอดรวมและ notification
- บันทึก/ยกเลิกบันทึกโดยไม่ออกจากหน้ากระทู้
- โพล สร้างตัวเลือก เปลี่ยนคำตอบ และอัปเดตผลแบบ real-time
- รายงานกระทู้หรือคอมเมนต์พร้อมเหตุผล
- notification center และ notification dropdown

### 5. เครื่องมือผู้ดูแล

- dashboard สรุปผู้ใช้ กระทู้ คอมเมนต์ รายงาน และกระทู้ล่าสุด
- ค้นหาและแบ่งหน้ารายการผู้ใช้ กระทู้ และคอมเมนต์
- แบน/ปลดแบนสมาชิก
- ให้/ถอนสิทธิ์ admin โดยจำกัดเฉพาะ super admin
- ป้องกันการแก้ super admin และป้องกันผู้ดูแลแก้สิทธิ์ตัวเอง
- ปิดรายงาน ลบกระทู้ และลบคอมเมนต์แบบ cascade พร้อมปรับ XP/counter

### 6. Real-time, AI และบริการภายนอก

- Pusher private notification channel พร้อม endpoint ตรวจ session และเจ้าของ channel
- Pusher poll channel สำหรับผลโหวตแบบ real-time
- ITHub Bot แบบ floating chat เก็บประวัติใน `localStorage`
- Gemini fallback ระหว่างโมเดลและ retry เมื่อ overload
- สร้างคำตอบ AI หลังสร้างกระทู้เมื่อมีบัญชี `ITHub Bot 🤖`
- Vercel Analytics และ Cloudinary image hosting

### 7. UX, accessibility และเอกสารผู้ใช้

- light/dark mode, responsive navbar/sidebar/bottom navigation และ safe-area บนมือถือ
- sidebar toggle ด้วยคีย์บอร์ด, focus style, skip link และ reduced-motion rules
- footer เชื่อมหน้าแรก หมวดหมู่ leaderboard สร้างกระทู้ แจ้งเตือน ติดต่อ ช่วยเหลือ และหน้ากฎหมาย
- หน้า `/help`, `/privacy`, `/terms`
- first-visit welcome และ modal onboarding 4 ขั้น ใช้ `ithub_onboarding_v1`, native `<dialog>`, focus trap, Escape และการจำสถานะใน browser

## ภาพรวมสถาปัตยกรรม

- **Frontend/SSR:** Next.js 16 App Router + React 19; pages เป็น Server Components โดย default และแยก Client Components สำหรับ editor, navigation state, theme, notification, engagement, poll, chat และ onboarding
- **Mutation:** Server Actions ภายใน route/component และ action รวมใน `lib/actions.js`
- **API route:** `/api/pusher/auth` สำหรับ authorize private channel
- **Data:** MySQL/TiDB ผ่าน connection pool ของ `mysql2`
- **Auth:** signed stateless cookie อายุ 24 ชั่วโมง และโหลด user ล่าสุดจากฐานข้อมูลทุก request
- **Storage/integration:** Cloudinary, Pusher, Gemini, Vercel Analytics
- **Quality:** ESLint, Next production build, Playwright ครบ Chromium/Firefox/WebKit แบบ worker เดียว

## จุดแข็งของโค้ด

1. ตรวจสิทธิ์ซ้ำใน Server Actions ไม่พึ่งเพียงการซ่อนปุ่มฝั่ง client
2. SQL ส่วนใหญ่ใช้ parameter binding และค่าที่นำไปประกอบ query เช่น category/sort ใช้ allowlist
3. rich text มี defense in depth ทั้งก่อน write และก่อน render
4. flow เสี่ยงต่อข้อมูลคลาด เช่น solution, like, bookmark, poll, create/delete และ profile ใช้ transaction หรือ helper ที่จัดการ cascade
5. Pusher notification แยก private channel และตรวจ channel name ตรงกับ user ใน session
6. หน้าแรกเริ่ม query ที่ไม่ขึ้นต่อกันพร้อมกันด้วย `Promise.all`
7. มี migration, seed, integrity check และ reconciliation tool อยู่ใน repository
8. error/loading/not-found states และ responsive regression tests มีหลักฐานอัตโนมัติ

## ช่องว่างและความเสี่ยงที่พบ

### P1 — ควรแก้ก่อนถือว่า production-complete

1. **ฐานข้อมูลที่ environment ปัจจุบันชี้ไป migrate ไม่ครบ**  
   `npm run db:check` ล้มเหลวเพราะไม่มี `rate_limits` และ `schema_migrations` ทำให้ shared rate limiting ถอยไปใช้ in-memory fallback ต่อ instance และไม่สามารถยืนยันประวัติ migration ได้ ต้องสำรองข้อมูล ตรวจปลายทาง แล้วรัน migration/check/reconcile ตามลำดับก่อน release ถัดไป

2. **authenticated regression tests ยังไม่มีหลักฐานรอบปัจจุบัน**  
   Playwright ข้าม 15 tests (5 flow × 3 engines): login, create/delete topic, private Pusher owner authorization, profile atomic update และ like/bookmark จึงยังยืนยันบัคที่ผู้ใช้เคยพบด้วยบัญชีจริงไม่ได้

3. **Animated Spotlight Tour ยังไม่อยู่บน `main`**  
   `main` มี modal onboarding v1 เท่านั้น ส่วน branch `origin/codex/animated-spotlight-tour` มี commit `b8e9e12` และ `e3c9ab7` แต่แยกจาก redesign ปัจจุบันแล้ว การ merge ตรง ๆ มี diff ย้อนทับงานดีไซน์จำนวนมาก จึงควร port/rebase เฉพาะ behavior และทดสอบกับ UI ปัจจุบัน

4. **ชุด E2E ไม่มี test database guard**  
   Playwright โหลดค่า DB ชุดเดียวกับแอป และ authenticated test มีการสร้าง/ลบกระทู้ เปลี่ยน like/bookmark และส่ง profile form ห้ามใส่บัญชี production จนกว่าจะชี้ environment ไปฐานข้อมูลทดสอบเฉพาะหรือเพิ่ม safety guard ที่หยุดทันทีเมื่อ DB เป็น production

### P2 — ควรจัดใน milestone 75% → 90%

5. **ขอบเขตการค้นหาไม่ตรงกับข้อความใน UI/คู่มือ**  
   `components/SearchInput.js` ระบุค้นหัวข้อหรือเนื้อหา แต่ `app/page.js` ใช้ `topics.title LIKE ?` เท่านั้น ควรเพิ่ม content search หรือแก้คำอธิบายให้ตรงกัน และพิจารณา FULLTEXT index เมื่อข้อมูลโต

6. **Leaderboard อ่านข้อมูลผู้ใช้เกินจำเป็น**  
   `app/leaderboard/page.js` ใช้ `SELECT * FROM users` ทำให้ password hash/email ถูกโหลดเข้า server memory แม้ไม่ส่งออก UI ควรเลือกเฉพาะ `id, username, avatar_url, role, xp, post_count`

7. **session ที่ถูกขโมยไม่ถูก revoke เมื่อเปลี่ยนรหัสผ่าน**  
   token มีเพียง userId/เวลาและยังใช้ได้สูงสุด 24 ชั่วโมง การเปลี่ยนรหัสผ่านไม่หมุน `session_version` ควรเพิ่ม version หรือ server-side session store และออก token ใหม่หลังเปลี่ยนรหัสผ่าน

8. **login rate limit ผูกกับ email อย่างเดียว**  
   ผู้โจมตีสามารถยิงอีเมลของเหยื่อให้ชน limit และรบกวนการล็อกอินได้ ควรแยก limit ต่อ IP และต่อคู่ IP+account พร้อมบันทึกเหตุการณ์ผิดปกติ

9. **ประวัติ AI chat พึ่ง `localStorage` โดยไม่ป้องกันทุกจุด**  
   การอ่านมี try/catch แต่การเขียนใน effect และ clear action ไม่มี fallback และไม่มีการจำกัดจำนวนข้อความ เมื่อ storage ถูกบล็อกหรือเต็ม component อาจผิดพลาด ควรครอบการเขียนและจำกัด history ฝั่ง UI

10. **build ยังพึ่งเครือข่าย Google Fonts**  
    build ใน environment ปิดเครือข่ายล้มเหลวที่ IBM Plex Sans Thai แต่ผ่านเมื่ออนุญาตอินเทอร์เน็ต ควร self-host font ด้วย `next/font/local` เพื่อให้ CI/rebuild ทำซ้ำได้แน่นอน

11. **ยังไม่มี CI workflow และ test pyramid**  
    ไม่พบ `.github/workflows`; tests ทั้งหมดอยู่ใน spec E2E เดียว ควรเพิ่ม CI lint/build/E2E, unit tests สำหรับ validation/auth/content และ integration tests สำหรับ transaction/database helpers

### P3 — งานเก็บรายละเอียดก่อน 100%

12. จัดการ error ของ mark-as-read แบบ optimistic ให้คืน unread count เมื่อ server action ล้มเหลว และเพิ่ม click-outside/Escape/focus behavior ให้ notification dropdown
13. ลด `SELECT *` ที่เหลือใน server queries และกำหนด data projection ต่อหน้าชัดเจน
14. เพิ่ม CSP/HSTS ตาม deployment policy และทดสอบ header บน production
15. เพิ่ม `robots`, `sitemap`, manifest และ social sharing image หากต้องการค้นพบจาก search/social
16. แก้ Node warning ของ scripts เรื่อง package module type โดยเลือกแนวทางที่ไม่กระทบ Next config
17. เก็บ baseline screenshot matrix ที่ design plan ระบุว่ายังค้าง โดยเฉพาะ Login, Leaderboard และ Help ทุก breakpoint/theme

## ผลการทดสอบรอบนี้

| การตรวจ | ผล | หลักฐาน |
|---|---|---|
| `npm run lint` | PASS | ESLint จบด้วย exit code 0 |
| `npm run build` | PASS เมื่อมี network | Next.js 16.3.0 compile, type check และ route generation สำเร็จ; รอบ sandbox แรกดาวน์โหลด Google Font ไม่ได้ |
| `npm run test:e2e` | PARTIAL PASS | 57 passed, 15 skipped, 0 failed, 2.6 นาที; Chromium/Firefox/WebKit แบบ serial |
| `npm run db:check` | FAIL | missing tables: `rate_limits`, `schema_migrations` |
| `npm ls quill --depth=2` | PASS | `quill@2.0.2 overridden` |
| Current npm vulnerability audit | NOT VERIFIED | ไม่ได้ส่ง dependency metadata ออกไปตรวจ registry ในรอบนี้; ห้ามอ้างผล 0 vulnerabilities จากรายงานเก่าเป็นผลปัจจุบัน |

หมายเหตุจาก E2E: dev server มี log `The destination stream closed early` และ `ECONNRESET` บางช่วง แม้ไม่มี test ล้มเหลว ควรเก็บ trace/log เพิ่มหากเกิดซ้ำใน CI หรือ production

## แผนจาก 75% ไป 100%

### 75% → 85%: ปิดช่องว่างที่ตรวจยืนยันไม่ได้

1. เตรียม test database และบัญชีสมาชิก E2E แยกจาก production
2. เพิ่ม environment guard แล้วรัน authenticated tests ครบ 72/72
3. สำรองฐานข้อมูลเป้าหมาย รัน migration และให้ `db:check` ผ่าน
4. แก้ search scope ให้ตรง UI และลด sensitive over-fetch

### 85% → 95%: ความเสถียรและความปลอดภัย

1. port spotlight onboarding เข้ากับ redesign ปัจจุบันและเพิ่ม v2 tests
2. เพิ่ม session revocation, dual-key rate limit และ safe localStorage handling
3. self-host font และเพิ่ม CI workflow
4. เพิ่ม unit/integration tests สำหรับ auth, validation, sanitizer, rate limit และ transaction invariants

### 95% → 100%: release evidence

1. ทำ visual baseline matrix และ accessibility audit
2. ทดสอบ admin/report/notification/AI failure paths ด้วยบัญชีและ environment เฉพาะ
3. รัน dependency/security scan ใน CI ที่ได้รับอนุญาต
4. deploy preview, ตรวจ console/runtime logs/header/database แล้วจึง promote production
5. อัปเดตรายงานนี้เป็น release report พร้อม commit, deployment URL และ rollback point

## ข้อสรุป

ระบบปัจจุบันเหมาะกับสถานะ **beta 75%**: ฟีเจอร์ผู้ใช้หลักและโครง UI พร้อมใช้งานและ public regression suite ผ่าน แต่เงื่อนไข “production-complete” ยังไม่ผ่านจนกว่าฐานข้อมูลจะ migrate ครบ, authenticated tests ใช้บัญชี/ฐานข้อมูลทดสอบแยกและผ่านทั้งหมด, spotlight onboarding ถูก port เข้าสู่ main และมี CI/release evidence ที่ทำซ้ำได้

