import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@databricks/appkit-ui/react';
import { ArrowRight } from 'lucide-react';

const ETAPAS = [
  { n: 1, titulo: 'CSV', detalhe: 'leads_*, empresas_*, oportunidades_* exportados pelos sistemas de origem' },
  { n: 2, titulo: 'Volume', detalhe: '/Volumes/lead_score/bronze/raw governado pelo Unity Catalog' },
  { n: 3, titulo: 'Bronze', detalhe: 'Auto Loader: cada arquivo lido uma vez; linhas ruins em _rescued_data' },
  { n: 4, titulo: 'Silver', detalhe: 'E-mail e CNPJ normalizados, dedupe por e-mail (AUTO CDC), junção com empresa e histórico' },
  { n: 5, titulo: 'Gold', detalhe: 'ai_classify (intenção) + ai_extract (entidades) + nota 0–100 + fila do dia' },
  { n: 6, titulo: 'Genie', detalhe: 'Genie Space sobre as tabelas Gold, com instruções e SQL de exemplo' },
  { n: 7, titulo: 'App', detalhe: 'Databricks App: fila do vendedor, visão do gestor e agente' },
];

const NOTA = [
  { comp: 'Intenção', peso: '50%', fonte: 'ai_classify', regra: 'compra imediata 100 · avaliando 40 · suporte/spam 0' },
  { comp: 'Perfil', peso: '25%', fonte: 'empresas + histórico', regra: 'grande 100 · médio 60 · pequeno 30 · desconhecido 20 · +20 se já é cliente' },
  { comp: 'Sinais', peso: '15%', fonte: 'ai_extract', regra: '+40 orçamento aprovado · +30 prazo · +30 quantidade' },
  { comp: 'Recência', peso: '10%', fonte: 'recebido_em', regra: '100 no dia · 50 no dia seguinte · 0 após 3 dias' },
];

export function PlataformaPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Da fonte à decisão</h1>
        <p className="text-sm text-muted-foreground">
          Tudo roda dentro do Databricks, governado pelo Unity Catalog, sem endpoint de modelo próprio.
        </p>
      </div>

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {ETAPAS.map((e, i) => (
          <li key={e.n} className="relative flex flex-col gap-2 rounded-lg border bg-card p-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {e.n}
            </span>
            <span className="font-semibold text-foreground">{e.titulo}</span>
            <span className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{e.detalhe}</span>
            {i < ETAPAS.length - 1 && (
              <ArrowRight className="absolute -right-3 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-muted-foreground lg:block" />
            )}
          </li>
        ))}
      </ol>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>As duas funções de IA</CardTitle>
            <CardDescription>Funções SQL que rodam onde o dado já está</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <div>
              <Badge>ai_classify</Badge>
              <p className="mt-1 text-muted-foreground">“Em qual caixa esse texto cai?” compra_imediata · avaliando · suporte · spam</p>
            </div>
            <div>
              <Badge>ai_extract</Badge>
              <p className="mt-1 text-muted-foreground">
                “Que dados estão escondidos nesse texto?” produto · licenças · prazo · orçamento · cargo · concorrente
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Salvaguardas: mensagem com menos de 5 caracteres vira spam sem chamar a IA; a IA roda só em leads novos
              (streaming table); a versão da função fica gravada com o resultado.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Regra da nota (explicável)</CardTitle>
            <CardDescription>spam → nota 0 · suporte → fora da fila comercial</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col divide-y text-sm">
              {NOTA.map((n) => (
                <div key={n.comp} className="grid grid-cols-[90px_50px_1fr] gap-2 py-2">
                  <span className="font-medium text-foreground">{n.comp}</span>
                  <span className="tabular-nums text-muted-foreground">{n.peso}</span>
                  <span className="text-muted-foreground">
                    <span className="font-mono text-xs">{n.fonte}</span> · {n.regra}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
