import {
  getShootReference,
  uploadShootReference,
} from "@/lib/shoot-reference-api";
export const dynamic = "force-dynamic";
type Context = { params: { id: string } };
export function GET(req: Request, { params }: Context) {
  return getShootReference(req, { kind: "admin", id: params.id });
}
export function POST(req: Request, { params }: Context) {
  return uploadShootReference(req, { kind: "admin", id: params.id });
}
