import os, re, subprocess, sys, io
from pypdf import PdfReader, PdfWriter, Transformation
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors

DRAFT = os.environ.get("DRAFT", "1") == "1"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get("OUT_DIR", os.path.join(HERE, "dist"))
os.makedirs(OUT, exist_ok=True)
EDITION = "Edição 1.0" + (" (rascunho v0.1)" if DRAFT else "")
TITLE = "Manual Pi Network"
SUB = "Do primeiro clique ao uso consciente: Pi, dinheiro, tecnologia e Brasil"

parts = [
 ("Parte I", "Começando com a Pi", list(range(1, 6))),
 ("Parte II", "O mundo do dinheiro", list(range(6, 10))),
 ("Parte III", "A Pi nesse cenário", list(range(10, 14))),
 ("Parte IV", "Brasil", [14, 15]),
 ("Parte V", "Avançado e ação", [16, 17, 18]),
 ("Parte VI", "Tecnologia e futuro", [19, 20, 21, 22]),
 ("Fechamento", "Plano, glossário e fontes", [23]),
]

def read(path):
    return open(path, encoding="utf-8").read()

def chap_title(n):
    first = read(os.path.join(HERE, "chapters", f"{n:02d}.md")).splitlines()[0]
    return first.replace("## ", "").strip()

def pandoc(md, extra=None):
    cmd = ["pandoc", "-f", "gfm", "-t", "html5", "--no-highlight"]
    p = subprocess.run(cmd, input=md.encode("utf-8"), capture_output=True)
    if p.returncode: raise SystemExit(p.stderr.decode())
    return p.stdout.decode("utf-8")

def dot(html):
    # troca marcadores de cor por texto simples quando houver emoji
    for k, v in {"🔴": "●", "🟡": "●", "🟢": "●", "✅": "✔", "⏳": "…"}.items():
        html = html.replace(k, v)
    return html

def body_html():
    out = []
    for pi, (pn, pt, chs) in enumerate(parts):
        listing = "<br>".join(f"Capítulo {n} — {chap_title(n).split(' — ',1)[1]}" for n in chs)
        out.append(f'<div class="part"><div class="pn">{pn.upper()}</div><div class="pt">{pt}</div><div class="pc">{listing}</div></div>')
        for n in chs:
            out.append(pandoc(read(os.path.join(HERE, "chapters", f"{n:02d}.md"))))
    return dot("\n".join(out))

def toc_html(pages):
    rows = ['<div class="toc"><h2>Sumário</h2>']
    rows.append('<div class="tc"><b>Antes de começar</b> <span class="n">%s</span></div>' % pages.get("front", "00"))
    for pn, pt, chs in parts:
        rows.append('<div class="tp">%s — %s <span style="float:right;font-weight:normal">%s</span></div>' % (pn, pt, pages.get(pn, "00")))
        for n in chs:
            t = chap_title(n)
            rows.append('<div class="tc">%s <span class="n">%s</span></div>' % (t, pages.get(n, "00")))
    rows.append('</div>')
    return "\n".join(rows)

def doc(inner, toc):
    banner = ""
    if DRAFT:
        banner = '<div class="draft"><b>RASCUNHO DE DESENVOLVIMENTO (v0.1).</b> Esta versão serve para testar diagramação, entrega e download. Não publicar nem vender: faltam verificação em fontes primárias e revisão de contador e advogado.</div>'
    front = pandoc(read(os.path.join(HERE, "abertura.md")))
    return f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>{TITLE}</title>
<link rel="stylesheet" href="style.css"></head><body>
{banner}{front}
{toc}
{inner}
</body></html>"""

def cover_html():
    flag = '<div style="margin-top:16mm;display:inline-block;border:1.5px solid #fff;padding:2.5mm 5mm;font-size:10pt;letter-spacing:2px;">RASCUNHO v0.1 · NÃO PUBLICAR</div>' if DRAFT else ""
    return f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<style>
html,body{{margin:0;padding:0;}}
body{{background:#1F3A5F;color:#fff;font-family:"DejaVu Sans",Arial,sans-serif;}}
.wrap{{height:297mm;width:210mm;box-sizing:border-box;padding:60mm 22mm 20mm 22mm;position:relative;}}
.brand{{font-size:12pt;letter-spacing:6px;color:#9fb4cf;}}
h1{{font-size:46pt;line-height:1.05;margin:14mm 0 0 0;color:#fff;font-weight:bold;}}
.sub{{font-size:15pt;line-height:1.35;margin-top:10mm;color:#dbe6f3;}}
.tag{{font-size:11pt;margin-top:14mm;color:#9fb4cf;line-height:1.6;}}
.foot{{position:absolute;left:22mm;right:22mm;bottom:18mm;font-size:8.5pt;color:#9fb4cf;line-height:1.5;border-top:1px solid #4a6489;padding-top:4mm;}}
</style></head><body><div class="wrap">
<div class="brand">ISAR.PI</div>
<h1>MANUAL<br>PI NETWORK</h1>
<div class="sub">{SUB}</div>
<div class="tag">Guia independente, com fatos separados de promessas.<br>{EDITION} · outubro de 2026</div>
{flag}
<div class="foot">Material educativo e independente. Não é material oficial da Pi Network, não é afiliado à Pi Core Team e não é recomendação de investimento.</div>
</div></body></html>"""

