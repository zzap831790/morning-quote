import re, json

def load(path):
    t = open(path, encoding="utf-8", errors="replace").read().replace("\r", "")
    return t.replace("\u2060", "")

def wordspans(t):
    return [(m.group(0).lower().replace("’", "'").replace("‘", "'"), m.start(), m.end())
            for m in re.finditer(r"[A-Za-z’'‘]+", t)]

CACHE = {}
def locate(path, cand):
    if path not in CACHE:
        t = load(path); CACHE[path] = (t, wordspans(t))
    t, ws = CACHE[path]
    cw = [w.lower().replace("’", "'") for w in re.findall(r"[A-Za-z’']+", cand)]
    seq = [w for w, _, _ in ws]; n = len(cw); hits = []
    for i in range(len(seq) - n + 1):
        if seq[i] == cw[0] and seq[i:i + n] == cw:
            s, e = ws[i][1], ws[i + n - 1][2]
            while e < len(t) and t[e] in ".,;:!?\"'’”": e += 1
            hits.append((s, t[s:e]))
    return t, hits

def clean(span):
    span = re.sub(r"(?<=[A-Za-z,.;:!?’'”])\d+", "", span)   # footnote markers
    span = re.sub(r"\s+", " ", span).strip()
    span = span.replace("--", "—")
    span = span.strip("\"“”").strip()
    span = re.sub(r"\.{3,}$", ".", span)                           # trailing ellipsis where the quote is cut
    if span[-1] in ",;:": span = span[:-1] + "."                  # clause cut at a comma, colon or semicolon
    if span[0].islower(): span = span[0].upper() + span[1:]        # clause cut from mid sentence
    return span

HEAD = {  # regex for the headers that give a location, last match before the quote wins
 "karamazov.txt": [r"\n\s*(Book [IVXL]+)\.", r"\n\s*(Chapter [IVXL]+)\.", r"\n\s*(Epilogue)\n"],
 "crime.txt": [r"\n(PART [IVX]+|EPILOGUE)\n", r"\n(CHAPTER [IVX]+)\n"],
 "warpeace.txt": [r"\n(BOOK [A-Z]+(?:-[A-Z]+)?|FIRST EPILOGUE|SECOND EPILOGUE)(?::|\n)", r"\n(CHAPTER [IVXL]+)\n"],
 "resurrection.txt": [r"\n(BOOK [IVX]+)\.?\n", r"\n(CHAPTER [IVXL]+)\.\n"],
 "frankenstein.txt": [r"\n(Letter \d|Chapter \d+)\n"],
 "timemachine.txt": [r"\n\s*([IVX]+)\n\n"],
 "flatland.txt": [r"\n(SECTION \d+)\s"],
 "utopia.txt": [r"\n\s*(CHAPTER THE [A-Z]+)\b"],
 "se_meditations_long.txt": [r"##### text/(book-\d+)"],
 "se_epictetus_long.txt": [r"##### text/([a-z-]+)\.xhtml"],
 "se_confession_maude.txt": [r"##### text/(chapter-\d+)"],
}
def where(path, t, pos):
    out = []
    for rx in HEAD.get(path, []):
        ms = [m for m in re.finditer(rx, t[:pos])]
        if ms: out.append(ms[-1].group(1))
    return out

cands = json.load(open("../candidates.json"))
final, report = [], []
for c in cands:
    if c["file"] == "kjv":
        continue
    t, hits = locate(c["file"], c["text"])
    if not hits:
        report.append(f"NOT FOUND  {c['id']}: {c['text'][:70]}"); continue
    s, span = hits[0]
    q = dict(c); q["text"] = clean(span); q["located"] = where(c["file"], t, s); q["hits"] = len(hits)
    final.append(q); report.append(f"VERIFIED   {c['id']}  [{', '.join(q['located'])}]  hits={len(hits)}")
# King James: pull by verse number
kt = load("kjv.txt"); verses = {}
for m in re.finditer(r"^(\d\d):(\d\d\d):(\d\d\d) (.*?)(?=\n\s*\n|\n\d\d:\d\d\d:\d\d\d |\Z)", kt, re.S | re.M):
    verses[(int(m.group(1)), int(m.group(2)), int(m.group(3)))] = re.sub(r"\s+", " ", m.group(4)).strip()
for c in cands:
    if c["file"] != "kjv": continue
    b, ch, vs = c["verse"]
    got = [verses.get((b, ch, v)) for v in vs]
    if None in got: report.append(f"NOT FOUND  {c['id']}"); continue
    q = dict(c); q["text"] = clean(" ".join(got)); final.append(q)
    report.append(f"VERIFIED   {c['id']}  [{c['where']}]")
print("\n".join(report))
json.dump(final, open("verified.json", "w"), ensure_ascii=False, indent=1)
