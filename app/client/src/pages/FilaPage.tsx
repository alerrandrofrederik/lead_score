import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Skeleton,
  useAnalyticsQuery,
  type QueryRegistry,
} from '@databricks/appkit-ui/react';
import { sql } from '@databricks/appkit-ui/js';
import { ArrowRight, Bot, Building2, Check, Clock, ListOrdered, Loader2, Phone } from 'lucide-react';
import { useFiltros } from '../lib/filtros';
import { canalLabel, dataBR, horaBR, INTENCAO_LABEL, inteiro, num } from '../lib/format';

type Lead = QueryRegistry['fila_vendedor']['result'][number];

function Hero() {
  const { canal } = useFiltros();
  const navigate = useNavigate();
  const { data, loading, error } = useAnalyticsQuery('resumo_dia', {
    canal: sql.string(canal),
    vendedor: sql.string(''),
    rev: sql.number(0),
  });
  const r = data?.[0];

  return (
    <section className="rounded-xl border bg-card p-6 md:p-8">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Fila do dia · {r ? dataBR(r.data_referencia) : '—'}
      </p>
      {loading && <Skeleton className="mt-3 h-10 w-3/4" />}
      {error && <p className="mt-3 text-destructive">Não foi possível carregar o resumo: {error}</p>}
      {r && (
        <h1 className="mt-2 text-2xl font-semibold leading-snug text-foreground md:text-3xl">
          <span className="text-primary">{inteiro(r.na_fila)} leads</span> na fila hoje ·{' '}
          <span>{inteiro(r.compra_imediata)} de compra imediata</span> ·{' '}
          <span className="text-destructive">{inteiro(r.compra_fora_da_fila)} ficaram de fora</span>
        </h1>
      )}
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        {r ? `${inteiro(r.recebidos)} leads chegaram, ${inteiro(r.leads_unicos)} únicos depois da deduplicação. ` : ''}
        A IA leu cada mensagem e a nota escolheu os 20 com maior chance de compra. 4 vendedores, 5 conversas cada.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={() => document.getElementById('minha-fila')?.scrollIntoView({ behavior: 'smooth' })}>
          <ListOrdered className="h-4 w-4" /> Ver minha fila
        </Button>
        <Button variant="outline" onClick={() => void navigate('/agente')}>
          <Bot className="h-4 w-4" /> Perguntar ao agente
        </Button>
      </div>
    </section>
  );
}

const COMPONENTES: Array<{ chave: 'c_intencao' | 'c_perfil' | 'c_sinais' | 'c_recencia'; rotulo: string; peso: number }> = [
  { chave: 'c_intencao', rotulo: 'Intenção', peso: 0.5 },
  { chave: 'c_perfil', rotulo: 'Perfil', peso: 0.25 },
  { chave: 'c_sinais', rotulo: 'Sinais', peso: 0.15 },
  { chave: 'c_recencia', rotulo: 'Recência', peso: 0.1 },
];

