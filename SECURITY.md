# Política de Segurança — HOKAGE22B

## Regra Absoluta (Pi Network & Web3)

- Este projeto **NUNCA** solicita a **Passphrase (frase secreta de 24 palavras)** nem a **senha da conta Pi** de nenhum usuário — nem em ambiente Sandbox/Testnet, nem na Mainnet.
- Toda autenticação e assinatura de pagamento ocorrem exclusivamente pelo **Pi SDK oficial** (`sdk.minepi.com`) dentro do aplicativo **Pi Browser**.
- Todas as escritas sensíveis no banco de dados passam por **Supabase Edge Functions** que verificam o `accessToken` diretamente em `https://api.minepi.com/v2/me`.

## Reportando Vulnerabilidades

Se você encontrar qualquer falha de segurança, problema de RLS, vazamento de dados ou comportamento inesperado:

1. **Não** abra uma Issue pública com detalhes exploráveis.
2. Envie um relato privado para: **contato@hokage22b.com**
3. Inclua passos para reproduzir, impacto esperado e (se possível) sugestão de correção.

## Auditoria Contínua

Para validar as políticas públicas de RLS do projeto usando a `anon key`, consulte:
- `database/tests/run_security_tests.js`
- `database/README.md`
