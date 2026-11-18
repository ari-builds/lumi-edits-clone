// Minimal AWS SigV4 presigned PUT URL generator for Neon Object Storage (zero deps).
const crypto = require('crypto');

function hmac(key, str) { return crypto.createHmac('sha256', key).update(str).digest(); }
function sha256hex(str) { return crypto.createHash('sha256').update(str).digest('hex'); }
function rfc3986(str) { return encodeURIComponent(str).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()); }

function presignPut({ key, contentType, expires = 3600 }) {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const region = process.env.AWS_REGION || 'us-east-2';
  const bucket = process.env.S3_BUCKET;
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secret = process.env.AWS_SECRET_ACCESS_KEY;
  if (!endpoint || !bucket || !accessKey || !secret) throw new Error('S3 env not configured');

  const url = new URL(endpoint);
  const host = url.host;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);
  const credential = `${accessKey}/${dateStamp}/${region}/s3/aws4_request`;

  // Path-style: /bucket/key  (each segment RFC3986 encoded)
  const canonicalUri = '/' + bucket + '/' + key.split('/').map(rfc3986).join('/');

  const query = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': 'host',
  };
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${rfc3986(k)}=${rfc3986(query[k])}`)
    .join('&');

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  const payloadHash = 'UNSIGNED-PAYLOAD';

  const canonicalRequest = [
    'PUT', canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash,
  ].join('\n');

  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256', amzDate, scope, sha256hex(canonicalRequest),
  ].join('\n');

  const kDate = hmac('AWS4' + secret, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const uploadUrl = `${endpoint}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
  const publicUrl = `${endpoint}${canonicalUri}`;
  return { uploadUrl, publicUrl, key, contentType, expires };
}

module.exports = { presignPut };
