# Claude Agent Monitor - PRD (Product Requirements Document)

> Mission Control open-source para agentes Claude Code: observabilidade em tempo real + tracking visual de PRD/Sprints

**Versao**: 2.0.0
**Data**: 2026-02-14
**Status**: Draft
**Licenca**: MIT

---

## 1. Visao do Produto

### Nome
**Claude Agent Monitor** (CAM)

### Proposta de Valor
Um Mission Control que transforma a experiencia "black box" de agentes Claude Code em uma experiencia completamente transparente e observavel. Dois pilares complementares:

| Pilar | Pergunta que responde | Fonte de dados |
|-------|----------------------|----------------|
| **Agent Monitor** | "O que cada agente esta fazendo AGORA?" | Hooks em tempo real |
| **PRD Tracker** | "Onde estamos no projeto? O que falta?" | TaskCreate/TaskUpdate capturados via hooks |

Entregue um PRD. Abra o dashboard. Deixe os agentes trabalharem. Assista tudo acontecer.

### Target Audience
- **Primario**: Desenvolvedores que usam Claude Code com times de agentes (TeamCreate/Task)
- **Secundario**: Qualquer usuario de Claude Code que roda agentes em background
- **Terciario**: Leads tecnicos que querem supervisionar agentes trabalhando em projetos
- **Bonus**: Desenvolvedores iniciantes que querem visibilidade total do que a IA esta fazendo no projeto deles

### Diferencial
- **Unico Mission Control visual** para Claude Code agents (nenhum existe hoje)
- **Agent Map interativo**: visualizacao pixel art em tempo real onde agentes sao personagens que se movem entre zonas, interagem e executam acoes - inspirado no OPES Big Brother
- **PRD-driven**: importa um PRD, o dashboard tracka progresso automaticamente conforme agentes completam tasks
- **Zero config**: um comando para instalar, hooks auto-configurados
- **Auto-updating**: tasks se movem sozinhas no Kanban conforme agentes trabalham
- **Open-source**: comunidade pode criar temas customizados (Open Core model)
- **Universal**: funciona em qualquer projeto - basta `cam init` + entregar o PRD
- **Temas premium** (futuro): Terminal e Pixel Art como experiencias alternativas completas

---

## 2. Problema

### Situacao Atual
Quando um desenvolvedor usa Claude Code com agentes em background (`Task` tool com `run_in_background: true`, ou `TeamCreate` com multiplos teammates), a unica forma de monitorar e:

1. Ler arquivos de output manualmente (`Read` no output_file)
2. Rodar `tail` nos logs
3. Esperar a notificacao de idle/completion
4. Abrir o task list e ler status textual

### Dores

**Pilar 1 - Observabilidade de Agentes**:
| Dor | Severidade | Frequencia |
|-----|-----------|------------|
| Nao sei se o agente travou ou esta trabalhando | Alta | Toda sessao |
| Perco contexto de o que cada agente fez | Alta | Times > 2 agentes |
| Nao sei quais arquivos foram modificados | Media | Projetos grandes |
| Preciso fazer polling manual nos outputs | Media | Background tasks |
| Nao consigo ver erros ate o agente terminar | Alta | Debug sessions |
| Falta visao geral do progresso do time | Media | Team workflows |

**Pilar 2 - Tracking de PRD/Sprint**:
| Dor | Severidade | Frequencia |
|-----|-----------|------------|
| Nao sei em qual etapa do PRD estamos | Alta | Todo projeto |
| Nao tenho visao de quais tasks ja foram concluidas | Alta | Sprints longos |
| Preciso abrir task list textual e contar manualmente | Media | Toda sessao |
| Nao sei qual % do sprint/projeto esta completo | Alta | Projetos multi-sprint |
| Nao consigo ver dependencias bloqueadas visualmente | Media | Tasks complexas |
| Falta um burndown/progresso para saber se estamos no ritmo | Media | Projetos com deadline |

### Oportunidade
Claude Code expoe **hooks** - shell commands que executam em resposta a eventos do agente. Esses hooks sao o ponto de integracao perfeito: capturam eventos em tempo real sem modificar o comportamento do Claude Code.

Alem disso, quando agentes usam `TaskCreate`, `TaskUpdate`, e `TaskList`, essas chamadas passam pelos hooks como qualquer outra tool. Isso significa que podemos **capturar automaticamente o progresso das tasks** sem nenhum input manual - o Kanban se atualiza sozinho.

---

## 3. Arquitetura Tecnica

### Overview

```
                          +---> [Pilar 1] Agent Monitor (real-time activity)
                          |
PRD.md --> cam init --+   |
                      |   |
Claude Code (hooks) --+--> Local Server (Node.js) ---> Dashboard (Browser)
       |                      |                              |
  hook scripts           REST + SSE                    React SPA
  (shell cmds)          (port 7890)                (3 temas visuais)
                          |
                          +---> [Pilar 2] PRD Tracker (sprint/task progress)
```

### Fluxo de Dados - Pilar 1 (Agent Monitor)

```
1. Claude Code executa uma acao (ex: Edit file)
2. Hook configurado dispara um shell command
3. Shell command faz POST para o servidor local (localhost:7890)
4. Servidor processa, armazena em memoria, e emite SSE event
5. Dashboard recebe SSE e atualiza UI em tempo real
6. Dados persistidos em SQLite para historico da sessao
```

### Fluxo de Dados - Pilar 2 (PRD Tracker)

```
1. Usuario fornece PRD.md via `cam init --prd ./PRD.md`
2. PRD e parseado em tasks estruturadas (AI-assisted ou formato estruturado)
3. Usuario revisa/confirma tasks no dashboard
4. Agentes trabalham -> hooks capturam chamadas a TaskCreate/TaskUpdate
5. Correlation Engine mapeia tool calls para PRD tasks
6. Dashboard atualiza Kanban/Progress/Burndown automaticamente
7. Ao final, relatorio completo de execucao do PRD
```

### Stack Tecnico

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Hook Scripts** | Bash/PowerShell + curl | Universais, zero deps |
| **Server** | Node.js + Express/Fastify | Leve, facil de instalar |
| **Database** | SQLite (better-sqlite3) | Zero config, arquivo local |
| **SSE** | EventSource API nativa | Simples, unidirecional, perfeito para monitoring |
| **Dashboard** | React 19 + Vite | Rapido, moderno, HMR para dev |
| **Styling** | Tailwind CSS 4 | Consistente, facil theming |
| **State** | Zustand | Leve, sem boilerplate |
| **Graficos** | Recharts ou Visx | Simples, React-native |

### Por que NAO WebSocket?
SSE (Server-Sent Events) e suficiente porque:
- Fluxo de dados e **unidirecional** (server -> client)
- O dashboard so observa, nao envia comandos
- SSE reconecta automaticamente
- Menos complexidade que WebSocket
- Funciona nativamente sem bibliotecas extras

---

## 4. Especificacao dos 3 Temas

### 4.1 Pixel Art Theme ("Retro")

**Conceito**: Dashboard estilo game boy / RPG dos anos 90. Cada agente e um personagem pixel art com animacoes de estado.

**Visual**:
- Background: Grid escuro com scan lines sutis
- Fonte: Monospace pixelada (Press Start 2P ou similar)
- Cores: Paleta limitada a 16 cores (estilo NES)
- Bordas: Pixel borders (box-shadow steps)
- Agentes: Sprites 32x32 com idle/working/error/done animations
- Barra de progresso: Coracao/estrela que enche pixel a pixel
- Notificacoes: Baloes de dialogo RPG

**Agente Sprites (estados)**:
| Estado | Animacao |
|--------|----------|
| `idle` | Personagem parado, piscando |
| `working` | Martelando/digitando, particulas de codigo |
| `error` | Exclamacao vermelha piscando, personagem tremendo |
| `completed` | Comemoracap com confete pixelado |
| `shutdown` | Personagem deita e dorme (zzZ) |

**Layout**:
- Top: Status bar estilo game (HP/MP = progresso/memoria)
- Center: "Mapa" onde agentes se movem entre "salas" (tasks)
- Bottom: Log estilo terminal RPG ("Agent-1 used Edit! It's super effective!")
- Sidebar: Inventario = lista de arquivos modificados

### 4.2 Modern Theme ("Clean")

**Conceito**: Dashboard minimalista e profissional, inspirado em Linear/Vercel/Raycast.

**Visual**:
- Background: `#0a0a0a` com gradients sutis
- Fonte: Inter/Geist (system)
- Cores: Neutrals + accent color configuravel
- Bordas: 1px borders com border-radius suave
- Cards: Glassmorphism sutil com backdrop-blur
- Motion: Framer Motion para transicoes suaves
- Graficos: Area charts limpos para timeline

**Layout**:
- Top bar: Session info + tempo decorrido + agent count
- Left sidebar: Lista de agentes com status dots (verde/amarelo/vermelho)
- Center: Feed de atividades em tempo real (estilo git log visual)
- Right panel: Detalhes do agente selecionado (tool calls, files, messages)
- Bottom: Mini timeline/gantt dos agentes

**Componentes especificos**:
- Agent cards com avatar gerado (identicon/gradient)
- Activity feed com icones por tipo de tool
- File tree com highlights de arquivos modificados
- Diff viewer inline para mudancas recentes
- Toast notifications para eventos importantes

### 4.3 Terminal Theme ("Hacker")

**Conceito**: Interface 100% texto, estilo htop/lazygit/terminal multiplexer. Para quem vive no terminal.

