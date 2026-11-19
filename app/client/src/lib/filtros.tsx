import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export const VENDEDORES = ['Ana Ribeiro', 'Bruno Costa', 'Carla Mendes', 'Diego Lima'] as const;

interface Filtros {
  vendedor: string; // '' = todos
  canal: string; // '' = todos
  rev: number; // muda após cada "contatado" para furar o cache das consultas
  setVendedor: (v: string) => void;
  setCanal: (c: string) => void;
  bump: () => void;
}

const FiltrosContext = createContext<Filtros | null>(null);

function lerVendedorSalvo(): string {
  try {
    return localStorage.getItem('lead-score:vendedor') ?? VENDEDORES[0];
  } catch {
    return VENDEDORES[0];
  }
}

export function FiltrosProvider({ children }: { children: ReactNode }) {
  const [vendedor, setVendedorState] = useState<string>(lerVendedorSalvo);
  const [canal, setCanal] = useState('');
  // Começa no instante em que a página abriu (segundos, cabe em INT): cada carga da página
  // ganha uma chave de cache nova no servidor, e cada "contatado" incrementa.
  const [rev, setRev] = useState(() => Math.floor(Date.now() / 1000));

  const setVendedor = useCallback((v: string) => {
    setVendedorState(v);
    try {
      localStorage.setItem('lead-score:vendedor', v);
    } catch {
      /* armazenamento indisponível: só não lembra a escolha */
    }
  }, []);
  const bump = useCallback(() => setRev((r) => r + 1), []);

  const value = useMemo(
    () => ({ vendedor, canal, rev, setVendedor, setCanal, bump }),
    [vendedor, canal, rev, setVendedor, bump],
  );
  return <FiltrosContext.Provider value={value}>{children}</FiltrosContext.Provider>;
}

export function useFiltros(): Filtros {
  const ctx = useContext(FiltrosContext);
  if (!ctx) throw new Error('useFiltros fora do FiltrosProvider');
  return ctx;
}
