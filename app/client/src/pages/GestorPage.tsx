import {
  Alert,
  AlertDescription,
  BarChart,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useAnalyticsQuery,
} from '@databricks/appkit-ui/react';
import { sql } from '@databricks/appkit-ui/js';
import { KpiCard } from '../components/KpiCard';
import { useFiltros } from '../lib/filtros';
import { canalLabel, dataBR, horaBR, inteiro, num, pct } from '../lib/format';

function Origem({ children }: { children: string }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{children}</span>
  );
}

function Kpis() {
  const { canal, vendedor, rev } = useFiltros();
  const { data, loading, error } = useAnalyticsQuery('resumo_dia', {
    canal: sql.string(canal),
    vendedor: sql.string(vendedor),
    rev: sql.number(rev),
  });
  const r = data?.[0];
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Não foi possível carregar os indicadores: {error}</AlertDescription>
      </Alert>
    );
  }
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          titulo="Recebidos"
          valor={r ? inteiro(r.recebidos) : '—'}
          detalhe={r ? `${inteiro(r.leads_unicos)} únicos após dedupe` : undefined}
          origem="BRONZE.LEADS"
          tom="muted"
          loading={loading}
        />
        <KpiCard
          titulo="Classificados"
          valor={r ? inteiro(r.classificados) : '—'}
          detalhe="ai_classify + ai_extract"
          origem="GOLD.LEADS_CLASSIFICADOS"
          loading={loading}
        />
        <KpiCard
          titulo="Na fila"
          valor={r ? inteiro(r.na_fila) : '—'}
          detalhe={vendedor ? vendedor : '4 vendedores × 5'}
          origem="GOLD.FILA_DO_DIA"
          loading={loading}
        />
        <KpiCard
          titulo="Contatados"
          valor={r ? inteiro(r.contatados) : '—'}
          detalhe={r ? `${pct(r.contatados, r.na_fila)} da fila` : undefined}
          origem="GOLD.FEEDBACK_CONTATOS"
          tom="success"
          loading={loading}
        />
        <KpiCard
          titulo="% compra imediata"
          valor={r ? pct(r.compra_imediata, r.leads_unicos) : '—'}
          detalhe={r ? `${inteiro(r.compra_imediata)} leads · ${inteiro(r.compra_fora_da_fila)} fora da fila` : undefined}
          origem="GOLD.LEADS_CLASSIFICADOS"
          tom="warning"
          loading={loading}
        />
        <KpiCard
          titulo="Acurácia da IA"
          valor={r ? `${num(r.acuracia_ia).toLocaleString('pt-BR')}%` : '—'}
          detalhe={r ? `vs. gabarito · ${inteiro(r.avaliados_ia)} mensagens · meta ≥ 85%` : undefined}
          origem="GOLD.AVALIACAO_IA"
          tom={r && num(r.acuracia_ia) < 85 ? 'destructive' : 'success'}
          loading={loading}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Dia de referência {r ? dataBR(r.data_referencia) : '—'} · IA processou o último lead em{' '}
        {r ? horaBR(r.atualizado_em) : '—'}
        {canal ? ` · canal: ${canalLabel(canal)}` : ''}
      </p>
    </>
  );
}

function Funil() {
  // Funil do time inteiro (ignora o filtro de vendedor): a pergunta é quanto da demanda cabe na fila.
  const { canal, rev } = useFiltros();
  const { data, loading } = useAnalyticsQuery('resumo_dia', {
    canal: sql.string(canal),
    vendedor: sql.string(''),
    rev: sql.number(rev),
  });
  const r = data?.[0];
  const etapas = r
    ? [
        { etapa: 'Recebidos', leads: num(r.recebidos) },
        { etapa: 'Únicos', leads: num(r.leads_unicos) },
        { etapa: 'Classificados', leads: num(r.classificados) },
        { etapa: 'Na fila', leads: num(r.na_fila) },
        { etapa: 'Contatados', leads: num(r.contatados) },
      ]
    : [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Só {r ? pct(r.na_fila, r.recebidos) : '—'} dos leads cabem na fila: a nota escolhe quais</CardTitle>
        <CardDescription>Funil do dia: recebidos → classificados → na fila → contatados</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !r ? (
          <Skeleton className="h-[260px] w-full" />
        ) : (
          <BarChart data={etapas} xKey="etapa" yKey="leads" orientation="horizontal" height={260} showLegend={false} />
        )}
        <Origem>BRONZE.LEADS · GOLD.LEADS_CLASSIFICADOS · GOLD.FILA_DO_DIA · GOLD.FEEDBACK_CONTATOS</Origem>
      </CardContent>
    </Card>
  );
}

