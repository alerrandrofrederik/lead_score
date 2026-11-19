-- M0 · Smoke test das AI Functions (risco 3.3: validar antes da demo)
-- Roda ai_classify e ai_extract sobre a mensagem herói e mostra o VARIANT bruto.
WITH m AS (
  SELECT 'Boa tarde, sou Diretor Financeiro da Metalúrgica Bandeirantes. Precisamos de 200 licenças do Atlas Gestão até dezembro, o orçamento já está aprovado. Hoje usamos o OmniERP e queremos migrar. Podemos agendar uma reunião?' AS mensagem
)
SELECT
  ai_classify(
    mensagem,
    '{
      "compra_imediata": "Pede preço, proposta, quantidade de licenças, prazo ou reunião comercial",
      "avaliando":       "Quer conhecer, comparar ou ver demo, sem urgência",
      "suporte":         "Já é cliente e relata problema ou dúvida de uso",
      "spam":            "Sem relação com compra"
    }',
    map('version', '2.1')
  ) AS intencao_raw,
  ai_extract(
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
  ) AS entidades_raw
FROM m;
