-- Vendedores da fila com o andamento dos contatos (filtro global + tabela do gestor)
-- @param rev INT
SELECT
  f.vendedor,
  count(*)                        AS na_fila,
  count(DISTINCT c.lead_id)       AS contatados,
  round(avg(f.nota), 0)           AS nota_media
FROM lead_score.gold.fila_do_dia f
LEFT JOIN lead_score.gold.feedback_contatos c
  ON c.lead_id = f.lead_id AND :rev >= 0
GROUP BY f.vendedor
ORDER BY f.vendedor
