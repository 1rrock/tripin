import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/shared/lib/admin-auth";

export async function POST(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  const response = NextResponse.redirect(url, 303);
  response.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
