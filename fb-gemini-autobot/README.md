# ระบบตอบแชทลูกค้า Facebook อัตโนมัติ (ฟรีทั้งระบบ)

Workflow: **ลูกค้าแชท Facebook Page → Webhook → Vercel Function → Gemini API (อ่านคำตอบจาก Google Sheet) → ตอบกลับลูกค้า**

โครงสร้างไฟล์:
```
fb-gemini-autobot/
├── api/
│   └── webhook.js      <- จุดที่ Facebook ยิง webhook มาหา
├── lib/
│   ├── sheet.js         <- ดึงข้อมูลจาก Google Sheet
│   ├── gemini.js        <- เรียก Gemini ให้ตอบคำถาม
│   └── facebook.js      <- ส่งข้อความกลับหาลูกค้า
├── package.json
└── .env.example
```

ทุกอย่างในระบบนี้ **ฟรี**: Vercel (Hobby plan), Gemini API (free tier), Google Sheets, Facebook Page/App — ไม่ต้องผูกบัตรเครดิตเลยสักที่

---

## ภาพรวม 5 ขั้นตอน

1. เตรียม Google Sheet เป็นฐานข้อมูลคำถาม-คำตอบ
2. ขอ Gemini API Key (ฟรี) จาก Google AI Studio
3. สร้าง Facebook App + Page เพื่อรับ webhook
4. Deploy โค้ดนี้ขึ้น Vercel และตั้งค่า Environment Variables
5. เชื่อม Webhook เข้ากับ Facebook Page แล้วทดสอบแชท

---

## ขั้นตอนที่ 1: สร้าง Google Sheet เป็นฐานข้อมูล

1. สร้าง Google Sheet ใหม่ ตั้งชื่อคอลัมน์ง่าย ๆ เช่น:

   | คำถาม | คำตอบ |
   |---|---|
   | ราคาสินค้า A เท่าไหร่ | สินค้า A ราคา 590 บาท ส่งฟรีทั่วประเทศ |
   | ร้านเปิดกี่โมง | เปิดทุกวัน 9:00-20:00 น. |

   ใส่ข้อมูลร้านของคุณลงไปเรื่อย ๆ ได้ (ที่อยู่, เวลาทำการ, โปรโมชั่น, นโยบายคืนสินค้า ฯลฯ)

2. ไปที่ **File > Share > Publish to web**
3. เลือกชีตที่ต้องการ, เลือกฟอร์แมตเป็น **Comma-separated values (.csv)**
4. กด **Publish** แล้วคัดลอกลิงก์ที่ได้ (จะมีหน้าตาแบบ `https://docs.google.com/spreadsheets/d/e/2PACX-xxxx/pub?output=csv`)
5. เก็บลิงก์นี้ไว้ใส่ในตัวแปร `SHEET_CSV_URL` ทีหลัง

> ข้อดีของวิธีนี้: ไม่ต้องสร้าง Google Cloud Service Account ให้ยุ่งยาก แค่แก้ข้อมูลใน Sheet แล้วบอทจะตอบตามข้อมูลใหม่ทันที (มี cache 60 วินาที)

---

## ขั้นตอนที่ 2: ขอ Gemini API Key (ฟรี)

1. เข้า https://aistudio.google.com/app/apikey
2. ล็อกอินด้วย Google Account แล้วกด **Create API key**
3. คัดลอก key เก็บไว้ (จะใส่ในตัวแปร `GEMINI_API_KEY`)

