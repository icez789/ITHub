import Link from 'next/link';
import { CircleHelp, Mail, MapPin, Phone } from 'lucide-react';

const footerLinkClass = 'transition-colors hover:text-[var(--app-accent-text)]';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-[var(--app-border)] bg-[var(--app-surface)] pb-24 pt-12 transition-colors md:pb-8">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <section aria-labelledby="footer-brand" className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-2" aria-label="ไปหน้าแรก ITHub">
              <span className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg">IT</span>
              <span id="footer-brand" className="text-xl font-bold tracking-tight text-[var(--app-text)]">
                IT<span className="text-red-600">Hub</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-[var(--app-text-muted)]">
              พื้นที่แลกเปลี่ยนความรู้ด้านเทคโนโลยีสำหรับนักศึกษา ผู้เริ่มต้น และคนไอทีทุกระดับ
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-[var(--app-text-muted)]">
              <span className="rounded-full border border-[var(--app-border)] px-3 py-1">เรียนรู้</span>
              <span className="rounded-full border border-[var(--app-border)] px-3 py-1">แบ่งปัน</span>
              <span className="rounded-full border border-[var(--app-border)] px-3 py-1">ปลอดภัย</span>
            </div>
          </section>

          <nav aria-label="เมนูลัดท้ายเว็บไซต์">
            <h2 className="mb-4 font-bold text-[var(--app-text)]">เมนูลัด</h2>
            <ul className="space-y-3 text-sm text-[var(--app-text-muted)]">
              <li><Link href="/" className={footerLinkClass}>หน้าแรก</Link></li>
              <li><Link href={{ pathname: '/', query: { sort: 'popular' } }} className={footerLinkClass}>กระทู้ยอดนิยม</Link></li>
              <li><Link href="/leaderboard" className={footerLinkClass}>อันดับสมาชิก</Link></li>
              <li><Link href="/create" className={footerLinkClass}>สร้างกระทู้</Link></li>
              <li><Link href="/notifications" className={footerLinkClass}>การแจ้งเตือน</Link></li>
            </ul>
          </nav>

          <nav aria-label="หมวดหมู่ท้ายเว็บไซต์">
            <h2 className="mb-4 font-bold text-[var(--app-text)]">หมวดหมู่แนะนำ</h2>
            <ul className="space-y-3 text-sm text-[var(--app-text-muted)]">
              {['Hardware', 'Software', 'Network', 'AI & Data', 'General'].map((category) => (
                <li key={category}>
                  <Link href={{ pathname: '/', query: { category } }} className={footerLinkClass}>{category}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <section aria-labelledby="footer-contact">
            <h2 id="footer-contact" className="mb-4 font-bold text-[var(--app-text)]">ติดต่อและช่วยเหลือ</h2>
            <ul className="space-y-3 text-sm text-[var(--app-text-muted)]">
              <li className="flex items-start gap-3"><MapPin aria-hidden="true" className="mt-0.5 shrink-0" size={16} /><span>วิทยาลัยเทคนิคเชียงใหม่<br />ถนนเวียงแก้ว ต.ศรีภูมิ อ.เมือง จ.เชียงใหม่</span></li>
              <li><a href="mailto:contact@cmtc.ac.th" className={`inline-flex items-center gap-3 ${footerLinkClass}`}><Mail aria-hidden="true" size={16} />contact@cmtc.ac.th</a></li>
              <li><a href="tel:+6653217708" className={`inline-flex items-center gap-3 ${footerLinkClass}`}><Phone aria-hidden="true" size={16} />053-217-708</a></li>
              <li><Link href="/help" className={`inline-flex items-center gap-3 ${footerLinkClass}`}><CircleHelp aria-hidden="true" size={16} />ศูนย์ช่วยเหลือ</Link></li>
            </ul>
          </section>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-[var(--app-border)] pt-8 md:flex-row">
          <p className="text-center text-sm text-[var(--app-text-muted)] md:text-left">
            © {currentYear} <span className="font-bold text-red-600">ITHub</span>. สงวนสิทธิ์ตามกฎหมาย
          </p>
          <nav aria-label="นโยบายเว็บไซต์" className="flex flex-wrap justify-center gap-5 text-sm text-[var(--app-text-muted)]">
            <Link href="/privacy" className={footerLinkClass}>นโยบายความเป็นส่วนตัว</Link>
            <Link href="/terms" className={footerLinkClass}>ข้อกำหนดการใช้งาน</Link>
            <Link href="/help" className={footerLinkClass}>ช่วยเหลือ</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
