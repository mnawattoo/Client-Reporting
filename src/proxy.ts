import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Public report links (/r/:token) and auth routes stay open; everything
// else under /dashboard requires a signed-in session.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = pathname.startsWith("/dashboard");
  if (isProtected && !req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
