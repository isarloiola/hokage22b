# Cloudflare HTTP Response Security Headers (HOKAGE22B)

O portal **HOKAGE22B** (`hokage22b.com`) roda sobre hospedagem estática (GitHub Pages por trás da edge Cloudflare). Como `<meta http-equiv="...">` não substitui cabeçalhos HTTP de transporte (`HSTS`, `X-Content-Type-Options`, `X-Frame-Options` real), recomenda-se configurar as regras abaixo no painel Cloudflare.

---

## Como configurar no Cloudflare Dashboard

1. Acesse o painel da zona **`hokage22b.com`** no Cloudflare.
2. Navegue até **Rules** → **Transform Rules** → **Modify Response Header** → **Create rule**.
3. Crie as regras na ordem abaixo.

---

### Regra 1: Cabeçalhos Globais de Segurança (`hokage22b.com`)

- **Rule name:** `HOKAGE22B Global Security Headers`
- **When incoming requests match:** Custom filter expression:
  ```text
  (http.host eq "hokage22b.com" or http.host eq "www.hokage22b.com")
  ```
- **Then (Modify Response Header):**

| Ação | Header name | Value |
|---|---|---|
| Set static | `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| Set static | `X-Content-Type-Options` | `nosniff` |
| Set static | `X-Frame-Options` | `SAMEORIGIN` |
| Set static | `Referrer-Policy` | `strict-origin-when-cross-origin` |
| Set static | `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

> **Observação sobre `X-Frame-Options: SAMEORIGIN`:** Evite usar `DENY` global se desejar permitir futuros widgets/embeds internos na mesma origem ou inspeção no ecossistema Pi Browser. Páginas administrativas podem usar proteção mais estrita na Regra 2.

---

### Regra 2: Blindagem Específica para `/admin`

- **Rule name:** `HOKAGE22B Admin Anti-Framing & No-Cache`
- **When incoming requests match:**
  ```text
  (http.request.uri.path eq "/admin" or http.request.uri.path eq "/admin.html")
  ```
- **Then (Modify Response Header):**

| Ação | Header name | Value |
|---|---|---|
| Set static | `Cache-Control` | `no-store, no-cache, must-revalidate` |
| Set static | `Referrer-Policy` | `strict-origin-when-cross-origin` |
| Set static | `X-Robots-Tag` | `noindex, nofollow` |

> **Compatibilidade com Pi SDK v2.0:** Mantenha `Referrer-Policy: strict-origin-when-cross-origin` (nunca `no-referrer` em `/admin`), pois o bridge do Pi Browser / Pi Sandbox depende de origem/referrer válidos durante `Pi.authenticate()`.

---

### Boas práticas adicionais na Cloudflare SSL/TLS

- **SSL/TLS → Overview:** modo **Full (strict)**.
- **SSL/TLS → Edge Certificates → Always Use HTTPS:** **Ativado**.
- **SSL/TLS → Edge Certificates → Minimum TLS Version:** **TLS 1.2**.
- **Caching → Tiered Cache / Browser Cache:** respeitar headers de origem nos assets com query string `?v=...`.
