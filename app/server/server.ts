import {
  createApp,
  analytics,
  genie,
  server,
  getExecutionContext,
  getWarehouseId,
} from '@databricks/appkit';
import { z } from 'zod';

const VENDEDORES = ['Ana Ribeiro', 'Bruno Costa', 'Carla Mendes', 'Diego Lima'] as const;
const RESULTADOS = ['contatado', 'sem_resposta', 'oportunidade', 'descartado'] as const;

const contatoSchema = z.object({
  lead_id: z.string().regex(/^L\d{8}-\d{4}$/),
  vendedor: z.enum(VENDEDORES),
  resultado: z.enum(RESULTADOS).default('contatado'),
});

createApp({
  plugins: [analytics(), genie(), server()],
  onPluginsReady(appkit) {
    appkit.server.extend((app) => {
      // Quem está usando o app (cabeçalhos injetados pelo Databricks Apps)
      app.get('/api/whoami', (req, res) => {
        res.json({
          email: req.header('x-forwarded-email') ?? null,
          user: req.header('x-forwarded-user') ?? null,
        });
      });

      // RF-14 · "Marcar como contatado": grava em gold.feedback_contatos
      app.post('/api/contatos', async (req, res) => {
        const parsed = contatoSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'Dados inválidos', detalhes: parsed.error.flatten() });
          return;
        }
        const { lead_id, vendedor, resultado } = parsed.data;
        try {
          const { client } = getExecutionContext();
          const resp = await client.statementExecution.executeStatement({
            warehouse_id: await getWarehouseId(),
            wait_timeout: '30s',
            statement: `
              INSERT INTO lead_score.gold.feedback_contatos (lead_id, vendedor, contatado_em, resultado)
              SELECT :lead_id, :vendedor, current_timestamp(), :resultado
              WHERE EXISTS (SELECT 1 FROM lead_score.gold.fila_do_dia WHERE lead_id = :lead_id)`,
            parameters: [
              { name: 'lead_id', value: lead_id, type: 'STRING' },
              { name: 'vendedor', value: vendedor, type: 'STRING' },
              { name: 'resultado', value: resultado, type: 'STRING' },
            ],
          });
          const state = resp.status?.state;
          if (state !== 'SUCCEEDED') {
            res.status(502).json({ error: resp.status?.error?.message ?? `Statement ${state ?? 'sem status'}` });
            return;
          }
          res.status(201).json({ ok: true, lead_id, vendedor, resultado });
        } catch (e) {
          res.status(500).json({ error: e instanceof Error ? e.message : 'Falha ao registrar contato' });
        }
      });
    });
  },
}).catch(console.error);
