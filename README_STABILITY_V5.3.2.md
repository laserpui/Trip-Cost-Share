# Trip Cost Share v5.3.2 — Stability / Performance Update

เวอร์ชันนี้แก้เฉพาะ UI runtime และการนำทางเพื่อให้เว็บลื่นและเสถียรมากขึ้น โดยไม่แก้สูตรคำนวณ ฐานข้อมูล หรือ API

## จุดที่แก้

- ลด Backdrop Blur ที่ซ้อนกันหลายชั้น
- ยกเลิก animation พื้นหลังแบบต่อเนื่อง
- ยกเลิก smooth-scroll ระหว่างเปลี่ยนหน้า
- ปรับ MutationObserver ให้ประมวลผลเฉพาะ DOM ที่เพิ่งถูกเพิ่ม ไม่สแกนทั้งหน้าใหม่ทุกครั้ง
- Cache รายการหน้าและเมนูใน navigation.js ลด querySelectorAll ซ้ำ
- โหลด html2canvas แบบ async เพื่อไม่บล็อกการเริ่มทำงานของหน้าเว็บ
- บนมือถือปิด live blur เกือบทั้งหมด แต่คงโทน Glass/SaaS ด้วยพื้นผิวโปร่งและ shadow

## ไฟล์ที่เปลี่ยน

- index.html
- styles.css
- navigation.js
- ui-enhancements.js

## ไฟล์ระบบที่ไม่เปลี่ยน

- app.js
- admin.js
- config.js
- apps-script/Code.gs

ดังนั้นไม่กระทบ Google Sheet, Google Drive, API, สูตรหาร หรือข้อมูลเดิม

## วิธีอัปเดต

อัปโหลด 4 ไฟล์ที่เปลี่ยนขึ้น GitHub แทนไฟล์เดิม แล้วกด Ctrl + F5
