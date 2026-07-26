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
หน้าที่ของคุณ: ตอบคำถามลูกค้าโดยอ้างอิงจาก "ข้อมูลอ้างอิง" ด้านล่างเท่านั้น
ถ้าไม่มีข้อมูลที่เกี่ยวข้องกับคำถาม ให้ตอบว่าจะแจ้งแอดมินให้ช่วยตรวจสอบเพิ่มเติม
ห้ามเดาหรือแต่งข้อมูลที่ไม่มีในตาราง

ข้อมูลอ้างอิง (CSV จาก Google Sheet):
${sheetContext}

คำถามจากลูกค้า: ${question}

ตอบเป็นภาษาที่ลูกค้าถามมา สุภาพ เป็นกันเอง แบบแชท ไม่ต้องบอกว่าอ้างอิงจากที่ไหน`;

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
