import { startDrawingId } from "../../../../lib/drawing-id/sso";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() { return startDrawingId(); }
