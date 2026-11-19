-- Leads de compra imediata que ficaram fora dos 20 do dia (pergunta do gestor, RF-15)
-- @param canal STRING
SELECT lead_id, nome, empresa, canal, nota, motivo, date_format(recebido_em, 'HH:mm') AS hora_recebido
FROM lead_score.gold.leads_classificados
WHERE intencao = 'compra_imediata'
  AND to_date(recebido_em) = data_referencia
  AND lead_id NOT IN (SELECT lead_id FROM lead_score.gold.fila_do_dia)
  AND (:canal = '' OR canal = :canal)
ORDER BY nota DESC
LIMIT 50
