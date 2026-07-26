// อ่านข้อมูลจาก Google Sheet ที่ "Publish to web" เป็น CSV แล้ว
// วิธีนี้ไม่ต้องใช้ Google Cloud service account เลย ฟรี 100% และตั้งค่าง่ายที่สุด
//
// วิธีหา URL: เปิด Google Sheet -> File -> Share -> Publish to web
// -> เลือกชีตที่ต้องการ -> เลือกฟอร์แมตเป็น "Comma-separated values (.csv)" -> Publish
// -> คัดลอกลิงก์ที่ได้มาใส่ใน SHEET_CSV_URL (environment variable)

let cache = { data: null, ts: 0 };
const CACHE_MS = 60 * 1000; // cache ไว้ 60 วินาที กัน Google บล็อกถ้ามีคนแชทถี่ ๆ

async function getSheetContext() {
  const now = Date.now();
  if (cache.data && now - cache.ts < CACHE_MS) {
    return cache.data;
  }

  const url = process.env.SHEET_CSV_URL;
  if (!url) {
    throw new Error('SHEET_CSV_URL ยังไม่ได้ตั้งค่าใน environment variables');
  }

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`โหลด Google Sheet ไม่สำเร็จ: ${resp.status}`);
  }

  const csvText = await resp.text();
  cache = { data: csvText, ts: now };
  return csvText;
}

module.exports = { getSheetContext };
