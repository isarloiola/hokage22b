# Catálogo Editorial de E-books — HOKAGE22B

Todos os projetos editoriais, fontes em Markdown, scripts de compilação e cópias mestras (`dist/`) dos e-books do portal **HOKAGE22B** estão centralizados e padronizados nesta pasta `ebooks/`.

---

## Estrutura Padronizada por Obra

Cada e-book segue exatamente a mesma organização interna:

```text
ebooks/
├── README.md                          # Este índice geral
├── manual-pi-network/                 # E-book 1: Manual Pi Network / Além do Clique (Gratuito)
│   ├── README.md
│   ├── assets/                        # Folhas de estilo (style.css) e recursos gráficos
│   ├── build/                         # Scripts de compilação (build.py, build_epub.sh, build_epub_site.js, stamp_buyer.py)
│   ├── content/                       # Textos-fonte em Markdown (abertura.md + chapters/01.md..23.md)
│   ├── dist/                          # Cópias mestras compiladas (.pdf, .epub, .html e capa)
│   └── plan/                          # Ficha técnica e metadados (produto.json)
│
├── pi-para-seu-negocio/               # E-book 2: Pi para seu Negócio (3.14 π / R$ 19,90)
│   ├── README.md
│   ├── assets/
│   ├── build/
│   ├── content/
│   ├── dist/                          # Capa oficial e artefatos finais
│   └── plan/                          # Ficha técnica e links comerciais (produto.json)
│
└── ia-na-pratica/                     # E-book 3: IA na Prática (7.50 π / R$ 47,00)
    ├── README.md
    ├── assets/                        # Folha de estilo editorial (style.css)
    ├── build/                         # Compiladores Node.js (compile_book.js, build_epub.js, book_standalone.html)
    ├── content/                       # 14 módulos completos em Markdown (00 a 13)
    ├── dist/                          # PDF (293 págs), EPUB, Bônus Checklist e Capas em alta resolução
    └── plan/                          # Planejamento editorial (01_planejamento_editorial.md)
```

---

## Segurança de Produção (Downloads e Capas no Site)

> **Importante:** Os arquivos públicos servidos pelo site em produção permanecem **intactos** em seus caminhos originais dentro de `site/` para nunca quebrar links, downloads ou imagens já publicados:

| Obra | Arquivos Públicos de Download (`site/downloads/`) | Capas Públicas (`site/assets/img/`) |
| :--- | :--- | :--- |
| **Manual Pi Network / Além do Clique** | `site/downloads/Manual-Pi-Network.pdf`<br>`site/downloads/Manual-Pi-Network.epub`<br>`site/downloads/Alem-do-Clique-Manual-Tecnico.pdf`<br>`site/downloads/Alem-do-Clique-Guia-Definitivo.epub`<br>`site/downloads/manual-tecnico.html` | `site/assets/img/ebook-cover.png` |
| **Pi para seu Negócio** | Entrega via Checkout Web3 Pi (`3.14 π`) / Hotmart (`A108356534I`) | `site/assets/img/ebook-pago-negocios.jpg` |
| **IA na Prática** | Entrega via Checkout Web3 Pi (`7.50 π`) / Hotmart (`J108469065H`) | `site/assets/img/ebook-ia-na-pratica.png`<br>`site/assets/img/ebook-ia-na-pratica-square.png` |