**Visual**:
- Background: Preto puro `#000000`
- Fonte: JetBrains Mono / Fira Code
- Cores: Verde fosforescente (#00ff00) principal, amber (#ffaa00) warnings, red (#ff0000) errors
- Sem bordas arredondadas - tudo reto, box-drawing characters
- Efeito CRT opcional (curvatura + scan lines + flicker)
- ASCII art para headers e separadores

**Layout (paineis estilo tmux)**:
```
+--[Agents]--+--[Activity Log]--+--[Details]--+
| AG-1: work | 14:23 AG-1 Edit  | Tool: Edit   |
| AG-2: idle | 14:23 AG-1 Read  | File: src/.. |
| AG-3: done | 14:22 AG-2 Bash  | Duration: 3s |
+------------+-----------+------+--------------+
| [Task List]            | [File Watcher]       |
| [ ] Task 1 (AG-1)     | M src/index.ts       |
| [x] Task 2 (AG-3)     | A src/new-file.ts    |
| [ ] Task 3 (blocked)  | M package.json       |
+------------------------+----------------------+
```

**Caracteristicas**:
- Keyboard-only navigation (vim keys: j/k/h/l)
- Paineis redimensionaveis com drag
- Filtros por tipo de evento (`:filter tool:Edit`)
- Busca textual nos logs (`:search pattern`)
- Auto-scroll com toggle (tecla `f` = follow mode)
- Sparklines ASCII para metricas

---

## 5. Data Model

### 5.1 Session

Uma sessao representa uma invocacao do Claude Code.

```typescript
interface Session {
  id: string;              // UUID gerado no start
  startedAt: string;       // ISO timestamp
  endedAt?: string;        // null se ativa
  workingDirectory: string;
  status: 'active' | 'completed' | 'error';
  agentCount: number;      // total de agentes observados
  eventCount: number;      // total de eventos recebidos
  metadata?: Record<string, unknown>;
}
```

### 5.2 Agent

Um agente e um processo Claude Code (main ou teammate).

```typescript
interface Agent {
  id: string;              // agent ID do Claude Code (ou "main" para o principal)
  sessionId: string;       // FK para Session
  name: string;            // nome legivel (ex: "researcher", "frontend-engineer")
  type: string;            // subagent_type (ex: "general-purpose", "Explore")
  status: AgentStatus;
  firstSeenAt: string;     // quando apareceu pela primeira vez
  lastActivityAt: string;  // ultimo evento recebido
  currentTask?: string;    // task ID que esta executando
  toolCallCount: number;
  errorCount: number;
}

type AgentStatus =
  | 'active'       // recebendo eventos ativamente
  | 'idle'         // sem atividade por > 30s
  | 'error'        // ultimo evento foi erro
  | 'completed'    // agente terminou
  | 'shutdown';    // recebeu shutdown request
```

### 5.3 Event

Evento individual capturado por um hook.

```typescript
interface AgentEvent {
  id: string;              // UUID
  sessionId: string;       // FK
  agentId: string;         // FK (qual agente gerou)
  timestamp: string;       // ISO timestamp
  hookType: HookType;      // qual hook disparou
  category: EventCategory; // classificacao para UI

  // Payload especifico do hook
  tool?: string;           // nome da tool (Edit, Bash, Read, etc.)
  filePath?: string;       // arquivo afetado
  input?: string;          // input truncado (primeiros 500 chars)
  output?: string;         // output truncado (primeiros 500 chars)
  error?: string;          // mensagem de erro se houver
  duration?: number;       // ms da execucao

  // Metadata
  metadata?: Record<string, unknown>;
}

type HookType =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'Notification'
  | 'Stop'
  | 'SubagentStop'
  | 'PreCompact'
  | 'PostCompact'
  | 'PreToolUseRejected'
  | 'ToolError'
  | 'SessionStart';

type EventCategory =
  | 'tool_call'    // PreToolUse/PostToolUse
  | 'file_change'  // Edit/Write tool events
  | 'command'       // Bash tool events
  | 'message'       // SendMessage events
  | 'lifecycle'     // Start/Stop/Shutdown
  | 'error'         // Errors e rejections
  | 'compact'       // Context compaction
  | 'notification'; // Notifications
```

### 5.4 TaskItem

Espelho das tasks do team (capturadas indiretamente via tool calls).

```typescript
interface TaskItem {
  id: string;
  sessionId: string;
  subject: string;
  status: 'pending' | 'in_progress' | 'completed';
  owner?: string;          // agent name
  createdAt: string;
  updatedAt: string;
}
```

### 5.5 FileChange

Arquivo modificado durante a sessao.

```typescript
interface FileChange {
  filePath: string;
  sessionId: string;
  agentId: string;
  changeType: 'created' | 'modified' | 'read';
  firstTouchedAt: string;
  lastTouchedAt: string;
  touchCount: number;      // quantas vezes foi tocado
}
```

### 5.6 Project (Pilar 2)

Container principal que agrupa PRD + sessoes + tasks.

```typescript
interface Project {
  id: string;              // UUID
  name: string;            // nome do projeto (ex: "claude-agent-monitor")
  description?: string;    // descricao curta
  prdSource: string;       // path original do PRD.md
  prdContent: string;      // conteudo raw do PRD
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'completed' | 'archived';
  totalTasks: number;
  completedTasks: number;
  currentSprintId?: string;
  metadata?: Record<string, unknown>;
}
```

### 5.7 Sprint (Pilar 2)

Fase/sprint dentro de um projeto. Um projeto pode ter multiplos sprints.

```typescript
interface Sprint {
  id: string;              // UUID
  projectId: string;       // FK para Project
  name: string;            // ex: "MVP", "Sprint 1", "Auth Module"
  description?: string;
  order: number;           // ordem no projeto (1, 2, 3...)
  status: 'planned' | 'active' | 'completed';
  startedAt?: string;
  completedAt?: string;
  totalTasks: number;
  completedTasks: number;
  metadata?: Record<string, unknown>;
}
```

### 5.8 PRDTask (Pilar 2)

Task extraida do PRD com status, assignee, e dependencias. Diferente de `TaskItem` (5.4) que e um espelho efemero das tasks do Claude Code, `PRDTask` e persistente e representa a visao do projeto.

```typescript
interface PRDTask {
  id: string;              // UUID
  projectId: string;       // FK para Project
  sprintId?: string;       // FK para Sprint (null = backlog)
  externalId?: string;     // ID da task no Claude Code (para correlacao)

  // Conteudo
  title: string;           // titulo da task
  description: string;     // descricao detalhada
  acceptanceCriteria?: string[]; // criterios de aceite

  // Organizacao
  status: PRDTaskStatus;
  priority: 'critical' | 'high' | 'medium' | 'low';
  complexity?: number;     // 1-10 (estimado por AI ou manual)
  tags?: string[];         // labels livres

  // Dependencias
  dependsOn: string[];     // IDs de tasks que esta depende
  blockedBy: string[];     // IDs de tasks que bloqueiam esta (computado)

  // Execucao
  assignedAgent?: string;  // nome do agente que esta executando
  startedAt?: string;
  completedAt?: string;
  sessionId?: string;      // em qual sessao foi executada

  // PRD source mapping
  prdSection?: string;     // de qual secao do PRD veio
  prdLineStart?: number;   // linha inicial no PRD
  prdLineEnd?: number;     // linha final no PRD

  createdAt: string;
  updatedAt: string;
}

type PRDTaskStatus =
  | 'backlog'        // no backlog, nao planejada para sprint
  | 'planned'        // planejada para um sprint
  | 'pending'        // no sprint ativo, aguardando
  | 'in_progress'    // sendo executada por um agente
  | 'in_review'      // concluida mas aguardando validacao
  | 'completed'      // concluida e validada
  | 'blocked'        // bloqueada por dependencia
  | 'deferred';      // adiada para sprint futuro
```

### 5.9 TaskActivity (Pilar 2)

Ponte entre eventos de agente (Pilar 1) e tasks do PRD (Pilar 2). E a "cola" que permite o dashboard saber que "o agente X editando arquivo Y" corresponde a "Task 5 do Sprint 2".

```typescript
interface TaskActivity {
  id: string;              // UUID
  prdTaskId: string;       // FK para PRDTask
  eventId: string;         // FK para AgentEvent
  sessionId: string;       // FK para Session
  agentId: string;         // qual agente
  activityType: TaskActivityType;
  timestamp: string;
  details?: string;        // descricao legivel
}

type TaskActivityType =
  | 'task_created'     // TaskCreate detectado no hook
  | 'task_started'     // TaskUpdate status -> in_progress
  | 'task_completed'   // TaskUpdate status -> completed
  | 'task_blocked'     // dependencia nao resolvida
  | 'task_unblocked'   // dependencia resolvida
  | 'agent_assigned'   // agente atribuido a task
  | 'file_modified'    // arquivo relevante editado
  | 'error_occurred'   // erro durante execucao da task
  | 'manual_update';   // usuario atualizou manualmente
```

### 5.10 PRDDocument (Pilar 2)

Representacao parseada do PRD para referencia e tracking.

```typescript
interface PRDDocument {
  id: string;
  projectId: string;       // FK para Project
  version: number;         // versionamento (PRD pode ser atualizado)
  rawContent: string;      // markdown original
  sections: PRDSection[];  // secoes parseadas
  parsedAt: string;
  parseMethod: 'structured' | 'ai_assisted' | 'manual';
}

interface PRDSection {
  id: string;
  title: string;
  content: string;
  order: number;
  level: number;           // heading level (1, 2, 3)
  taskIds: string[];       // PRDTasks extraidas desta secao
  completionPercent: number; // calculado baseado nas tasks
}
```

### 5.11 Correlation Engine

O Correlation Engine e o servico que conecta os dois pilares. Ele observa eventos do Pilar 1 e atualiza o estado do Pilar 2 automaticamente.

**Regras de correlacao**:

```typescript
// Eventos que disparam atualizacoes automaticas no PRD Tracker:
const CORRELATION_RULES = {
  // 1. TaskCreate detectado → cria/atualiza PRDTask correspondente
  'TaskCreate': (event) => {
    // Busca PRDTask com titulo similar (fuzzy match)
    // Se encontra → vincula via externalId
    // Se nao encontra → cria como "unplanned task"
  },

  // 2. TaskUpdate com status change → atualiza PRDTask
  'TaskUpdate': (event) => {
    // event.data.status === 'in_progress' → PRDTask.status = 'in_progress'
    // event.data.status === 'completed' → PRDTask.status = 'completed'
    // event.data.owner → PRDTask.assignedAgent
  },

  // 3. TaskList chamado → sincroniza estado geral
  'TaskList': (event) => {
    // Compara tasks do Claude Code com PRDTasks
    // Atualiza divergencias
  },

  // 4. File Edit/Write em arquivo mapeado → registra atividade
  'Edit|Write': (event) => {
    // Se filePath esta associado a uma PRDTask → registra TaskActivity
  },

  // 5. SendMessage entre agentes → tracking de colaboracao
  'SendMessage': (event) => {
    // Registra comunicacao entre agentes no contexto da task
  }
};
```

**Modos de operacao**:
1. **Auto** (default): Correlation Engine roda automaticamente, usando fuzzy matching para vincular events a tasks
2. **Strict**: So vincula quando ha match exato de IDs (menos falsos positivos)
3. **Manual**: Correlation desligada, usuario vincula manualmente no dashboard

---

## 6. Hook Events

Claude Code suporta hooks que executam shell commands em resposta a eventos. Referencia: https://docs.anthropic.com/en/docs/claude-code/hooks

### 6.1 Hooks que Vamos Capturar

#### 1. PreToolUse
**Quando**: Antes de cada chamada de tool
**Dados disponiveis**: tool_name, tool_input
**Uso**: Registrar intencao do agente, tracking de tools

```json
{
  "hook": "PreToolUse",
  "timestamp": "2026-02-14T10:30:00.000Z",
  "session_id": "abc-123",
  "agent_id": "main",
  "data": {
    "tool_name": "Edit",
    "tool_input": {
      "file_path": "/src/index.ts",
      "old_string": "const x = 1",
      "new_string": "const x = 2"
    }
  }
}
```

**Schema do hook (.claude/settings.json)**:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "*",
        "command": "curl -s -X POST http://localhost:7890/api/events -H 'Content-Type: application/json' -d '{\"hook\":\"PreToolUse\",\"tool\":\"$CLAUDE_TOOL_NAME\",\"input\":$CLAUDE_TOOL_INPUT}'"
      }
    ]
  }
}
```

#### 2. PostToolUse
**Quando**: Apos cada chamada de tool completar
**Dados disponiveis**: tool_name, tool_input, tool_output, duration
**Uso**: Registrar resultado, calcular duracao, detectar erros

```json
{
  "hook": "PostToolUse",
  "timestamp": "2026-02-14T10:30:01.500Z",
  "session_id": "abc-123",
  "agent_id": "main",
  "data": {
    "tool_name": "Edit",
    "tool_input": { "file_path": "/src/index.ts" },
    "tool_output": "File edited successfully",
    "duration_ms": 1500
  }
}
```

#### 3. Notification
**Quando**: Claude Code envia uma notificacao ao usuario
**Dados disponiveis**: message, level (info/warning/error)
**Uso**: Alertas no dashboard, tracking de problemas

```json
{
  "hook": "Notification",
  "timestamp": "2026-02-14T10:35:00.000Z",
  "session_id": "abc-123",
  "agent_id": "researcher",
  "data": {
    "message": "Task completed: Implement auth module",
    "level": "info"
  }
}
```

#### 4. Stop
**Quando**: O agente principal para (fim da conversa ou erro)
**Dados disponiveis**: reason, stop_type
**Uso**: Marcar fim de sessao, cleanup

```json
{
  "hook": "Stop",
  "timestamp": "2026-02-14T11:00:00.000Z",
  "session_id": "abc-123",
  "agent_id": "main",
  "data": {
    "reason": "end_turn",
    "stop_type": "natural"
  }
}
```

#### 5. SubagentStop
**Quando**: Um sub-agente (teammate) para
**Dados disponiveis**: agent_id, agent_name, reason
**Uso**: Tracking de ciclo de vida dos agentes

```json
{
  "hook": "SubagentStop",
  "timestamp": "2026-02-14T10:45:00.000Z",
  "session_id": "abc-123",
  "agent_id": "researcher",
  "data": {
    "agent_name": "researcher",
    "reason": "shutdown_approved"
  }
}
```

#### 6. PreCompact
**Quando**: Antes do contexto ser compactado (conversation truncation)
**Dados disponiveis**: current_tokens, threshold
**Uso**: Tracking de uso de contexto

```json
{
  "hook": "PreCompact",
  "timestamp": "2026-02-14T10:50:00.000Z",
  "session_id": "abc-123",
  "agent_id": "main",
  "data": {
    "current_tokens": 180000,
    "threshold": 200000
  }
}
```

#### 7. PostCompact
**Quando**: Apos o contexto ser compactado
**Dados disponiveis**: tokens_before, tokens_after
**Uso**: Tracking de eficiencia de compactacao

```json
{
  "hook": "PostCompact",
  "timestamp": "2026-02-14T10:50:05.000Z",
  "session_id": "abc-123",
  "agent_id": "main",
  "data": {
    "tokens_before": 180000,
    "tokens_after": 95000,
    "messages_removed": 42
  }
}
```

#### 8. PreToolUseRejected
**Quando**: Usuario rejeita uma chamada de tool
**Dados disponiveis**: tool_name, tool_input, rejection_reason
**Uso**: Tracking de permissoes e padroes de rejeicao

```json
{
  "hook": "PreToolUseRejected",
  "timestamp": "2026-02-14T10:32:00.000Z",
  "session_id": "abc-123",
  "agent_id": "main",
  "data": {
    "tool_name": "Bash",
    "tool_input": { "command": "rm -rf /" },
    "rejection_reason": "user_denied"
  }
}
```

#### 9. ToolError
**Quando**: Uma tool falha durante execucao
**Dados disponiveis**: tool_name, error_message, error_code
**Uso**: Tracking de erros, alertas

```json
{
  "hook": "ToolError",
  "timestamp": "2026-02-14T10:33:00.000Z",
  "session_id": "abc-123",
  "agent_id": "main",
  "data": {
    "tool_name": "Bash",
    "error_message": "Command failed with exit code 1",
    "error_code": 1
  }
}
```

#### 10. SessionStart (Custom - via init script)
**Quando**: Dashboard inicia monitoramento de uma sessao
**Dados disponiveis**: working_directory, config
**Uso**: Inicializar sessao no dashboard

> Nota: Este nao e um hook nativo do Claude Code. E emitido pelo script de inicializacao `cam start` que configura os hooks e registra a sessao.

```json
{
  "hook": "SessionStart",
  "timestamp": "2026-02-14T10:00:00.000Z",
  "session_id": "abc-123",
  "agent_id": "system",
  "data": {
    "working_directory": "/Users/dev/my-project",
    "hooks_configured": 9,
    "server_port": 7890
  }
}
```

### 6.2 Configuracao Completa dos Hooks

Arquivo `.claude/settings.json` (gerado automaticamente por `cam init`):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "*",
        "command": "cam-hook pre-tool-use"
      }
    ],
    "PostToolUse": [
      {
        "matcher": "*",
        "command": "cam-hook post-tool-use"
      }
    ],
    "Notification": [
      {
        "matcher": "*",
        "command": "cam-hook notification"
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "command": "cam-hook stop"
      }
    ],
    "SubagentStop": [
      {
        "matcher": "*",
        "command": "cam-hook subagent-stop"
      }
    ],
    "PreCompact": [
      {
        "matcher": "*",
        "command": "cam-hook pre-compact"
      }
    ],
    "PostCompact": [
      {
        "matcher": "*",
        "command": "cam-hook post-compact"
      }
    ]
  }
}
```

