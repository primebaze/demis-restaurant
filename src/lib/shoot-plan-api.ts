import { NextResponse } from "next/server";
import { ShootValidationError } from "@/lib/shoot-plans";

export async function readShootBody(
  req: Request,
): Promise<Record<string, unknown>> {
  const raw = await req.text();
  if (raw.length > 750_000)
    throw new ShootValidationError(
      "This plan is too large. Shorten the shot notes.",
      "shots",
    );
  try {
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error();
    return body;
  } catch {
    throw new ShootValidationError(
      "The request could not be read. Try again.",
      "title",
    );
  }
}
export function shootApiError(error: unknown) {
  if (error instanceof ShootValidationError)
    return NextResponse.json(
      { error: error.message, field: error.field },
      { status: 400 },
    );
  // Do not expose database details or turn failed reads into an empty plan list.
  console.error(
    "Shoot plan request failed",
    error instanceof Error ? error.name : "Unknown error",
  );
  return NextResponse.json(
    { error: "Shoot plans are unavailable right now. Please try again." },
    { status: 503 },
  );
}
