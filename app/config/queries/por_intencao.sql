-- Distribuição dos leads do dia por intenção (RF-15)
-- @param canal STRING
SELECT
  CASE intencao WHEN 'compra_imediata' THEN 'Compra imediata' WHEN 'avaliando' THEN 'Avaliando'
                WHEN 'suporte' THEN 'Suporte' ELSE 'Spam' END AS intencao,
  count(*) AS leads,
  count_if(lead_id IN (SELECT lead_id FROM lead_score.gold.fila_do_dia)) AS na_fila
FROM lead_score.gold.leads_classificados
WHERE to_date(recebido_em) = data_referencia
  AND (:canal = '' OR canal = :canal)
GROUP BY 1
ORDER BY leads DESC