> `cam-hook` e um CLI binario/script instalado globalmente que:
> 1. Le variaveis de ambiente injetadas pelo Claude Code (`$CLAUDE_TOOL_NAME`, `$CLAUDE_TOOL_INPUT`, etc.)
> 2. Serializa em JSON
> 3. Faz POST para `http://localhost:7890/api/events`
> 4. Falha silenciosamente se o server nao esta rodando (nao bloqueia o Claude Code)

---

## 7. Server API

### Base URL: `http://localhost:7890`

### 7.1 Event Ingestion

#### `POST /api/events`
Recebe eventos dos hooks. Endpoint principal de ingestao.

**Request**:
```json
{
  "hook": "PostToolUse",
  "timestamp": "2026-02-14T10:30:00.000Z",
  "session_id": "abc-123",
  "agent_id": "main",
  "data": { ... }
}
```

**Response**: `200 OK`
```json
{ "ok": true, "event_id": "evt_xyz" }
```

**Comportamento**:
- Valida schema minimo (hook + timestamp obrigatorios)
- Enriquece com server timestamp se ausente
- Persiste em SQLite
- Emite via SSE para todos os clients conectados
- Latencia alvo: < 5ms (nao pode atrasar o Claude Code)

### 7.2 Session Management

#### `GET /api/sessions`
Lista todas as sessoes.

