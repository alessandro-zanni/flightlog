"""Usage: python3 -I scripts/mbox-flights.py <file.mbox> <out.jsonl>
Keeps only flight-related mails (airline sender or flight keywords in subject) from a Takeout mbox."""
import json, mailbox, re, sys
from email.header import decode_header, make_header
from email.utils import parsedate_to_datetime
import html

AIRLINES = r"ryanair|easyjet|wizzair|vueling|volotea|transavia|lufthansa|ita-airways|itaairways|alitalia|airfrance|klm\.|britishairways|emirates|iberia|aegean|norwegian|flytap|turkishairlines|eurowings|aireuropa|airdolomiti|neos|blueair|jet2|flybe|tuifly|condor|swiss\.com|brusselsairlines|austrian|sas\.|finnair|aerlingus|qatarairways|etihad|airarabia|royalairmaroc|tunisair|egyptair|delta|united|americanairlines|jetblue|southwest|aircanada|singaporeair|cathaypacific|thaiairways|airasia|scoot|vistara|airindia|qantas|latam|avianca|copaair|logitravel|opodo|edreams|skyscanner|kiwi\.com|trip\.com|booking\.com|expedia|lastminute|momondo|checkfelix|volagratis|volagratis|trenitalia"
KEYWORDS = r"boarding pass|carta d.imbarco|e-?ticket|biglietto elettronico|itinerar|conferma (della )?prenotazione|booking confirmation|flight confirmation|your flight|il tuo volo|check-?in online|volo [A-Z]{2}\s?\d{2,4}|numero di prenotazione|reservation code"

def dec(v):
    try: return str(make_header(decode_header(v or "")))
    except Exception: return v or ""

def body(m):
    out = ""
    parts = m.walk() if m.is_multipart() else [m]
    for p in parts:
        if p.get_content_type() in ("text/plain", "text/html"):
            try: t = p.get_payload(decode=True).decode(p.get_content_charset() or "utf-8", "replace")
            except Exception: continue
            if p.get_content_type() == "text/html":
                t = re.sub(r"(?s)<(style|head|script).*?</\1>", " ", t); t = re.sub(r"<[^>]+>", " ", t); t = html.unescape(t)
            out += " " + t
    return re.sub(r"\s+", " ", out).strip()

n = kept = 0
with open(sys.argv[2], "w") as f:
    for m in mailbox.mbox(sys.argv[1]):
        n += 1
        frm, subj = dec(m["From"]), dec(m["Subject"])
        if not (re.search(AIRLINES, frm, re.I) or re.search(KEYWORDS, subj, re.I)):
            continue
        try: date = parsedate_to_datetime(m["Date"]).date().isoformat()
        except Exception: date = ""
        kept += 1
        f.write(json.dumps({"date": date, "from": frm, "subject": subj, "to": dec(m["To"]), "body": body(m)[:4000]}, ensure_ascii=False) + "\n")
print(n, "messages,", kept, "kept")
