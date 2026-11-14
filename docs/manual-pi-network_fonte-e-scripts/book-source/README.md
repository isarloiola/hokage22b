# Manual Pi Network (isar.pi): fonte do livro e scripts de montagem

Conteúdo-fonte do e-book em Markdown e os scripts que geram o PDF e o EPUB. Edite os arquivos `.md`, rode os scripts e publique os arquivos de `dist/`.

## Estrutura

- `abertura.md`: ficha técnica, aviso legal (minuta), rotas de leitura, legenda das etiquetas e bônus.
- `chapters/01.md` a `chapters/23.md`: os 23 capítulos (título do capítulo em `##`, seções em `###`).
- `style.css`: estilo do PDF.
- `build.py`: gera o PDF (capa, sumário com páginas, partes, capítulos, rodapé e numeração).
- `build_epub.sh`: gera o EPUB a partir dos mesmos arquivos.
- `stamp_buyer.py`: carimba uma cópia do PDF com os dados do comprador (nome, e-mail, pedido), para uso na entrega.

## Requisitos (Linux)

`pandoc`, `wkhtmltopdf`, `qpdf`, `poppler-utils` (pdftotext, pdftoppm), Python 3 com `pypdf`, `reportlab` e `Pillow`.

```bash
pip install pypdf reportlab pillow
```

## Gerar

```bash
# Rascunho (marca d'água "RASCUNHO v0.1" e aviso na abertura)
DRAFT=1 python3 build.py
DRAFT=1 ./build_epub.sh

# Edição final (sem marca d'água)
DRAFT=0 python3 build.py
DRAFT=0 ./build_epub.sh
```

Saída em `dist/`:

- `Manual-Pi-Network_v0.1-RASCUNHO.pdf` / `.epub` (rascunho)
- `Manual-Pi-Network_Edicao-1.0.pdf` / `.epub` (final)

## Carimbar por comprador

```bash
python3 stamp_buyer.py dist/Manual-Pi-Network_Edicao-1.0.pdf saida.pdf \
  --name "Nome Sobrenome" --email comprador@exemplo.com --order PED-000123
```

## Antes de gerar a edição final

1. Resolver os itens críticos da Lista mestra de verificação (A1 a A7) e conferir o aplicativo da Pi (B1 a B5).
2. Revisão de contador (capítulos 13 a 15) e de advogado (aviso legal, reembolso, publicidade, CVM, capítulo 17).
3. Substituir os campos entre colchetes em `abertura.md` (suporte, reembolso, direitos).
4. Remover o texto de rascunho e conferir todos os links.
5. Atualizar capítulos marcados como trimestrais depois da Cúpula do Ecossistema da Pi (17 a 19/11/2026).

## Observações

- O `wkhtmltopdf` desta instalação ignora opções de rodapé e zoom; por isso o rodapé e a numeração são aplicados pelo `build.py` com `reportlab` e `pypdf`.
- Os arquivos `.md` já incluem as correções feitas depois da redação inicial (lista KYB com 12 nomes, Resoluções BCB 588/591/584, tarifas dos EUA, GENIUS Act, CVM 249 e outras).
