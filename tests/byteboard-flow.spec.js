import { test, expect } from '@playwright/test';

// 🚀 กลุ่มการทดสอบ: ByteBoard E2E Master Test
test.describe('ByteBoard (IT Techboard) - Full E2E Tests', () => {

  // บอทจะเปิดหน้าแรกเสมอ ก่อนเริ่มแต่ละเทสต์
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/');
  });

  // ---------------------------------------------------------
  // 🧪 เทสต์ที่ 1: ระบบแชท AI (ITHub Bot)
  // ---------------------------------------------------------
  test('1. ทดสอบระบบแชทกับ ITHub Bot 🤖', async ({ page }) => {
    // 1. กดปุ่มลอย (Floating Button) รูปหุ่นยนต์
    await page.locator('button.bg-red-600.rounded-full').click();

    // 2. เช็คว่าหน้าต่างแชทกางออก และเจอคำว่า ITHub Bot
    await expect(page.getByText('ITHub Bot')).toBeVisible();

    // 3. พิมพ์ข้อความและกดส่ง
    await page.locator('input[placeholder="พิมพ์ข้อความที่นี่..."]').fill('สวัสดีครับ ทดสอบระบบจาก Playwright');
    await page.locator('button[type="submit"]').click();

    // 4. รอให้ AI ตอบกลับ (สังเกตจากคลาส markdown-body ที่เราทำไว้)
    // ให้เวลาบอทคิดสูงสุด 15 วินาที
    await expect(page.locator('.markdown-body').first()).toBeVisible({ timeout: 15000 });
  });

  // ---------------------------------------------------------
  // 🧪 เทสต์ที่ 2: ระบบ Login
  // ---------------------------------------------------------
  test('2. ระบบล็อกอินแบบสมบูรณ์ (Login Flow)', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    // กรอกข้อมูล (ถ้า input name ของลูกพี่ชื่ออื่น ให้แก้ให้ตรงนะครับ)
    await page.locator('input[name="email"]').fill('admin@ithub.com');
    await page.locator('input[name="password"]').fill('12345678');
    
    // กดปุ่มเข้าสู่ระบบ
    await page.locator('button[type="submit"]').click();

    // ต้องเด้งกลับมาหน้าแรก และเจอปุ่ม Logout
    await page.waitForURL('http://localhost:3000/');
    await expect(page.getByRole('button', { name: /Logout/i })).toBeVisible();
  });

  // ---------------------------------------------------------
  // 🧪 เทสต์ที่ 3: ระบบสร้างกระทู้ (Create Topic) 
  // ---------------------------------------------------------
  test('3. ทดสอบการตั้งกระทู้ใหม่ (Create Topic Flow)', async ({ page }) => {
    // สเต็ป A: แอบล็อกอินให้บอทก่อน (เพราะตั้งกระทู้ต้องมี User)
    await page.goto('http://localhost:3000/login');
    await page.locator('input[name="email"]').fill('admin@ithub.com');
    await page.locator('input[name="password"]').fill('12345678');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('http://localhost:3000/');

    // สเต็ป B: บุกหน้าสร้างกระทู้
    await page.goto('http://localhost:3000/create');

    // สเต็ป C: กรอกฟอร์ม (ถ้า name ในโค้ดลูกพี่ชื่ออื่น ให้ปรับตามนะครับ)
    await page.locator('input[name="title"]').fill('🚀 กระทู้ทดสอบระบบอัตโนมัติ (Playwright)');
    
    // เลือกหมวดหมู่สมมติว่าเป็น Dropdown
    await page.locator('select[name="category"]').selectOption({ index: 1 });
    
    // กล่องพิมพ์เนื้อหา (React Quill) จะใช้คลาส .ql-editor
    await page.locator('.ql-editor').fill('นี่คือเนื้อหากระทู้ที่ถูกสร้างขึ้นจากการทำ E2E Testing ครับ ระบบเสถียรมาก!');

    // กดปุ่มโพสต์
    await page.locator('button[type="submit"]').click();

    // สเต็ป D: ตรวจสอบว่าโพสต์สำเร็จ ระบบต้องพาไปหน้ากระทู้ (URL มีคำว่า /topic/)
    await expect(page).toHaveURL(/.*\/topic\/.*/, { timeout: 10000 });
  });

  // ---------------------------------------------------------
  // 🧪 เทสต์ที่ 4: ตรวจสอบระบบเปลี่ยนธีม (Dark Mode)
  // ---------------------------------------------------------
  test('4. ทดสอบปุ่มสลับธีม Dark/Light', async ({ page }) => {
    // หาระบบปุ่ม Theme (สมมติว่าหาปุ่มที่มีคำว่า โหมดมืด/สว่าง หรือ ไอคอน)
    // ตรงนี้ลูกพี่อาจจะต้องใส่ `data-testid="theme-toggle"` ไว้ที่ปุ่ม ThemeToggle.js เพื่อให้บอทหาง่ายๆ
    // ตัวอย่าง: await page.getByTestId('theme-toggle').click();
    
    // เช็คว่ากดแล้ว HTML มีคลาส 'dark' หรือไม่
    // await expect(page.locator('html')).toHaveClass(/dark/);
  });

});