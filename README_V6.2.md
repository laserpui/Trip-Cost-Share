# Trip Cost Share v6.2 — Reset Trip + Clean UI

## เพิ่มฟังก์ชันรีเซ็ตทริป

อยู่ที่หน้า Admin > ตั้งค่ากิจกรรม > รีเซ็ตทริป

ระบบจะขอยืนยัน 2 ชั้น:
1. Confirm
2. พิมพ์ `RESET`

เมื่อยืนยัน ระบบจะล้างข้อมูลของทริปปัจจุบัน:
- Participants
- Receipts
- ExpenseLines
- ExpenseShares
- รูปใบเสร็จใน Google Drive จะถูกย้ายไป Trash

ระบบจะ **ไม่ลบ**:
- โครงสร้าง Google Sheet
- Settings sheet
- AdminLog
- Apps Script deployment
- config.js / API URL

หลังรีเซ็ต Settings จะเป็น:
- ชื่อกิจกรรม: `กิจกรรมใหม่`
- วันเริ่ม: วันนี้
- วันสิ้นสุด: วันนี้
- สถานะ: `open`

## Clean UI

ซ่อนข้อความอธิบายที่ไม่จำเป็น เช่นคำอธิบายใต้หัวข้อ, helper text ของ card และคำแนะนำยาว ๆ
แต่ยังคงข้อความที่จำเป็นต่อการใช้งาน เช่น:
- Error / validation
- สถานะการบันทึก
- จำนวนข้อมูล
- ชื่อไฟล์/ข้อมูลที่จำเป็น

## การอัปเดต

โครงสร้างฐานข้อมูล **ไม่เปลี่ยน** จึงไม่ต้อง migrate และไม่ต้องสร้างชีตใหม่

ให้อัปโหลดไฟล์หน้าเว็บจากแพ็กเกจ Upgrade แทนของเดิม และ **เก็บ config.js ของคุณไว้**
จากนั้นนำ `apps-script/Code.gs` ไปแทนใน Google Apps Script แล้ว:

Deploy > Manage deployments > Edit > New version > Deploy

ไม่จำเป็นต้องรัน `setupDatabase()` ใหม่ หาก v6.1 ใช้งานอยู่แล้ว

หลัง Deploy กด Ctrl + F5
