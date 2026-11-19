import { Card, CardContent, Skeleton } from '@databricks/appkit-ui/react';
import type { ReactNode } from 'react';

type Tom = 'primary' | 'success' | 'warning' | 'destructive' | 'muted';

const BORDA: Record<Tom, string> = {
  primary: 'border-l-primary',
  success: 'border-l-success',
  warning: 'border-l-warning',
  destructive: 'border-l-destructive',
  muted: 'border-l-muted-foreground',
};

interface KpiCardProps {
  titulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  origem: string;
  tom?: Tom;
  loading?: boolean;
}

/** KPI com borda semântica e a tabela de origem no rodapé (padrão 2.8 do PRD). */
export function KpiCard({ titulo, valor, detalhe, origem, tom = 'primary', loading }: KpiCardProps) {
  return (
    <Card className={`border-l-4 ${BORDA[tom]} py-0`}>
      <CardContent className="p-4 flex flex-col gap-1 h-full">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{titulo}</span>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <span className="text-3xl font-semibold tabular-nums text-foreground">{valor}</span>
        )}
        {detalhe && <span className="text-xs text-muted-foreground">{detalhe}</span>}
        <span className="mt-auto pt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80">
          {origem}
        </span>
      </CardContent>
    </Card>
  );
}
