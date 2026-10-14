import { NextResponse } from "next/server";
import { fetchStationMetar } from "@/lib/services/weather-service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const station = searchParams.get("station") || "HYD";

  try {
    const metar = await fetchStationMetar(station);
    return NextResponse.json({ ok: true, metar });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to fetch METAR" },
      { status: 500 }
    );
  }
}
