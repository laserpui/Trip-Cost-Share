# Trip Cost Share v6.1 — Connection & Alcohol Fix

เวอร์ชันนี้แก้ 2 ปัญหาหลักของ v6.0:

1. เว็บเข้า **โหมดทดลอง** เพราะ `config.js` ถูกแทนด้วยค่า placeholder
2. หมวด **เครื่องดื่มแอลกอฮอล์** และสถานะผู้ดื่มถูกตัดออกจากหน้า Public โดยไม่ควร

## 1) การเชื่อม Google Apps Script

v6.1 จะไม่เข้า Demo อัตโนมัติเมื่อ `API_URL` ไม่ถูกต้องอีกแล้ว แต่จะแสดงข้อความชัดเจนว่า **ยังไม่ได้ตั้ง API URL**

ไฟล์ `config.js` ที่ใช้งานจริงต้องมี Web App URL จาก Deployment ของคุณ เช่น:

```js
window.APP_CONFIG = {
  APP_NAME: "Trip Cost Share",
  API_URL: "https://script.google.com/macros/s/YOUR_REAL_DEPLOYMENT_ID/exec",
  RECEIPT_MAX_WIDTH: 1280,
  RECEIPT_JPEG_QUALITY: 0.76,
  REQUEST_TIMEOUT_MS: 20000,
  SNAPSHOT_MAX_AGE_MINUTES: 30,
  ENABLE_DEMO_MODE: false
};
```

> ชุด Upgrade **ไม่ใส่ `config.js`** เพื่อไม่ให้ URL จริงของคุณถูกเขียนทับ

ถ้าใช้ Deployment เดิมแบบ `Manage deployments > Edit > New version > Deploy` URL จะไม่เปลี่ยน

## 2) เครื่องดื่มแอลกอฮอล์

คืนฟังก์ชันเดิมให้ครบ:

- หน้าเพิ่มผู้ร่วมกิจกรรมมีตัวเลือก **ดื่มเครื่องดื่มแอลกอฮอล์**
- หน้า Admin สามารถแก้สถานะผู้ดื่มได้
- หมวดค่าใช้จ่ายมี **เครื่องดื่มแอลกอฮอล์**
- เมื่อเลือกหมวดนี้ ระบบจะแสดง/เลือกเฉพาะผู้ที่ระบุว่าเป็นผู้ดื่ม
- ถ้าเลือกวิธี `ผู้ที่มาในวันนั้น` ระบบจะกรองทั้ง **มาในวันนั้น + เป็นผู้ดื่ม**
- Apps Script ตรวจซ้ำฝั่ง Server เพื่อป้องกันการคิดค่าแอลกอฮอล์กับผู้ไม่ดื่ม

## วิธีอัปเดต

อัปโหลดไฟล์จากชุด Upgrade ไปแทนของเดิม:

- `index.html`
- `admin.html`
- `app.js`
- `admin.js`
- `styles.css`
- `apps-script/Code.gs`

**ห้ามเขียนทับ `config.js` เดิมที่มี URL จริง**

จากนั้น:

1. Apps Script: `Deploy > Manage deployments > Edit > New version > Deploy`
2. เปิด `config.js` บน GitHub และตรวจว่า `API_URL` เป็น URL จริง ไม่ใช่ `PASTE_YOUR...`
3. กด `Ctrl + F5`
4. ถ้ายังขึ้นว่าไม่ได้เชื่อม ให้เปิด URL นี้ใน Browser โดยแทน URL จริงของคุณ:

```text
YOUR_WEB_APP_URL?action=health
```

ควรได้ JSON ที่มี `"ok":true` และ `"apiVersion":"6.1"`

## การทดสอบ

- JavaScript syntax: PASS
- HTML/JS ID audit: PASS
- สูตรปัดเศษ 1,000 / 3: PASS
- ค่าอาหารตามวันที่เข้าร่วม: PASS
- ค่าที่พักตามคืนที่พัก: PASS
- ค่าแอลกอฮอล์กรองเฉพาะผู้ดื่ม: PASS
- Server ปฏิเสธผู้ไม่ดื่มในรายการแอลกอฮอล์: PASS
