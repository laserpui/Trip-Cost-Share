# Trip Cost Share v6.5 — Reset Fix & Modern Dialog

เวอร์ชันนี้แก้ปัญหา `Unknown POST action: adminResetTrip` และปรับ Popup / Confirmation ให้เป็น Modal ของเว็บเองแทน `confirm()` / `prompt()` ของ Browser

## 1) แก้ Reset Trip

Google Apps Script v6.5 รองรับคำสั่งต่อไปนี้ทั้งหมด:

- `adminResetTrip`
- `adminResetCurrentTrip`
- `resetTrip`

คำสั่งหลักที่หน้า Admin ใช้คือ `adminResetTrip`

เมื่อรีเซ็ต ระบบจะล้าง:

- Participants
- Receipts
- ExpenseLines
- ExpenseShares
- รูปใบเสร็จของทริปจะย้ายไป Trash ใน Google Drive

ระบบจะไม่ลบ:

- โครงสร้าง Google Sheet
- AdminLog
- Deployment / API URL
- config.js

หลังรีเซ็ต Settings จะเป็น:

- ชื่อกิจกรรม: `กิจกรรมใหม่`
- วันที่เริ่ม / สิ้นสุด: วันที่ปัจจุบันตาม Timezone ของ Spreadsheet
- สถานะ: `open`

## 2) Modern Popup

เพิ่มไฟล์ `ui-dialog.js` สำหรับ Popup แบบใหม่:

- ลบผู้ร่วมกิจกรรม
- ลบใบเสร็จ
- รีเซ็ตทริป
- ยืนยัน RESET
- แจ้งรีเซ็ตสำเร็จ
- แจ้งว่า Apps Script ที่ Deploy อยู่เก่าเกินไป

รองรับ Desktop / Tablet / Mobile และ Keyboard Focus

## 3) วิธีอัปเดต

### GitHub

อัปโหลดแทน / เพิ่มไฟล์:

- `index.html`
- `admin.html`
- `admin.js`
- `styles.css`
- `ui-dialog.js`

**เก็บ `config.js` เดิมไว้**

### Google Apps Script — ขั้นตอนนี้จำเป็น

นำ `apps-script/Code.gs` v6.5 ไปแทน Code.gs เดิม แล้วใช้ Deployment เดิม:

1. Deploy
2. Manage deployments
3. Edit Deployment เดิม
4. เลือก **New version**
5. Deploy

หากอัปโหลดเฉพาะ GitHub แต่ไม่ Deploy Code.gs ใหม่ ปุ่ม Reset จะยังขึ้น `Unknown POST action: adminResetTrip`

## 4) ตรวจว่า Deploy ถูกเวอร์ชันแล้ว

เปิด Web App URL แล้วต่อท้าย:

`?action=health`

ควรได้ข้อมูลประมาณ:

```json
{
  "ok": true,
  "apiVersion": "6.5",
  "features": {
    "resetTrip": true
  }
}
```

ถ้า apiVersion ยังเป็นรุ่นก่อนหน้า แสดงว่า Deployment ยังไม่ได้ชี้ไป Code.gs v6.5

## 5) หลังอัปเดต

กด `Ctrl + F5` บน Desktop หรือปิดหน้าเว็บแล้วเปิดใหม่บนมือถือ
