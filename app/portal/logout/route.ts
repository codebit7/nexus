import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const cookieStore = cookies();
  cookieStore.delete("portal_client_id");
  cookieStore.delete("portal_csrf_token");

  const origin = new URL(request.url).origin;
  return NextResponse.redirect(new URL("/login", origin), { status: 303 });
}
