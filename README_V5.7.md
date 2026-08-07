# Trip Cost Share v5.7 — Lock Fix & Fast Write

เวอร์ชันนี้แก้ปัญหา:

> Lock timeout: another process was holding the lock for too long.

และลดเวลารอหลังบันทึกข้อมูล โดยไม่เปลี่ยนโครงสร้าง Google Sheet

## สาเหตุหลักที่แก้

### 1. v5.6 ถือล็อกนานเกินไป

ก่อนหน้านี้ Apps Script ใช้ Script Lock ครอบทั้ง:

- การเขียน Google Sheet
- การอัปโหลดรูปไป Google Drive
- การอ่านฐานข้อมูลทั้งหมดกลับมาหลังบันทึก

ทำให้ request หนึ่งสามารถถือล็อกนานหลายวินาที และ request ถัดไปชน `Lock timeout`

v5.7 เปลี่ยนเป็น:

1. ย่อรูปที่ Browser
2. Upload Google Drive **ก่อน** ล็อก Spreadsheet
3. ล็อกเฉพาะช่วงเขียน Sheet
4. ปลดล็อกทันที
5. งาน Cleanup / การอ่านข้อมูลอื่นทำหลังปลดล็อก

### 2. หลังบันทึกเคยอ่านฐานข้อมูลทุกชีตใหม่ทั้งหมด

สำหรับการเพิ่มผู้ร่วมกิจกรรมและเพิ่มใบเสร็จ v5.7 จะตอบกลับเฉพาะข้อมูลที่เพิ่งบันทึก (delta response)

จึงไม่ต้องรออ่าน:

- Participants ทั้งหมด
- Receipts ทั้งหมด
- ExpenseLines ทั้งหมด
- ExpenseShares ทั้งหมด

ทุกครั้งหลังบันทึก

### 3. เพิ่มใบเสร็จใหม่เคย Rewrite ทั้งชีต

เดิมการเพิ่มใบเสร็จใหม่ใช้วิธีอ่านและเขียน `ExpenseLines` และ `ExpenseShares` ใหม่ทั้งชีต

v5.7 เปลี่ยนเป็น:

- ใบเสร็จใหม่ → Batch Append เท่านั้น
- แก้ใบเสร็จเดิม → Replace เฉพาะเมื่อจำเป็น

ยิ่งข้อมูลเยอะ ความต่างด้านความเร็วจะยิ่งชัดเจน

### 4. เปลี่ยน Lock timeout เป็น Busy + Auto Retry

แทนที่จะรอ Lock 12 วินาทีแล้ว Error:

- Server รอ Lock ช่วงสั้น ๆ
- ถ้ายังไม่ว่าง ส่ง code `BUSY`
- Browser retry อัตโนมัติ 3 ครั้ง

จึงลด Error ที่ผู้ใช้ต้องกดบันทึกซ้ำเอง

### 5. ลดขนาดรูปใบเสร็จก่อนส่ง

Browser จำกัดรูปประมาณ:

- สูงสุด 1280 px
- JPEG quality สูงสุดประมาณ 0.76

เพื่อลดเวลาส่งข้อมูลไป Apps Script / Drive โดยยังเพียงพอสำหรับอ่านใบเสร็จทั่วไป

---

# วิธีอัปเกรดจาก v5.6 / v5.6.1

## GitHub

อัปโหลดแทนของเดิม:

- `app.js`
- `admin.js`

ไม่ต้องเปลี่ยน `config.js`

## Google Apps Script

นำไฟล์:

- `apps-script/Code.gs`

ไปแทน Code.gs เดิม

จากนั้น:

1. Save
2. Deploy → Manage deployments
3. Edit deployment
4. Version → New version
5. Deploy

ไม่ต้องรัน migrate และไม่ต้องสร้าง Google Sheet ใหม่

## หลัง Deploy

แนะนำให้รันหนึ่งครั้งจาก Apps Script Editor:

```javascript
clearPerformanceCache()
warmCache()
```

จากนั้นปิดหน้าเว็บที่เปิดซ้ำหลาย Tab แล้วเปิดใหม่ และกด `Ctrl + F5`

> Lock ของ request เก่าจะปล่อยเองเมื่อ execution เก่าจบ ไม่มีคำสั่งสำหรับ force-unlock จากหน้าเว็บ

---

# ฐานข้อมูล

v5.7 ไม่เปลี่ยน Headers หรือ Sheet structure จาก v5.6

- Settings
- Participants
- Receipts
- ExpenseLines
- ExpenseShares
- AdminLog

จึงไม่กระทบข้อมูลเดิม
