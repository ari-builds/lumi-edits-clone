// End-to-end test: presign -> PUT bytes -> GET public URL back.
// Reads S3 config from environment variables (AWS_ACCESS_KEY_ID etc.).
const { presignPut } = require('../api/_s3');

(async () => {
  const filename = 'test-' + Date.now() + '.mp4';
  const key = 'reels/' + filename;
  const bytes = Buffer.from('FAKEVIDEO-' + Date.now());
  const signed = presignPut({ key, contentType: 'video/mp4', expires: 900 });

  const put = await fetch(signed.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'video/mp4' }, body: bytes });
  console.log('PUT status:', put.status);
  if (!put.ok) console.log('PUT body:', (await put.text()).slice(0, 300));

  const get = await fetch(signed.publicUrl);
  console.log('GET status:', get.status);
  if (get.ok) {
    const text = await get.text();
    console.log('round-trip match:', text === bytes.toString());
  }
  console.log('public URL:', signed.publicUrl);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
