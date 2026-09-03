import Link from 'next/link';
import OnboardingLauncher from '../../components/OnboardingLauncher';
import { Bell, Check, MessageCircle, PenLine, Search, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'คู่มือและศูนย์ช่วยเหลือ | ITHub',
  description: 'คู่มือเริ่มต้นใช้งาน คำถามที่พบบ่อย และช่องทางติดต่อทีมงาน ITHub',
};

const guideSections = [
  {
    id: 'discover',
    step: '01',
    Icon: Search,
    title: 'ค้นหาและสำรวจกระทู้',
    description: 'ใช้ช่องค้นหาด้านบนเพื่อค้นจากหัวข้อหรือเนื้อหา เลือกเมนูมาแรงเพื่อดูเรื่องที่ชุมชนสนใจ หรือกรองตามหมวดหมู่จาก Sidebar',
    items: [
      'หน้าแรกเรียงกระทู้ล่าสุดให้โดยอัตโนมัติ และเปลี่ยนเป็นยอดนิยมหรือมาแรงได้',
      'หมวดหมู่หลักประกอบด้วย Hardware, Software, Network, AI & Data และ General',
      'กดการ์ดผลการค้นหาเพื่อเปิดรายละเอียดกระทู้โดยตรง',
    ],
    tip: 'หากยังไม่แน่ใจว่าควรค้นคำใด ลองเริ่มจากชื่ออุปกรณ์ โปรแกรม หรือข้อความผิดพลาดที่พบ',
    action: { href: '/', label: 'สำรวจกระทู้' },
  },
  {
    id: 'create',
    step: '02',
    Icon: PenLine,
    title: 'สมัครสมาชิกและสร้างกระทู้',
    description: 'สมัครสมาชิกหรือเข้าสู่ระบบ จากนั้นเลือก “สร้างกระทู้” ระบุหัวข้อ หมวดหมู่ และรายละเอียดที่ช่วยให้ผู้อื่นเข้าใจปัญหาได้ครบถ้วน',
    items: [
      'ตั้งหัวข้อให้กระชับ เช่น ระบุอุปกรณ์ โปรแกรม หรืออาการที่พบ',
      'ใช้ตัวแก้ไขข้อความสำหรับรายการ ลิงก์ รูปภาพ และตัวอย่างโค้ด',
      'สร้างโพลได้เมื่อต้องการรวบรวมความคิดเห็นจากสมาชิก',
    ],
    tip: 'ลบรหัสผ่าน เลขประจำตัว ที่อยู่ และข้อมูลลับออกจากภาพหน้าจอหรือข้อความก่อนเผยแพร่เสมอ',
    action: { href: '/create', label: 'สร้างกระทู้ใหม่' },
  },
  {
    id: 'engage',
    step: '03',
    Icon: MessageCircle,
    title: 'ตอบกลับ ถูกใจ และบันทึก',
    description: 'เมื่อเข้าสู่ระบบแล้ว คุณสามารถร่วมตอบคำถาม กดถูกใจ บันทึกกระทู้ไว้อ่านภายหลัง และติดตามกิจกรรมจากศูนย์แจ้งเตือน',
    items: [
      'ตอบด้วยขั้นตอนที่ทดลองจริง พร้อมอธิบายผลลัพธ์และข้อควรระวัง',
      'เจ้าของกระทู้สามารถเลือกความคิดเห็นที่ช่วยแก้ปัญหาเป็นคำตอบที่ยอมรับ',
      'เปิดกระทู้ที่บันทึกไว้ได้จากเมนู “บันทึกไว้” ในพื้นที่ส่วนตัว',
    ],
    tip: 'สื่อสารอย่างสุภาพและอธิบายเหตุผลเมื่อเสนอแนวทางที่ต่างจากสมาชิกคนอื่น',
    action: { href: '/notifications', label: 'ดูการแจ้งเตือน' },
  },
  {
    id: 'account-safety',
    step: '04',
    Icon: ShieldCheck,
    title: 'โปรไฟล์ ความปลอดภัย และ AI',
    description: 'ปรับข้อมูลโปรไฟล์ ดูอันดับสมาชิก และช่วยดูแลชุมชนด้วยการรายงานเนื้อหาที่ไม่เหมาะสม ส่วน ITHub Bot ใช้เพื่อช่วยตั้งต้นการค้นคว้าได้',
    items: [
      'ใช้รหัสผ่านที่ไม่ซ้ำกับบริการอื่น และออกจากระบบเมื่อใช้อุปกรณ์สาธารณะ',
      'รายงานเนื้อหาพร้อมเหตุผลที่กระชับ เพื่อให้ผู้ดูแลตรวจสอบได้รวดเร็ว',
      'ตรวจสอบคำตอบจาก AI กับเอกสารทางการ โดยเฉพาะคำแนะนำที่มีความเสี่ยง',
    ],
    tip: 'อย่าส่งรหัสผ่าน คีย์ API หรือข้อมูลส่วนบุคคลให้ ITHub Bot หรือโพสต์ลงในชุมชน',
    action: { href: '/profile', label: 'ไปยังโปรไฟล์' },
  },
];

