import { NextRequest } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-fallback-secret-key-at-least-32-bytes-long'
);

interface UserSession {
  id: string;
  email: string;
  name: string;
}

// Helper to convert an object to a base64url encoded string
function base64UrlEncode(obj: any): string {
  const str = JSON.stringify(obj);
  const base64 = btoa(unescape(encodeURIComponent(str)));
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export async function createToken(payload: UserSession): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode({ ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 });

  const cryptoKey = await crypto.subtle.importKey(
    'raw', JWT_SECRET, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC', cryptoKey, new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  );
  
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureStr = String.fromCharCode(...signatureArray);
  const encodedSignature = btoa(signatureStr).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

export async function verifyAuth(req: NextRequest): Promise<UserSession | null> {
  const token = req.cookies.get('auth_token')?.value;
  if (!token) return null;

  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
    if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

    const cryptoKey = await crypto.subtle.importKey(
      'raw', JWT_SECRET, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );

    const verified = await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      Uint8Array.from(atob(encodedSignature.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
    );

    if (!verified) return null;

    const payload = JSON.parse(decodeURIComponent(escape(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/')))));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;

    return { id: payload.id, email: payload.email, name: payload.name };
  } catch {
    return null;
  }
}