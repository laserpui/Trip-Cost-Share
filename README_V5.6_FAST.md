# Trip Cost Share v5.6 — Fast Sync / Performance

เวอร์ชันนี้เน้นแก้ปัญหา “เชื่อม Google Sheet และโหลดข้อมูลช้า” โดย **ไม่เปลี่ยนโครงสร้างฐานข้อมูลเดิม** และไม่เพิ่มฟังก์ชันชำระเงินคืนกลับเข้ามา

## จุดคอขวดที่แก้

### 1) ไม่รัน setupDatabase() ทุก Request อีกต่อไป
ใน v5.5 ทุก GET/POST จะเรียก `setupDatabase()` ซึ่งตรวจทุกชีต จัดรูปแบบหัวตาราง และเดิมมี Auto Resize ทำให้เสียเวลามาก

v5.6 ใช้ Schema Version ใน Script Properties:
- ตรวจเบา ๆ ทุก Request
- รัน setup จริงเฉพาะครั้งแรกของเวอร์ชันใหม่
- ไม่ Auto Resize คอลัมน์ระหว่างการใช้งาน

### 2) Server-side Cache
- Cache Bootstrap สูงสุด 120 วินาที
- Cache Settings สูงสุด 300 วินาที
- เมื่อมีการบันทึกข้อมูล ระบบล้าง Cache และสร้างข้อมูลสดใหม่
- ปุ่ม “รีเฟรชข้อมูล” ใช้ `fresh=1` เพื่อข้าม Cache และอ่าน Google Sheet จริง

### 3) Instant Local Snapshot
หน้าหลักจะเก็บ Snapshot ล่าสุดไว้ใน `localStorage` สูงสุด 24 ชั่วโมง

เมื่อกลับมาเปิดเว็บ:
1. แสดงข้อมูลล่าสุดในเครื่องก่อนทันที
2. แสดงสถานะ “กำลังซิงก์ข้อมูล”
3. โหลด Google Sheet เบื้องหลัง
4. เมื่อเสร็จจะแทนด้วยข้อมูลล่าสุดจาก Server

หากอินเทอร์เน็ต/Apps Script มีปัญหาชั่วคราว ผู้ใช้ยังเห็นข้อมูลล่าสุดในเครื่องได้

หน้า Admin ใช้ `sessionStorage` จึงเก็บ Cache เฉพาะ Session ปัจจุบัน

### 4) Navigation ไม่ถูกล็อกระหว่าง Sync
เดิม `setBusy()` ปิดปุ่มทั้งหน้า รวมเมนู Navigation ทำให้ผู้ใช้รู้สึกว่าเว็บค้าง

v5.6 ปิดเฉพาะปุ่มที่ “เขียนข้อมูล” ระหว่าง Sync เมนูและการเปิดดูหน้าต่าง ๆ ยังใช้งานได้

### 5) บันทึกที่พักทั้งกลุ่มแบบ Batch
เดิมสามารถเกิด 2 Spreadsheet writes ต่อสมาชิกหนึ่งคน

v5.6:
- อ่าน Participants ครั้งเดียว
- แก้ข้อมูลทั้งหมดใน Memory
- เขียนกลับด้วย `setValues()` ครั้งเดียว

### 6) ใบเสร็จ / ExpenseShares แบบ Batch
เดิมรายการย่อยและ ExpenseShares ใช้ `appendRow()` ทีละรายการ และลบ Row ทีละแถว

v5.6 ใช้การแทนข้อมูลแบบ Batch:
- Lines ต่อใบเสร็จเขียนเป็นชุด
- Shares ต่อใบเสร็จเขียนเป็นชุด
- ลด Spreadsheet service calls จำนวนมาก

### 7) อ่าน Sheet เฉพาะ Used Range
เปลี่ยนจาก `getDataRange()` เป็น Range ตาม `lastRow/lastColumn` เพื่อลดข้อมูลส่วนเกินที่ถูกอ่าน

---

# วิธีอัปเกรดจาก v5.5

## GitHub
จากแพ็กเกจ Upgrade ให้อัปโหลดแทนไฟล์เดิม:

- `index.html`
- `admin.html`
- `styles.css`
- `app.js`
- `admin.js`
- `navigation.js`

**อย่าเขียนทับ `config.js` เดิมของคุณ**

## Google Apps Script
1. นำ `apps-script/Code.gs` v5.6 ไปแทน Code.gs เดิม
2. Save
3. แนะนำให้รัน `setupDatabase()` **หนึ่งครั้งก่อน Deploy**
4. จากนั้นรัน `warmCache()` หนึ่งครั้ง (ไม่บังคับ แต่ช่วยให้การเปิดเว็บครั้งแรกเร็วขึ้น)
5. Deploy > Manage deployments > Edit
6. เลือก New version
7. Deploy
8. กลับหน้าเว็บ กด `Ctrl + F5` หนึ่งครั้ง

หลังจากนั้นการเปิดเว็บครั้งต่อ ๆ ไปจะใช้ Fast Sync อัตโนมัติ

---

# ฟังก์ชันช่วยด้าน Performance

### setupDatabase()
ตรวจ/เตรียมโครงสร้างชีต และบันทึก Schema Version

รันหนึ่งครั้งหลังเปลี่ยนมา v5.6

### warmCache()
อ่านข้อมูลล่าสุดและอุ่น Server Cache ไว้ก่อนผู้ใช้เปิดเว็บ

สามารถรันหลัง Deploy หรือหลัง Import ข้อมูลจำนวนมาก

### clearPerformanceCache()
ล้างเฉพาะ Cache การอ่านข้อมูล ไม่ลบข้อมูลใน Google Sheet

ใช้กรณีต้องการ Troubleshoot

---

# ข้อมูลที่ไม่ได้เปลี่ยน

โครงสร้างชีตยังคง:
- Settings
- Participants
- Receipts
- ExpenseLines
- ExpenseShares
- AdminLog

ไม่มีการลบข้อมูลเดิม ไม่มีการเปลี่ยนคอลัมน์ และไม่มีการนำระบบ Settlements/บันทึกชำระคืนกลับมาใช้งาน

## หมายเหตุ
Server Cache อาจทำให้การแก้ Google Sheet “ด้วยมือโดยตรง” ยังไม่ปรากฏบนหน้าเว็บทันทีในช่วงสั้น ๆ หากต้องการข้อมูลสดทันทีให้กด **รีเฟรชข้อมูล** ซึ่ง v5.6 จะบังคับข้าม Cache
