import { getShootReference } from "@/lib/shoot-reference-api";
export const dynamic = "force-dynamic";
type Context = { params: { token: string } };
export function GET(req: Request, { params }: Context) {
  return getShootReference(req, { kind: "viewer", token: params.token });
}
