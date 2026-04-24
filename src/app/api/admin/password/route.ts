import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { compareSync, hashSync } from "bcryptjs";
export const dynamic = "force-dynamic";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

export async function PATCH(req: Request) {
  const { admin, unauthorized } = await requireAdmin();
  if (unauthorized || !admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Both current and new password are required" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    const adminUser = await prisma.adminUser.findUnique({
      where: { id: admin.sub },
    });

    if (!adminUser) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    const valid = compareSync(currentPassword, adminUser.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
    }

    const newHash = hashSync(newPassword, 12);
    await prisma.adminUser.update({
      where: { id: admin.sub },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}
