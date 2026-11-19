-- M0 · Ambiente do Lead Score (idempotente)
-- Schemas e volumes do medalhão + tabela de feedback escrita pelo Data App (fora do pipeline).

CREATE SCHEMA IF NOT EXISTS lead_score.bronze;
CREATE SCHEMA IF NOT EXISTS lead_score.silver;
CREATE SCHEMA IF NOT EXISTS lead_score.gold;

CREATE VOLUME IF NOT EXISTS lead_score.bronze.raw
  COMMENT 'Landing dos CSVs do dia: leads_*, empresas_*, oportunidades_*';
CREATE VOLUME IF NOT EXISTS lead_score.bronze.gabarito
  COMMENT 'Gabarito (rótulos esperados) para validar ai_classify/ai_extract. Fica fora do raw.';

-- RF-14: o botão "Marcar como contatado" do app grava aqui.
CREATE TABLE IF NOT EXISTS lead_score.gold.feedback_contatos (
  lead_id       STRING    NOT NULL COMMENT 'Lead contatado',
  vendedor      STRING    NOT NULL COMMENT 'Vendedor que fez o contato',
  contatado_em  TIMESTAMP NOT NULL COMMENT 'Momento do clique no app',
  resultado     STRING             COMMENT 'contatado | sem_resposta | oportunidade | descartado'
)
COMMENT 'Feedback do time comercial registrado pelo Data App (RF-14)';
