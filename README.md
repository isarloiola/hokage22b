# HOKAGE22B — Ecossistema Web3 & Manual Pi Network

Portal educacional, Vitrine Web3 (`/@usuario`), Mural Comunitário (Gazeta dos Pioneiros) e referência aberta de arquitetura **custo zero** para aplicações na **Pi Network** usando **GitHub Pages + Supabase + Pi SDK v2.0**.

- **Portal Oficial:** [https://hokage22b.com](https://hokage22b.com)
- **GitHub Pages:** [https://isarloiola.github.io/hokage22b/](https://isarloiola.github.io/hokage22b/)
- **Documentação Técnica para Devs:** [docs/PI_DAPP_ARCHITECTURE.md](docs/PI_DAPP_ARCHITECTURE.md)

---

## Princípios de Arquitetura e Segurança

1. **Zero Passphrase / Zero Senha de Usuário:** O app nunca solicita a frase secreta de 24 palavras nem senha da conta Pi. Toda autenticação e assinatura de pagamento ocorrem exclusivamente via **Pi SDK oficial** dentro do Pi Browser.
2. **Backend Zero-Trust no Supabase:** Escritas sensíveis (perfis, anúncios, pagamentos e indicações) passam por **Supabase Edge Functions** que validam o `accessToken` diretamente em `https://api.minepi.com/v2/me`.
3. **Hospedagem Estática com Links Curtos (`/@usuario`):** O roteamento em `site/404.html` resolve URLs amigáveis diretamente no GitHub Pages sem necessidade de servidor Node/Next.js.

---

## Mapa do Repositório

| Pasta / Arquivo | O que é e para que serve |
| --- | --- |
| `site/` | Frontend estático publicado em produção (`index.html`, `pioneiro.html`, `mural.html`, `zero.html`, `construir.html`, `hackathon.html`, `admin.html`). |
| `site/404.html` | Roteador SPA para links curtos (`hokage22b.com/@usuario` e `/simulador`). |
| `site/assets/js/modules/` | Módulos JS desacoplados: `pi-pay.js`, `vitrine.js`, `mural.v4.js`, `referral.js`, `db.js`, `i18n.js`, `pi-ticker.js`, `portal.js`, `ui.js`. |
| `supabase/functions/` | Edge Functions Deno: `pi-profile`, `pi-payment`, `mural-action` e helpers em `_shared/` (`pi-auth.ts`, `http.ts`, `notify.ts`). |
| `database/` | Schema SQL (`schema.sql`), 18 migrações de evolução e hardening RLS (`migrations/`), testes automatizados (`tests/run_security_tests.js`) e guias (`README.md`, `COMO_CONFIGURAR_SUPABASE.md`, `COMO_ATIVAR_PAGAMENTOS_PI.md`). |
| `ebooks/` & `tools/` | Conteúdo e pipeline de compilação (Markdown -> HTML/PDF/EPUB) dos materiais educativos do ecossistema. |
| `docs/` | Guias técnicos para a comunidade e integrações externas (ex.: `PI_DAPP_ARCHITECTURE.md`, `google-sheets-integration/`). |
| `HACKATHON_SUBMISSION.md` | Resumo estruturado da submissão do projeto no ecossistema Pi. |

---

## Blocos Reutilizáveis pela Comunidade Pi

Se você é desenvolvedor construindo um dApp na Pi Network, os arquivos abaixo servem como referência direta:

- **Validação de identidade Pi no servidor (`/v2/me`):** [`supabase/functions/_shared/pi-auth.ts`](supabase/functions/_shared/pi-auth.ts)
- **Ciclo de pagamento Pi (approve / complete / ledger):** [`supabase/functions/pi-payment/index.ts`](supabase/functions/pi-payment/index.ts) + [`site/assets/js/modules/pi-pay.js`](site/assets/js/modules/pi-pay.js)
- **Links curtos `/@usuario` em hospedagem estática:** [`site/404.html`](site/404.html)
- **Notificações admin via Telegram / Resend:** [`supabase/functions/_shared/notify.ts`](supabase/functions/_shared/notify.ts)
- **Hardening RLS e testes de segurança com `anon key`:** [`database/README.md`](database/README.md) e [`database/tests/run_security_tests.js`](database/tests/run_security_tests.js)

---

## Como Configurar / Contribuir

1. Leia o guia de arquitetura em [`docs/PI_DAPP_ARCHITECTURE.md`](docs/PI_DAPP_ARCHITECTURE.md).
2. Para subir seu próprio backend no Supabase, siga [`database/COMO_CONFIGURAR_SUPABASE.md`](database/COMO_CONFIGURAR_SUPABASE.md) e [`database/COMO_ATIVAR_PAGAMENTOS_PI.md`](database/COMO_ATIVAR_PAGAMENTOS_PI.md).
3. Para validar políticas RLS públicas, execute `node database/tests/run_security_tests.js`.
