# Chaveio

App de previsao de chaves estilo March Madness para eventos de team bonding. Antes do torneio comecar, cada participante preenche sua chave completa. Os palpites ficam privados ate o criador resolver cada rodada. Pontos sao atribuidos automaticamente.

## Como Funciona

1. **Criador** monta o torneio com os itens (4, 8, 16 ou 32) e compartilha o codigo
2. **Participantes** entram com o codigo, criam senha e preenchem seus palpites na chave completa
3. **Criador inicia** o torneio — palpites sao travados
4. **A cada partida**, o criador escolhe o vencedor — pontos sao calculados automaticamente
5. **Placar ao vivo** com ranking atualizado em tempo real

## Pontuacao

As rodadas valem progressivamente mais, e a final vale um bonus especial:

| Itens | R1 | R2 | R3 | R4 | R5 | Final | Max |
|-------|----|----|----|----|----|----|-----|
| 4     | 1  | —  | —  | —  | — | 4  | **6** |
| 8     | 1  | 2  | —  | —  | — | 8  | **14** |
| 16    | 1  | 2  | 4  | —  | — | 16 | **40** |
| 32    | 1  | 2  | 4  | 8  | — | 32 | **78** |

## Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Estilos | Tailwind CSS 4 |
| Banco | SQLite (dev) / PostgreSQL via Neon (prod) |
| ORM | Prisma 7 |
| Auth | JWT por torneio via `jose` |
| Testes | Vitest |
| Hosting | Vercel |
| CI | GitHub Actions |

## Rodando Localmente

```bash
# Instalar dependencias
pnpm install

# Configurar banco de dados
cp .env.example .env
pnpm prisma migrate dev

# Iniciar servidor de desenvolvimento
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
pnpm dev              # servidor de desenvolvimento
pnpm build            # build de producao
pnpm test             # testes unitarios
pnpm test:integration # testes de integracao
pnpm lint             # eslint
pnpm prisma studio    # GUI do banco de dados
```

## Estrutura do Projeto

```
src/
├── app/
│   ├── page.tsx                    # Landing: criar ou entrar
│   ├── tournament/
│   │   ├── new/page.tsx            # Formulario de criacao
│   │   └── [code]/
│   │       ├── page.tsx            # Lobby / tela de entrada
│   │       ├── bracket/page.tsx    # Preencher chave / visualizar
│   │       ├── live/page.tsx       # Criador resolve partidas
│   │       └── results/page.tsx    # Placar + ranking
│   └── api/                        # Rotas da API REST
├── lib/                            # Logica de negocio e utilitarios
├── components/                     # Componentes reutilizaveis
├── constants/                      # Constantes da aplicacao
└── types/                          # Interfaces TypeScript
```