def wk(html_path, pdf_path, cover=False, offset=1):
    cmd = ["wkhtmltopdf", "--quiet", "--enable-local-file-access", "--page-size", "A4", "--encoding", "utf-8"]
    if cover:
        cmd += ["-T", "0", "-B", "0", "-L", "0", "-R", "0"]
    else:
        cmd += ["-T", "16mm", "-B", "20mm", "-L", "20mm", "-R", "20mm"]
    cmd += [html_path, pdf_path]
    if os.path.exists(pdf_path): os.remove(pdf_path)
    r = subprocess.run(cmd, capture_output=True)
    if not os.path.exists(pdf_path):
        raise SystemExit(r.stderr.decode())

def find_pages(pdf):
    n = len(PdfReader(pdf).pages)
    texts = []
    for i in range(1, n + 1):
        t = subprocess.run(["pdftotext", "-f", str(i), "-l", str(i), "-layout", pdf, "-"], capture_output=True).stdout.decode("utf-8", "ignore")
        texts.append(t)
    pages = {}
    for pn, pt, chs in parts:
        key = pn.upper()
        hits = [i for i, t in enumerate(texts) if re.search(r"^\s*" + re.escape(key) + r"\s*$", t, re.M)]
        if hits: pages[pn] = hits[-1] + 2  # +1 índice, +1 capa
        for c in chs:
            hits = [i for i, t in enumerate(texts) if re.search(r"^\s*Capítulo %d —" % c, t, re.M)]
            if hits: pages[c] = hits[-1] + 2
    pages["front"] = 2
    return pages

def watermark_pdf(n_w, n_h):
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(n_w, n_h))
    c.saveState()
    c.setFillColor(colors.Color(0.7, 0.1, 0.1, alpha=0.13))
    c.setFont("Helvetica-Bold", 62)
    c.translate(n_w / 2, n_h / 2)
    c.rotate(50)
    c.drawCentredString(0, 0, "RASCUNHO v0.1")
    c.setFont("Helvetica-Bold", 30)
    c.drawCentredString(0, -42, "NÃO PUBLICAR")
    c.restoreState()
    c.save(); buf.seek(0)
    return PdfReader(buf).pages[0]

def footer_pdf(n_w, n_h, num, total):
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(n_w, n_h))
    c.setFont("Helvetica", 7)
    c.setFillColor(colors.Color(0.35, 0.35, 0.35))
    c.drawString(20 * 2.83465, 10 * 2.83465, f"isar.pi  |  {TITLE}  |  {EDITION}")
    c.drawRightString(n_w - 20 * 2.83465, 10 * 2.83465, str(num))
    c.save(); buf.seek(0)
    return PdfReader(buf).pages[0]

def main():
    work = os.path.join(HERE, "work"); os.makedirs(work, exist_ok=True)
    inner = body_html()
    pages = {}
    html_path = os.path.join(work, "book.html")
    cover_path = os.path.join(work, "cover.html")
    open(cover_path, "w", encoding="utf-8").write(cover_html())
    open(os.path.join(work, "style.css"), "w", encoding="utf-8").write(read(os.path.join(HERE, "style.css")))
    for pas in (1, 2):
        open(html_path, "w", encoding="utf-8").write(doc(inner, toc_html(pages)))
        wk(html_path, os.path.join(work, "main.pdf"))
        pages = find_pages(os.path.join(work, "main.pdf"))
    # pass 3 para garantir estabilidade
    open(html_path, "w", encoding="utf-8").write(doc(inner, toc_html(pages)))
    wk(html_path, os.path.join(work, "main.pdf"))
    wk(cover_path, os.path.join(work, "cover.pdf"), cover=True)
    w = PdfWriter()
    for p in PdfReader(os.path.join(work, "cover.pdf")).pages[:1]: w.add_page(p)
    for p in PdfReader(os.path.join(work, "main.pdf")).pages: w.add_page(p)
    for idx, page in enumerate(w.pages):
        if idx == 0: continue
        page.merge_page(footer_pdf(float(page.mediabox.width), float(page.mediabox.height), idx + 1, len(w.pages)))
    if DRAFT:
        for page in w.pages:
            wm = watermark_pdf(float(page.mediabox.width), float(page.mediabox.height))
            page.merge_page(wm)
    w.add_metadata({"/Title": f"{TITLE} - {EDITION}", "/Author": "isar.pi", "/Subject": SUB})
    name = "Manual-Pi-Network_v0.1-RASCUNHO.pdf" if DRAFT else "Manual-Pi-Network_Edicao-1.0.pdf"
    outpdf = os.path.join(OUT, name)
    tmp = outpdf + ".tmp"
    with open(tmp, "wb") as f: w.write(f)
    subprocess.run(["qpdf", "--recompress-flate", "--compression-level=9", "--object-streams=generate", "--stream-data=compress", tmp, outpdf], check=True)
    os.remove(tmp)
    print("PDF:", outpdf, "paginas:", len(w.pages))
    print("paginas dos capitulos:", {k: v for k, v in pages.items()})

if __name__ == "__main__":
    main()
