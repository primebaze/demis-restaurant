import { jwtVerify } from "jose";
import { cookies } from "next/headers";

if (!process.env.BLOG_JWT_SECRET) {
  console.warn("⚠️  BLOG_JWT_SECRET is not set — blog admin will be disabled!");
}
const JWT_SECRET = process.env.BLOG_JWT_SECRET
  ? new TextEncoder().encode(process.env.BLOG_JWT_SECRET)
  : null;

export type BlogAuthorPayload = {
  sub: string;
  email: string;
  name: string;
};

export async function verifyBlogAuthor(): Promise<BlogAuthorPayload | null> {
  if (!JWT_SECRET) return null;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("blog_author_token")?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as BlogAuthorPayload;
  } catch {
    return null;
  }
}

export async function requireBlogAuthor() {
  const author = await verifyBlogAuthor();
  if (!author) {
    return { author: null, unauthorized: true };
  }
  return { author, unauthorized: false };
}

export { JWT_SECRET as BLOG_JWT_SECRET };
