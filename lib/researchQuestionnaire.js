export {
  PILOT_EVALUATION_NOTICE_VERSION,
  PILOT_QUESTIONNAIRE_VERSION,
} from './researchWorkflowCore';
export const PILOT_ANALYTICS_NOTICE_VERSION = 'research-analytics-pilot-v1';

export const SUS_PILOT_ITEMS = Object.freeze([
  'ฉันคิดว่าฉันอยากใช้ ITHub นี้เป็นประจำ',
  'ฉันพบว่า ITHub ซับซ้อนเกินความจำเป็น',
  'ฉันคิดว่า ITHub ใช้งานง่าย',
  'ฉันคิดว่าฉันต้องอาศัยความช่วยเหลือจากผู้ที่มีความรู้ทางเทคนิคเพื่อใช้ ITHub',
  'ฉันพบว่าฟังก์ชันต่าง ๆ ใน ITHub ทำงานเชื่อมโยงกันได้ดี',
  'ฉันคิดว่า ITHub มีความไม่สอดคล้องกันมากเกินไป',
  'ฉันคิดว่าคนส่วนใหญ่จะเรียนรู้การใช้ ITHub ได้เร็ว',
  'ฉันพบว่า ITHub ใช้งานยุ่งยาก',
  'ฉันรู้สึกมั่นใจเมื่อใช้ ITHub',
  'ฉันต้องเรียนรู้หลายอย่างก่อนจึงจะเริ่มใช้ ITHub ได้',
]);

export const SUS_SCALE = Object.freeze([
  [1, 'ไม่เห็นด้วยอย่างยิ่ง'],
  [2, 'ไม่เห็นด้วย'],
  [3, 'ไม่แน่ใจ'],
  [4, 'เห็นด้วย'],
  [5, 'เห็นด้วยอย่างยิ่ง'],
]);

export const RESEARCH_TASKS = Object.freeze([
  'ค้นหาและเปิดกระทู้ที่ต้องการ',
  'สร้างกระทู้',
  'แสดงความคิดเห็นหรือตอบกลับ',
  'กดถูกใจหรือบันทึกกระทู้',
  'ติดตามหมวดหรือผู้เขียน แล้วเปิด Following หรือ For You',
]);

export const TASK_RESULT_OPTIONS = Object.freeze([
  ['success', 'สำเร็จ'],
  ['partial', 'สำเร็จบางส่วน'],
  ['failed', 'ไม่สำเร็จ'],
  ['not_attempted', 'ไม่ได้ลอง'],
]);

export const RESPONDENT_TYPE_OPTIONS = Object.freeze([
  ['student', 'นักศึกษา'],
  ['teacher', 'อาจารย์'],
  ['other', 'อื่น ๆ'],
]);

export const EXPERIENCE_LEVEL_OPTIONS = Object.freeze([
  ['beginner', 'เริ่มต้น'],
  ['intermediate', 'ระดับกลาง'],
  ['advanced', 'มีประสบการณ์'],
]);

export const PRIMARY_DEVICE_OPTIONS = Object.freeze([
  ['mobile', 'โทรศัพท์มือถือ'],
  ['tablet', 'แท็บเล็ต'],
  ['desktop', 'คอมพิวเตอร์'],
]);

export const FEEDBACK_CATEGORY_OPTIONS = Object.freeze([
  ['bug', 'แจ้งบัค'],
  ['ux_ui', 'ปัญหา UX/UI'],
  ['feature', 'ข้อเสนอแนะฟีเจอร์'],
  ['content', 'เนื้อหา'],
  ['other', 'อื่น ๆ'],
]);

export const FEEDBACK_STATUS_LABELS = Object.freeze({
  new: 'ใหม่',
  reviewing: 'กำลังตรวจสอบ',
  planned: 'วางแผนแก้',
  resolved: 'แก้แล้ว',
  declined: 'ไม่ดำเนินการ',
});

export const CAMPAIGN_STATUS_LABELS = Object.freeze({
  draft: 'แบบร่าง',
  open: 'เปิดรับคำตอบ',
  closed: 'ปิดรับคำตอบ',
  locked: 'ล็อกแล้ว',
});
