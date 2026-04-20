import { jwtVerify } from "jose";
import { cookies } from "next/headers";

if (!process.env.ADMIN_JWT_SECRET || process.env.ADMIN_JWT_SECRET === "demis-admin-secret-change-me") {
  console.warn("⚠️  ADMIN_JWT_SECRET is missing or using the default — set a strong secret in production!");
}
const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "demis-admin-secret-change-me"
);

export type AdminPayload = {
  sub: string;
  email: string;
  name: string;
  role: string;
};

/** Verify admin JWT from cookies. Returns payload or null. */
export async function verifyAdmin(): Promise<AdminPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AdminPayload;
  } catch {
    return null;
  }
}

/** Require admin auth — returns 401 response if not authenticated */
export async function requireAdmin() {
  const admin = await verifyAdmin();
  if (!admin) {
    return { admin: null, unauthorized: true };
  }
  return { admin, unauthorized: false };
}
