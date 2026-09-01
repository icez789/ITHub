# ITHub — รายงานความคืบหน้า 88%

> วันที่: 2 กันยายน 2026 (Asia/Bangkok)
> สาขา: `codex/teacher-role-delete-ux`
> Production: ยังไม่ deploy ตามขอบเขตของ milestone

## สรุป

Milestone นี้เพิ่ม Teacher ในฐานะผู้ดูแลเนื้อหาและแก้ประสบการณ์ลบรายการทั้งระบบ พร้อมลดการลบกระทู้จากรูปแบบที่จำนวน query เพิ่มตามผู้ร่วมกระทู้เป็น transaction ที่มีจำนวน query คงที่และใช้ FK cascade ที่ผ่าน preflight แล้ว

คะแนนขยับจาก 85% เป็น 88% เพราะปิดช่องว่าง RBAC สำหรับอาจารย์, destructive-action UX, deletion performance และ authenticated E2E ระดับฐานข้อมูลครบ แต่ยังไม่รวม session revocation, rate-limit แบบหลายกุญแจ, CI เต็มรูปแบบ, security headers ขั้นถัดไป และ Production rollout ของ milestone นี้

## สิ่งที่ทำแล้ว

### Delete UX

- ไม่มี native `confirm()` เหลือใน repository
- ใช้ reusable native dialog ใน topic detail, comments, Admin topics/comments/reports และ ITHub Bot
- pending แสดงทันที ป้องกันกดซ้ำ ปิด Escape/backdrop ระหว่าง mutation และแสดง error ใน modal
- focus restoration, body scroll lock, Screen Reader semantics, Dark Mode และ Reduced Motion
- Server Actions การลบคืน `{ success, message }` เพื่อแยก success/error ชัดเจน

### Deletion performance

- transaction ยัง lock topic ด้วย `FOR UPDATE`
- ตรวจ `@@foreign_key_checks = 1` ก่อนลบทุกครั้ง
- aggregate XP/post deduction ของเจ้าของกระทู้ ผู้ตอบ accepted solution และผู้โหวตใน set-based update เดียว
- ลบ parent `topics` หนึ่งครั้งและใช้ migration 002 FK cascade ลบ dependent rows
- app-issued queries คงที่ 4 ครั้งภายใน transaction ไม่เพิ่มตามจำนวนผู้ร่วมกระทู้
- revalidate หน้า home, Admin, topics/comments, leaderboard, profile และ saved topics ที่เกี่ยวข้อง

### Teacher RBAC

- role allowlist: `user | teacher | admin | super_admin`
- helper กลางแยก Admin, Content Moderator และ Super Admin
- Teacher เข้า `/admin`, `/admin/topics`, `/admin/comments`, ปิดรายงานและลบเนื้อหาได้
- Teacher รับ notification เมื่อมีรายงานใหม่ แต่เข้า `/admin/users`, แบน, เปลี่ยน role หรือแก้กระทู้ผู้อื่นไม่ได้
- Dashboard Teacher ไม่ query รายชื่อ/จำนวนสมาชิกและไม่ render member-management panel
- Super Admin เท่านั้นที่ตั้ง `user`, `teacher`, `admin`; ห้ามตนเอง, `super_admin` และ role ปลอม
- `db:check` ตรวจ role นอก allowlist แบบอ่านอย่างเดียว

## หลักฐานทดสอบ

| การตรวจ | ผล |
|---|---|
| `npm run lint` | PASS |
| `npm run build` | PASS — Next.js 16.3.0, 20 routes |
| `db:preflight:e2e` | PASS — migration 002 complete, duplicate/invalid role/orphan = 0 |
| `db:migrate:e2e` | PASS — 001/002 up to date |
| `db:seed:e2e` | PASS — deterministic seed |
| `db:check:e2e` | PASS — 11/11 tables, integrity checks ผ่าน |
| `db:reconcile:e2e` | PASS — counter drift 0, dry run |
| Teacher route/action guards | PASS บน Chromium, Firefox, WebKit |
| Super Admin role transitions | PASS บน Chromium, Firefox, WebKit |
| Cascade fixture cleanup | PASS — dependent rows 0, XP/post count ถูกต้อง |
| Playwright production-mode serial | PASS — full suite 111/111 และ modal error-recovery เพิ่มเติม 3/3, Chromium/Firefox/WebKit, 0 skip, 0 failure |
| Feedback latency | 5ms / 10ms / 41ms; median 10ms |
| Deletion latency | 572ms / 597ms / 536ms; median 572ms |

Playwright acceptance รอบสุดท้ายผ่าน 111/111 แบบ serial หลังเพิ่ม post-login readiness gate สำหรับ WebKit และ error-recovery เพิ่มเติมผ่าน 3/3; ไม่มี temporary topic, like, bookmark หรือ role fixture ค้าง และ post-run database integrity ยังคงตรวจซ้ำก่อนสร้าง Preview

## Preview rollout

- Git branch: `codex/teacher-role-delete-ux`
- GitHub remote: push สำเร็จถึง `origin/codex/teacher-role-delete-ux`
- Vercel target: Preview เท่านั้น; Production ไม่ถูก deploy หรือ promote
- Preview alias: <https://ithub-git-codex-teacher-role-delete-ux-thiraphat-s-projects.vercel.app>
- Environment safety: เพิ่ม branch-specific overrides 10 รายการ โดย DB/session/Pusher server values เป็น Secret และ `NEXT_PUBLIC_PUSHER_*` เป็น Config ตามข้อกำหนดของ Vercel
- Database guard: อ่านค่า local ผ่าน `.env.e2e.local` โดยไม่พิมพ์ secret และหยุดทันทีหาก `DB_NAME` ไม่ลงท้าย `_e2e`
- Build evidence: Vercel clone สาขาถูกต้องและ build Next.js 16.3.0 ครบ 20 routes
- Read-only smoke: `/`, `/help`, `/login`, `/register`, `/privacy`, `/terms` ตอบ HTTP 200 ทุกหน้า; ไม่พบ runtime error log หลังตรวจ
- Authenticated/destructive smoke บน Preview จะทำหลัง deployment ใหม่จาก commit รายงานนี้ เพื่อยืนยันว่าการเขียนทั้งหมดอยู่บนฐาน `_e2e`

## งานค้างหลัง 88%

- session-version revocation หลังเปลี่ยนรหัสผ่าน
- login rate limit แบบ IP + account และ audit log สำหรับ role/moderation
- GitHub Actions พร้อม test pyramid/unit tests
- CSP/HSTS และ dependency warning cleanup
- admin/report E2E เพิ่มเติมสำหรับ error injection และ transaction rollback
- Production rollout ต้องได้รับคำสั่งเผยแพร่โดยตรงก่อนเสมอ