**Query params**: `?status=active&limit=10`

**Response**:
```json
{
  "sessions": [
    {
      "id": "abc-123",
      "startedAt": "2026-02-14T10:00:00Z",
      "status": "active",
      "agentCount": 3,
      "eventCount": 142
    }
  ]
}
```

#### `GET /api/sessions/:id`
Detalhes de uma sessao especifica.

**Response**: Session completa com agents e stats.

#### `DELETE /api/sessions/:id`
Remove uma sessao e todos seus eventos.

### 7.3 Agent Data

#### `GET /api/sessions/:id/agents`
Lista agentes de uma sessao.

**Response**:
```json
{
  "agents": [
    {
      "id": "main",
      "name": "main",
      "type": "orchestrator",
      "status": "active",
      "toolCallCount": 45,
      "errorCount": 2,
      "lastActivityAt": "2026-02-14T10:30:00Z"
    }
  ]
}
```

#### `GET /api/sessions/:id/agents/:agentId/events`
Eventos de um agente especifico.

**Query params**: `?category=tool_call&limit=50&offset=0`

### 7.4 Events

#### `GET /api/sessions/:id/events`
Lista eventos de uma sessao com filtros.

**Query params**:
- `category`: filtrar por categoria (tool_call, file_change, error, etc.)
- `agent_id`: filtrar por agente
- `tool`: filtrar por nome de tool
- `since`: timestamp ISO (eventos apos)
- `limit`: max resultados (default 100)
- `offset`: paginacao

### 7.5 File Changes

#### `GET /api/sessions/:id/files`
Lista arquivos modificados na sessao.

**Response**:
```json
{
  "files": [
    {
      "filePath": "src/index.ts",
      "agentId": "main",
      "changeType": "modified",
      "touchCount": 3,
      "lastTouchedAt": "2026-02-14T10:30:00Z"
    }
  ]
}
```

### 7.6 Real-time Stream (SSE)

#### `GET /api/stream`
Server-Sent Events stream para updates em tempo real.

**Query params**: `?session_id=abc-123` (opcional, filtra por sessao)

**Event types**:
```
event: agent_event
data: { "type": "tool_call", "agent": "main", "tool": "Edit", ... }

event: agent_status
data: { "agent": "researcher", "status": "idle", "previousStatus": "active" }

event: session_status
data: { "session": "abc-123", "status": "completed" }

event: heartbeat
data: { "timestamp": "2026-02-14T10:30:00Z", "connections": 2 }
```

**Heartbeat**: A cada 15 segundos para manter a conexao viva.

### 7.7 Projects (Pilar 2)

#### `POST /api/projects`
Cria um novo projeto a partir de um PRD.

**Request**:
```json
{
  "name": "my-awesome-app",
  "prd_content": "# PRD\n## Features\n- [ ] Auth module\n- [ ] Dashboard...",
  "parse_method": "ai_assisted"
}
```

**Response**: `201 Created`
```json
{
  "project": {
    "id": "proj_abc",
    "name": "my-awesome-app",
    "totalTasks": 12,
    "sprints": [
      { "id": "spr_1", "name": "MVP", "taskCount": 8 },
      { "id": "spr_2", "name": "Polish", "taskCount": 4 }
    ]
  },
  "tasks_preview": [
    { "id": "task_1", "title": "Auth module", "priority": "high", "complexity": 7 },
    { "id": "task_2", "title": "Dashboard layout", "priority": "high", "complexity": 5 }
  ]
}
```

#### `GET /api/projects`
Lista todos os projetos.

#### `GET /api/projects/:id`
Detalhes de um projeto com stats de progresso.

**Response**:
```json
{
  "project": {
    "id": "proj_abc",
    "name": "my-awesome-app",
    "status": "active",
    "totalTasks": 12,
    "completedTasks": 5,
    "completionPercent": 41.7,
    "currentSprint": {
      "id": "spr_1",
      "name": "MVP",
      "totalTasks": 8,
      "completedTasks": 5,
      "completionPercent": 62.5
    },
    "activeSessions": 1,
    "totalSessions": 3,
    "agentsUsed": ["main", "researcher", "frontend-engineer"]
  }
}
```

#### `DELETE /api/projects/:id`
Remove um projeto e todos seus dados.

### 7.8 Sprints (Pilar 2)

#### `GET /api/projects/:id/sprints`
Lista sprints de um projeto.

#### `POST /api/projects/:id/sprints`
Cria um novo sprint.

**Request**:
```json
{
  "name": "Sprint 2 - Auth",
  "task_ids": ["task_5", "task_6", "task_7"]
}
```

#### `PATCH /api/projects/:projectId/sprints/:sprintId`
Atualiza sprint (status, adicionar/remover tasks).

### 7.9 PRD Tasks (Pilar 2)

#### `GET /api/projects/:id/tasks`
Lista todas as tasks do projeto.

**Query params**:
- `sprint_id`: filtrar por sprint
- `status`: filtrar por status (pending, in_progress, completed, blocked)
- `agent`: filtrar por agente atribuido
- `priority`: filtrar por prioridade

**Response**:
```json
{
  "tasks": [
    {
      "id": "task_1",
      "title": "Implement auth module",
      "status": "in_progress",
      "priority": "high",
      "complexity": 7,
      "assignedAgent": "backend-engineer",
      "sprintId": "spr_1",
      "dependsOn": [],
      "blockedBy": [],
      "progress": {
        "filesModified": 4,
        "toolCalls": 23,
        "timeSpent": 1200
      }
    }
  ],
  "summary": {
    "total": 12,
    "backlog": 2,
    "pending": 3,
    "in_progress": 2,
    "completed": 5,
    "blocked": 0
  }
}
```

#### `PATCH /api/projects/:projectId/tasks/:taskId`
Atualiza uma task manualmente (para overrides do usuario).

#### `GET /api/projects/:id/tasks/:taskId/activity`
Historico de atividades de uma task (quais agentes tocaram, quais files, etc.)

### 7.10 PRD Parsing (Pilar 2)

#### `POST /api/parse-prd`
Parseia um PRD e retorna tasks sugeridas (sem criar projeto).

**Request**:
```json
{
  "content": "# PRD content here...",
  "method": "structured"
}
```

**Response**:
```json
{
  "sections": [
    { "title": "MVP Features", "level": 2, "taskCount": 5 }
  ],
  "suggested_tasks": [
    {
      "title": "Auth module",
      "description": "Implement user authentication...",
      "priority": "high",
      "complexity": 7,
      "dependsOn": [],
      "prdSection": "MVP Features",
      "prdLineStart": 15,
      "prdLineEnd": 22
    }
  ],
  "suggested_sprints": [
    { "name": "MVP", "taskIndices": [0, 1, 2, 3, 4] },
    { "name": "Polish", "taskIndices": [5, 6, 7] }
  ]
}
```

**Metodos de parsing suportados**:

1. **`structured`** - Para PRDs com checkboxes/listas claras:
   - Detecta `- [ ]` e `- [x]` como tasks
   - Detecta headings como sprints/secoes
   - Detecta dependencias explicitas (ex: "depende de Task X")
   - Rapido, deterministico, sem custo de AI

2. **`ai_assisted`** - Para PRDs em texto livre:
   - Usa LLM local ou API para extrair tasks
   - Estima complexidade (1-10)
   - Sugere dependencias semanticas
   - Sugere agrupamento em sprints
   - Mais lento, melhor resultado para PRDs ambiguos

3. **`manual`** - Usuario cria tasks manualmente no dashboard

### 7.11 PRD Progress SSE Events (Pilar 2)

Novos event types no stream SSE (`GET /api/stream`):

```
event: task_status_changed
data: { "taskId": "task_5", "oldStatus": "pending", "newStatus": "in_progress", "agent": "backend-engineer" }

event: task_assigned
data: { "taskId": "task_5", "agent": "backend-engineer" }

event: sprint_progress
data: { "sprintId": "spr_1", "completedTasks": 6, "totalTasks": 8, "percent": 75.0 }

event: project_progress
data: { "projectId": "proj_abc", "completedTasks": 6, "totalTasks": 12, "percent": 50.0 }

event: task_blocked
data: { "taskId": "task_7", "blockedBy": ["task_5"], "reason": "dependency" }

event: task_unblocked
data: { "taskId": "task_7", "unblockedBy": "task_5" }

event: correlation_match
data: { "eventId": "evt_123", "taskId": "task_5", "confidence": 0.92, "reason": "TaskUpdate status match" }
```

### 7.12 Stats

#### `GET /api/sessions/:id/stats`
Metricas agregadas da sessao.

**Response**:
```json
{
  "duration_seconds": 3600,
  "total_events": 342,
  "total_tool_calls": 280,
  "total_errors": 5,
  "tools_breakdown": {
    "Edit": 89,
    "Read": 72,
    "Bash": 45,
    "Grep": 38,
    "Write": 20,
    "Glob": 16
  },
  "agents_breakdown": {
    "main": { "events": 120, "errors": 1 },
    "researcher": { "events": 98, "errors": 2 },
    "frontend": { "events": 124, "errors": 2 }
  },
  "files_modified": 23,
  "files_created": 7,
  "files_read": 156,
  "compactions": 2,
  "timeline": [
    { "minute": "10:00", "events": 12 },
    { "minute": "10:01", "events": 8 }
  ]
}
```

