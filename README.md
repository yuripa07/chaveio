# Chaveio

App de previsao de chaves estilo March Madness para eventos de team bonding. Antes do torneio comecar, cada participante preenche sua chave completa. Os palpites ficam privados ate o criador resolver cada rodada. Pontos sao atribuidos automaticamente.

## Como Funciona

1. **Criador** entra com Google, monta o torneio com os itens (4, 8, 16 ou 32) e compartilha o codigo
2. **Participantes** entram com Google usando o codigo e preenchem seus palpites na chave completa
3. **Criador inicia** o torneio — palpites sao travados
4. **A cada partida**, o criador escolhe o vencedor — pontos sao calculados automaticamente
5. **Placar ao vivo** com ranking atualizado em tempo real (polling a cada 3-5s)

## Pontuacao

As rodadas valem progressivamente mais, e a final vale um bonus especial:

| Itens | R1 | R2 | R3 | R4 | R5 | Final | Max |
|-------|----|----|----|----|----|----|-----|
| 4     | 1  | —  | —  | —  | — | 4  | **6** |
| 8     | 1  | 2  | —  | —  | — | 8  | **14** |
| 16    | 1  | 2  | 4  | —  | — | 16 | **40** |
| 32    | 1  | 2  | 4  | 8  | — | 32 | **78** |

Empates no ranking sao desempatados por ordem alfabetica (sequential ranking).

## Recursos

- **Login com Google** (OAuth via `arctic`, PKCE) — sessao persistida em cookie HttpOnly de 30 dias
- **Token por torneio** (JWT em `localStorage`, 30 dias) — independente da sessao Google
- **Historico de torneios** em `/history` — lista todos os torneios em que o usuario participou ou criou
- **Reordenar candidatos** via drag-and-drop no lobby (somente criador, antes dos picks)
- **Expulsar participante** a qualquer momento (lobby, ativo, finalizado) com cascata em picks
- **Late joiners** — participantes que entram durante o torneio recebem picks parciais a partir da rodada atual
- **i18n** pt-BR / en com `LocaleProvider` + traducao automatica de erros da API
- **Dark mode** com toggle Light / Dark / System
- **Header unificado** (`AppHeader`) com avatar, dropdown de tema, idioma, historico e logout
- **Polling** em todas as paginas dinamicas (lobby 3s, bracket 5s, results/live 4s) com `AbortController`

## Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Estilos | Tailwind CSS 4 |
| Banco | PostgreSQL via Neon (dev e prod) |
| ORM | Prisma 7 |
| Auth (sessao) | Google OAuth via `arctic` (PKCE) + JWT em cookie HttpOnly via `jose` |
| Auth (torneio) | JWT por torneio via `jose` (HS256, 30d) |
| Drag-and-drop | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` |
| Icones | `lucide-react` |
| Testes | Vitest (unit + integracao) |
| Hosting | Vercel |
| CI | GitHub Actions |
| Package manager | **pnpm** (nunca `npm` para instalar) |

## Rodando Localmente

```bash
# Instalar dependencias
pnpm install

# Configurar variaveis de ambiente
cp .env.example .env
# Edite .env com seus valores: DATABASE_URL, JWT_SECRET, SESSION_SECRET,
# GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI

# Aplicar migracoes
pnpm prisma migrate dev

# Iniciar servidor de desenvolvimento
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Variaveis de ambiente

| Variavel | Descricao |
|----------|-----------|
| `DATABASE_URL` | Connection string do Postgres Neon (use uma branch dedicada para dev) |
| `JWT_SECRET` | Assinatura dos tokens por torneio |
| `SESSION_SECRET` | Assinatura do cookie de sessao Google (rotacionavel separado de `JWT_SECRET`) |
| `GOOGLE_CLIENT_ID` | OAuth client (Google Cloud Console) |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Ex.: `http://localhost:3000/api/auth/google/callback` |

Gere segredos com `openssl rand -base64 32`.

## Scripts

```bash
pnpm dev                       # servidor de desenvolvimento
pnpm build                     # build de producao
pnpm test                      # testes unitarios (vitest)
pnpm test:watch                # vitest em watch mode
pnpm test:integration          # testes de integracao
pnpm test:coverage             # cobertura unitaria
pnpm test:coverage:integration # cobertura de integracao
pnpm lint                      # eslint
pnpm prisma migrate dev        # criar/aplicar migracao
pnpm prisma studio             # GUI do banco
```

> Sempre use `pnpm` localmente. Apos `pnpm add`, rode `npm install --package-lock-only` para manter o `package-lock.json` em sincronia para o CI.

## Estrutura do Projeto

```
src/
├── app/
│   ├── layout.tsx                       # Root layout (Theme/Locale/UserProvider + AppHeader)
│   ├── page.tsx                         # Landing (gateado em login)
│   ├── history/page.tsx                 # Historico de torneios do usuario
│   ├── tournament/
│   │   ├── new/page.tsx                 # Formulario de criacao
│   │   └── [code]/
│   │       ├── page.tsx                 # Lobby
│   │       ├── bracket/page.tsx         # Preencher / visualizar chave
│   │       ├── live/page.tsx            # Criador resolve partidas
│   │       └── results/page.tsx         # Placar + ranking
│   └── api/
│       ├── auth/                        # Google OAuth: start, callback, logout, me
│       ├── tournaments/                 # CRUD, join, start, rankings, items/order, kick
│       └── picks/                       # GET / POST picks
├── lib/                                 # Logica de negocio (auth, session, oauth, bracket, pontuacao)
├── contexts/                            # LocaleProvider, ThemeProvider, UserProvider
├── hooks/                               # usePolling, useTournamentToken, useRequireParticipant
├── components/                          # AppHeader, BracketView, GoogleSignInButton, etc.
├── locales/translations.ts              # Strings pt-BR / en
├── constants/                           # Estilos compartilhados, intervalos de polling, statuses
└── types/                               # Interfaces TypeScript
```

Para detalhes de convencoes, padroes e arquitetura, veja `AGENTS.md` e `docs/`:

- `docs/auth.md` — modelo de dois tokens, fluxo OAuth, garantias legacy
- `docs/frontend-conventions.md` — padroes de UI, hooks, dark mode, i18n
- `docs/backend-conventions.md` — padroes de rotas, transacoes, testes
- `docs/i18n.md` — adicao de strings, traducao de erros da API
- `docs/git-workflow.md` — branch strategy, versionamento e migracoes
- `docs/code-conventions.md` — estilo de codigo

Historico de releases em [`CHANGELOG.md`](./CHANGELOG.md).
