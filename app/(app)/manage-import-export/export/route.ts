import { NextResponse } from "next/server";
import { ROUTES } from "@/app/lib/constants";

export async function GET(request: Request) {
  return NextResponse.redirect(new URL(`${ROUTES.MANAGE_IMPORT_EXPORT}/export`, request.url));
}
