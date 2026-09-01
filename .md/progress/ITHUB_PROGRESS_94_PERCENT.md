# ITHub — รายงานความคืบหน้า 94%

> วันที่: 2 กันยายน 2026 (Asia/Bangkok)
> สาขา: `codex/ithub-94-milestone`
> สถานะเอกสาร: Release candidate; ช่อง rollout จะอัปเดตจาก SHA เดียวกับที่ผ่าน CI/Preview/Production

## สรุป

Milestone นี้ปิดช่องว่างระดับสูงด้าน dependency, session revocation, rate limit, nullable owner, moderation audit, notification lifecycle, Cloudinary asset lifecycle และ automated quality gate โดยใช้ migration แบบ additive `003_security_moderation_and_media.sql` และฐานทดสอบ `_e2e` ที่มี write guard

ระบบจะนับเป็น 94% เมื่อ GitHub Required Check, Vercel Preview, Production migration และ post-deploy smoke ผ่านครบจาก commit เดียวกัน รายงานนี้เก็บทั้งหลักฐานก่อน rollout และผลจริงหลังเผยแพร่

## สิ่งที่ส่งมอบ

### Security และ data integrity

- อัปเดต `mysql2` เป็น 3.24.2, Next.js/eslint-config-next 16.3.4, Cloudinary 2.11.0, Pusher/Pusher JS และ sanitize-html 2.17.7; `npm audit --omit=dev` ไม่พบ vulnerability
- session cookie มี `sessionVersion`, `issuedAt`, `expiresAt`; cookie รุ่นเก่าหรือ version ไม่ตรงฐานหมดผล
- เปลี่ยนรหัสผ่าน เปลี่ยน role แบน และปลดระงับจะเพิ่ม `session_version`
- Login rate limit แยก account 8/15 นาทีและ IP 40/15 นาที โดย hash key ก่อนบันทึก
- รวม trusted client IP สำหรับ Vercel และ AI/Login rate limit
- topic owner เป็น `NULL` แล้วยัง Like/Bookmark/Comment ได้ โดยไม่สร้าง notification ที่ไม่มีผู้รับ
- เพิ่ม CSP Report-Only นอก Production, enforced CSP และ HSTS บน Production
- ข้อผิดพลาดฐานข้อมูลที่ส่งถึง UI เป็นข้อความทั่วไป

### Moderation และชุมชน

- เพิ่ม `is_pinned`, `is_locked`, actor และ timestamp; Teacher/Admin/Super Admin จัดการได้
- กระทู้ล็อกดู Like และ Bookmark ได้ แต่ server/UI ปฏิเสธ Comment/Reply ใหม่
- feed ล่าสุดวาง pinned ก่อน; Search คง sort ที่เลือกและแสดง badge
- audit log ครอบคลุมลบเนื้อหา ปักหมุด ล็อก ปิดรายงาน แบน/ปลดแบน และเปลี่ยน role
- `/admin/audit` จำกัด Admin/Super Admin; Teacher ถูกปฏิเสธทั้ง route และ action ที่เกินสิทธิ์
- ปิดรายงานและเขียน audit ใน transaction เดียวกัน พร้อม pending/error state

### Notification, mutation และ media

- Notification หน้าละ 20 รายการ อ่าน/ลบรายชิ้นหรือทั้งหมด และ dedupe realtime
- mutation สำคัญมี pending, double-submit guard, structured result, success/error feedback
- ถอด SweetAlert2 และไม่มี native `window.confirm()` เหลือ
- เก็บ `avatar_public_id`/`image_public_id`; ลบ asset เก่าหลัง DB สำเร็จ
- Cloudinary failure เข้า `media_cleanup_queue`; `npm run media:cleanup` เป็น dry-run โดยปริยายและ retry แบบ idempotent
- asset legacy ที่ไม่มี public ID ไม่ถูกเดาหรือลบ

### CI และ test pyramid

- GitHub Actions รัน audit, lint, unit, E2E DB guard/migration/seed/check/reconcile, build และ Playwright serial สาม engine
- concurrency lock ป้องกัน PR หลายงานเขียนฐาน `_e2e` เดียวกัน
- unit tests ครอบคลุม session token, role boundary, rate-limit key/IP, media cleanup และ nullable owner
- E2E เพิ่ม session revocation, nullable owner, pin/lock, audit, report resolution, notification และ security headers

## Migration 003

- `users`: `session_version`, `avatar_public_id`
- `topics`: `image_public_id`, pin/lock state, actor IDs และ timestamps
- ตารางใหม่: `moderation_audit_logs`, `media_cleanup_queue`
- migration runner ตรวจ fingerprint, adopt เฉพาะ schema ที่ครบ และหยุดเมื่อ partial/mismatch

## หลักฐานก่อน rollout

| การตรวจ | ผล |
|---|---|
| `npm audit --omit=dev` | PASS — 0 vulnerability |
| `npm run lint` | PASS |
| `npm run test:unit` | PASS — 8/8 |
| `npm run build` | PASS — Next.js 16.3.4, 21 routes |
| E2E preflight → migrate → seed → check | PASS — migration 003 complete, invalid/orphan = 0 |
| `db:reconcile:e2e` | PASS — drift 0, dry-run |
| Playwright full serial | PASS — 129/129, Chromium/Firefox/WebKit, 0 skip/failure |
| Final report/notification regression | PASS — 6/6 ครบสาม engine |
| Delete feedback | 7ms / 13ms / 95ms; ทุก engine <100ms |
| Delete completion | 991ms / 854ms / 896ms; median 896ms |

## GitHub, Preview และ Production

- Commit SHA: รอสร้าง commit หลัง final diff review
- Pull Request: รอ push
- Required Check: รอ workflow run แรก
- Preview URL: รอ Vercel Git deployment และ smoke บนฐาน `_e2e`
- Production migration: รอ preflight และยืนยัน restore point
- Production deployment: รอ SHA เดียวกับ Preview/CI
- Rollback point: รอบันทึก deployment ก่อน rollout

## งานหลัง 94%

- Email verification และ password reset
- Public profile และ privacy controls
- Tags/full-text search
- XP ledger ที่ตรวจสอบย้อนหลังได้
- SEO metadata/OG/sitemap ขั้นสูง
- External monitoring, alerting และ log drain
- welcome/rules/FAQ topics จริงโดยผู้ดูแลหลัง rollout; ไม่ seed ลง Production อัตโนมัติ