---

## 8. Dashboard Components

### 8.1 AgentPanel

**Descricao**: Painel lateral com lista de todos os agentes e seus status.

**Funcionalidades**:
- Lista todos os agentes da sessao ativa
- Status indicator (dot colorido ou sprite dependendo do tema)
- Click para selecionar agente e ver detalhes
- Contadores: tool calls, errors, tempo ativo
- Sort por: status, atividade recente, nome

**Variacao por tema**:
- Pixel: Sprites com animacao, HP bar = progresso
- Modern: Cards com avatar identicon, badges
- Terminal: Lista com status chars `[*] active  [-] idle  [!] error  [x] done`

### 8.2 ActivityFeed

**Descricao**: Feed cronologico de eventos em tempo real.

**Funcionalidades**:
- Stream infinito de eventos (scroll virtual para performance)
- Icone/emoji por tipo de tool
- Cor por categoria (verde=sucesso, vermelho=erro, amarelo=warning)
- Expandir para ver input/output completo
- Filtros: por agente, por tool, por categoria
- Follow mode (auto-scroll) com toggle
- Busca textual

**Variacao por tema**:
- Pixel: Baloes de dialogo estilo RPG, animacao de entrada
- Modern: Timeline vertical com cards expandiveis
- Terminal: Log lines com timestamps, `grep`-like filtering

### 8.3 FileWatcher

**Descricao**: Arvore de arquivos com highlights de modificacoes.

**Funcionalidades**:
- File tree do projeto (ou flat list)
- Color coding: verde=criado, amarelo=modificado, azul=lido
- Badge com contagem de vezes tocado
- Click para ver historico de mudancas no arquivo
- Indicador de qual agente tocou o arquivo

**Variacao por tema**:
- Pixel: Icones de arquivo pixelados, efeito "glow" em novos
- Modern: Tree view com icons do VS Code, hover preview
- Terminal: Estilo `git status` output com letras (M/A/R)

### 8.4 StatsBar

**Descricao**: Barra de metricas agregadas no topo ou rodape.

**Funcionalidades**:
- Tempo decorrido (timer ativo)
- Total de tool calls
- Total de erros
- Arquivos modificados
- Agentes ativos
- Events/minuto (sparkline)

**Variacao por tema**:
- Pixel: Barra estilo game HUD com icones pixelados
- Modern: Metrics cards minimalistas com trend arrows
- Terminal: Status line estilo vim/tmux `[3 agents] [142 events] [5 errors] [23 files] [01:23:45]`

### 8.5 AgentDetail

**Descricao**: Painel de detalhes do agente selecionado.

**Funcionalidades**:
- Informacoes do agente (nome, tipo, status, tempo ativo)
- Timeline de tool calls (mini activity feed filtrado)
- Arquivos que o agente tocou
- Erros recentes
- Task atual (se em um team)
- Mensagens enviadas/recebidas (SendMessage events)

**Variacao por tema**:
- Pixel: Character sheet estilo RPG (stats, inventory, quest log)
- Modern: Tab panel com secoes (Activity, Files, Errors, Messages)
- Terminal: Paineis divididos com dados tabulares

### 8.6 SessionTimeline

**Descricao**: Visualizacao temporal da sessao (mini Gantt chart).

**Funcionalidades**:
- Eixo X = tempo
- Uma linha por agente
- Segmentos coloridos por status (ativo/idle/erro)
- Markers para eventos importantes (start, stop, error, compaction)
- Zoom in/out
- Hover para ver detalhes do momento

**Variacao por tema**:
- Pixel: Barras pixeladas estilo progress bar de game
- Modern: Gantt chart limpo com gradients
- Terminal: ASCII bars `[=====>------|!!|=====>]`

### 8.7 KanbanBoard (Pilar 2)

**Descricao**: Quadro Kanban visual onde tasks se movem automaticamente entre colunas conforme agentes trabalham.

**Colunas**: Backlog | Planned | In Progress | In Review | Completed | Blocked

**Funcionalidades**:
- Cards de task com titulo, prioridade (cor), complexidade (badge), agente atribuido
- Cards se movem automaticamente quando hooks capturam TaskUpdate
- Animacao de transicao entre colunas (slide suave)
- Drag & drop manual para overrides do usuario
- Filtros: por sprint, por agente, por prioridade
- Contadores por coluna
- Indicador visual de tasks bloqueadas (linha vermelha conectando dependencias)
- Click no card abre detalhes com historico de atividades

**Variacao por tema**:
- Pixel: Quest board de taverna RPG, tasks sao pergaminhos, coluna "Completed" tem confete pixelado
- Modern: Cards estilo Linear com status dots, drag & drop smooth, glassmorphism
- Terminal: Tabela com colunas separadas por `|`, status chars `[>] in_progress  [x] done  [!] blocked`

### 8.8 SprintProgress (Pilar 2)

**Descricao**: Indicador visual de progresso do sprint atual.

**Funcionalidades**:
- Progress bar principal (% concluido)
- Contagem: "5 de 8 tasks concluidas"
- Mini-donut chart com breakdown por status (pending/progress/done/blocked)
- Estimativa de tempo restante (baseado na velocidade media)
- Sprint selector (dropdown para ver sprints anteriores)
- Velocidade: tasks/hora (trend dos ultimos 30min)

**Variacao por tema**:
- Pixel: XP bar que enche, level up ao completar sprint, estrelas por task concluida
- Modern: Progress ring circular com % no centro, mini chart de velocidade
- Terminal: `Sprint MVP [=======>----] 62.5% (5/8)  ~2.1 tasks/hr`

### 8.9 PRDOverview (Pilar 2)

**Descricao**: Visao panoramica do PRD inteiro com secoes coloridas por status de completude.

**Funcionalidades**:
- Renderiza o PRD original como documento
- Secoes coloridas: verde (100% tasks done), amarelo (em progresso), cinza (nao iniciado), vermelho (blocked)
- Hover em secao mostra tasks daquela secao
- Click navega para as tasks no KanbanBoard
- Barra lateral com % de cada secao
- Modo "diff": mostra o que mudou desde o inicio

**Variacao por tema**:
- Pixel: Mapa de mundo RPG, secoes sao regioes, regioes concluidas ficam iluminadas
- Modern: Document outline com heat map de progresso, accordion expandivel
- Terminal: Tree view com indicadores `[100%] Section 1  [ 50%] Section 2  [  0%] Section 3`

### 8.10 DependencyGraph (Pilar 2)

**Descricao**: Grafo visual de dependencias entre tasks. Permite ver o caminho critico e gargalos.

**Funcionalidades**:
- Nodes = tasks, Edges = dependencias
- Cor do node por status (verde/amarelo/vermelho/cinza)
- Highlight do caminho critico (longest path)
- Tasks bloqueadas pulsam em vermelho
- Zoom/pan/drag
- Click em node abre detalhes da task
- Auto-layout (dagre ou elk algorithm)
- Filtro por sprint

**Variacao por tema**:
- Pixel: Dungeon map, tasks sao salas, dependencias sao corredores, salas bloqueadas tem porta trancada
- Modern: Grafo limpo estilo Mermaid/D3, bezier curves, labels elegantes
- Terminal: ASCII graph com box-drawing characters e setas `-->` `-->`

### 8.11 BurndownChart (Pilar 2)

**Descricao**: Grafico classico de burndown mostrando tasks restantes vs tempo.

**Funcionalidades**:
- Eixo X = tempo (horas/dias), Eixo Y = tasks restantes
- Linha ideal (linear) vs linha real
- Area entre ideal e real colorida (verde = a frente, vermelho = atrasado)
- Markers para eventos (sprint start, sprint end, agente adicionado)
- Tooltip com detalhes ao hover
- Toggle: burndown (restantes) vs burnup (concluidas)
- Scope changes visíveis (quando tasks sao adicionadas/removidas)

**Variacao por tema**:
- Pixel: Grafico pixelado estilo mini-game, "HP bar" do sprint diminuindo
- Modern: Area chart smooth com gradients, responsive, animado
- Terminal: ASCII sparkline `Tasks: 12 ▇▇▇▆▆▅▅▄▃▃▂▁ 0` com annotations

### 8.12 ProjectSelector (Pilar 2)

**Descricao**: Switcher entre projetos e modo de visualizacao (Agent Monitor vs PRD Tracker vs Combined).

**Funcionalidades**:
- Dropdown com lista de projetos
- 3 modos de visualizacao:
  - **Monitor**: Foco no Pilar 1 (activity feed, agent panel, file watcher)
  - **Tracker**: Foco no Pilar 2 (kanban, burndown, dependency graph)
  - **Mission Control**: Ambos lado a lado (layout split)
- Indicadores de projeto: nome, sprint ativo, % progresso, agentes ativos
- Quick stats em cada item do dropdown
- Atalho de teclado para trocar (Ctrl+P / `:project`)

**Variacao por tema**:
- Pixel: Menu de selecao de "save slot" estilo RPG, cada projeto e um slot
- Modern: Command palette estilo Raycast/Spotlight com search
- Terminal: `:project list` e `:project switch <name>`

### 8.13 AgentMap (CORE FEATURE)

**Descricao**: Visualizacao interativa pixel art em tempo real onde agentes Claude Code sao representados como personagens que se movem entre zonas de atividade, interagem entre si e executam acoes visivelmente. Esta e a **feature central do produto** - o que diferencia o CAM de qualquer outra ferramenta de monitoring. Inspirado no OPES Big Brother.

