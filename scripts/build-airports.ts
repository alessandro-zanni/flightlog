// Usage: bun scripts/build-airports.ts <airports.csv> [airports.dat]
//   airports.csv: OurAirports (public domain), https://davidmegginson.github.io/ourairports-data/airports.csv
//   airports.dat: OpenFlights (ODbL), optional, adds the IANA timezone (tz),
//     https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat
// Keeps airports with an IATA code and scheduled service -> data/airports.json
import { readFileSync, writeFileSync } from "node:fs";

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

const [header, ...rows] = readFileSync(process.argv[2], "utf8").split("\n").filter(Boolean);
const cols = parseCsvLine(header);
const idx = (n: string) => cols.indexOf(n);

// OpenFlights: no header, IATA at index 4, tz database name at index 11, \N when missing.
const tzOf = new Map<string, string>();
if (process.argv[3])
  for (const row of readFileSync(process.argv[3], "utf8").split("\n").filter(Boolean)) {
    const c = parseCsvLine(row);
    if (c[4] && c[4] !== "\\N" && c[11] && c[11] !== "\\N") tzOf.set(c[4], c[11]);
  }

const airports: Record<string, { name: string; city: string; country: string; lat: number; lon: number; tz?: string }> = {};
for (const row of rows) {
  const c = parseCsvLine(row);
  const iata = c[idx("iata_code")];
  if (!iata || c[idx("scheduled_service")] !== "yes") continue;
  airports[iata] = {
    name: c[idx("name")],
    city: c[idx("municipality")],
    country: c[idx("iso_country")],
    lat: Number(c[idx("latitude_deg")]),
    lon: Number(c[idx("longitude_deg")]),
    tz: tzOf.get(iata),
  };
}
writeFileSync("data/airports.json", JSON.stringify(airports));
console.log(Object.keys(airports).length, "airports,", Object.values(airports).filter((a) => a.tz).length, "with tz");
