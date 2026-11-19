import { createBrowserRouter, RouterProvider, NavLink, Outlet } from 'react-router';
import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  useAnalyticsQuery,
  useIsMobile,
} from '@databricks/appkit-ui/react';
import { sql } from '@databricks/appkit-ui/js';
import { Bot, Gauge, ListOrdered, Menu, Moon, Network, Sun, Target } from 'lucide-react';
import { FiltrosProvider, useFiltros, VENDEDORES } from './lib/filtros';
import { canalLabel } from './lib/format';
import { FilaPage } from './pages/FilaPage';
import { GestorPage } from './pages/GestorPage';
import { AgentePage } from './pages/AgentePage';
import { PlataformaPage } from './pages/PlataformaPage';

const TODOS = '__todos__';

const MENU = [
  {
    grupo: 'Comercial',
    itens: [
      { to: '/', label: 'Fila do Dia', sub: 'gold.fila_do_dia', icon: ListOrdered },
      { to: '/gestor', label: 'Visão do Gestor', sub: 'gold.leads_classificados', icon: Gauge },
    ],
  },
  {
    grupo: 'Inteligência',
    itens: [{ to: '/agente', label: 'Agente', sub: 'Genie Conversation API', icon: Bot }],
  },
  {
    grupo: 'Engenharia',
    itens: [{ to: '/plataforma', label: 'Plataforma', sub: 'Lakeflow · Unity Catalog', icon: Network }],
  },
];

function Navegacao({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-5">
      {MENU.map((g) => (
        <div key={g.grupo} className="flex flex-col gap-1">
          <span className="px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
            {g.grupo}
          </span>
          {g.itens.map(({ to, label, sub, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-start gap-3 rounded-md px-3 py-2 transition-colors ${
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`
              }
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-medium">{label}</span>
                <span className="font-mono text-[10px] opacity-70">{sub}</span>
              </span>
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

function StatusServicos() {
  const { rev } = useFiltros();
  const { data, loading, error } = useAnalyticsQuery('vendedores', { rev: sql.number(rev) });
  const sqlOk = !loading && !error && data !== null;
  const ponto = (ok: boolean, carregando: boolean) =>
    carregando ? 'bg-warning' : ok ? 'bg-success' : 'bg-destructive';
  return (
    <div className="flex flex-col gap-2 rounded-md border border-sidebar-border p-3 text-xs text-sidebar-foreground/80">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">Serviços</span>
      <span className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${ponto(sqlOk, loading)}`} />
        SQL Warehouse
      </span>
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-success" />
        Genie Space
      </span>
    </div>
  );
}

function Marca() {
  return (
    <div className="flex items-center gap-2 px-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <Target className="h-4 w-4" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-sidebar-foreground">Lead Score</span>
        <span className="text-[10px] text-sidebar-foreground/60">Atlas Software · comercial</span>
      </span>
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="dark flex h-full flex-col gap-6 bg-sidebar px-3 py-5">
      <Marca />
      <Navegacao onNavigate={onNavigate} />
      <div className="mt-auto">
        <StatusServicos />
      </div>
    </div>
  );
}

function useTema(): [boolean, () => void] {
  const [escuro, setEscuro] = useState<boolean>(() => {
    try {
      const salvo = localStorage.getItem('lead-score:tema');
      if (salvo) return salvo === 'escuro';
    } catch {
      /* sem armazenamento */
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', escuro);
    root.classList.toggle('light', !escuro);
    try {
      localStorage.setItem('lead-score:tema', escuro ? 'escuro' : 'claro');
    } catch {
      /* sem armazenamento */
    }
  }, [escuro]);
  return [escuro, () => setEscuro((e) => !e)];
}

function FiltrosGlobais() {
  const { vendedor, setVendedor, canal, setCanal } = useFiltros();
  const { data: canais } = useAnalyticsQuery('canais', {});
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={vendedor || TODOS} onValueChange={(v) => setVendedor(v === TODOS ? '' : v)}>
        <SelectTrigger className="h-8 w-[170px]" aria-label="Vendedor">
          <SelectValue placeholder="Vendedor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos os vendedores</SelectItem>
          {VENDEDORES.map((v) => (
            <SelectItem key={v} value={v}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={canal || TODOS} onValueChange={(v) => setCanal(v === TODOS ? '' : v)}>
        <SelectTrigger className="h-8 w-[160px]" aria-label="Canal">
          <SelectValue placeholder="Canal" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos os canais</SelectItem>
          {(canais ?? []).map((c) => (
            <SelectItem key={c.canal} value={c.canal}>
              {canalLabel(c.canal)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Layout() {
  const isMobile = useIsMobile();
  const [menuAberto, setMenuAberto] = useState(false);
  const [escuro, alternarTema] = useTema();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 md:block">
        <Sidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur md:px-6">
          <div className="md:hidden">
            <Sheet open={menuAberto && isMobile} onOpenChange={setMenuAberto}>
              <Button variant="ghost" size="icon" onClick={() => setMenuAberto(true)}>
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menu</span>
              </Button>
              <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <Sidebar onNavigate={() => setMenuAberto(false)} />
              </SheetContent>
            </Sheet>
          </div>
          <FiltrosGlobais />
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="border-warning text-foreground">
              Demo · dados 100% sintéticos
            </Badge>
            <Button variant="ghost" size="icon" onClick={alternarTema} aria-label="Alternar tema">
              {escuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <FilaPage /> },
      { path: '/gestor', element: <GestorPage /> },
      { path: '/agente', element: <AgentePage /> },
      { path: '/plataforma', element: <PlataformaPage /> },
    ],
  },
]);

export default function App() {
  return (
    <FiltrosProvider>
      <RouterProvider router={router} />
    </FiltrosProvider>
  );
}
