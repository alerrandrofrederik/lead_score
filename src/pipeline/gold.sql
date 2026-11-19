-- ============================================================================
-- GOLD · IA, nota de prioridade e fila do dia (RF-07 a RF-12)
-- ============================================================================

-- ---------------------------------------------------------------- IA (incremental)
-- RF-07/RF-08. Streaming table: cada linha nova chama a IA uma única vez (CA-11).
-- Roda sobre leads_limpos (antes da dedupe) para ser incremental; a junção com
-- a versão deduplicada acontece em leads_classificados.
-- Salvaguarda: mensagem vazia ou com menos de 5 caracteres vira spam sem IA.
CREATE OR REFRESH STREAMING TABLE gold.leads_ia
COMMENT 'Saída bruta de ai_classify e ai_extract por lead recebido (auditoria)'
AS
WITH m AS (
  SELECT lead_id, email_norm, mensagem,
         length(trim(coalesce(mensagem, ''))) < 5 AS mensagem_curta
  FROM STREAM(silver.leads_limpos)
)
SELECT
  lead_id,
  email_norm,
  mensagem_curta,
  CASE WHEN NOT mensagem_curta THEN ai_classify(
    mensagem,
    '{
      "compra_imediata": "Pede preço, proposta, quantidade de licenças, prazo ou reunião comercial",
      "avaliando":       "Quer conhecer, comparar ou ver demo, sem urgência",
      "suporte":         "Já é cliente e relata problema ou dúvida de uso",
      "spam":            "Sem relação com compra"
    }',
    map('version', '2.1')
  ) END AS intencao_raw,
  CASE WHEN NOT mensagem_curta THEN ai_extract(
    mensagem,
    '{
      "produto":            {"type": "string",  "description": "Produto Atlas citado"},
      "qtd_licencas":       {"type": "integer", "description": "Quantidade de licenças ou usuários"},
      "prazo":              {"type": "string",  "description": "Prazo ou data desejada"},
      "orcamento_aprovado": {"type": "boolean", "description": "Mencionou orçamento aprovado"},
      "cargo":              {"type": "string",  "description": "Cargo de quem escreveu"},
      "concorrente_citado": {"type": "string",  "description": "Concorrente mencionado"}
    }',
    map('version', '2.1')
  ) END AS entidades_raw,
  '2.1'               AS ai_versao,
  current_timestamp() AS processado_em
FROM m;

-- ---------------------------------------------------------------- todos os leads, com nota
-- RF-09, RF-10, RF-12
CREATE OR REFRESH MATERIALIZED VIEW gold.leads_classificados
COMMENT 'Todos os leads deduplicados, com intenção, entidades, nota explicável, motivo e próximo passo'
AS
WITH ref AS (
  SELECT max(to_date(recebido_em)) AS data_referencia FROM silver.leads_enriquecidos
),
base AS (
  SELECT
    l.*,
    r.data_referencia,
    CASE WHEN i.mensagem_curta THEN 'spam'
         ELSE i.intencao_raw:response[0].value::string END             AS intencao,
    nullif(trim(i.entidades_raw:response.produto.value::string), '')   AS produto,
    i.entidades_raw:response.qtd_licencas.value::int                   AS qtd_licencas,
    nullif(trim(i.entidades_raw:response.prazo.value::string), '')     AS prazo,
    coalesce(i.entidades_raw:response.orcamento_aprovado.value::boolean, false) AS orcamento_aprovado,
    nullif(trim(i.entidades_raw:response.cargo.value::string), '')     AS cargo,
    nullif(trim(i.entidades_raw:response.concorrente_citado.value::string), '') AS concorrente_citado,
    i.ai_versao,
    i.processado_em
  FROM silver.leads_enriquecidos l
  JOIN gold.leads_ia i USING (lead_id)
  CROSS JOIN ref r
),
comp AS (
  SELECT
    *,
    CASE intencao WHEN 'compra_imediata' THEN 100 WHEN 'avaliando' THEN 40 ELSE 0 END AS c_intencao,
    least(100,
      CASE porte WHEN 'grande' THEN 100 WHEN 'médio' THEN 60 WHEN 'pequeno' THEN 30 ELSE 20 END
      + IF(ja_cliente, 20, 0))                                                        AS c_perfil,
    least(100,
      IF(orcamento_aprovado, 40, 0)
      + IF(prazo IS NOT NULL, 30, 0)
      + IF(qtd_licencas IS NOT NULL, 30, 0))                                          AS c_sinais,
    CASE datediff(data_referencia, to_date(recebido_em))
      WHEN 0 THEN 100 WHEN 1 THEN 50 WHEN 2 THEN 25 ELSE 0 END                        AS c_recencia
  FROM base
)
SELECT
  lead_id, nome, email, telefone, cnpj, empresa, canal, campanha,
  porte, segmento, uf, ja_cliente, produtos_contratados,
  mensagem, intencao,
  produto, qtd_licencas, prazo, orcamento_aprovado, cargo, concorrente_citado,
  -- trava: spam → nota 0
  CAST(IF(intencao = 'spam', 0,
          round(0.50 * c_intencao + 0.25 * c_perfil + 0.15 * c_sinais + 0.10 * c_recencia)) AS INT) AS nota,
  named_struct('intencao', c_intencao, 'perfil', c_perfil,
               'sinais', c_sinais, 'recencia', c_recencia)                      AS nota_componentes,
  concat_ws(' · ', filter(array(
    CASE
      WHEN qtd_licencas IS NOT NULL AND produto IS NOT NULL
        THEN concat('Pediu ', qtd_licencas, ' licenças do ', produto,
                    CASE WHEN prazo IS NULL THEN ''
                         WHEN lower(prazo) RLIKE '^(até|ate|em|ainda|no|na|para|by|until|before|within) ' THEN concat(' ', prazo)
                         WHEN prazo RLIKE '^[0-9]' THEN concat(' em ', prazo)
                         ELSE concat(' até ', prazo) END)
      WHEN produto IS NOT NULL AND intencao = 'compra_imediata' THEN concat('Quer contratar o ', produto,
                    IF(prazo IS NULL, '', concat(' · prazo: ', prazo)))
      WHEN produto IS NOT NULL AND intencao = 'avaliando' THEN concat('Avaliando o ', produto)
      WHEN intencao = 'suporte' THEN 'Pedido de suporte'
      WHEN intencao = 'spam'    THEN 'Sem relação com compra'
    END,
    IF(orcamento_aprovado, 'orçamento aprovado', NULL),
    CASE porte WHEN 'grande' THEN 'empresa grande' WHEN 'médio' THEN 'empresa média'
               WHEN 'pequeno' THEN 'empresa pequena' END,
    IF(ja_cliente, 'já é cliente', NULL),
    IF(concorrente_citado IS NOT NULL, concat('usa ', concorrente_citado), NULL)
  ), x -> x IS NOT NULL))                                                          AS motivo,
  CASE intencao
    WHEN 'compra_imediata' THEN 'Ligar hoje e enviar proposta'
    WHEN 'avaliando'       THEN 'Enviar material e agendar demonstração'
    WHEN 'suporte'         THEN 'Encaminhar ao suporte'
    ELSE 'Descartar'
  END                                                                              AS proximo_passo,
  recebido_em, recebido_em_corrigido, data_referencia, ai_versao, processado_em
