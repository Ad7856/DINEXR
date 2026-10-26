import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export const middleware = (req: NextRequest) => updateSession(req);
export const config = { matcher: ["/admin/:path*", "/kitchen/:path*", "/api/staff/:path*", "/api/admin/:path*"] }; // customer pages never pay for a session check