> **IMPORTANTE**: O Agent Map NAO e um tema. E um componente core que vive dentro do tema Modern (e qualquer tema). E a visualizacao principal que o usuario ve ao abrir o dashboard.

**Conceito Visual**:
```
+------------------------------------------------------------------+
|                        AGENT MAP                                  |
|                                                                   |
|  +----------+     +----------+     +----------+     +----------+  |
|  | CODE     |     | COMMAND  |     | COMMS    |     | RESEARCH |  |
|  | ZONE     |     | ZONE     |     | HUB      |     | LAB      |  |
|  |          |     |          |     |          |     |          |  |
|  |  🧙 Lead |---->|  🗡️ Eng  |     | 🏹 Test  |<--->| 🛡️ Res  |  |
|  | editing  |     | running  |     | sending  |     | reading  |  |
|  | auth.ts  |     | tests    |     | message  |     | docs     |  |
|  +----------+     +----------+     +----------+     +----------+  |
|                                                                   |
|  +----------+     +----------+                                    |
|  | REST     |     | DONE     |    💬 "Auth module done!"          |
|  | AREA     |     | ZONE     |    Lead --> Eng (balao de fala)    |
|  |          |     |          |                                    |
|  | 😴 Idle  |     | 🎉 Fin  |                                    |
|  | zzZ...   |     | quest!   |                                    |
|  +----------+     +----------+                                    |
+------------------------------------------------------------------+
```

**Zonas de Atividade (mapeadas automaticamente por tool usage)**:

| Zona | Tools que ativam | Visual | Descricao |
|------|-----------------|--------|-----------|
| **Code Zone** | Edit, Write, Read, Glob, Grep | Sala com tela de codigo | Agente lendo/editando arquivos |
| **Command Zone** | Bash | Sala com terminal | Agente executando comandos |
| **Comms Hub** | SendMessage, Task tools | Sala com baloes | Agente se comunicando com outros |
| **Research Lab** | WebSearch, WebFetch | Sala com livros/globo | Agente pesquisando na web |
| **Task Board** | TaskCreate, TaskUpdate, TaskList | Sala com quadro | Agente gerenciando tasks |
| **Rest Area** | (idle > 30s) | Sala com cama/fogueira | Agente descansando |
| **Done Zone** | (completed/shutdown) | Sala com trofeu | Agente que terminou |

**Sprites dos Agentes**:
- Renderizados em CSS pixel art (box-shadow sprites) ou Canvas 2D
- Cada agente tem cor unica baseada no nome (hash -> paleta)
- Tamanho: 24x24 ou 32x32 pixels
- Estados de animacao:
  | Estado | Animacao |
  |--------|----------|
  | `idle` | Personagem parado, piscando lentamente |
  | `working` | Martelando/digitando, particulas de codigo saindo |
  | `moving` | Caminhando (transicao entre zonas) |
  | `talking` | Balao de dialogo aparece com preview da mensagem |
  | `error` | Exclamacao vermelha, personagem tremendo |
  | `completed` | Comemoracap, confete pixelado |
  | `shutdown` | Personagem deita e dorme (zzZ) |

**Interacoes Visuais Entre Agentes**:
- Quando Agent A envia SendMessage para Agent B: linha tracejada conecta os dois + balao de fala
- Quando Agent A spawna Agent B (Task tool): Agent B aparece com animacao de "spawn" na zona de origem
- Quando Agent A atribui task a Agent B (TaskUpdate): seta animada de A para B
- Quando Team e deletado: agentes na Done Zone fazem animacao de "wave goodbye"

**Dados Necessarios (ja capturados pelos hooks existentes)**:
- `agent_id` + `status` -> qual agente, em qual estado
- `tool` (de events) -> determina a zona atual
- `SendMessage` events -> linhas de interacao entre agentes
- `Task` tool calls -> spawn/shutdown de agentes
- `TaskCreate`/`TaskUpdate` -> movimentacao de task cards

**Implementacao Tecnica**:
- **Rendering**: HTML5 Canvas 2D ou CSS Grid + CSS animations
- **State machine**: Cada agente tem estado (zona, animacao, posicao)
- **Transicoes**: CSS transitions suaves ao mudar de zona (500ms ease)
- **SSE integration**: Novos eventos atualizam estado do agente -> mapa reage
- **Responsivo**: Zonas reorganizam em grid responsivo
- **Performance**: RequestAnimationFrame para animacoes, max 60fps
- **Interatividade**: Click em agente abre AgentDetail panel

**API necessaria (ja existente)**:
- `GET /api/sessions/:id/agents` - lista agentes e status
- `GET /api/stream` (SSE) - eventos em tempo real
- `GET /api/sessions/:id/events?agent_id=X` - historico do agente

---

## 9. Setup / Install Flow

### 9.1 Instalacao Global

```bash
# Via npm
npm install -g claude-agent-monitor

# Via pnpm
pnpm add -g claude-agent-monitor

# Via bun
bun add -g claude-agent-monitor
```

Isso instala dois binarios:
- `cam` - CLI principal (start server, init hooks, open dashboard)
- `cam-hook` - Binario leve chamado pelos hooks (apenas faz POST)

### 9.2 Inicializacao em um Projeto

```bash
cd /meu/projeto
cam init
```

O que `cam init` faz:
1. Detecta se `.claude/settings.json` existe
2. Se sim, faz merge dos hooks (preserva hooks existentes)
3. Se nao, cria o arquivo com todos os hooks configurados
4. Mostra resumo do que foi configurado
5. Testa conectividade com o server (se rodando)

**Output**:
```
Claude Agent Monitor - Initializing...

  Created .claude/settings.json
  Configured 7 hooks:
    - PreToolUse (all tools)
    - PostToolUse (all tools)
    - Notification
    - Stop
    - SubagentStop
    - PreCompact
    - PostCompact

  Run 'cam start' to launch the monitoring server.
```

### 9.2.1 Inicializacao com PRD (Pilar 2)

```bash
cd /meu/projeto
cam init --prd ./PRD.md
```

O que `cam init --prd` faz (alem do init normal):
1. Le o arquivo PRD
2. Parseia em tasks (metodo auto-detectado ou `--parse structured|ai|manual`)
3. Cria o projeto no banco local
4. Mostra preview das tasks extraidas e pede confirmacao
5. Cria sprint(s) sugerido(s)

**Output**:
```
Claude Agent Monitor - Initializing with PRD...

  Hooks configured (7 hooks)
  PRD parsed: ./PRD.md (structured mode)

  Project: "my-awesome-app"
  Found 12 tasks in 3 sections:

  Sprint 1 - MVP (8 tasks):
    [1] Auth module               priority:high  complexity:7
    [2] Dashboard layout           priority:high  complexity:5
    [3] API endpoints              priority:high  complexity:6
    ...

  Sprint 2 - Polish (4 tasks):
    [9] Dark mode                  priority:low   complexity:3
    ...

  Accept this breakdown? [Y/n/edit]
```

### 9.3 Iniciando o Server + Dashboard

```bash
cam start
```

O que `cam start` faz:
1. Inicia o servidor Node.js na porta 7890 (configuravel com `--port`)
2. Inicia o dashboard web na porta 7891 (configuravel com `--dashboard-port`)
3. Abre o browser automaticamente (configuravel com `--no-open`)
4. Cria sessao inicial
5. Mostra URL do dashboard

**Output**:
```
Claude Agent Monitor v1.0.0

  Server:    http://localhost:7890
  Dashboard: http://localhost:7891
  Session:   cam_abc123

  Waiting for Claude Code events...
  (Press Ctrl+C to stop)
```

### 9.4 Outros Comandos CLI

```bash
# === Server & Dashboard ===
cam start                    # Inicia server + dashboard
cam start --port 8080        # Porta customizada
cam start --theme terminal   # Inicia com tema especifico
cam start --no-open          # Nao abre browser

# === Init & Hooks ===
cam init                     # Configura hooks no projeto
cam init --prd ./PRD.md      # Configura hooks + importa PRD
cam init --prd ./PRD.md --parse ai   # Parse com AI
cam init --force             # Sobrescreve hooks existentes

# === Monitoring ===
cam status                   # Mostra se server esta rodando + stats
cam sessions                 # Lista sessoes anteriores
cam sessions --clear         # Limpa historico

cam hooks --list             # Mostra hooks configurados
cam hooks --remove           # Remove hooks do CAM (preserva outros)
cam hooks --test             # Envia evento de teste

# === Temas ===
cam theme pixel              # Troca tema
cam theme modern
cam theme terminal

# === PRD & Projects (Pilar 2) ===
cam project list             # Lista projetos
cam project show             # Mostra projeto ativo com stats
cam project import PRD.md    # Importa PRD em projeto existente
cam project archive          # Arquiva projeto

cam sprint list              # Lista sprints do projeto ativo
cam sprint create "Sprint 2" # Cria sprint
cam sprint status            # Progresso do sprint ativo no terminal
cam sprint activate <id>     # Define sprint ativo

cam tasks                    # Lista tasks do sprint ativo
cam tasks --all              # Lista todas as tasks do projeto
cam tasks --blocked          # Mostra tasks bloqueadas
cam tasks --agent researcher # Tasks de um agente especifico

cam progress                 # Mini burndown no terminal
cam progress --full          # Relatorio detalhado de progresso

# === Geral ===
cam --version                # Versao
cam --help                   # Ajuda
```

### 9.5 Fluxo Completo (Pilar 1 - Apenas Monitoring)

