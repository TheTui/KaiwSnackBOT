// ส่งข้อความกลับหาลูกค้าผ่าน Facebook Send API (ฟรี ไม่มีค่าใช้จ่าย)
async function sendMessage(recipientId, text) {
  const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageAccessToken) {
    throw new Error('FB_PAGE_ACCESS_TOKEN ยังไม่ได้ตั้งค่าใน environment variables');
  }

  const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
      messaging_type: 'RESPONSE',
    }),
  });

  const data = await resp.json();
  if (!resp.ok) {
    console.error('Facebook Send API error:', data);
  }
  return data;
}

module.exports = { sendMessage };
