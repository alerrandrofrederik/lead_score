-- ============================================================================
-- SILVER · limpeza, deduplicação e junção (RF-03 a RF-06)
-- ============================================================================

-- ---------------------------------------------------------------- leads limpos
-- Normaliza e-mail e CNPJ, valida o dígito verificador e aplica as expectations.
-- Append-only: cada linha da bronze passa uma vez (alimenta a dedupe e a IA).
CREATE TEMPORARY VIEW leads_normalizados AS
SELECT
  lead_id,
  nome,
  email,
  lower(trim(email))                          AS email_norm,
  telefone,
  cnpj,
  nullif(regexp_replace(cnpj, '[^0-9]', ''), '') AS cnpj_norm,
  canal,
  campanha,
  mensagem,
  -- data malformada (CA-02): cai para a data embutida no lead_id (L20261118-0001)
  coalesce(recebido_em, to_timestamp(substr(lead_id, 2, 8), 'yyyyMMdd')) AS recebido_em,
  recebido_em IS NULL                         AS recebido_em_corrigido,
  _rescued_data,
  _arquivo,
  _ingerido_em
FROM STREAM(bronze.leads);

CREATE OR REFRESH STREAMING TABLE silver.leads_limpos (
  CONSTRAINT email_valido       EXPECT (email_norm RLIKE '^[^@ ]+@[^@ ]+[.][^@ ]+$') ON VIOLATION DROP ROW,
  CONSTRAINT cnpj_valido        EXPECT (cnpj_norm IS NULL OR cnpj_valido),
  CONSTRAINT data_recebimento   EXPECT (NOT recebido_em_corrigido),
  CONSTRAINT mensagem_presente  EXPECT (length(trim(coalesce(mensagem, ''))) >= 5)
)
COMMENT 'Leads com e-mail e CNPJ normalizados; uma linha por linha recebida'
AS
WITH dv AS (
  SELECT
    *,
    -- 1º dígito verificador do CNPJ (pesos 5,4,3,2,9,8,7,6,5,4,3,2)
    aggregate(sequence(1, 12), 0, (acc, i) ->
      acc + cast(substr(cnpj_norm, i, 1) AS INT) * element_at(array(5,4,3,2,9,8,7,6,5,4,3,2), i)) % 11 AS r1,
    -- 2º dígito verificador (pesos 6,5,4,3,2,9,8,7,6,5,4,3,2)
    aggregate(sequence(1, 13), 0, (acc, i) ->
      acc + cast(substr(cnpj_norm, i, 1) AS INT) * element_at(array(6,5,4,3,2,9,8,7,6,5,4,3,2), i)) % 11 AS r2
  FROM STREAM(leads_normalizados)
)
SELECT
  * EXCEPT (r1, r2),
  coalesce(
    length(cnpj_norm) = 14
    AND cast(substr(cnpj_norm, 13, 1) AS INT) = IF(r1 < 2, 0, 11 - r1)
    AND cast(substr(cnpj_norm, 14, 1) AS INT) = IF(r2 < 2, 0, 11 - r2),
    false) AS cnpj_valido
FROM dv;

-- ---------------------------------------------------------------- leads (dedupe)
-- RF-04: uma linha por e-mail normalizado, mantendo a mensagem mais recente.
CREATE OR REFRESH STREAMING TABLE silver.leads
COMMENT 'Leads deduplicados por e-mail (SCD 1: vence a mensagem mais recente)';

CREATE FLOW leads_dedupe AS AUTO CDC INTO silver.leads
FROM STREAM(silver.leads_limpos)
KEYS (email_norm)
SEQUENCE BY STRUCT(recebido_em, lead_id)
COLUMNS * EXCEPT (_rescued_data)
STORED AS SCD TYPE 1;

-- ---------------------------------------------------------------- empresas
CREATE OR REFRESH MATERIALIZED VIEW silver.empresas
COMMENT 'Cadastro de empresas com CNPJ normalizado (uma linha por CNPJ)'
AS SELECT
  cnpj_norm, razao_social, porte, segmento, num_funcionarios, uf
FROM (
  SELECT
    regexp_replace(cnpj, '[^0-9]', '') AS cnpj_norm,
    trim(razao_social)                 AS razao_social,
    lower(trim(porte))                 AS porte,
    segmento, num_funcionarios, uf,
    row_number() OVER (PARTITION BY regexp_replace(cnpj, '[^0-9]', '') ORDER BY _ingerido_em DESC) AS rn
  FROM bronze.empresas
)
WHERE rn = 1;

-- ---------------------------------------------------------------- histórico
CREATE OR REFRESH MATERIALIZED VIEW silver.historico_empresa
COMMENT 'Histórico comercial agregado por empresa'
AS SELECT
  regexp_replace(cnpj, '[^0-9]', '')                               AS cnpj_norm,
  count_if(status = 'ganha')                                        AS oportunidades_ganhas,
  count_if(status = 'aberta')                                       AS oportunidades_abertas,
  count_if(status = 'perdida')                                      AS oportunidades_perdidas,
  array_sort(collect_set(IF(status = 'ganha', produto, NULL)))      AS produtos_contratados,
  count_if(status = 'ganha') > 0                                    AS ja_cliente
FROM bronze.oportunidades
GROUP BY 1;

-- ---------------------------------------------------------------- lead + empresa + histórico
-- RF-05
CREATE OR REFRESH MATERIALIZED VIEW silver.leads_enriquecidos
COMMENT 'Lead deduplicado + empresa (por CNPJ) + histórico comercial'
AS SELECT
  l.lead_id, l.nome, l.email_norm AS email, l.telefone, l.cnpj_norm AS cnpj, l.cnpj_valido,
  l.canal, l.campanha, l.mensagem, l.recebido_em, l.recebido_em_corrigido,
  e.razao_social                         AS empresa,
  coalesce(e.porte, 'desconhecido')      AS porte,
  e.segmento, e.num_funcionarios, e.uf,
  coalesce(h.ja_cliente, false)          AS ja_cliente,
  coalesce(h.oportunidades_ganhas, 0)    AS oportunidades_ganhas,
  coalesce(h.produtos_contratados, array()) AS produtos_contratados
FROM silver.leads l
LEFT JOIN silver.empresas e
  ON l.cnpj_valido AND l.cnpj_norm = e.cnpj_norm
LEFT JOIN silver.historico_empresa h
  ON l.cnpj_valido AND l.cnpj_norm = h.cnpj_norm;
