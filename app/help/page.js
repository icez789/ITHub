import Link from 'next/link';

export const metadata = {
  title: 'ศูนย์ช่วยเหลือ | ITHub',
  description: 'คำถามที่พบบ่อยและช่องทางติดต่อทีมงาน ITHub',
};

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
    <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
      <header className="text-center max-w-3xl mx-auto mb-12">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-600 mb-3">Support</p>
        <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">ศูนย์ช่วยเหลือ</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">ค้นหาคำตอบสำหรับการใช้งานทั่วไป หรือส่งรายละเอียดให้ทีมงานเมื่อพบปัญหา</p>
      </header>

      <section aria-labelledby="quick-help" className="grid sm:grid-cols-3 gap-4 mb-12">
        <Link href="/create" className="rounded-2xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-6 hover:border-red-400 transition"><span className="text-2xl" aria-hidden="true">✍️</span><h2 id="quick-help" className="font-bold mt-3">สร้างกระทู้</h2><p className="text-sm text-gray-500 mt-1">ถามและแบ่งปันความรู้กับชุมชน</p></Link>
        <Link href="/notifications" className="rounded-2xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-6 hover:border-red-400 transition"><span className="text-2xl" aria-hidden="true">🔔</span><h2 className="font-bold mt-3">การแจ้งเตือน</h2><p className="text-sm text-gray-500 mt-1">ดูการตอบกลับและกิจกรรมล่าสุด</p></Link>
        <Link href="/privacy" className="rounded-2xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-6 hover:border-red-400 transition"><span className="text-2xl" aria-hidden="true">🛡️</span><h2 className="font-bold mt-3">ความเป็นส่วนตัว</h2><p className="text-sm text-gray-500 mt-1">ดูวิธีที่เราดูแลข้อมูลของคุณ</p></Link>
      </section>

      <section aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-2xl font-bold mb-5">คำถามที่พบบ่อย</h2>
        <div className="space-y-3">
          {faqs.map(([question, answer]) => (
            <details key={question} className="group rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-5">
              <summary className="font-bold cursor-pointer list-none flex justify-between gap-4">{question}<span aria-hidden="true" className="text-red-600 group-open:rotate-45 transition-transform">＋</span></summary>
              <p className="pt-4 text-gray-600 dark:text-gray-300 leading-7">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 text-white p-7 md:p-9">
        <h2 className="text-2xl font-bold">ยังต้องการความช่วยเหลือ?</h2>
        <p className="mt-2 text-red-100">ส่งรายละเอียดปัญหา URL ของหน้า และขั้นตอนที่ทำก่อนพบปัญหา โดยหลีกเลี่ยงการส่งรหัสผ่านหรือข้อมูลลับ</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href="mailto:contact@cmtc.ac.th?subject=ITHub%20Support" className="rounded-lg bg-white text-red-700 font-bold px-5 py-3 hover:bg-red-50 transition">ส่งอีเมล</a>
          <a href="tel:+6653217708" className="rounded-lg border border-white/40 font-bold px-5 py-3 hover:bg-white/10 transition">โทร 053-217-708</a>
        </div>
      </section>
    </div>
  );
}
