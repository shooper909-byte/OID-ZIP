import { NextResponse } from "next/server";
import { db } from "../../../../../lib/database";
import { validateProductionEnvironment } from "../../../../../lib/config/env";

export async function GET() {
  try {
    if (process.env.NODE_ENV === "production" && validateProductionEnvironment().length) throw new Error("CONFIG");
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ready" });
  } catch {
    return NextResponse.json({ status: "not_ready" }, { status: 503 });
  }
}
