import { NextResponse } from "next/server";
import { requireBlogAuthor } from "@/lib/blog-auth";
export const dynamic = "force-dynamic";

export async function GET() {
  const { author, unauthorized } = await requireBlogAuthor();
  if (unauthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ author });
}
