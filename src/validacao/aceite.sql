-- Critérios de aceite do PRD (seção 3.1). Cada linha: CA, resultado, esperado, ok.
SELECT 'CA-01' AS ca, 'linhas na bronze.leads' AS checagem,
       CAST(count(*) AS STRING) AS resultado, '300' AS esperado, count(*) = 300 AS ok
FROM lead_score.bronze.leads
UNION ALL
SELECT 'CA-02', 'linhas com _rescued_data', CAST(count_if(_rescued_data IS NOT NULL) AS STRING), '3',
       count_if(_rescued_data IS NOT NULL) = 3
FROM lead_score.bronze.leads
UNION ALL
SELECT 'CA-03', 'e-mails duplicados na silver (linhas)', concat(count(*) - count(DISTINCT email_norm), ' dup / ', count(*), ' linhas'), '0 dup / 290',
       count(*) = count(DISTINCT email_norm) AND count(*) = 290
FROM lead_score.silver.leads
UNION ALL
SELECT 'CA-03', 'leads com CNPJ válido sem empresa', CAST(count_if(cnpj_valido AND empresa IS NULL) AS STRING), '0',
       count_if(cnpj_valido AND empresa IS NULL) = 0
FROM lead_score.silver.leads_enriquecidos
UNION ALL
SELECT 'CA-04', 'acurácia ai_classify', concat(round(100 * avg(CAST(acertou AS INT)), 1), '%'), '>= 85%',
       avg(CAST(acertou AS INT)) >= 0.85
FROM lead_score.gold.avaliacao_ia
UNION ALL
SELECT 'CA-05', 'pegadinhas corretas', concat(count_if(acertou), ' de ', count(*)), '>= 4 de 5', count_if(acertou) >= 4
FROM lead_score.gold.avaliacao_ia WHERE pegadinha IS NOT NULL
UNION ALL
SELECT 'CA-06', 'mensagem herói', concat_ws(' | ', produto, CAST(qtd_licencas AS STRING), prazo, CAST(orcamento_aprovado AS STRING)),
       'Atlas Gestão | 200 | dezembro | true',
       produto = 'Atlas Gestão' AND qtd_licencas = 200 AND lower(prazo) LIKE '%dezembro%' AND orcamento_aprovado
FROM lead_score.gold.leads_classificados WHERE email = 'roberto.almeida@metalurgicabandeirantes.com.br'
UNION ALL
SELECT 'CA-07', 'spam/suporte na fila', CAST(count_if(intencao IN ('spam', 'suporte')) AS STRING), '0',
       count_if(intencao IN ('spam', 'suporte')) = 0
FROM lead_score.gold.fila_do_dia
UNION ALL
SELECT 'CA-08', 'fila: total / por vendedor / componentes',
       concat(count(*), ' / ', min(n), '-', max(n), ' / ', count_if(nota_componentes IS NULL), ' nulos'), '20 / 5-5 / 0 nulos',
       count(*) = 20 AND min(n) = 5 AND max(n) = 5 AND count_if(nota_componentes IS NULL) = 0
FROM (SELECT *, count(*) OVER (PARTITION BY vendedor) AS n FROM lead_score.gold.fila_do_dia)
UNION ALL
SELECT 'CA-08', 'herói na posição', CAST(min(posicao) AS STRING), '1', min(posicao) = 1
FROM lead_score.gold.fila_do_dia WHERE email = 'roberto.almeida@metalurgicabandeirantes.com.br'
UNION ALL
SELECT 'CA-11', 'chamadas de IA (linhas em gold.leads_ia) = bronze', CAST(count(*) AS STRING), '300 (não cresce ao reexecutar)', count(*) = 300
FROM lead_score.gold.leads_ia;
