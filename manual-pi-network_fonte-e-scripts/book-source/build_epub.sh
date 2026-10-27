#!/usr/bin/env bash
# Gera o EPUB a partir dos mesmos arquivos Markdown. Uso: DRAFT=1 ./build_epub.sh
set -e
cd "$(dirname "$0")"
mkdir -p work dist
DRAFT="${DRAFT:-1}"
OUTNAME="Manual-Pi-Network_Edicao-1.0.epub"
EDLABEL="Edição 1.0"
if [ "$DRAFT" = "1" ]; then OUTNAME="Manual-Pi-Network_v0.1-RASCUNHO.epub"; EDLABEL="Edição 1.0 (rascunho v0.1)"; fi
python3 - << PY
import os, re
here = os.getcwd()
draft = os.environ.get("DRAFT", "1") == "1"
parts = [("Parte I","Começando com a Pi",range(1,6)),("Parte II","O mundo do dinheiro",range(6,10)),("Parte III","A Pi nesse cenário",range(10,14)),("Parte IV","Brasil",[14,15]),("Parte V","Avançado e ação",[16,17,18]),("Parte VI","Tecnologia e futuro",[19,20,21,22]),("Fechamento","Plano, glossário e fontes",[23])]
out = []
if draft:
    out.append("> **RASCUNHO DE DESENVOLVIMENTO (v0.1).** Esta versão serve para testar entrega e leitura. Não publicar nem vender: faltam verificação em fontes primárias e revisão de contador e advogado.\n")
ab = open("abertura.md", encoding="utf-8").read().replace('<div class="front">', '').replace('</div>', '')
out.append(ab)
for pn, pt, chs in parts:
    out.append(f"\n# {pn} — {pt}\n")
    for n in chs:
        out.append(open(f"chapters/{n:02d}.md", encoding="utf-8").read() + "\n")
open("work/book_epub.md", "w", encoding="utf-8").write("\n".join(out))
PY
cat > work/epub.css << 'CSS'
body { font-family: serif; line-height: 1.5; }
h1 { color: #1F3A5F; text-align: center; margin-top: 2em; }
h2 { color: #1F3A5F; border-bottom: 1px solid #1F3A5F; padding-bottom: .2em; }
h3 { color: #1F3A5F; }
table { border-collapse: collapse; width: 100%; font-size: .85em; margin: 1em 0; }
th { background: #1F3A5F; color: #fff; padding: .3em; text-align: left; }
td { border: 1px solid #c8d2de; padding: .3em; vertical-align: top; }
blockquote { border-left: 4px solid #B3261E; padding-left: .8em; color: #B3261E; }
CSS
# capa a partir do PDF da capa (sem marca d'água)
pdftoppm -r 90 -png -f 1 -l 1 -singlefile work/cover.pdf work/cover
pandoc work/book_epub.md -f gfm -o "dist/$OUTNAME" --toc --toc-depth=2 --split-level=2 \
  --css=work/epub.css --epub-cover-image=work/cover.png \
  --metadata title="Manual Pi Network — Do primeiro clique ao uso consciente: Pi, dinheiro, tecnologia e Brasil" \
  --metadata author="isar.pi" --metadata lang=pt-BR --metadata date="2026-10" \
  --metadata rights="Material educativo e independente. Não afiliado à Pi Core Team." \
  --metadata subtitle="$EDLABEL"
echo "EPUB: dist/$OUTNAME"
