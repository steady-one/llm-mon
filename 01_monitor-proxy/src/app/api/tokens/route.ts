import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tokens = await prisma.monitorToken.findMany({
    where: { orgId: session.user.id },
    select: {
      id: true,
      tokenPrefix: true,
      name: true,
      isActive: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ tokens })
}

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { name } = body

  // Generate token
  const rawToken = `mon_${crypto.randomBytes(24).toString("hex")}`
  const tokenHash = await bcrypt.hash(rawToken, 10)
  const tokenPrefix = rawToken.substring(0, 12)

  await prisma.monitorToken.create({
    data: {
      orgId: session.user.id,
      tokenHash,
      tokenPrefix,
      name: name || null,
    },
  })

  return NextResponse.json({
    message: "Token created",
    token: rawToken,
    tokenPrefix,
  })
}

export async function DELETE(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const tokenId = searchParams.get("id")

  if (!tokenId) {
    return NextResponse.json({ error: "Token ID required" }, { status: 400 })
  }

  // Verify token belongs to user
  const token = await prisma.monitorToken.findUnique({
    where: { id: tokenId },
  })

  if (!token || token.orgId !== session.user.id) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 })
  }

  await prisma.monitorToken.delete({
    where: { id: tokenId },
  })

  return NextResponse.json({ message: "Token deleted" })
}
