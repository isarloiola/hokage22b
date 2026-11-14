#!/usr/bin/env python3
"""Carimba o PDF do e-book com os dados do comprador (marca d'água de rastreio) e grava metadados.

Uso:
  python3 stamp_buyer.py ENTRADA.pdf SAIDA.pdf --name "Nome Sobrenome" --email comprador@exemplo.com --order PED-000123

O carimbo aparece no rodapé de todas as páginas (exceto a capa) e nos metadados do arquivo.
Uso previsto: gerar uma cópia por compra, no momento da entrega, para desencorajar o compartilhamento.
Não substitui contrato, termos de uso nem proteção por link assinado e com prazo.
"""
import argparse, io, subprocess, os
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib import colors

def stamp_page(w, h, text):
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(w, h))
    c.setFont("Helvetica", 6.5)
    c.setFillColor(colors.Color(0.45, 0.45, 0.45))
    c.drawCentredString(w / 2, 5.5 * 2.83465, text)
    c.save(); buf.seek(0)
    return PdfReader(buf).pages[0]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("entrada"); ap.add_argument("saida")
    ap.add_argument("--name", required=True); ap.add_argument("--email", required=True); ap.add_argument("--order", required=True)
    a = ap.parse_args()
    r = PdfReader(a.entrada)
    w = PdfWriter()
    text = f"Licenciado para {a.name} <{a.email}> | Pedido {a.order} | Uso pessoal: não redistribuir"
    for i, p in enumerate(r.pages):
        if i > 0:
            p.merge_page(stamp_page(float(p.mediabox.width), float(p.mediabox.height), text))
        w.add_page(p)
    meta = dict(r.metadata or {})
    meta["/Keywords"] = f"order={a.order}"
    meta["/Subject"] = f"Licenciado para {a.email}"
    w.add_metadata({k: str(v) for k, v in meta.items()})
    tmp = a.saida + ".tmp"
    with open(tmp, "wb") as f: w.write(f)
    subprocess.run(["qpdf", "--recompress-flate", "--compression-level=9", "--object-streams=generate", "--stream-data=compress", tmp, a.saida], check=True)
    os.remove(tmp)
    print("ok:", a.saida)

if __name__ == "__main__":
    main()
