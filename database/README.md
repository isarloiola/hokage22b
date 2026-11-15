# Banco de Dados & Migrações (Supabase PostgreSQL)

Esta pasta centraliza o schema base, as migrações incrementais ordenadas, rollbacks de emergência e os testes de auditoria do portal **HOKAGE22B.COM**.

## Estrutura

- `schema.sql` — Schema base inicial das tabelas principais (`pioneiros`, `anuncios`, `leads`, `doacoes`).
- `COMO_CONFIGURAR_SUPABASE.md` — Guia de configuração inicial do projeto Supabase.
- `COMO_ATIVAR_PAGAMENTOS_PI.md` — Guia de configuração da `PI_SERVER_API_KEY` e Edge Functions.
- `backups/` — Snapshots de segurança pré-hardening.
- `rollbacks/` — Scripts de reversão manual de emergência (separados das migrações normais).
- `tests/` — Scripts automatizados de validação de RLS e segurança (`run_security_tests.js`).
- `migrations/` — Histórico cronológico numerado (`001_` a `018_`) aplicado em ordem crescente:
  1. `001_setup_mural.sql` — Estrutura base do Mural dos Pioneiros.
  2. `002_setup_storage.sql` — Bucket público e políticas de upload de imagens.
  3. `003_setup_metrics.sql` — Contadores atômicos de visualizações e cliques.
  4. `004_setup_likes_and_profile_visits.sql` — Curtidas e visitas à Vitrine.
  5. `005_setup_denuncias.sql` — Sistema comunitário de denúncias e auto-moderação.
  6. `006_setup_admin.sql` — RPCs administrativas protegidas.
  7. `007_setup_transacoes_pi.sql` — Ledger imutável de transações blockchain Pi (`transacoes_pi`).
  8. `008_setup_mural_commercial_hierarchy.sql` — Hierarquia comercial Ouro / Prata / Bronze.
  9. `009_setup_saas_engine.sql` — Edição em janela de 24h e renovação de anúncios.
  10. `010_setup_linktree_olx_upgrade.sql` — Evolução da Vitrine (produtos, bio, links e carteira).
  11. `011_setup_global_reach.sql` — Filtros globais de país (`country_code`) e modo de pagamento (`payment_modes`).
  12. `012_setup_mural_security_and_comments.sql` — Comentários verificados e rate-limit.
  13. `013_setup_security_hardening.sql` — Blindagem RLS e revogação de escritas diretas.
  14. `014_setup_fase1_security_hardening.sql` — Hardening Fase 1 (com rollback pareado em `rollbacks/rollback_fase1_security_hardening.sql`).
  15. `015_setup_zero_trust_mural.sql` — Escrita exclusiva via Edge Functions (`service_role`).
  16. `016_setup_audit_remediation_2026.sql` — Correções da auditoria master de segurança.
  17. `017_ativar_publicacao_imediata.sql` — Ativação imediata após confirmação de pagamento Pi.
  18. `018_setup_referral_system.sql` — Sistema antifraude de indicação, créditos Bronze e Selo Embaixador.