```bash
# 1. Instala globalmente (uma vez)
npm install -g claude-agent-monitor

# 2. Configura hooks no projeto
cd /meu/projeto
cam init

# 3. Inicia o monitor
cam start

# 4. Em outro terminal, usa Claude Code normalmente
claude "implement auth module using a team of 3 agents"

# 5. Dashboard mostra atividade dos agentes em tempo real!
# 6. Ao terminar, Ctrl+C no cam start
```

### 9.6 Fluxo Completo (Pilar 1 + 2 - Mission Control)

```bash
# 1. Instala globalmente (uma vez)
npm install -g claude-agent-monitor

# 2. Configura hooks + importa PRD
cd /meu/projeto
cam init --prd ./PRD.md

# 3. Revisa tasks extraidas do PRD (interativo)
# → Confirma breakdown em tasks e sprints

# 4. Inicia o monitor em modo Mission Control
cam start

# 5. Em outro terminal, usa Claude Code com o PRD
claude "read the PRD.md and implement all tasks using a team of agents"

# 6. Dashboard mostra TUDO:
#    - Esquerda: Kanban com tasks se movendo sozinhas
#    - Direita: Feed em tempo real do que cada agente faz
#    - Topo: Progress bar do sprint + stats
#    - Embaixo: Timeline/Gantt de quem fez o que

# 7. Ao terminar, relatorio completo de execucao
cam progress --full
```

---

## 10. Roadmap

### MVP (v1.0) - "Mission Control"

**Escopo**: Server local + Dashboard web + 2 Pilares + Agent Map + 3 temas

**Sprint 1 - Core Infrastructure** (CONCLUIDO):
- [x] Monorepo setup (pnpm workspaces)
- [x] `@cam/shared` - tipos e schemas compartilhados
- [x] `@cam/server` - Node.js + SQLite + REST API + SSE
- [x] `@cam/hook` - binario ultra-leve para hooks
- [x] `@cam/cli` - comandos basicos (init, start, status)
- [x] Dashboard React + Vite + Zustand
- [x] AgentPanel, ActivityFeed, FileWatcher, StatsBar, AgentDetail, SessionTimeline
- [x] Tema Modern (default)
- [x] PRD parser (structured mode)
- [x] Correlation Engine (auto-matching events -> tasks)
- [x] Project/Sprint data model + API endpoints
- [x] KanbanBoard (auto-updating)
- [x] SprintProgress, BurndownChart, DependencyGraph, PRDOverview, ProjectSelector
- [x] Tema Terminal (keyboard-driven, ASCII)
- [x] Tema Pixel Art (RPG aesthetic)
- [x] Theme switcher component

**Sprint 1 - Remaining** (3 tasks):
- [ ] CLI completo (project, sprint, tasks, progress commands)
- [ ] npm packaging + instalacao global
- [ ] README + docs + examples

**Sprint 2 - Agent Map** (CORE FEATURE - PROXIMO):
- [ ] Arquitetura do componente AgentMap (Canvas vs CSS, state machine)
- [ ] Sprites pixel art dos agentes (CSS box-shadow ou Canvas)
- [ ] Mapa com zonas de atividade (Code, Command, Comms, Research, Task Board, Rest, Done)
- [ ] Sistema de posicionamento (tool usage -> zona do agente)
- [ ] Animacoes de estado (idle, working, moving, talking, error, completed)
- [ ] Interacoes visuais (baloes de fala, linhas de comunicacao, spawn animations)
- [ ] Integracao SSE (eventos em tempo real -> atualizacao do mapa)
- [ ] Integracao no layout Modern (componente central do dashboard)
- [ ] Click em agente -> abre AgentDetail
- [ ] Responsividade e performance (60fps)

**Sprint 1 - Deferred to v1.1**:
- PRD parser AI-assisted mode (structured mode funciona bem)

### v1.1 - "Intelligence"

- [ ] PRD parser AI-assisted com estimativa de complexidade
- [ ] Sugestoes automaticas de dependencias entre tasks
- [ ] Theme customization (cores, fontes)
- [ ] Export de sessao/projeto (JSON, CSV, Markdown report)
- [ ] Diff viewer inline
- [ ] Performance profiling (quais tools sao mais lentas)
- [ ] Comparacao entre sessoes/sprints
- [ ] Dark/Light mode no tema Modern

### v2.0 - "Desktop App" (Tauri)

**Escopo**: App desktop nativo com Tauri

**Vantagens sobre web**:
- Nao precisa de browser aberto
- Notificacoes nativas do OS
- System tray icon com status
- Menor uso de memoria
- Auto-start com login

**Entregas**:
- [ ] Tauri wrapper do dashboard existente
- [ ] System tray com mini-status
- [ ] Notificacoes nativas (errors, completions)
- [ ] Auto-detect Claude Code sessions
- [ ] Auto-start no login (configuravel)
- [ ] Instalacao via `.dmg` / `.msi` / `.AppImage`

### v3.0 - "VS Code Extension"

**Escopo**: Extensao VS Code com panel integrado

**Vantagens**:
- Integrado no editor onde o dev ja trabalha
- Zero friction (sem abrir nada extra)
- Acesso direto aos arquivos modificados (click to open)
- Status bar no VS Code

**Entregas**:
- [ ] VS Code extension com WebView panel
- [ ] Status bar item (agent count, errors)
- [ ] Activity feed como VS Code panel
- [ ] Click-to-open em arquivos modificados
- [ ] Decorators nos arquivos (quem editou, quando)
- [ ] Command palette integration
- [ ] Marketplace publishing

### v4.0 - "Multi-machine" (Future)

**Escopo**: Monitorar agentes rodando em diferentes maquinas

- [ ] Server centralizado (pode ser cloud)
- [ ] Autenticacao (API keys)
- [ ] Multi-user dashboard
- [ ] Historico persistente (PostgreSQL)
- [ ] Alertas configuravei (Slack, Discord, email)
- [ ] Metricas de custo estimado (tokens usados)

---

## 11. Estrutura de Arquivos

