# Trip Cost Share v6.4 — Responsive Design

อัปเดตนี้แก้เฉพาะ `styles.css` เพื่อให้หน้าเว็บรองรับ Desktop / Tablet / Mobile โดยไม่เปลี่ยน JavaScript, API, Google Apps Script หรือฐานข้อมูล

## จุดที่ปรับ
- Layout ปรับตาม Desktop / Tablet / Mobile อัตโนมัติ
- Sidebar เปลี่ยนเป็น Drawer บน Tablet/Mobile และรองรับ `100dvh`
- Topbar ไม่ซ้อนกันเมื่อจอแคบ
- Dashboard Metric Cards ปรับ 4 → 2 → 1 คอลัมน์
- Form 2 คอลัมน์เปลี่ยนเป็น 1 คอลัมน์บนมือถือ
- Checkbox วันที่/คืนพักปรับ 2 → 1 คอลัมน์บนมือถือจอเล็ก
- ตารางเลื่อนแนวนอนภายใน Card โดยไม่ดันทั้งหน้า
- ใบเสร็จ, รายการย่อย, ผู้ร่วมรับผิดชอบ และปุ่มต่าง ๆ ไม่ล้นกรอบ
- ข้อความยาว, ชื่อร้าน, ชื่อคน และยอดเงินมีการ Wrap/Truncate ที่เหมาะสม
- รองรับ safe-area บนอุปกรณ์มือถือ
- ปรับ Landscape phone และหน้าจอแคบถึง 360px

## วิธีอัปเดต
อัปโหลด `styles.css` แทนไฟล์เดิมบน GitHub แล้วกด `Ctrl + F5`

ไม่ต้อง Deploy Google Apps Script ใหม่
