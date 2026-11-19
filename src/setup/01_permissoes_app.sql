-- Permissões mínimas do service principal do Data App "lead-score".
-- Application ID do SP: `databricks apps get lead-score -p pessoal` → service_principal_client_id
GRANT USE CATALOG ON CATALOG lead_score                         TO `20958e3c-69ef-44fa-9f52-4192c2a4522c`;
GRANT USE SCHEMA  ON SCHEMA  lead_score.bronze                  TO `20958e3c-69ef-44fa-9f52-4192c2a4522c`;
GRANT USE SCHEMA  ON SCHEMA  lead_score.gold                    TO `20958e3c-69ef-44fa-9f52-4192c2a4522c`;
GRANT SELECT      ON TABLE   lead_score.bronze.leads            TO `20958e3c-69ef-44fa-9f52-4192c2a4522c`;
GRANT SELECT      ON SCHEMA  lead_score.gold                    TO `20958e3c-69ef-44fa-9f52-4192c2a4522c`;
GRANT MODIFY      ON TABLE   lead_score.gold.feedback_contatos  TO `20958e3c-69ef-44fa-9f52-4192c2a4522c`;
