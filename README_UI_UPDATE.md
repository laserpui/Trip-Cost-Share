# Trip Cost Share v5.2 — UI-only Update

แพ็กเกจนี้ปรับเฉพาะ UI/UX และไม่มีไฟล์ระบบคำนวณ ฐานข้อมูล หรือ API

## ไฟล์ที่ให้อัปโหลดขึ้น GitHub

- `index.html`
- `admin.html`
- `styles.css`
- `ui-enhancements.js`

## ไฟล์ที่ห้ามเขียนทับ

เก็บไฟล์เดิมของคุณไว้ตามเดิม:

- `config.js` เพื่อรักษา Google Apps Script API URL
- `app.js`
- `admin.js`
- `apps-script/Code.gs`

## ขั้นตอนอัปเดต

1. สำรอง Repository เดิม
2. อัปโหลด 4 ไฟล์ในแพ็กเกจนี้แทนไฟล์เดิม
3. ไม่ต้องแก้ Google Sheet
4. ไม่ต้อง Deploy Apps Script ใหม่
5. เปิดหน้าเว็บและกด `Ctrl + F5`

## สิ่งที่เปลี่ยน

- Gradient `#E5FFFF → #FFFFE6 → #FFE6FF`
- Glassmorphism, Backdrop Blur, Border โปร่ง และ Shadow แบบนุ่ม
- ฟอนต์ Sarabun และ Noto Sans Thai
- ชุดไอคอน SVG แบบเดียวกันทั้งระบบ
- Hover, Transition และ Micro-interaction
- Responsive สำหรับ Desktop, Tablet และ Mobile
- Popup, Form, Table, Checkbox, Switch และ Dashboard แบบ Professional SaaS
