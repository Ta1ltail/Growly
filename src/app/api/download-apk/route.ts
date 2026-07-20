import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const APK_PATH = path.join(process.cwd(), "public", "growly-v2.2.5.apk");
const APK_MIME = "application/vnd.android.package-archive";

export async function GET() {
  try {
    if (!fs.existsSync(APK_PATH)) {
      return new NextResponse("APK not found", { status: 404 });
    }

    const stat = fs.statSync(APK_PATH);
    const fileBuffer = fs.readFileSync(APK_PATH);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": APK_MIME,
        "Content-Length": String(stat.size),
        "Content-Disposition": 'attachment; filename="growly-v2.2.5.apk"',
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return new NextResponse("Failed to serve download", { status: 500 });
  }
}