FROM comp;

-- ---------------------------------------------------------------- fila do dia
-- RF-11: os 20 leads de maior nota, 5 por vendedor. spam e suporte ficam fora (CA-07).
-- Desempate: maior pedido (qtd de licenças) primeiro, depois ordem de chegada.
CREATE OR REFRESH MATERIALIZED VIEW gold.fila_do_dia
COMMENT 'Os 20 leads prioritários do dia, distribuídos entre os 4 vendedores'
AS
WITH ranqueado AS (
  SELECT
    *,
    row_number() OVER (ORDER BY nota DESC, qtd_licencas DESC NULLS LAST, recebido_em ASC, lead_id) AS posicao
  FROM gold.leads_classificados
  WHERE intencao IN ('compra_imediata', 'avaliando')
    AND to_date(recebido_em) = data_referencia
)
SELECT
  data_referencia AS data,
  posicao,
  element_at(array('Ana Ribeiro', 'Bruno Costa', 'Carla Mendes', 'Diego Lima'),
             CAST((posicao - 1) % 4 + 1 AS INT)) AS vendedor,
  * EXCEPT (posicao, data_referencia)
FROM ranqueado
WHERE posicao <= 20;

-- ---------------------------------------------------------------- avaliação da IA
-- CA-04/CA-05: compara ai_classify com o gabarito (alimenta o KPI de acurácia do app).
CREATE OR REFRESH MATERIALIZED VIEW gold.avaliacao_ia
COMMENT 'Intenção prevista pela IA x gabarito, por lead recebido'
AS
WITH gabarito AS (
  SELECT lead_id, intencao_esperada, nullif(pegadinha, '') AS pegadinha, nullif(observacao, '') AS observacao
  FROM read_files('/Volumes/lead_score/bronze/gabarito/intencao.csv',
                  format => 'csv', header => true,
                  schema => 'lead_id STRING, email STRING, intencao_esperada STRING, pegadinha STRING, observacao STRING')
)
SELECT
  g.lead_id,
  g.intencao_esperada,
  CASE WHEN i.mensagem_curta THEN 'spam' ELSE i.intencao_raw:response[0].value::string END AS intencao_prevista,
  g.intencao_esperada = CASE WHEN i.mensagem_curta THEN 'spam'
                             ELSE i.intencao_raw:response[0].value::string END             AS acertou,
  g.pegadinha,
  g.observacao,
  i.ai_versao
FROM gabarito g
JOIN gold.leads_ia i USING (lead_id);
