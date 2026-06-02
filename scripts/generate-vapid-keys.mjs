import { generateKeyPairSync } from 'node:crypto';

function base64UrlToBuffer(value) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  return Buffer.from((value + padding).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function bufferToBase64Url(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const publicJwk = publicKey.export({ format: 'jwk' });
const privateJwk = privateKey.export({ format: 'jwk' });

const x = base64UrlToBuffer(publicJwk.x);
const y = base64UrlToBuffer(publicJwk.y);
const publicRaw = Buffer.concat([Buffer.from([0x04]), x, y]);

console.log('PATRIOT_VAPID_PUBLIC_KEY=' + bufferToBase64Url(publicRaw));
console.log('PATRIOT_VAPID_PRIVATE_KEY=' + privateJwk.d);
console.log('PATRIOT_VAPID_SUBJECT=mailto:your-email@example.com');
