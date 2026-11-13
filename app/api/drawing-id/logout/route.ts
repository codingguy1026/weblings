import { type NextRequest } from "next/server";
import { signOutDrawingId } from "../../../../lib/drawing-id/sso";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) { return signOutDrawingId(request); }
