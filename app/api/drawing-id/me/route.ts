import { type NextRequest } from "next/server";
import { getDrawingIdStatus } from "../../../../lib/drawing-id/sso";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { return getDrawingIdStatus(request); }
