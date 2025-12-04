import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-me');

export interface JWTPayload {
  orgId: string;
  email: string;
}

// JWT 생성
export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

// JWT 검증
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// 비밀번호 해시
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// 비밀번호 검증
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Monitor Token 생성 (Pass-through용)
export async function generateMonitorToken(): Promise<{ token: string; prefix: string; hash: string }> {
  const rawToken = `mon_sk_${crypto.randomBytes(32).toString('hex')}`;
  const prefix = rawToken.substring(0, 15) + '...';
  const hash = await bcrypt.hash(rawToken, 10);
  return { token: rawToken, prefix, hash };
}

// API Key 생성 (Reseller용)
export async function generateApiKey(): Promise<{ key: string; prefix: string; hash: string }> {
  const rawKey = `llm_sk_${crypto.randomBytes(32).toString('hex')}`;
  const prefix = rawKey.substring(0, 15) + '...';
  const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
  return { key: rawKey, prefix, hash };
}

// Monitor Token 검증
export async function verifyMonitorToken(token: string): Promise<{ valid: boolean; orgId?: string; tokenId?: string }> {
  const monitorTokens = await prisma.monitorToken.findMany({
    where: { isActive: true },
  });

  for (const mt of monitorTokens) {
    const isValid = await bcrypt.compare(token, mt.tokenHash);
    if (isValid) {
      await prisma.monitorToken.update({
        where: { id: mt.id },
        data: { lastUsedAt: new Date() },
      });
      return { valid: true, orgId: mt.orgId, tokenId: mt.id };
    }
  }
  return { valid: false };
}

// API Key 검증 (Reseller용)
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

// 세션에서 현재 사용자 가져오기
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const org = await prisma.organization.findUnique({
    where: { id: payload.orgId },
  });

  return org;
}
