-- Cards da Fila do Dia (RF-13) com status de contato (RF-14)
-- @param canal STRING
-- @param vendedor STRING
-- @param rev INT
SELECT
  f.posicao, f.vendedor, f.lead_id, f.nome, f.email, f.telefone, f.empresa, f.canal, f.campanha,
  f.porte, f.segmento, f.uf, f.ja_cliente,
  f.mensagem, f.intencao, f.produto, f.qtd_licencas, f.prazo, f.orcamento_aprovado, f.cargo, f.concorrente_citado,
  f.nota,
  f.nota_componentes.intencao AS c_intencao,
  f.nota_componentes.perfil   AS c_perfil,
  f.nota_componentes.sinais   AS c_sinais,
  f.nota_componentes.recencia AS c_recencia,
  f.motivo, f.proximo_passo,
  date_format(f.recebido_em, 'HH:mm') AS hora_recebido,
  c.contatado_em,
  c.resultado
FROM lead_score.gold.fila_do_dia f
LEFT JOIN (
  SELECT lead_id, max(contatado_em) AS contatado_em, max_by(resultado, contatado_em) AS resultado
  FROM lead_score.gold.feedback_contatos
  WHERE :rev >= 0
  GROUP BY lead_id
) c ON c.lead_id = f.lead_id
WHERE (:vendedor = '' OR f.vendedor = :vendedor)
  AND (:canal = '' OR f.canal = :canal)
ORDER BY f.posicao
