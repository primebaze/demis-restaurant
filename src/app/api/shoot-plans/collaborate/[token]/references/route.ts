import {
  getShootReference,
  uploadShootReference,
} from "@/lib/shoot-reference-api";
export const dynamic = "force-dynamic";
type Context = { params: { token: string } };
export function GET(req: Request, { params }: Context) {
  return getShootReference(req, { kind: "editor", token: params.token });
}
export function POST(req: Request, { params }: Context) {
  return uploadShootReference(req, { kind: "editor", token: params.token });
}
