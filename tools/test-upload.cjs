// End-to-end test: presign -> PUT bytes -> GET public URL back.
process.env.AWS_ACCESS_KEY_ID = 'nak_live_fa7f32562ccd4a4291c90127f8ffe552';
process.env.AWS_SECRET_ACCESS_KEY = 'nsk_live_2ffbc57514f754ec02b823cf6038caa839e05355a5e33420c2d36e1879f29657';
process.env.AWS_ENDPOINT_URL_S3 = 'https://br-tiny-dust-bdoop9n2.storage.c-8.us-east-2.aws.neon.tech';
process.env.AWS_REGION = 'us-east-2';
process.env.S3_BUCKET = 'lumi-media';
const { presignPut } = require('../api/_s3');

(async () => {
  const filename = 'test-' + Date.now() + '.mp4';
  const key = 'reels/' + filename;
  const bytes = Buffer.from('FAKEVIDEO-' + Date.now());
  const signed = presignPut({ key, contentType: 'video/mp4', expires: 900 });

  const put = await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4' },
    body: bytes,
  });
  console.log('PUT status:', put.status);

  const get = await fetch(signed.publicUrl);
  console.log('GET status:', get.status);
  const text = await get.text();
  console.log('round-trip match:', text === bytes.toString());
  console.log('public URL:', signed.publicUrl);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
