# Banco de Dados & Migrações (Supabase PostgreSQL)

Esta pasta centraliza o schema base, as migrações incrementais de segurança/funcionalidades e os testes de auditoria do portal **HOKAGE22B.COM**.

## Estrutura

- `schema.sql` — Schema base inicial das tabelas principais (`pioneiros`, `anuncios`, `leads`, `doacoes`).
- `COMO_CONFIGURAR_SUPABASE.md` — Guia de configuração inicial do projeto Supabase.
- `COMO_ATIVAR_PAGAMENTOS_PI.md` — Guia de configuração da `PI_SERVER_API_KEY` e Edge Functions.
- `backups/` — Snapshots de segurança pré-hardening.
- `tests/` — Scripts automatizados de validação de RLS e segurança (`run_security_tests.js`).
- `migrations/` — Histórico cronológico de evoluções e blindagem Zero-Trust aplicadas em produção:
  1. `setup_mural.sql` — Estrutura base do Mural dos Pioneiros.
  2. `setup_storage.sql` — Bucket público e políticas de upload de imagens.
  3. `setup_metrics.sql` — Contadores atômicos de visualizações e cliques.
  4. `setup_likes_and_profile_visits.sql` — Curtidas e visitas à Vitrine.
  5. `setup_denuncias.sql` — Sistema comunitário de denúncias e auto-moderação.
  6. `setup_admin.sql` — RPCs administrativas protegidas.
  7. `setup_transacoes_pi.sql` — Ledger imutável de transações blockchain Pi (`transacoes_pi`).
  8. `setup_mural_commercial_hierarchy.sql` — Hierarquia comercial Ouro / Prata / Bronze.
  9. `setup_saas_engine.sql` — Edição em janela de 24h e renovação de anúncios.
  10. `setup_linktree_olx_upgrade.sql` — Evolução da Vitrine (produtos, bio, links e carteira).
  11. `setup_global_reach.sql` — Filtros globais de país (`country_code`) e modo de pagamento (`payment_modes`).
  12. `setup_mural_security_and_comments.sql` — Comentários verificados e rate-limit.
  13. `setup_security_hardening.sql` — Blindagem RLS e revogação de escritas diretas.
  14. `setup_fase1_security_hardening.sql` — Hardening Fase 1 (com `rollback_fase1_security_hardening.sql` pareado).
  15. `setup_zero_trust_mural.sql` — Escrita exclusiva via Edge Functions (`service_role`).
  16. `setup_audit_remediation_2026.sql` — Correções da auditoria master de segurança.
  17. `ativar_publicacao_imediata.sql` — Ativação imediata após confirmação de pagamento Pi.
  18. `setup_referral_system.sql` — Sistema antifraude de indicação, créditos Bronze e Selo Embaixador.
