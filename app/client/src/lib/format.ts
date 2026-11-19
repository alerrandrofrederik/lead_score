export const num = (v: number | string | null | undefined): number => Number(v ?? 0);

export const inteiro = (v: number | string | null | undefined): string =>
  num(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

export const pct = (parte: number | string, total: number | string): string => {
  const t = num(total);
  return t === 0 ? '—' : `${((num(parte) / t) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
};

export const dataBR = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
};

export const horaBR = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export const INTENCAO_LABEL: Record<string, string> = {
  compra_imediata: 'Compra imediata',
  avaliando: 'Avaliando',
  suporte: 'Suporte',
  spam: 'Spam',
};

export const CANAL_LABEL: Record<string, string> = {
  linkedin: 'LinkedIn',
  indicacao: 'Indicação',
  evento: 'Evento',
  google_ads: 'Google Ads',
  site: 'Site',
};

export const canalLabel = (c: string | null | undefined): string => (c ? (CANAL_LABEL[c] ?? c) : '—');
