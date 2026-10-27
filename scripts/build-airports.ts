// Usage: bun scripts/build-airports.ts <airports.csv>  (OurAirports, public domain)
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

const airports: Record<string, { name: string; city: string; country: string; lat: number; lon: number }> = {};
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
  };
}
writeFileSync("data/airports.json", JSON.stringify(airports));
console.log(Object.keys(airports).length, "airports");