function PorIntencao() {
  const { canal } = useFiltros();
  const { data, loading, error } = useAnalyticsQuery('por_intencao', { canal: sql.string(canal) });
  const total = (data ?? []).reduce((s, d) => s + num(d.leads), 0);
  const semPotencial = (data ?? [])
    .filter((d) => d.intencao === 'Suporte' || d.intencao === 'Spam')
    .reduce((s, d) => s + num(d.leads), 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {data ? `${pct(semPotencial, total)} do volume é suporte ou spam` : 'Leads por intenção'}
        </CardTitle>
        <CardDescription>Leads do dia por intenção classificada pela IA, total e na fila</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !data && <Skeleton className="h-[260px] w-full" />}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {data && (
          <BarChart data={data} xKey="intencao" yKey={['leads', 'na_fila']} height={260} colorPalette="categorical" />
        )}
        <Origem>GOLD.LEADS_CLASSIFICADOS</Origem>
      </CardContent>
    </Card>
  );
}

function PorCanal() {
  const { canal } = useFiltros();
  const { data, loading, error } = useAnalyticsQuery('por_canal', { canal: sql.string(canal) });
  const linhas = (data ?? []).map((d) => ({ ...d, canal: canalLabel(d.canal) }));
  const lider = linhas[0];
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {lider ? `${lider.canal} traz mais compra imediata (${inteiro(lider.compra_imediata)})` : 'Leads por canal'}
        </CardTitle>
        <CardDescription>Volume não é qualidade: leads do dia por canal e intenção</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !data && <Skeleton className="h-[260px] w-full" />}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {data && (
          <BarChart
            data={linhas}
            xKey="canal"
            yKey={['compra_imediata', 'avaliando', 'sem_potencial']}
            stacked
            height={260}
            colorPalette="categorical"
          />
        )}
        <Origem>GOLD.LEADS_CLASSIFICADOS</Origem>
      </CardContent>
    </Card>
  );
}

function Vendedores() {
  const { rev } = useFiltros();
  const { data, loading, error } = useAnalyticsQuery('vendedores', { rev: sql.number(rev) });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Andamento por vendedor</CardTitle>
        <CardDescription>Contatos registrados pelo botão “Marcar como contatado”</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !data && <Skeleton className="h-40 w-full" />}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {data && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Na fila</TableHead>
                <TableHead className="text-right">Contatados</TableHead>
                <TableHead className="text-right">Nota média</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((v) => (
                <TableRow key={v.vendedor}>
                  <TableCell className="font-medium">{v.vendedor}</TableCell>
                  <TableCell className="text-right tabular-nums">{inteiro(v.na_fila)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {inteiro(v.contatados)} <span className="text-muted-foreground">({pct(v.contatados, v.na_fila)})</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{inteiro(v.nota_media)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Origem>GOLD.FILA_DO_DIA · GOLD.FEEDBACK_CONTATOS</Origem>
      </CardContent>
    </Card>
  );
}

function ForaDaFila() {
  const { canal } = useFiltros();
  const { data, loading, error } = useAnalyticsQuery('compra_fora_da_fila', { canal: sql.string(canal) });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Compra imediata que ficou fora da fila</CardTitle>
        <CardDescription>Candidatos para amanhã ou para redistribuir se alguém liberar agenda</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !data && <Skeleton className="h-40 w-full" />}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {data && data.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Nenhum lead quente ficou de fora</EmptyTitle>
              <EmptyDescription>Todos os leads de compra imediata deste filtro estão na fila.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {data && data.length > 0 && (
          <div className="max-h-80 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead className="text-right">Nota</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((l) => (
                  <TableRow key={l.lead_id}>
                    <TableCell>
                      <div className="font-medium">{l.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        {l.empresa ?? 'sem empresa'} · {l.hora_recebido}
                      </div>
                    </TableCell>
                    <TableCell>{canalLabel(l.canal)}</TableCell>
                    <TableCell className="text-right tabular-nums">{inteiro(l.nota)}</TableCell>
                    <TableCell className="max-w-xs whitespace-normal text-xs">{l.motivo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <Origem>GOLD.LEADS_CLASSIFICADOS · GOLD.FILA_DO_DIA</Origem>
      </CardContent>
    </Card>
  );
}

export function GestorPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Visão do Gestor</h1>
        <p className="text-sm text-muted-foreground">O funil está saudável? Quem atende quem? Que canal traz comprador?</p>
      </div>
      <Kpis />
      <div className="grid gap-4 lg:grid-cols-2">
        <Funil />
        <PorIntencao />
        <PorCanal />
        <Vendedores />
      </div>
      <ForaDaFila />
    </div>
  );
}