function Componentes({ lead }: { lead: Lead }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      {COMPONENTES.map(({ chave, rotulo, peso }) => {
        const v = num(lead[chave]);
        return (
          <div key={chave} className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>
                {rotulo} <span className="opacity-70">×{peso.toLocaleString('pt-BR')}</span>
              </span>
              <span className="tabular-nums text-foreground">{v}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${v}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Entidades({ lead }: { lead: Lead }) {
  const itens: Array<[string, string | null]> = [
    ['Produto', lead.produto],
    ['Licenças', lead.qtd_licencas ? inteiro(lead.qtd_licencas) : null],
    ['Prazo', lead.prazo],
    ['Orçamento', lead.orcamento_aprovado ? 'aprovado' : null],
    ['Cargo', lead.cargo],
    ['Concorrente', lead.concorrente_citado],
  ];
  const presentes = itens.filter(([, v]) => v);
  if (presentes.length === 0) return <p className="text-xs text-muted-foreground">Nenhum dado extraído da mensagem.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {presentes.map(([k, v]) => (
        <Badge key={k} variant="secondary" className="font-normal">
          <span className="text-muted-foreground">{k}:</span> {v}
        </Badge>
      ))}
    </div>
  );
}

function LeadCard({ lead, onContatado }: { lead: Lead; onContatado: () => void }) {
  const [estado, setEstado] = useState<'idle' | 'salvando' | 'ok' | 'erro'>(lead.contatado_em ? 'ok' : 'idle');
  const [erro, setErro] = useState<string | null>(null);
  const contatado = estado === 'ok' || !!lead.contatado_em;

  async function marcar() {
    setEstado('salvando');
    setErro(null);
    try {
      const resp = await fetch('/api/contatos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: lead.lead_id, vendedor: lead.vendedor, resultado: 'contatado' }),
      });
      if (!resp.ok) {
        const corpo = (await resp.json().catch(() => ({}))) as { error?: string };
        throw new Error(corpo.error ?? `HTTP ${resp.status}`);
      }
      setEstado('ok');
      onContatado();
    } catch (e) {
      setEstado('erro');
      setErro(e instanceof Error ? e.message : 'Falha ao registrar');
    }
  }

  const compra = lead.intencao === 'compra_imediata';
  return (
    <Card className={`flex flex-col ${contatado ? 'opacity-70' : ''}`}>
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        <div className="flex flex-col items-center">
          <span className="text-4xl font-semibold tabular-nums text-foreground">{inteiro(lead.nota)}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">nota</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs tabular-nums text-muted-foreground">#{lead.posicao}</span>
            <Badge className={compra ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'}>
              {INTENCAO_LABEL[lead.intencao] ?? lead.intencao}
            </Badge>
            {lead.ja_cliente && <Badge variant="outline">Já é cliente</Badge>}
          </div>
          <h3 className="mt-1 truncate text-base font-semibold text-foreground">{lead.nome}</h3>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" /> {lead.empresa ?? 'Empresa não identificada'} · {canalLabel(lead.canal)}
            <Clock className="ml-1 h-3 w-3" /> {lead.hora_recebido}
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Por que está na fila</p>
          <p className="text-sm text-foreground">{lead.motivo}</p>
        </div>
        <blockquote className="border-l-2 pl-3 text-sm italic text-muted-foreground">“{lead.mensagem}”</blockquote>
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Extraído pela IA</p>
          <Entidades lead={lead} />
        </div>
        <Componentes lead={lead} />
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-2 border-t pt-4">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ArrowRight className="h-4 w-4 text-primary" /> {lead.proximo_passo}
          <span className="ml-auto flex items-center gap-1 text-xs font-normal text-muted-foreground">
            <Phone className="h-3 w-3" /> {lead.telefone}
          </span>
        </p>
        <Button
          variant={contatado ? 'secondary' : 'default'}
          disabled={contatado || estado === 'salvando'}
          onClick={() => void marcar()}
        >
          {estado === 'salvando' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : contatado ? (
            <Check className="h-4 w-4" />
          ) : null}
          {contatado
            ? `Contatado${lead.contatado_em ? ` · ${horaBR(lead.contatado_em)}` : ''}`
            : estado === 'salvando'
              ? 'Registrando…'
              : 'Marcar como contatado'}
        </Button>
        {estado === 'erro' && <p className="text-xs text-destructive">Não registrou: {erro}</p>}
      </CardFooter>
    </Card>
  );
}

function Fila() {
  const { vendedor, canal, rev, bump } = useFiltros();
  const { data, loading, error } = useAnalyticsQuery('fila_vendedor', {
    vendedor: sql.string(vendedor),
    canal: sql.string(canal),
    rev: sql.number(rev),
  });

  const leads: Lead[] = data ?? [];
  const feitos = leads.filter((l) => l.contatado_em).length;

  return (
    <section id="minha-fila" className="flex scroll-mt-20 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{vendedor ? `Fila de ${vendedor}` : 'Fila completa'}</h2>
          <p className="text-sm text-muted-foreground">
            Ordenada pela nota · {data ? `${feitos} de ${leads.length} contatados` : 'carregando…'}
          </p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          GOLD.FILA_DO_DIA · GOLD.FEEDBACK_CONTATOS
        </span>
      </div>

      {loading && !data && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-96 rounded-xl" />
          ))}
        </div>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível carregar a fila</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {data && leads.length === 0 && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Nenhum lead nesta fila</EmptyTitle>
            <EmptyDescription>
              Com o filtro de canal atual, nenhum dos 20 leads do dia é deste vendedor. Limpe o filtro de canal no
              topo.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {leads.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {leads.map((l) => (
            <LeadCard key={`${l.lead_id}-${rev}`} lead={l} onContatado={bump} />
          ))}
        </div>
      )}
    </section>
  );
}

export function FilaPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <Hero />
      <Fila />
    </div>
  );
}
