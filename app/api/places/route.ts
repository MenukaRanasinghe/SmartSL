export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

const placeCoordinates: Record<string, { lat: number; lon: number }> = {
  Sigiriya: { lat: 7.9576, lon: 80.7603 },
  Pidurangala: { lat: 7.9568, lon: 80.7453 },
  Kandalama: { lat: 7.8763, lon: 80.7043 },
  "Cave Temple": { lat: 7.856, lon: 80.649 },
  "Popham's Arboretum": { lat: 7.855, lon: 80.748 },
  "Sri Dalada Maligawa": { lat: 7.2936, lon: 80.6413 },
  "Leisure World Peradeniya": { lat: 7.2715, lon: 80.5956 },
  "Polgolla Dam": { lat: 7.328, lon: 80.662 },
  "Sahas Uyana": { lat: 7.3, lon: 80.65 },
  "Dunumadalawa Forest Reserve": { lat: 7.286, lon: 80.625 },
  Piduruthalagala: { lat: 7.005, lon: 80.78 },
  "Adam's Peak": { lat: 6.809, lon: 80.499 },
  "Horton Plains": { lat: 6.802, lon: 80.799 },
  "Gregory Park": { lat: 6.957, lon: 80.777 },
  "Devon Falls": { lat: 6.974, lon: 80.67 },
  "Galle Face": { lat: 6.922, lon: 79.847 },
  Gangaramaya: { lat: 6.9147, lon: 79.8522 },
  "Diyatha Uyana": { lat: 6.9069, lon: 79.9099 },
  "Viharamahadevi Park": { lat: 6.914, lon: 79.861 },
  "Lotus Tower": { lat: 6.9272, lon: 79.8487 },
};

export async function GET() {
  try {
    const dataPath = path.resolve(
      process.cwd(),
      "data",
      "crowd_predictions_next7days_with_levels.xlsx"
    );

    console.log("📁 Excel Path:", dataPath);

    if (!fs.existsSync(dataPath)) {
      console.error("❌ Excel file not found:", dataPath);
      return NextResponse.json([], { status: 200 });
    }

    const workbook = XLSX.read(fs.readFileSync(dataPath), { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
      console.warn("⚠️ No data rows found in Excel file.");
      return NextResponse.json([], { status: 200 });
    }

    const levelMap: Record<number, string> = {
      1: "Quiet",
      2: "Moderate",
      3: "Busy",
      4: "Very Busy",
    };

    const now = new Date();
    const todayISO = now.toISOString().split("T")[0];
    const currentHour = now.getHours();

    const excelEpoch = new Date(1899, 11, 30); // Excel date system base

    const todayRows = rows.filter((r) => {
      try {
        const dateObj = new Date(excelEpoch.getTime() + r.date * 86400000);
        const excelDate = dateObj.toISOString().split("T")[0];
        return excelDate === todayISO;
      } catch {
        return false;
      }
    });

    let filteredRows = todayRows.length > 0 ? todayRows : rows;

    let chosen = filteredRows.filter((r) => Number(r.hour) === currentHour);
    if (chosen.length === 0 && filteredRows.length > 0) {
      chosen = filteredRows.sort(
        (a, b) =>
          Math.abs(Number(a.hour) - currentHour) -
          Math.abs(Number(b.hour) - currentHour)
      );
    }

    if (chosen.length === 0) chosen = rows;

    console.log("🔍 Found rows:", chosen.length);
    console.log("🕒 Current date:", todayISO, "hour:", currentHour);
    console.log("📄 Example row:", chosen[0]);

    const result = chosen
      .map((r) => {
        const placeName = String(r.place || "").trim();
        const coords = placeCoordinates[placeName];
        if (!coords) {
          console.warn(`⚠️ No coordinates for: ${placeName}`);
          return null;
        }

        const level = Number(r.busyness_level);
        return {
          id: `${placeName}-${r.hour ?? "unknown"}`,
          name: placeName,
          lat: coords.lat,
          lon: coords.lon,
          busyLevel: levelMap[level] || "Moderate",
        };
      })
      .filter(Boolean);

    console.log(`✅ Returning ${result.length} places`);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("❌ Excel read error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}