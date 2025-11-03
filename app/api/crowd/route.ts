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

const scoreFromLevel = (lvl: number | string | undefined) => {
  const n = Number(lvl);
  if (![1,2,3,4].includes(n)) return 3; 
  return n;
};

const excelEpoch = new Date(1899, 11, 30);
const dateSerialToISO = (serial?: number) => {
  if (serial === undefined || serial === null) return null;
  const d = new Date(excelEpoch.getTime() + serial * 86400000);
  return d.toISOString().split("T")[0];
};

const serialAndHourToDate = (serial?: number, hour?: number | string) => {
  if (serial === undefined || hour === undefined || hour === null) return null;
  const base = new Date(excelEpoch.getTime() + serial * 86400000);
  const h = Number(hour);
  const d = new Date(base);
  d.setHours(h, 0, 0, 0);
  return d;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const placeQuery = searchParams.get("place");           
    const limit = Math.max(1, Math.min(48, Number(searchParams.get("limit") || "12")));

    const dataPath = path.resolve(process.cwd(), "data", "crowd_predictions_next7days_with_levels.xlsx");
    if (!fs.existsSync(dataPath)) {
      console.warn("Excel not found at:", dataPath);
      return NextResponse.json(placeQuery ? { place: placeQuery, forecast: [], best: null } : [], { status: 200 });
    }

    const workbook = XLSX.read(fs.readFileSync(dataPath), { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Row[] = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) {
      return NextResponse.json(placeQuery ? { place: placeQuery, forecast: [], best: null } : [], { status: 200 });
    }

    if (placeQuery) {
      const canonicalName = Object.keys(placeCoordinates).find(
        (p) => p.toLowerCase() === placeQuery.toLowerCase()
      ) || placeQuery;

      const rowsForPlace = rows.filter(r =>
        (r.place || "").toString().trim().toLowerCase() === canonicalName.toLowerCase()
      );

      const withDate = rowsForPlace
        .map(r => {
          const dt = serialAndHourToDate(r.date, r.hour);
          return dt ? { ...r, when: dt } : null;
        })
        .filter(Boolean) as (Row & { when: Date })[];

      const now = new Date();
      const future = withDate
        .filter(r => r.when.getTime() >= now.getTime())
        .sort((a, b) => a.when.getTime() - b.when.getTime());

      const take = future.slice(0, limit);
      const need = limit - take.length;
      let extra: (Row & { when: Date })[] = [];
      if (need > 0) {
        extra = withDate
          .filter(r => !take.includes(r))
          .sort((a, b) => a.when.getTime() - b.when.getTime())
          .slice(0, need);
      }

      const picked = [...take, ...extra];

      const forecast = picked.map(item => {
        const lvlNum = Number(item.busyness_level);
        const lvl = levelMap[lvlNum] || "Moderate";
        return {
          iso: item.when.toISOString(),
          hour: item.when.getHours(),
          level: lvl,
          score: scoreFromLevel(item.busyness_level),
          date: dateSerialToISO(item.date),
        };
      });

      let best = null as null | (typeof forecast[number]);
      if (forecast.length) {
        const minScore = Math.min(...forecast.map(f => f.score));
        best = forecast.find(f => f.score === minScore) || null;
      }

      const coords = placeCoordinates[canonicalName];

      return NextResponse.json({
        place: canonicalName,
        coords: coords || null,
        forecast,
        best
      }, { status: 200 });
    }

    const now = new Date();
    const todayISO = now.toISOString().split("T")[0];
    const currentHour = now.getHours();

    const todayRows = rows.filter(r => dateSerialToISO(r.date) === todayISO);
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