**ข้อจำกัดของ free tier** (เช็คตัวเลขล่าสุดได้ที่ https://ai.google.dev/gemini-api/docs/pricing เพราะ Google ปรับบ่อย): free tier ใช้ได้เฉพาะโมเดลตระกูล Flash / Flash-Lite เท่านั้น (ไม่ใช่ Pro) และมีจำกัดจำนวนครั้งต่อนาที/ต่อวัน — พอสำหรับร้านค้าขนาดเล็กถึงกลาง ถ้าแชทเยอะมากอาจต้องอัปเกรดเป็นแบบเสียเงินภายหลัง

---

## ขั้นตอนที่ 3: สร้าง Facebook App + เชื่อม Page

1. เข้า https://developers.facebook.com/ → สร้าง App ใหม่ → เลือกประเภท "Business"
2. ในหน้า App เพิ่มโปรดักต์ **Messenger**
3. ไปที่ Messenger > Settings → เชื่อม **Page** ของคุณเข้ากับ App นี้ ทำตามนี้:
   - เลื่อนหาหัวข้อ **"Access Tokens"**
   - กดปุ่ม **"Add or Remove Pages"**
   - จะเด้งหน้าต่างให้ล็อกอิน Facebook (ถ้ายังไม่ได้ล็อกอินด้วยบัญชีที่เป็นแอดมินเพจ) → กด Continue
   - เลือก **Page ของคุณ** จากรายการ (ต้องเป็นแอดมินของเพจนั้นถึงจะเห็น) → ติ๊กถูกเลือกเพจ → กด Next
   - หน้าถัดไปจะถามสิทธิ์ที่จะให้ App เข้าถึง เช่น `pages_messaging`, `pages_show_list` → กด **Continue/Done** เพื่ออนุญาต
   - เสร็จแล้วเพจของคุณจะไปโผล่อยู่ในลิสต์ใต้ "Access Tokens" กลับมาที่หน้า Messenger > Settings
4. ที่แถวของ Page ที่เพิ่งเชื่อมไว้ กด **Generate Token** เพื่อได้ **Page Access Token** (เป็นสตริงยาว ๆ) → คัดลอกเก็บไว้ใส่ `FB_PAGE_ACCESS_TOKEN`
5. ยังไม่ต้องตั้งค่า Webhook ตอนนี้ (ต้องรอ URL จาก Vercel ในขั้นตอนถัดไปก่อน)

---

## ขั้นตอนที่ 4: Deploy ขึ้น Vercel

**ถ้าใช้ GitHub (แนะนำ):**
1. สร้าง repo ใหม่บน GitHub แล้วอัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้นไป
2. เข้า https://vercel.com → New Project → เลือก repo นี้ → Deploy

**ถ้าไม่อยากใช้ GitHub ใช้ Vercel CLI ก็ได้:**
```bash
npm install -g vercel
cd fb-gemini-autobot
vercel login
vercel --prod
```

**ตั้งค่า Environment Variables** ที่ Vercel Dashboard → Project → Settings → Environment Variables ใส่ทั้ง 5 ตัวนี้:
- `FB_VERIFY_TOKEN` (ตั้งเองเป็นสตริงอะไรก็ได้ เช่น `my-secret-123`)
- `FB_PAGE_ACCESS_TOKEN` (จากขั้นตอนที่ 3)
- `GEMINI_API_KEY` (จากขั้นตอนที่ 2)
- `GEMINI_MODEL` (ใส่ `gemini-2.5-flash` หรือรุ่นฟรีล่าสุด)
- `SHEET_CSV_URL` (จากขั้นตอนที่ 1)

ใส่ค่าเสร็จแล้ว **Redeploy** อีกครั้งเพื่อให้ env vars มีผล

หลัง deploy เสร็จ จะได้ URL ประมาณ `https://your-project.vercel.app` → webhook endpoint ของคุณคือ:
```
https://your-project.vercel.app/api/webhook
```

---

## ขั้นตอนที่ 5: เชื่อม Webhook กับ Facebook

1. กลับไปที่ Facebook App → Messenger > Settings → Webhooks → **Add Callback URL**
2. **Callback URL**: `https://your-project.vercel.app/api/webhook`
3. **Verify Token**: ใส่ค่าเดียวกับ `FB_VERIFY_TOKEN` ที่ตั้งไว้ใน Vercel
4. กด Verify and Save (ถ้า verify ไม่ผ่าน เช็คว่า deploy สำเร็จหรือยัง และ token ตรงกันจริง)
5. Subscribe field เลือก `messages` (และ `messaging_postbacks` ถ้าต้องการ)
6. เลือก Page ของคุณให้ subscribe เข้ากับ webhook นี้

จากนั้นลองแชทเข้าเพจดูได้เลย — ข้อความจะวิ่งไปหา Gemini พร้อมข้อมูลจาก Sheet แล้วตอบกลับอัตโนมัติ

---

## เรื่อง "Claude เป็นระบบหัวหน้าคอยแก้ไข workflow"

ขอพูดตรง ๆ เพื่อไม่ให้เข้าใจผิด: **Claude เวอร์ชันฟรีในหน้าแชทนี้ (claude.ai) ไม่สามารถเชื่อมต่อเข้าไปแก้โค้ดใน Vercel/GitHub ของคุณเองแบบอัตโนมัติได้** เพราะไม่มีการเข้าถึง API หรือ repo ของคุณโดยตรง (ต้องใช้เครื่องมืออย่าง Claude Code ถึงจะแก้ไฟล์ในเครื่อง/repo ให้อัตโนมัติ ซึ่งเป็นคนละโปรดักต์)

สิ่งที่ทำได้จริงตอนนี้แบบฟรี คือใช้ Claude เป็น **"ที่ปรึกษา"**: เวลาระบบมีปัญหา
1. ก็อป error log จาก Vercel (Project → Deployments → Logs) หรือโค้ดไฟล์ที่มีปัญหา มาวางในแชทนี้
2. บอกอาการที่เจอ (เช่น "บอทไม่ตอบ", "ตอบผิด", "error 500")
3. Claude จะช่วยวิเคราะห์และให้โค้ดที่แก้แล้ว ให้คุณคัดลอกไปแก้ในไฟล์จริงแล้ว deploy ใหม่

ถ้าอยากได้ระบบที่ Claude แก้โค้ดให้อัตโนมัติจริง ๆ (ไม่ต้องคัดลอกเอง) ตัวเลือกที่ใกล้เคียงที่สุดคือ Claude Code ต่อกับ repo ของคุณ ซึ่งมีทั้งแบบฟรีจำกัดโควตาและแบบเสียเงิน แต่ไม่ใช่สิ่งที่ตั้งค่าอัตโนมัติในเวิร์กโฟลว์นี้ได้เอง

---

## Troubleshooting ที่เจอบ่อย

- **Webhook verify ไม่ผ่าน**: เช็ค `FB_VERIFY_TOKEN` ใน Vercel กับที่กรอกในหน้า Facebook ต้องเหมือนกันเป๊ะ, เช็คว่า deploy ล่าสุดสำเร็จ
- **ตอน deploy ขึ้น log ว่า `WARNING! Build output contains no "functions" or "static" directory; the build may not have produced any deployable output.`**: แปลว่า Vercel หาโฟลเดอร์ `api/` ไม่เจอตอน build ทำให้ webhook จะเข้าไม่ถึง (ยิงแล้วได้ 404) วิธีแก้:
  1. โปรเจกต์นี้มี `vercel.json` มาให้แล้ว (ระบุ runtime ของ `api/*.js` ชัดเจน) ให้แน่ใจว่าไฟล์นี้ถูกอัปโหลด/commit ขึ้นไปด้วย แล้วลอง Redeploy
  2. เช็ค **Project Settings → Build & Development Settings → Root Directory**: ต้องชี้ไปที่โฟลเดอร์ที่มี `api/` อยู่ตรง ๆ (ถ้า repo มีโฟลเดอร์ซ้อนกันหลายชั้น แล้ว Root Directory ตั้งผิดชั้น จะหา `api/` ไม่เจอ)
  3. เช็ค **Framework Preset** ในหน้าเดียวกัน ให้ตั้งเป็น **"Other"** (ไม่ใช่ Next.js/CRA/Vite ฯลฯ เพราะโปรเจกต์นี้ไม่ได้ใช้เฟรมเวิร์กพวกนั้น)
  4. เช็คว่าไฟล์ `api/webhook.js` ถูก push ขึ้น GitHub จริง (หรือถ้าใช้ Vercel CLI ให้รันคำสั่ง `vercel --prod` จาก **โฟลเดอร์ที่มี `api/` อยู่ข้างใน** ไม่ใช่โฟลเดอร์แม่)
  5. แก้ตามข้างบนแล้ว กด Redeploy อีกครั้ง แล้วเช็คใน Deployments ว่ามี `api/webhook.js` ขึ้นเป็น Function จริง (ดูได้ที่แท็บ "Functions" ของ deployment นั้น)
- **บอทไม่ตอบเลย**: เข้า Vercel → Deployments → เลือก deployment ล่าสุด → ดู Logs ว่า error อะไร (มักเป็น env var หายหรือพิมพ์ผิด)
- **Gemini ตอบ error 400/403**: เช็ค `GEMINI_API_KEY` และเช็คว่าโมเดลใน `GEMINI_MODEL` ยังไม่ถูกปิดใช้งาน (Google ปิดโมเดลเก่าเรื่อย ๆ)
- **บอทตอบวนซ้ำตัวเอง**: อย่าลืมเช็ค `event.message.is_echo` (มีอยู่ในโค้ดแล้ว) ป้องกันบอทรับข้อความที่ตัวเองส่งออกไปมาตอบซ้ำ
- **อยากให้ตอบแม่นขึ้น**: เพิ่มข้อมูลใน Google Sheet ให้ละเอียดขึ้น เพราะบอทตอบตามข้อมูลใน Sheet เป็นหลัก
