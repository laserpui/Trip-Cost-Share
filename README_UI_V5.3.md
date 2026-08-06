# Trip Cost Share v5.3 — Multi-page SaaS UI

เวอร์ชันนี้ปรับเฉพาะโครงสร้างหน้า UI/UX ให้เป็นระบบเมนูแยกหน้า โดยยังใช้ JavaScript, API, Google Apps Script และฐานข้อมูลเดิมทั้งหมด

## หน้าใช้งานใหม่

### 1. Dashboard
- สรุปผู้ร่วมกิจกรรม
- ค่าใช้จ่ายทั้งหมด
- ยอดชำระคืน
- ยอดรอตัดบัญชี
- สรุปยอดรายบุคคล
- คำแนะนำว่าใครควรโอนให้ใคร
- ปุ่มทางลัดไปยังหน้าที่ใช้บ่อย

### 2. บันทึกผู้ร่วมกิจกรรม
- กรอกชื่อ
- เลือกวันที่เข้าร่วม
- เลือกสถานะการดื่ม
- แสดงรายชื่อที่บันทึกแล้ว
- ใช้รูปแบบ Step 1 จากทั้งหมด 2 ขั้นตอน

### 3. บันทึกค่าใช้จ่าย
- บันทึกใบเสร็จ
- แนบรูปใบเสร็จ
- ระบุผู้สำรองจ่ายหลายคน
- แยกรายการย่อย
- ตรวจสอบวิธีหารก่อนบันทึก
- แสดงรายการใบเสร็จ
- บันทึกการชำระคืน

### 4. บันทึกที่พัก
- เป็น Step 2 ของการเพิ่มผู้ร่วมกิจกรรม
- เลือกคืนที่เข้าพักจริง
- มีคำแนะนำหลักการคิดค่าที่พัก
- ใช้ข้อมูลเดิมใน `lodgingNights` โดยไม่เพิ่มคอลัมน์ฐานข้อมูล

### 5. Admin
- หน้า Overview
- ตั้งค่ากิจกรรม
- จัดการผู้ร่วมกิจกรรม
- จัดการใบเสร็จและค่าใช้จ่าย
- จัดการการชำระคืน
- ใช้ระบบล็อกอิน Admin และ API เดิม

## ไฟล์ที่แก้ไขหรือเพิ่ม

```text
index.html       ปรับโครงสร้าง UI หน้าหลัก
admin.html       ปรับโครงสร้าง UI หน้า Admin
styles.css       เพิ่ม Sidebar, Workspace และ Responsive UI
navigation.js    ระบบเปลี่ยนหน้าแบบ Hash Navigation
```

## ไฟล์ที่ไม่ได้แก้ไข

ไฟล์เหล่านี้เหมือนกับ v5.2 ทุกประการ:

```text
app.js
admin.js
config.js
apps-script/Code.gs
```

ดังนั้นจึงไม่มีการเปลี่ยน:

- สูตรการคำนวณ
- Google Sheet
- Google Apps Script API
- การอัปโหลดใบเสร็จ
- Admin Token
- ข้อมูลเดิม

## วิธีอัปเดตแบบปลอดภัย

ให้อัปโหลดเฉพาะไฟล์ต่อไปนี้ขึ้น GitHub แทนของเดิม:

```text
index.html
admin.html
styles.css
navigation.js
```

เก็บ `config.js` เดิมของคุณไว้ เพื่อไม่ให้ URL ของ Google Apps Script ถูกเขียนทับ

หลังอัปโหลด ให้เปิดเว็บแล้วกด:

```text
Ctrl + F5
```

## URL ของแต่ละหน้า

หน้าเว็บใช้ Hash Navigation จึงใช้งานบน GitHub Pages ได้โดยไม่ต้องตั้งค่า Routing เพิ่มเติม:

```text
index.html#dashboard
index.html#participants
index.html#expenses
index.html#lodging
admin.html#overview
admin.html#settings
admin.html#participants
admin.html#receipts
admin.html#settlements
```

## Responsive

- Desktop: Sidebar ด้านซ้าย
- Tablet และ Mobile: Sidebar แบบเลื่อนออกจากด้านข้าง
- ตารางยังเลื่อนแนวนอนได้
- Form และ Card ปรับเป็นคอลัมน์เดียวอัตโนมัติ
