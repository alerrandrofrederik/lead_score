-- ============================================================================
-- BRONZE · ingestão incremental dos CSVs do Volume raw (RF-01, RF-02)
-- As três fontes ficam na mesma pasta; o Auto Loader separa pelo nome do arquivo.
-- Schema explícito: o que não casa com o tipo (ex.: data malformada) vai para
-- _rescued_data em vez de parar o pipeline.
-- ============================================================================

CREATE OR REFRESH STREAMING TABLE bronze.leads
COMMENT 'Leads como vieram do CSV (formulário do site, LinkedIn, eventos)'
AS SELECT
  *,
  _metadata.file_path AS _arquivo,
  current_timestamp() AS _ingerido_em
FROM STREAM read_files(
  '/Volumes/lead_score/bronze/raw/',
  format            => 'csv',
  header            => true,
  pathGlobFilter    => 'leads_*.csv',
  schema            => 'lead_id STRING, nome STRING, email STRING, telefone STRING, cnpj STRING, canal STRING, campanha STRING, mensagem STRING, recebido_em TIMESTAMP',
  timestampFormat   => 'yyyy-MM-dd HH:mm:ss',
  rescuedDataColumn => '_rescued_data'
);

CREATE OR REFRESH STREAMING TABLE bronze.empresas
COMMENT 'Base cadastral de empresas como veio do CSV'
AS SELECT
  *,
  _metadata.file_path AS _arquivo,
  current_timestamp() AS _ingerido_em
FROM STREAM read_files(
  '/Volumes/lead_score/bronze/raw/',
  format            => 'csv',
  header            => true,
  pathGlobFilter    => 'empresas_*.csv',
  schema            => 'cnpj STRING, razao_social STRING, porte STRING, segmento STRING, num_funcionarios INT, uf STRING',
  rescuedDataColumn => '_rescued_data'
);

CREATE OR REFRESH STREAMING TABLE bronze.oportunidades
COMMENT 'Export do CRM com o histórico de oportunidades'
AS SELECT
  *,
  _metadata.file_path AS _arquivo,
  current_timestamp() AS _ingerido_em
FROM STREAM read_files(
  '/Volumes/lead_score/bronze/raw/',
  format            => 'csv',
  header            => true,
  pathGlobFilter    => 'oportunidades_*.csv',
  schema            => 'oportunidade_id STRING, cnpj STRING, produto STRING, status STRING, valor DOUBLE, data DATE',
  rescuedDataColumn => '_rescued_data'
);
