-- Leads do dia por canal: volume x compra imediata (RF-15, pergunta do marketing)
-- @param canal STRING
SELECT
  canal,
  count(*)                                    AS leads,
  count_if(intencao = 'compra_imediata')      AS compra_imediata,
  count_if(intencao = 'avaliando')            AS avaliando,
  count_if(intencao IN ('suporte', 'spam'))   AS sem_potencial
FROM lead_score.gold.leads_classificados
WHERE to_date(recebido_em) = data_referencia
  AND (:canal = '' OR canal = :canal)
GROUP BY canal
ORDER BY compra_imediata DESC, leads DESC
