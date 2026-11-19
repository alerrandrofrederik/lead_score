-- Canais disponíveis para o filtro global
SELECT DISTINCT canal FROM lead_score.gold.leads_classificados WHERE canal IS NOT NULL ORDER BY canal
