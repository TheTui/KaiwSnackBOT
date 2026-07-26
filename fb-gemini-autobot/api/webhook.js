const { getSheetContext } = require('../lib/sheet');
const { askGemini } = require('../lib/gemini');
const { sendMessage } = require('../lib/facebook');

module.exports = async (req, res) => {
  // ----- 1) Facebook เรียกมาแบบ GET เพื่อ "verify" webhook ตอนตั้งค่าครั้งแรก -----
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.FB_VERIFY_TOKEN) {
      console.log('Webhook verified!');
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  // ----- 2) Facebook ส่งข้อความลูกค้ามาแบบ POST -----
  if (req.method === 'POST') {
    try {
      const body = req.body;

      if (body.object !== 'page') {
        return res.status(404).send('Not Found');
      }

      // ตอบ 200 กลับให้ Facebook ทันที ไม่ต้องรอ Gemini (ป้องกัน timeout/ส่งซ้ำ)
      res.status(200).send('EVENT_RECEIVED');

      for (const entry of body.entry || []) {
        const event = entry.messaging && entry.messaging[0];
        if (!event) continue;

        const senderId = event.sender && event.sender.id;
        const text = event.message && event.message.text;

        // ข้ามกรณีที่ไม่ใช่ข้อความตัวหนังสือ เช่น sticker, delivery receipt, echo ของแอดมินเอง
        if (!senderId || !text || event.message.is_echo) continue;

        try {
          const context = await getSheetContext();
          const answer = await askGemini(text, context);
          await sendMessage(senderId, answer);
        } catch (innerErr) {
          console.error('Error handling message:', innerErr);
          await sendMessage(
            senderId,
            'ขออภัยค่ะ ระบบขัดข้องชั่วคราว รบกวนรอสักครู่แล้วลองพิมพ์ใหม่อีกครั้งนะคะ'
          ).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Webhook error:', err);
      // เผื่อ error เกิดก่อนที่จะ res.status(200) ไปแล้ว
      if (!res.headersSent) res.status(500).send('Error');
    }
    return;
  }

  return res.status(405).send('Method Not Allowed');
};
