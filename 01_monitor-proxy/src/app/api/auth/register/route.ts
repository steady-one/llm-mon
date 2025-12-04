import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      )
    }

    // Check if organization already exists
    const existingOrg = await prisma.organization.findUnique({
      where: { email },
    })

    if (existingOrg) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create organization
    const org = await prisma.organization.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    })

    // Generate initial monitor token
    const rawToken = `mon_${crypto.randomBytes(24).toString("hex")}`
    const tokenHash = await bcrypt.hash(rawToken, 10)
    const tokenPrefix = rawToken.substring(0, 12)

    await prisma.monitorToken.create({
      data: {
        orgId: org.id,
        tokenHash,
        tokenPrefix,
        name: "Default Token",
      },
    })

    return NextResponse.json({
      message: "Organization created successfully",
      organization: {
        id: org.id,
        name: org.name,
        email: org.email,
      },
      monitorToken: rawToken,
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
