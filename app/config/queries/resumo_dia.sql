-- Hero + KPIs + funil do dia (Visão do Gestor e Fila do Dia)
-- @param canal STRING
-- @param vendedor STRING
-- @param rev INT
WITH lc AS (
  SELECT * FROM lead_score.gold.leads_classificados
  WHERE to_date(recebido_em) = data_referencia
    AND (:canal = '' OR canal = :canal)
),
fila AS (
  SELECT f.lead_id, f.vendedor FROM lead_score.gold.fila_do_dia f
  WHERE (:canal = '' OR f.canal = :canal)
    AND (:vendedor = '' OR f.vendedor = :vendedor)
),
contatos AS (
  SELECT DISTINCT c.lead_id FROM lead_score.gold.feedback_contatos c
  WHERE :rev >= 0
)
SELECT
  (SELECT max(data_referencia) FROM lead_score.gold.leads_classificados)                 AS data_referencia,
  (SELECT count(*) FROM lead_score.bronze.leads b WHERE (:canal = '' OR b.canal = :canal)) AS recebidos,
  (SELECT count(*) FROM lc)                                                              AS leads_unicos,
  (SELECT count_if(intencao IS NOT NULL) FROM lc)                                        AS classificados,
  (SELECT count(*) FROM fila)                                                            AS na_fila,
  (SELECT count(*) FROM fila f JOIN contatos c USING (lead_id))                           AS contatados,
  (SELECT count_if(intencao = 'compra_imediata') FROM lc)                                AS compra_imediata,
  (SELECT count_if(intencao = 'compra_imediata' AND lead_id NOT IN (SELECT lead_id FROM lead_score.gold.fila_do_dia)) FROM lc) AS compra_fora_da_fila,
  (SELECT round(100 * avg(CAST(acertou AS INT)), 1) FROM lead_score.gold.avaliacao_ia)  AS acuracia_ia,
  (SELECT count(*) FROM lead_score.gold.avaliacao_ia)                                    AS avaliados_ia,
  (SELECT max(processado_em) FROM lead_score.gold.leads_classificados)                   AS atualizado_em
