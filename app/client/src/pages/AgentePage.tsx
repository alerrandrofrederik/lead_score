import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  GenieChatInput,
  GenieChatMessageList,
  useGenieChat,
} from '@databricks/appkit-ui/react';
import { Bot, Database, Loader2, MessageSquarePlus, Sparkles } from 'lucide-react';

const PERGUNTAS = [
  'Quantos leads de compra imediata chegaram hoje?',
  'Quais leads de compra imediata ficaram fora da fila de hoje?',
  'Qual canal trouxe mais leads de compra imediata nesta semana?',
  'Quais leads citaram concorrente?',
  'Quantos leads da minha fila eu já contatei?',
];

function useWhoami() {
  const [me, setMe] = useState<{ email: string | null } | null>(null);
  useEffect(() => {
    fetch('/api/whoami')
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe)
      .catch(() => setMe(null));
  }, []);
  return me;
}

export function AgentePage() {
  const { messages, status, error, sendMessage, reset } = useGenieChat({ alias: 'default' });
  const me = useWhoami();
  const ocupado = status === 'streaming' || status === 'loading-history';

  const ultimaQuery = useMemo(() => {
    for (const m of [...messages].reverse())
      for (const a of m.attachments ?? []) if (a.query?.query) return a.query;
    return null;
  }, [messages]);

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
              <Bot className="h-6 w-6 text-primary" /> Agente comercial
            </h1>
            <p className="text-sm text-muted-foreground">
              Pergunte em português sobre os leads de hoje, a fila e os contatos.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              <Sparkles className="h-3 w-3" /> Genie
            </Badge>
            <Badge variant="secondary">
              <Database className="h-3 w-3" /> SQL Warehouse
            </Badge>
            <Badge variant="outline">{me?.email ?? 'Usuário do workspace'}</Badge>
          </div>
        </div>

        {messages.length === 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {PERGUNTAS.map((p, i) => (
              <button
                key={p}
                type="button"
                disabled={ocupado}
                onClick={() => sendMessage(p)}
                className="rounded-lg border bg-card p-4 text-left text-sm text-card-foreground transition-colors hover:border-primary hover:bg-muted disabled:opacity-50"
              >
                <span className="mb-1 block text-xs text-muted-foreground">Pergunta {i + 1}</span>
                {p}
              </button>
            ))}
          </div>
        )}

        <Card className="flex h-[min(620px,65vh)] flex-col overflow-hidden py-0">
          <GenieChatMessageList messages={messages} status={status} className="flex-1" />
          <div className="border-t p-3">
            {status === 'streaming' && (
              <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Genie está analisando os dados…
              </p>
            )}
            {status === 'error' && (
              <Alert variant="destructive" className="mb-2">
                <AlertTitle>O agente não conseguiu responder</AlertTitle>
                <AlertDescription>{error ?? 'Reformule a pergunta ou tente de novo.'}</AlertDescription>
              </Alert>
            )}
            <GenieChatInput
              onSend={sendMessage}
              disabled={ocupado}
              placeholder="Ex.: quais leads de compra imediata ficaram fora da fila?"
            />
          </div>
        </Card>
        <p className="text-xs text-muted-foreground">
          Respostas geradas por IA a partir das tabelas Gold. Confira o SQL ao lado antes de decidir com base nelas.
        </p>
      </div>

      <aside className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>SQL gerado</CardTitle>
            <CardDescription>{ultimaQuery?.title ?? 'Como a última resposta foi calculada'}</CardDescription>
          </CardHeader>
          <CardContent>
            {ultimaQuery ? (
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-xs text-foreground">
                {ultimaQuery.query}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">Faça uma pergunta para ver a consulta que o Genie escreveu.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Governança</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>
              As perguntas rodam <strong className="text-foreground">com a sua identidade</strong> (on-behalf-of): o
              Genie só enxerga as tabelas que você pode ler no Unity Catalog.
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wider">
              GOLD.LEADS_CLASSIFICADOS · GOLD.FILA_DO_DIA · GOLD.FEEDBACK_CONTATOS
            </p>
            <Button variant="outline" size="sm" onClick={reset} disabled={messages.length === 0}>
              <MessageSquarePlus className="h-4 w-4" /> Nova conversa
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
