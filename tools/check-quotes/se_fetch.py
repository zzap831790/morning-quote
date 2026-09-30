# Downloads one Standard Ebooks book from its GitHub repo and flattens it to plain text.
# Each chapter file is marked with a "##### text/<file>" line, which the checker uses for locations.
import html, re, sys, urllib.request

repo, out = sys.argv[1], sys.argv[2]
base = f"https://raw.githubusercontent.com/standardebooks/{repo}/master/src/epub/"
toc = urllib.request.urlopen(base + "toc.xhtml", timeout=30).read().decode("utf-8")
files = []
for h in re.findall(r'href="(text/[^"#]+)', toc):
    if h not in files:
        files.append(h)
parts = []
for f in files:
    x = urllib.request.urlopen(base + f, timeout=30).read().decode("utf-8")
    x = re.sub(r"<(br|/p|/h\d|/li|/blockquote|/header|/tr)[^>]*>", "\n", x)
    x = re.sub(r"<[^>]+>", "", x)
    parts.append(f"\n##### {f}\n" + html.unescape(x))
open(out, "w", encoding="utf-8").write("\n".join(parts))
print("got", out, f"({len(files)} files)")
