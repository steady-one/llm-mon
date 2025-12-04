import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret');

export interface JWTPayload {
  orgId: string;
  email: string;
}

export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function generateApiKey(): Promise<{ key: string; prefix: string; hash: string }> {
  const rawKey = `gw_sk_${crypto.randomBytes(32).toString('hex')}`;
  const prefix = rawKey.substring(0, 14) + '...';
  const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
  return { key: rawKey, prefix, hash };
}

export async function verifyApiKey(key: string): Promise<{ valid: boolean; orgId?: string; keyId?: string }> {
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const apiKey = await prisma.apiKey.findFirst({
    where: { keyHash: hash, isActive: true },
  });
  if (apiKey) {
    return { valid: true, orgId: apiKey.orgId, keyId: apiKey.id };
  }
  return { valid: false };
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return prisma.organization.findUnique({ where: { id: payload.orgId } });
}