```
claude-agent-monitor/
|
|-- package.json              # Monorepo root
|-- pnpm-workspace.yaml       # Workspace config
|-- tsconfig.base.json        # Shared TS config
|-- README.md                 # Documentacao principal
|-- LICENSE                   # MIT
|-- .github/
|   |-- workflows/
|       |-- ci.yml            # Build + Test + Lint
|       |-- release.yml       # npm publish
|
|-- packages/
|   |
|   |-- cli/                  # @cam/cli - CLI principal
|   |   |-- package.json
|   |   |-- tsconfig.json
|   |   |-- src/
|   |       |-- index.ts      # Entry point (cam binary)
|   |       |-- commands/
|   |       |   |-- init.ts   # cam init
|   |       |   |-- start.ts  # cam start
|   |       |   |-- status.ts # cam status
|   |       |   |-- sessions.ts
|   |       |   |-- hooks.ts
|   |       |   |-- theme.ts
|   |       |-- utils/
|   |           |-- config.ts
|   |           |-- hooks-config.ts
|   |           |-- logger.ts
|   |
|   |-- hook/                 # @cam/hook - Hook binary (ultra-leve)
|   |   |-- package.json
|   |   |-- tsconfig.json
|   |   |-- src/
|   |       |-- index.ts      # Entry point (cam-hook binary)
|   |       |-- handlers/
|   |       |   |-- pre-tool-use.ts
|   |       |   |-- post-tool-use.ts
|   |       |   |-- notification.ts
|   |       |   |-- stop.ts
|   |       |   |-- subagent-stop.ts
|   |       |   |-- compact.ts
|   |       |-- transport.ts  # HTTP POST para server
|   |
|   |-- server/               # @cam/server - Backend
|   |   |-- package.json
|   |   |-- tsconfig.json
|   |   |-- src/
|   |       |-- index.ts      # Express/Fastify app
|   |       |-- routes/
|   |       |   |-- events.ts     # POST /api/events
|   |       |   |-- sessions.ts   # GET/DELETE /api/sessions
|   |       |   |-- agents.ts     # GET /api/sessions/:id/agents
|   |       |   |-- files.ts      # GET /api/sessions/:id/files
|   |       |   |-- stats.ts      # GET /api/sessions/:id/stats
|   |       |   |-- stream.ts     # GET /api/stream (SSE)
|   |       |   |-- projects.ts   # CRUD /api/projects (Pilar 2)
|   |       |   |-- sprints.ts    # CRUD /api/projects/:id/sprints (Pilar 2)
|   |       |   |-- tasks.ts      # CRUD /api/projects/:id/tasks (Pilar 2)
|   |       |   |-- parse-prd.ts  # POST /api/parse-prd (Pilar 2)
|   |       |-- db/
|   |       |   |-- index.ts      # SQLite setup
|   |       |   |-- schema.sql    # Table definitions (ambos pilares)
|   |       |   |-- queries.ts    # Prepared statements
|   |       |-- services/
|   |       |   |-- event-processor.ts     # Processa + enriquece eventos
|   |       |   |-- sse-manager.ts         # Gerencia conexoes SSE
|   |       |   |-- session-manager.ts     # CRUD de sessoes
|   |       |   |-- correlation-engine.ts  # Vincula events a PRD tasks (Pilar 2)
|   |       |   |-- prd-parser.ts          # Parseia PRD em tasks (Pilar 2)
|   |       |   |-- project-manager.ts     # CRUD de projetos/sprints (Pilar 2)
|   |       |-- types.ts
|   |
|   |-- dashboard/            # @cam/dashboard - Frontend React
|   |   |-- package.json
|   |   |-- tsconfig.json
|   |   |-- vite.config.ts
|   |   |-- index.html
|   |   |-- src/
|   |       |-- main.tsx
|   |       |-- App.tsx
|   |       |-- stores/
|   |       |   |-- session-store.ts    # Zustand store - sessao ativa
|   |       |   |-- theme-store.ts      # Tema selecionado
|   |       |   |-- filter-store.ts     # Filtros ativos
|   |       |   |-- project-store.ts    # Projeto/sprint ativo (Pilar 2)
|   |       |   |-- kanban-store.ts     # Estado do kanban (Pilar 2)
|   |       |-- hooks/
|   |       |   |-- use-sse.ts          # Hook para SSE connection
|   |       |   |-- use-session.ts      # Dados da sessao
|   |       |   |-- use-agents.ts       # Lista de agentes
|   |       |   |-- use-events.ts       # Feed de eventos
|   |       |   |-- use-project.ts      # Dados do projeto (Pilar 2)
|   |       |   |-- use-sprint.ts       # Dados do sprint (Pilar 2)
|   |       |   |-- use-tasks.ts        # Tasks do PRD (Pilar 2)
|   |       |-- components/
|   |       |   |-- layout/
|   |       |   |   |-- Shell.tsx       # Layout shell (varia por tema)
|   |       |   |   |-- ThemeSwitcher.tsx
|   |       |   |-- shared/
|   |       |   |   |-- # Pilar 1 - Agent Monitor
|   |       |   |   |-- AgentPanel.tsx
|   |       |   |   |-- ActivityFeed.tsx
|   |       |   |   |-- FileWatcher.tsx
|   |       |   |   |-- StatsBar.tsx
|   |       |   |   |-- AgentDetail.tsx
|   |       |   |   |-- SessionTimeline.tsx
|   |       |   |   |-- # Pilar 2 - PRD Tracker
|   |       |   |   |-- KanbanBoard.tsx
|   |       |   |   |-- SprintProgress.tsx
|   |       |   |   |-- PRDOverview.tsx
|   |       |   |   |-- DependencyGraph.tsx
|   |       |   |   |-- BurndownChart.tsx
|   |       |   |   |-- ProjectSelector.tsx
|   |       |   |-- themes/
|   |       |       |-- pixel/
|   |       |       |   |-- PixelShell.tsx
|   |       |       |   |-- # Pilar 1
|   |       |       |   |-- PixelAgentPanel.tsx
|   |       |       |   |-- PixelActivityFeed.tsx
|   |       |       |   |-- PixelFileWatcher.tsx
|   |       |       |   |-- PixelStatsBar.tsx
|   |       |       |   |-- PixelAgentDetail.tsx
|   |       |       |   |-- PixelTimeline.tsx
|   |       |       |   |-- # Pilar 2
|   |       |       |   |-- PixelKanban.tsx
|   |       |       |   |-- PixelSprintProgress.tsx
|   |       |       |   |-- PixelPRDOverview.tsx
|   |       |       |   |-- PixelDependencyGraph.tsx
|   |       |       |   |-- PixelBurndown.tsx
|   |       |       |   |-- PixelProjectSelector.tsx
|   |       |       |   |-- sprites/          # PNG sprites para agentes
|   |       |       |   |-- pixel.css
|   |       |       |-- modern/
|   |       |       |   |-- ModernShell.tsx
|   |       |       |   |-- # Pilar 1
|   |       |       |   |-- ModernAgentPanel.tsx
|   |       |       |   |-- ModernActivityFeed.tsx
|   |       |       |   |-- ModernFileWatcher.tsx
|   |       |       |   |-- ModernStatsBar.tsx
|   |       |       |   |-- ModernAgentDetail.tsx
|   |       |       |   |-- ModernTimeline.tsx
|   |       |       |   |-- # Pilar 2
|   |       |       |   |-- ModernKanban.tsx
|   |       |       |   |-- ModernSprintProgress.tsx
|   |       |       |   |-- ModernPRDOverview.tsx
|   |       |       |   |-- ModernDependencyGraph.tsx
|   |       |       |   |-- ModernBurndown.tsx
|   |       |       |   |-- ModernProjectSelector.tsx
|   |       |       |   |-- modern.css
|   |       |       |-- terminal/
|   |       |           |-- TerminalShell.tsx
|   |       |           |-- # Pilar 1
|   |       |           |-- TerminalAgentPanel.tsx
|   |       |           |-- TerminalActivityFeed.tsx
|   |       |           |-- TerminalFileWatcher.tsx
|   |       |           |-- TerminalStatsBar.tsx
|   |       |           |-- TerminalAgentDetail.tsx
|   |       |           |-- TerminalTimeline.tsx
|   |       |           |-- # Pilar 2
|   |       |           |-- TerminalKanban.tsx
|   |       |           |-- TerminalSprintProgress.tsx
|   |       |           |-- TerminalPRDOverview.tsx
|   |       |           |-- TerminalDependencyGraph.tsx
|   |       |           |-- TerminalBurndown.tsx
|   |       |           |-- TerminalProjectSelector.tsx
|   |       |           |-- terminal.css
|   |       |-- lib/
|   |       |   |-- api.ts              # HTTP client para server
|   |       |   |-- sse.ts              # SSE client
|   |       |   |-- formatters.ts       # Formatadores de dados
|   |       |   |-- theme-registry.ts   # Registro de temas
|   |       |-- types/
|   |           |-- events.ts
|   |           |-- agents.ts
|   |           |-- sessions.ts
|   |           |-- themes.ts
|   |           |-- projects.ts    # Pilar 2
|   |           |-- tasks.ts       # Pilar 2
|   |
|   |-- shared/               # @cam/shared - Tipos compartilhados
|       |-- package.json
|       |-- tsconfig.json
|       |-- src/
|           |-- types/
|           |   |-- events.ts     # AgentEvent, HookType, EventCategory
|           |   |-- agents.ts     # Agent, AgentStatus
|           |   |-- sessions.ts   # Session
|           |   |-- files.ts      # FileChange
|           |   |-- projects.ts   # Project, Sprint, PRDTask (Pilar 2)
|           |   |-- correlation.ts # TaskActivity, correlation types (Pilar 2)
|           |   |-- index.ts      # re-exports
|           |-- constants.ts  # Portas default, timeouts, etc.
|           |-- schemas.ts    # Zod schemas para validacao (ambos pilares)
|
|-- docs/
|   |-- architecture.md       # Diagrama de arquitetura detalhado
|   |-- hooks.md              # Documentacao dos hooks
|   |-- themes.md             # Guia de criacao de temas
|   |-- api.md                # Referencia da API
|
|-- examples/
    |-- basic/                # Exemplo basico de setup
    |-- team/                 # Exemplo com time de agentes
    |-- custom-theme/         # Exemplo de tema customizado
```

---

## Apendice A: Questoes em Aberto

| # | Questao | Opcoes | Decisao |
|---|---------|--------|---------|
| 1 | Framework do server | Express vs Fastify vs Hono | TBD |
| 2 | Bundling do hook binary | esbuild single file vs pkg | TBD |
| 3 | Persistencia | SQLite vs LevelDB vs in-memory only | SQLite (provavel) |
| 4 | Sprites do tema Pixel | Criar do zero vs asset pack | TBD |
| 5 | Monorepo tool | pnpm workspaces vs turborepo vs nx | pnpm workspaces (provavel) |
| 6 | Keyboard nav no tema Terminal | Custom vs xterm.js | Custom (provavel) |
| 7 | Graph layout (DependencyGraph) | dagre vs elk vs d3-force | TBD |
| 8 | Kanban drag & drop | dnd-kit vs @hello-pangea/dnd | TBD |
| 9 | AI PRD parser | Local LLM vs API (Claude/GPT) vs ambos | TBD |
| 10 | Fuzzy matching (Correlation Engine) | fuse.js vs custom vs embedding-based | TBD |

## Apendice B: Metricas de Sucesso

**Pilar 1 - Agent Monitor**:
| Metrica | Target |
|---------|--------|
| Latencia do hook (POST) | < 10ms (nao impactar Claude Code) |
| Latencia SSE (server -> browser) | < 50ms |
| Memoria do server | < 100MB para sessoes de 1h |
| Tempo de setup | < 2 minutos (install + init + start) |
| Dashboard render | 60fps com 1000+ eventos |
| Bundle size (hook binary) | < 500KB |
| npm install time | < 30s |

**Pilar 2 - PRD Tracker**:
| Metrica | Target |
|---------|--------|
| PRD parse time (structured) | < 1s para PRDs de 500 linhas |
| PRD parse time (AI-assisted) | < 15s para PRDs de 500 linhas |
| Correlation accuracy (auto mode) | > 85% match correto event -> task |
| Kanban update latency | < 200ms apos hook event |
| Projetos simultaneos | Suportar 10+ projetos sem degradacao |
| Tasks por projeto | Suportar 200+ tasks sem degradacao no dashboard |

## Apendice C: Seguranca

- Server roda **apenas em localhost** (nao expor para rede)
- Sem autenticacao no MVP (localhost-only = seguro)
- Hook binary nao envia dados para nenhum servidor externo
- Tool inputs/outputs sao **truncados** (500 chars) para evitar vazamento de dados sensiveis
- Opcao `--redact` para ocultar conteudo de arquivos nos logs
- SQLite database e local, nenhum dado sai da maquina

---

*Documento gerado em 2026-02-14. Versao 2.0.0-draft.*
*Atualizado com Pilar 2 (PRD Tracker) em 2026-02-14.*