const faqs = [
  ['เริ่มสร้างกระทู้อย่างไร?', 'เข้าสู่ระบบแล้วเลือก “สร้างกระทู้” ระบุหัวข้อ หมวดหมู่ และรายละเอียดให้ชัดเจน ก่อนเผยแพร่ควรตรวจข้อมูลส่วนตัวและแหล่งอ้างอิง'],
  ['ทำไมกดถูกใจหรือบันทึกไม่ได้?', 'ฟังก์ชันดังกล่าวต้องเข้าสู่ระบบก่อน หากเข้าสู่ระบบแล้วแต่ยังใช้งานไม่ได้ ให้รีเฟรชหน้าและตรวจสอบการเชื่อมต่อ'],
  ['รายงานเนื้อหาที่ไม่เหมาะสมอย่างไร?', 'กดปุ่ม “รายงาน” ที่กระทู้หรือความคิดเห็น ระบุเหตุผลให้กระชับ ทีมผู้ดูแลจะตรวจสอบตามลำดับ'],
  ['แก้ไขข้อมูลโปรไฟล์ได้ที่ไหน?', 'ไปที่หน้าโปรไฟล์แล้วเลือก “แก้ไขโปรไฟล์” คุณสามารถเปลี่ยนชื่อ ประวัติย่อ รูปภาพ และรหัสผ่านได้'],
  ['การแจ้งเตือนไม่เปิดกระทู้เดิมทำอย่างไร?', 'หากกระทู้ถูกลบ การแจ้งเตือนอาจไม่มีปลายทาง โปรดกลับไปหน้าการแจ้งเตือนหรือหน้าแรก'],
  ['คำตอบจาก AI ใช้แทนผู้เชี่ยวชาญได้หรือไม่?', 'ไม่ได้ คำตอบ AI ใช้เป็นจุดเริ่มต้นในการค้นคว้า ควรตรวจสอบเอกสารทางการและสำรองข้อมูลก่อนทำสิ่งที่มีความเสี่ยง'],
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 md:py-16">
      <header className="ithub-hero relative overflow-hidden rounded-3xl px-6 py-10 text-white shadow-xl sm:px-10 md:py-14">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-red-500/20 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-200">Guide & Support</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl md:text-5xl">ศูนย์ช่วยเหลือ</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-200 sm:text-lg">
            เรียนรู้การใช้งาน ITHub ตั้งแต่ค้นหาความรู้ สร้างกระทู้ ไปจนถึงดูแลบัญชีและใช้งานชุมชนอย่างปลอดภัย
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <OnboardingLauncher className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-[var(--app-primary-hover)] shadow-lg transition hover:bg-white/90" />
            <a href="#getting-started" className="inline-flex items-center justify-center rounded-xl border border-white/40 px-5 py-3 font-bold transition hover:bg-white/10">
              อ่านคู่มือทั้งหมด
            </a>
          </div>
        </div>
      </header>

      <nav aria-label="สารบัญคู่มือ" className="mt-8 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
        <p className="text-sm font-bold text-[var(--app-text-muted)]">ไปยังหัวข้อ</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {guideSections.map((section) => {
            const Icon = section.Icon;
            return <li key={section.id}>
              <a href={`#${section.id}`} className="flex h-full items-center gap-3 rounded-xl px-3 py-3 font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-accent-text)]">
                <Icon aria-hidden="true" size={18} />
                <span>{section.title}</span>
              </a>
            </li>;
          })}
        </ul>
      </nav>

      <section id="getting-started" aria-labelledby="guide-title" className="scroll-mt-24 pt-14">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--app-accent-text)]">เริ่มต้นใช้งาน</p>
          <h2 id="guide-title" className="mt-2 text-3xl font-black text-[var(--app-text)]">คู่มือ ITHub ใน 4 ขั้นตอน</h2>
          <p className="mt-3 leading-7 text-[var(--app-text-muted)]">อ่านตามลำดับสำหรับการใช้งานครั้งแรก หรือเลือกเฉพาะหัวข้อที่ต้องการจากสารบัญด้านบน</p>
        </div>

        <div className="mt-8 space-y-6">
          {guideSections.map((section) => {
            const Icon = section.Icon;
            return <article id={section.id} key={section.id} className="scroll-mt-24 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
              <div className="grid md:grid-cols-[11rem_1fr]">
                <div className="ithub-hero flex items-center justify-between p-6 text-white md:flex-col md:items-start md:justify-start md:p-8">
                  <Icon aria-hidden="true" size={34} />
                  <div className="text-right md:mt-auto md:text-left">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-300">ขั้นตอน</p>
                    <p className="text-4xl font-black text-white">{section.step}</p>
                  </div>
                </div>
                <div className="p-6 sm:p-8">
                  <h3 className="text-2xl font-black text-[var(--app-text)]">{section.title}</h3>
                  <p className="mt-3 leading-7 text-[var(--app-text-muted)]">{section.description}</p>
                  <ul className="mt-5 space-y-3">
                    {section.items.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-6 text-[var(--app-text)]">
                        <Check className="mt-1 shrink-0 text-[var(--app-accent-text)]" aria-hidden="true" size={15} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 rounded-xl border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950 dark:bg-amber-950/25 dark:text-amber-100">
                    <strong>เคล็ดลับ:</strong> {section.tip}
                  </div>
                  <Link href={section.action.href} className="mt-6 inline-flex rounded-xl bg-[var(--app-primary)] px-5 py-3 font-bold text-[var(--app-primary-contrast)] transition hover:bg-[var(--app-primary-hover)]">
                    {section.action.label}
                  </Link>
                </div>
              </div>
            </article>;
          })}
        </div>
      </section>

      <section aria-labelledby="quick-links-title" className="pt-14">
        <h2 id="quick-links-title" className="text-2xl font-black">ทางลัดที่ใช้บ่อย</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Link href="/create" className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 transition hover:-translate-y-0.5 hover:border-[var(--app-primary)] hover:shadow-md"><PenLine className="text-[var(--app-accent-text)]" aria-hidden="true" size={22} /><h3 className="mt-3 font-bold">สร้างกระทู้</h3><p className="mt-1 text-sm text-[var(--app-text-muted)]">ถามและแบ่งปันความรู้กับชุมชน</p></Link>
          <Link href="/notifications" className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 transition hover:-translate-y-0.5 hover:border-[var(--app-primary)] hover:shadow-md"><Bell className="text-[var(--app-accent-text)]" aria-hidden="true" size={22} /><h3 className="mt-3 font-bold">การแจ้งเตือน</h3><p className="mt-1 text-sm text-[var(--app-text-muted)]">ดูการตอบกลับและกิจกรรมล่าสุด</p></Link>
          <Link href="/privacy" className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 transition hover:-translate-y-0.5 hover:border-[var(--app-primary)] hover:shadow-md"><ShieldCheck className="text-[var(--app-accent-text)]" aria-hidden="true" size={22} /><h3 className="mt-3 font-bold">ความเป็นส่วนตัว</h3><p className="mt-1 text-sm text-[var(--app-text-muted)]">ดูวิธีที่เราดูแลข้อมูลของคุณ</p></Link>
        </div>
      </section>

      <section aria-labelledby="faq-title" className="pt-14">
        <h2 id="faq-title" className="text-2xl font-black">คำถามที่พบบ่อย</h2>
        <div className="mt-5 space-y-3">
          {faqs.map(([question, answer]) => (
            <details key={question} className="group rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5">
              <summary className="flex cursor-pointer list-none justify-between gap-4 font-bold">{question}<span aria-hidden="true" className="text-[var(--app-accent-text)] transition-transform group-open:rotate-45 motion-reduce:transition-none">＋</span></summary>
              <p className="pt-4 leading-7 text-[var(--app-text-muted)]">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="ithub-hero mt-14 rounded-3xl p-7 text-white md:p-9">
        <h2 className="text-2xl font-black">ยังต้องการความช่วยเหลือ?</h2>
        <p className="mt-2 text-red-100">ส่งรายละเอียดปัญหา URL ของหน้า และขั้นตอนที่ทำก่อนพบปัญหา โดยหลีกเลี่ยงการส่งรหัสผ่านหรือข้อมูลลับ</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href="mailto:contact@cmtc.ac.th?subject=ITHub%20Support" className="rounded-lg bg-white px-5 py-3 font-bold text-red-700 transition hover:bg-red-50">ส่งอีเมล</a>
          <a href="tel:+6653217708" className="rounded-lg border border-white/40 px-5 py-3 font-bold transition hover:bg-white/10">โทร 053-217-708</a>
        </div>
      </section>
    </div>
  );
}
