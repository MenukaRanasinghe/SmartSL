import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

type Row = {
  place?: string;
  hour?: number | string;
  date?: number;            
  district?: string;        
  busyness_level?: number | string;
};

const placeCoordinates: Record<string, { lat: number; lon: number }> = {
  "Galle Face": { lat: 6.922, lon: 79.847 },
  Gangaramaya: { lat: 6.9147, lon: 79.8522 },
  "Diyatha Uyana": { lat: 6.9069, lon: 79.9099 },
  "Viharamahadevi Park": { lat: 6.914, lon: 79.861 },
  "Lotus Tower": { lat: 6.9272, lon: 79.8487 },

};

const levelMap: Record<number, string> = {
  1: "Quiet",
  2: "Moderate",
  3: "Busy",
  4: "Very Busy",
};

export async function GET() {
  try {
    const dataPath = path.resolve(process.cwd(), "data", "crowd_predictions_next7days_with_levels.xlsx");
    if (!fs.existsSync(dataPath)) {
      console.warn("Excel not found at:", dataPath);
      return NextResponse.json([], { status: 200 });
    }

    const workbook = XLSX.read(fs.readFileSync(dataPath), { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Row[] = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) return NextResponse.json([], { status: 200 });

    const now = new Date();
    const todayISO = now.toISOString().split("T")[0];
    const currentHour = now.getHours();

    const excelEpoch = new Date(1899, 11, 30);
    const toISO = (excelSerial?: number) => {
      if (!excelSerial && excelSerial !== 0) return null;
      const d = new Date(excelEpoch.getTime() + excelSerial * 86400000);
      return d.toISOString().split("T")[0];
    };

    const todayRows = rows.filter(r => toISO(r.date) === todayISO);
    let pool = todayRows.length ? todayRows : rows;

    const numericHour = (h: number | string | undefined) => (h === undefined ? NaN : Number(h));
    let chosen = pool.filter(r => numericHour(r.hour) === currentHour);
    if (!chosen.length) {
      chosen = [...pool].sort(
        (a, b) =>
          Math.abs(numericHour(a.hour) - currentHour) - Math.abs(numericHour(b.hour) - currentHour)
      );
    }

    const hasDistrictColombo = chosen.some(r => String(r.district || "").toLowerCase() === "colombo");
    const filtered = (hasDistrictColombo
      ? chosen.filter(r => String(r.district || "").toLowerCase() === "colombo")
      : chosen
    ).filter(r => r.place && placeCoordinates[String(r.place).trim()]);

    const result = filtered.map(r => {
      const name = String(r.place).trim();
      const coords = placeCoordinates[name]!;
      const levelNum = Number(r.busyness_level);
      return {
        id: `${name}-${r.hour ?? "unknown"}`,
        name,
        lat: coords.lat,
        lon: coords.lon,
        busyLevel: levelMap[levelNum] || "Moderate",
      };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("Excel read error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
