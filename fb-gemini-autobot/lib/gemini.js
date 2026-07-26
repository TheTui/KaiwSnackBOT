// เรียก Gemini API ผ่าน API key ฟรีจาก Google AI Studio (aistudio.google.com)
//
// หมายเหตุเรื่องชื่อโมเดล: Google เปลี่ยนรุ่นโมเดลบ่อย (ปิดรุ่นเก่า/ออกรุ่นใหม่เรื่อย ๆ)
// ให้เช็กชื่อโมเดลฟรีล่าสุดที่ https://ai.google.dev/gemini-api/docs/pricing ก่อนใช้งานจริง
// ณ กลางปี 2026 รุ่นที่ยังฟรีอยู่คือตระกูล Flash / Flash-Lite (ไม่ใช่ Pro)
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

async function askGemini(question, sheetContext) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY ยังไม่ได้ตั้งค่าใน environment variables');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const prompt = `คุณคือแอดมินตอบแชทลูกค้าของเพจ Facebook

หน้าที่ของคุณคือ ตอบคำถามโดยอ้างอิงจากข้อมูลอ้างอิงด้านล่างเท่านั้น

กฎสำคัญ
1. ห้ามแต่งข้อมูล หรือเดาข้อมูล
2. หากไม่มีข้อมูล ให้ตอบว่า "ขออนุญาตแจ้งแอดมินตรวจสอบเพิ่มเติมนะคะ"
3. หากข้อมูลมีหลายรายละเอียด ให้ตอบให้ครบทุกข้อ
4. ห้ามละเว้นข้อมูลสำคัญ เช่น
   - ราคา
   - โปรโมชั่น
   - ของแถม
   - ค่าส่ง
   - ระยะเวลาจัดส่ง
   - เงื่อนไขต่าง ๆ
5. หากข้อมูลมีหลายคอลัมน์ เช่น คำตอบ, คำตอบ2, คำตอบ3 ให้รวมทั้งหมดเป็นคำตอบเดียว
6. สามารถจัดรูปแบบเป็นหัวข้อย่อยเพื่อให้อ่านง่าย

ข้อมูลอ้างอิงจาก Google Sheet

${sheetContext}

คำถามของลูกค้า

${question}

ตอบเป็นภาษาเดียวกับลูกค้า
ตอบสั้น กระชับ แต่ต้องครบทุกข้อมูลที่เกี่ยวข้อง`;

ข้อมูลอ้างอิง (CSV จาก Google Sheet):
${sheetContext}

คำถามจากลูกค้า: ${question}

ตอบจากข้อมูลอ้างอิงให้ครบทุกประเด็นที่เกี่ยวข้อง

ห้ามตัดรายละเอียดสำคัญออก เช่น
- ราคา
- โปรโมชั่น
- ของแถม
- ค่าส่ง
- เงื่อนไขต่าง ๆ

หากในข้อมูลมีหลายรายละเอียด ให้สรุปให้ครบทุกข้อ
ตอบเป็นภาษาที่ลูกค้าถามมา สุภาพ เป็นกันเอง แบบแชท`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 500 },
    }),
  });

  const data = await resp.json();

  if (!resp.ok) {
    console.error('Gemini API error:', data);
    throw new Error(data?.error?.message || 'Gemini API error');
  }

  const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return answer?.trim() || 'ขออภัยค่ะ ตอนนี้ระบบตอบไม่ได้ รบกวนรอแอดมินสักครู่นะคะ';
}

module.exports = { askGemini };
