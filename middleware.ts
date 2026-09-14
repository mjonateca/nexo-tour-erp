import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: Parameters<NextResponse["cookies"]["set"]>[2] };

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const appDomain = (process.env.NEXT_PUBLIC_APP_DOMAIN ?? "nexo-tour-erp.vercel.app").toLowerCase();
  const suffix = `.${appDomain}`;
  const subdomain = host.endsWith(suffix) ? host.slice(0, -suffix.length) : "";

  if (subdomain && !subdomain.includes(".") && pathname !== "/login" && !pathname.startsWith("/agencia/")) {
    const storefrontUrl = request.nextUrl.clone();
    storefrontUrl.pathname = `/agencia/${subdomain}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(storefrontUrl);
  }

  if (pathname === "/login" || pathname.startsWith("/agencia/")) {
    return response;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, { cookies: { getAll: () => request.cookies.getAll(), setAll: (cookies: CookieToSet[]) => { cookies.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
