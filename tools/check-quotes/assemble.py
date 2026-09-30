import json, re
v = json.load(open("verified.json"))
ROMAN = {1:"I",2:"II",3:"III",4:"IV",5:"V",6:"VI",7:"VII",8:"VIII",9:"IX",10:"X",11:"XI",12:"XII"}
CHECKED = {
 "se_meditations_long.txt": "Standard Ebooks edition of George Long's translation",
 "se_epictetus_long.txt": "Standard Ebooks edition of George Long's translation",
 "se_confession_maude.txt": "Standard Ebooks edition of Aylmer Maude's translation",
 "karamazov.txt": "Project Gutenberg #28054, Garnett translation",
 "crime.txt": "Project Gutenberg #2554, Garnett translation",
 "warpeace.txt": "Project Gutenberg #2600, Maude translation",
 "resurrection.txt": "Project Gutenberg #1938, Louise Maude translation",
 "kjv": "Project Gutenberg #30, King James Version",
 "frankenstein.txt": "Project Gutenberg #84, 1831 text",
 "timemachine.txt": "Project Gutenberg #35",
 "flatland.txt": "Project Gutenberg #97",
 "utopia.txt": "Project Gutenberg #6424",
}
def title(s):
    return " ".join(w if re.fullmatch(r"[IVXL]+", w) else w.capitalize() for w in s.split())
out = []
for q in v:
    f, loc = q["file"], q.get("located", [])
    if f == "kjv":
        item = {"id": q["id"], "tradition": q["tradition"], "text": q["text"], "book": "The Bible",
                "author": None, "translator": "King James Version (1611)", "where": q["where"]}
    else:
        if "where" in q: where = q["where"]
        elif f == "se_meditations_long.txt": where = "Book " + ROMAN[int(loc[0].split("-")[1])]
        elif f == "se_confession_maude.txt": where = "Chapter " + ROMAN[int(loc[0].split("-")[1])]
        elif f == "karamazov.txt": where = ", ".join(loc[:2])
        elif f == "resurrection.txt": where = "Book I, " + title(loc[-1])
        elif f == "timemachine.txt": where = "Epilogue" if q["id"] == "scifi-07" else "Chapter " + loc[0]
        elif f == "utopia.txt": where = "Chapter 11"
        else: where = ", ".join(title(x) for x in loc)
        item = {"id": q["id"], "tradition": q["tradition"], "text": q["text"], "book": q["book"],
                "author": q["author"], "translator": q["translator"], "where": where}
    item["checkedAgainst"] = CHECKED[f]
    out.append(item)
json.dump({"version": 1, "quotes": out}, open("quotes.json", "w"), ensure_ascii=False, indent=2)
print(len(out), "quotes;", {t: sum(1 for i in out if i["tradition"] == t) for t in ["stoic","russian","scifi","scripture"]})
