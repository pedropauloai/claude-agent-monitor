# Claude Agent Monitor - PRD (Product Requirements Document)

> Mission Control open-source para agentes Claude Code: observabilidade em tempo real + tracking visual de PRD/Sprints

**Versao**: 3.0.0
**Data**: 2026-02-16
**Status**: Active (MVP released, Backlog in progress)
**Licenca**: MIT

---

# PARTE 1 - PRD (O QUE construir)

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

# PARTE 2 - SPEC (COMO construir)

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
| **Server** | Node.js + Express | Leve, facil de instalar |
| **Database** | SQLite (better-sqlite3) | Zero config, arquivo local |
| **SSE** | EventSource API nativa | Simples, unidirecional, perfeito para monitoring |
| **Dashboard** | React 19 + Vite | Rapido, moderno, HMR para dev |
| **Styling** | Tailwind CSS 4 | Consistente, facil theming |
| **State** | Zustand | Leve, sem boilerplate |
| **Graficos** | Recharts | Simples, React-native |

### Por que NAO WebSocket?
SSE (Server-Sent Events) e suficiente porque:
- Fluxo de dados e **unidirecional** (server -> client)
- O dashboard so observa, nao envia comandos
- SSE reconecta automaticamente
- Menos complexidade que WebSocket
- Funciona nativamente sem bibliotecas extras

---

## 4. Data Model

### 4.1 Session

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

### 4.2 Agent

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

### 4.3 Event

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

### 4.4 TaskItem

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

### 4.5 FileChange

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

### 4.6 Project (Pilar 2)

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

### 4.7 Sprint (Pilar 2)

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

### 4.8 PRDTask (Pilar 2)

Task extraida do PRD com status, assignee, e dependencias. Diferente de `TaskItem` (4.4) que e um espelho efemero das tasks do Claude Code, `PRDTask` e persistente e representa a visao do projeto.

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

### 4.9 TaskActivity (Pilar 2)

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

### 4.10 PRDDocument (Pilar 2)

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

### 4.11 Correlation Engine

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

## 5. Hook Events

Claude Code suporta hooks que executam shell commands em resposta a eventos. Referencia: https://docs.anthropic.com/en/docs/claude-code/hooks

### 5.1 Hooks que Vamos Capturar

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

### 5.2 Configuracao Completa dos Hooks

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

## 6. Server API

### Base URL: `http://localhost:7890`

### 6.1 Event Ingestion

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

### 6.2 Session Management

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

### 6.3 Agent Data

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

### 6.4 Events

#### `GET /api/sessions/:id/events`
Lista eventos de uma sessao com filtros.

**Query params**:
- `category`: filtrar por categoria (tool_call, file_change, error, etc.)
- `agent_id`: filtrar por agente
- `tool`: filtrar por nome de tool
- `since`: timestamp ISO (eventos apos)
- `limit`: max resultados (default 100)
- `offset`: paginacao

### 6.5 File Changes

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

### 6.6 Real-time Stream (SSE)

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

### 6.7 Projects (Pilar 2)

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

### 6.8 Sprints (Pilar 2)

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

### 6.9 PRD Tasks (Pilar 2)

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

### 6.10 PRD Parsing (Pilar 2)

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

### 6.11 PRD Progress SSE Events (Pilar 2)

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

### 6.12 Stats

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

## 7. Dashboard Components

### 7.1 AgentPanel

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

### 7.2 ActivityFeed

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

### 7.3 FileWatcher

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

### 7.4 StatsBar

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

### 7.5 AgentDetail

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

### 7.6 SessionTimeline

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

### 7.7 KanbanBoard (Pilar 2)

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

### 7.8 SprintProgress (Pilar 2)

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

### 7.9 PRDOverview (Pilar 2)

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

### 7.10 DependencyGraph (Pilar 2)

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

### 7.11 BurndownChart (Pilar 2)

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

### 7.12 ProjectSelector (Pilar 2)

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

### 7.13 AgentMap v2 - "Mission Floor" (CORE FEATURE)

**Descricao**: Visualizacao interativa pixel art em tempo real onde agentes Claude Code sao representados como personagens com poses distintas por atividade, organizados em um espaco aberto hierarquico. Esta e a **feature central do produto** - o que diferencia o CAM de qualquer outra ferramenta de monitoring. Inspirado no OPES Big Brother.

> **IMPORTANTE**: O Agent Map NAO e um tema. E um componente core que vive dentro de qualquer tema. E a visualizacao principal que o usuario ve ao abrir o dashboard.

> **DECISAO ARQUITETURAL (v2)**: O modelo anterior de "zonas fixas" (Code Zone, Command Zone, Rest Area, Done Zone) foi abandonado. Zonas fixas desperdicam espaco com agentes inativos e adicionam uma camada de abstracao que atrapalha a observabilidade real. O novo modelo "Mission Floor" e um espaco aberto onde agentes existem como entidades autonomas, e a informacao relevante (o que cada um FAZ agora) e exibida diretamente em cada agente.

**Conceito Visual - Mission Floor**:
```
+================================================================+
|  MISSION FLOOR                                    [3 active]   |
|                                                                 |
|  [sprite 48px]          [sprite 48px]         [sprite 48px]    |
|  pose: CODING           pose: READING         pose: TERMINAL   |
|  main                   explorer-1            test-writer      |
|  "editing App.tsx"      "reading schema.sql"  "$ pnpm test"   |
|  Edit > Read > Bash     Read > Glob > Grep    Bash > Read     |
|       \                      /                                  |
|        ------msg----------->                                   |
|                                                                 |
|  --- inactive ------------------------------------------------ |
|  [mini] explorer-2 done 2m ago  |  [mini] researcher idle 45s |
+================================================================+
```

**Principio central**: Todo pixel serve observabilidade. Sem espaco desperdicado com agentes inativos. O que importa e VER o que cada agente esta fazendo AGORA.

#### Layout: 2 areas

| Area | Espaco | Conteudo |
|------|--------|----------|
| **Active Workspace** | ~80% | Agentes trabalhando com sprites grandes, activity labels, tool trail, linhas de comunicacao |
| **Inactive Bar** | ~20% (bottom) | Agentes idle/done em miniatura com ultimo estado visivel |

- Agentes **sobem** para o workspace quando recebem atividade
- Agentes **descem** para a inactive bar quando ficam idle > 30s ou completam
- Transicao animada entre as duas areas
- Main agent posicionado ao centro, subagentes ao redor (hierarquia visual)

#### Sprite System: Poses por Atividade

Sprites renderizados em CSS pixel art (box-shadow) a 24x24 pixels com display 2x = 48x48px.
Cada agente tem cor unica derivada do nome (hash -> paleta de 12 cores).

**8 poses distintas mapeadas por tool usage**:

| Pose | Tools que ativam | Visual (24x24 pixel art) | Descricao |
|------|-----------------|--------------------------|-----------|
| **CODING** | Edit, Write, NotebookEdit | Sentado em mesa, digitando, particulas de codigo | Agente editando/escrevendo codigo |
| **READING** | Read, Glob, Grep | Segurando livro/scroll aberto | Agente lendo/explorando codebase |
| **TERMINAL** | Bash | Em pe frente a monitor verde | Agente executando comandos |
| **TALKING** | SendMessage | Pose com balao de fala ativo | Agente se comunicando |
| **SEARCHING** | WebSearch, WebFetch | Com lupa brilhando, globo | Agente pesquisando na web |
| **MANAGING** | TaskCreate, TaskUpdate, TaskList, TaskGet | Frente a um quadro/board | Agente gerenciando tasks |
| **IDLE** | (inativo > 30s) | Sentado no chao, zZz flutuando | Agente descansando |
| **CELEBRATING** | completed/shutdown | Bracos pra cima, confete pixelado | Agente que terminou trabalho |

Cada pose tem 2-3 frames de animacao (loop continuo).
Transicao entre poses: crossfade 300ms.

#### Activity Labels

Texto abaixo do sprite mostrando exatamente o que o agente faz:

| Tool | Label gerado | Exemplo |
|------|-------------|---------|
| Read | `reading <filename>` | "reading schema.sql" |
| Glob | `searching <pattern>` | "searching *.tsx" |
| Grep | `grep "<pattern>"` | `grep "AgentZone"` |
| Edit | `editing <filename>` | "editing index.ts" |
| Write | `writing <filename>` | "writing new-file.ts" |
| Bash | `$ <command>` | "$ pnpm test" |
| SendMessage | `msg -> <recipient>` | "msg -> researcher" |
| TaskCreate | `creating task` | "creating task" |
| WebSearch | `search "<query>"` | `search "react hooks"` |
| (idle) | `idle <N>s` | "idle 45s" |
| (done) | `completed` / `shutdown` | "completed" |

#### Agent Card (cada agente ativo)

```
+--[agent-card]-------------------------+
|  [sprite 48x48]                       |
|  pose: CODING                         |
|                                       |
|  main                  active 2m 15s  |
|  "editing App.tsx"                    |
|  [Edit] [Read] [Bash] [Edit] [Read]  |
|  12 tools | 0 errors                  |
+---------------------------------------+
```

Componentes do card:
- **Sprite** com pose animada (48x48 display)
- **Nome** do agente (bold, cor do agente)
- **Activity label** (monospace, 10px, o que esta fazendo)
- **Tool trail** (ultimas 5 tools como mini badges coloridos)
- **Stats** compactos (total tools, errors, tempo ativo)
- **Timer** (ativo ha X min ou idle Xs)

#### Comunicacao Visual

- **Linhas de mensagem**: SVG dashed lines animadas entre agentes que trocam SendMessage, com cor do agente remetente
- **Spawn animation**: quando subagente e criado, sprite nasce com efeito de escala (0 -> 1) a partir da posicao do agente pai
- **Shutdown animation**: sprite diminui e desce suavemente para a inactive bar
- **Hierarchy lines**: linhas finas pontilhadas conectando agente pai a seus filhos (quem spawnou quem)
- **Speech bubbles**: balao pixel art com preview da mensagem (60 chars) que aparece por 5s

#### Posicionamento

Agentes ativos sao posicionados no workspace usando logica hierarquica:
- **Main agent**: centro horizontal, levemente acima do centro vertical
- **Subagentes de 1o nivel**: distribuidos em semicirculo ao redor do main
- **Subagentes de 2o nivel**: proximos ao pai que os spawnou
- Quando ha apenas 1-2 agentes: centralizados com espaco
- Quando ha 5+ agentes: grid responsivo que preenche o workspace

#### Dados Necessarios (ja capturados pelos hooks)

- `agent_id` + `status` -> qual agente, em qual estado
- `tool` + `input` (de events) -> determina a pose + activity label
- `SendMessage` events -> linhas de comunicacao + speech bubbles
- `Task` tool calls -> spawn de agentes, hierarquia
- Timestamps -> tempo ativo, idle detection
- `agent_created` SSE event -> spawn animation
- `agent_status` SSE event -> transicoes de estado

#### Implementacao Tecnica

- **Rendering**: CSS pixel art (box-shadow) para sprites + CSS Flexbox para layout + SVG para linhas
- **State**: Zustand `agent-map-store` com posicoes, poses, labels, hierarquia
- **Sync**: `use-agent-map-sync` hook que mapeia eventos -> poses + labels
- **Poses**: Cada pose definida como array 2D de indices de cor, renderizada via box-shadow
- **Transicoes**: CSS transitions (300ms) para movimento entre areas, crossfade para troca de pose
- **SSE integration**: Eventos SSE atualizam estado -> componentes reagem
- **Responsivo**: Workspace reorganiza em breakpoints (4 cols -> 2 cols -> 1 col)
- **Performance**: React.memo em sprites, debounce em sync, max 60fps
- **Interatividade**: Click em agente abre AgentDetail panel lateral

#### API necessaria (ja existente)

- `GET /api/sessions/:id/agents` - lista agentes e status
- `GET /api/stream` (SSE) - eventos em tempo real + `agent_created` + `agent_status`
- `GET /api/sessions/:id/events?agent_id=X` - historico do agente

---

## 8. Temas Visuais

### 8.1 Pixel Art Theme ("Retro")

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

### 8.2 Modern Theme ("Clean")

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

### 8.3 Terminal Theme ("Hacker")

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

# PARTE 3 - EXECUTION (QUANDO construir)

> **Nota**: O tracking detalhado de tasks/sprints vive no banco de dados do CAM (dogfooding).
> As listas abaixo sao resumos em alto nivel. Use `cam tasks` para o estado real.

---

## 10. MVP - v1.0 "Mission Control"

Server local + Dashboard web + ambos os Pilares + Agent Map Mission Floor + 3 temas + CLI completo com 10 comandos + npm packaging + developer experience plug-and-play.

Inclui toda a infraestrutura core: monorepo (pnpm workspaces), `@cam/shared` (tipos/schemas), `@cam/server` (Express + SQLite + REST + SSE), `@cam/hook` (zero-dep binary), `@cam/cli` (Commander.js), Dashboard (React 19 + Vite + Zustand + Tailwind 4). Todos os componentes de ambos os pilares implementados nos 3 temas. Agent Map v2 "Mission Floor" com sprites detalhados (8 poses), layout hierarquico, activity labels, e comunicacao visual entre agentes. Sprint 5 foca em transformar o CAM de "funciona pra quem buildou" em "qualquer dev instala e usa em 2 minutos".

### Sprint 1 - Core Infrastructure (29 tasks) ✅

- Monorepo setup (pnpm workspaces)
- @cam/shared - tipos e schemas compartilhados
- @cam/server - Node.js + SQLite + REST API + SSE
- @cam/hook - binario ultra-leve para hooks
- @cam/cli - comandos basicos (init, start, status)
- Dashboard React + Vite + Zustand
- Project/Sprint data model + API endpoints
- Correlation Engine (auto-matching events -> tasks)
- PRD parser (structured mode)
- Tema Modern (default)
- Tema Pixel Art (sprites, animacoes, RPG aesthetic)
- Tema Terminal (keyboard-driven, ASCII)
- Theme switcher component
- AgentPanel (lista de agentes com status)
- ActivityFeed (feed em tempo real)
- FileWatcher (arvore de arquivos)
- StatsBar (metricas agregadas)
- AgentDetail (detalhes do agente)
- SessionTimeline (Gantt dos agentes)
- KanbanBoard (auto-updating)
- SprintProgress (barra + stats)
- PRDOverview (documento colorido)
- DependencyGraph
- BurndownChart
- ProjectSelector (switcher de modos)
- CLI completo (project, sprint, tasks, progress commands)
- npm packaging + instalacao global
- GitHub repo + CI/CD
- README + docs + examples

### Sprint 2 - Agent Map v1 (10 tasks) ✅ → substituido pelo Sprint 4

> **Nota**: O Agent Map v1 (grid de zonas fixas) foi implementado e depois substituido pelo Sprint 4 (Mission Floor). As 10 tasks abaixo foram concluidas mas o resultado visual foi descartado em favor do novo design. A infraestrutura (activity labels, idle detection, SSE events) foi reaproveitada.

- ~~Arquitetura do componente AgentMap~~
- ~~Sprites pixel art dos agentes~~
- ~~Mapa com 7 zonas de atividade~~
- ~~Sistema de posicionamento (tool -> zona)~~
- ~~Animacoes de estado dos agentes~~
- ~~Interacoes visuais entre agentes~~
- ~~Integracao SSE (tempo real)~~
- ~~Click em agente -> AgentDetail~~
- ~~Responsividade e performance (60fps)~~
- ~~Integrar AgentMap em todos os temas~~

### Sprint 3 - SSE Pilar 2 (2 tasks) 🔄

- SSE real-time events for PRD Tracker (Pilar 2)
- Dashboard SSE integration for Pilar 2 components

### Sprint 4 - Agent Map v2: Mission Floor (16 tasks) 🔜

Redesign completo do Agent Map. Substitui o grid de zonas fixas por um espaco aberto ("Mission Floor") com sprites detalhados que mudam de pose por atividade, activity labels mostrando exatamente o que cada agente faz, tool trail, hierarquia visual, e comunicacao animada entre agentes.

**Secao 1 - Sprite System (4 tasks)**:
- Sprite data format: sistema de definicao de poses como arrays 2D de pixels com paleta de cores tematica por agente (hash do nome -> cor base). Rendering via CSS box-shadow a 24x24 com display 2x (48x48px)
- Poses de trabalho primarias: CODING (sentado digitando, particulas de codigo), READING (segurando scroll aberto), TERMINAL (em pe frente a monitor verde). 2-3 frames de animacao cada
- Poses de trabalho secundarias: TALKING (com balao de fala ativo), SEARCHING (com lupa brilhando), MANAGING (frente a quadro/board). 2-3 frames cada
- Poses de estado: IDLE (sentado no chao, zZz flutuando), CELEBRATING (bracos pra cima, confete pixelado). Transicao crossfade 300ms entre qualquer par de poses

**Secao 2 - Mission Floor Layout (4 tasks)**:
- MissionFloor component: substitui o AgentMapGrid. Duas areas: ActiveWorkspace (~80%) e InactiveBar (~20% bottom). Transicao animada quando agente muda entre areas
- AgentCard component: card por agente ativo contendo sprite com pose animada, nome, activity label, tool trail (ultimas 5 tools como mini badges), stats compactos (tools, errors), timer (ativo ha Xm ou idle Xs)
- InactiveBar component: barra inferior mostrando agentes idle/done em miniatura (sprite 24x24, nome, ultimo estado). Click promove agente de volta ao workspace se voltar ativo
- Responsive layout: workspace reorganiza em breakpoints (4 cols desktop -> 2 cols tablet -> 1 col mobile). Integracao com todos os 3 temas via theme-registry

**Secao 3 - Comunicacao e Dinamicas (4 tasks)**:
- Hierarquia visual: linhas finas pontilhadas conectando agente pai a filhos. Main agent centralizado, subagentes distribuidos em semicirculo. Posicionamento hierarquico automatico
- Linhas de comunicacao: SVG dashed lines animadas (particulas fluindo) entre agentes que trocam SendMessage. Cor do remetente. Speech bubbles pixel art com preview 60 chars, visivel por 5s
- Spawn e shutdown animations: novo agente nasce com efeito scale(0->1) a partir da posicao do pai. Shutdown: sprite diminui e desliza suavemente para InactiveBar
- Click interaction: click em agente ativo abre AgentDetail panel lateral. Click em agente inativo na bar mostra popup com ultimo estado e historico

**Secao 4 - Polish e Performance (4 tasks)**:
- Tool trail component: ultimas 5 tools renderizadas como mini badges coloridos abaixo do activity label. Cada tool type tem cor e abreviacao propria (Ed=blue, Rd=indigo, Bh=amber, Msg=purple, etc.)
- Agent timer: contador em tempo real mostrando "ativo ha 2m 15s" ou "idle 45s". Atualiza a cada segundo para agentes ativos. Formatacao compacta
- Posicionamento hierarquico: algoritmo que distribui agentes no workspace baseado em hierarquia (pai-filho). Main no centro, filhos ao redor, netos proximos aos pais. Reposiciona suavemente quando agentes entram/saem
- Performance: React.memo em todos os sub-componentes, debounce de 100ms no sync, cleanup de speech bubbles/lines expirados, virtualizacao se > 10 agentes ativos

### Sprint 5 - Developer Experience & Plug-and-Play (15 tasks) 🔜

Transformar o CAM de "funciona pra quem buildou" em "qualquer dev instala e usa em 2 minutos". Hoje o CAM exige conhecimento tecnico demais para comecar (configurar hooks manualmente, entender WSL vs Windows, saber sobre tmux). Um iniciante deveria fazer `npm install -g claude-agent-monitor && cam init && cam start` e ver tudo funcionando.

**Secao 1 - CLI Robusto (4 tasks)**:
- `cam init` robusto: detectar `.claude/settings.json` existente, fazer merge inteligente de hooks (preservar hooks do usuario, adicionar os do CAM), funcionar em Windows/Mac/Linux, mostrar feedback claro do que foi configurado. Deve usar `cam-hook` (binario global) nos commands, NAO caminhos relativos
- `cam-hook` como binario global funcional: quando instalado via `npm install -g`, o binario `cam-hook` deve estar no PATH e funcionar standalone (ler stdin JSON, fazer POST pro server). Testar instalacao global end-to-end
- `cam start` integrado: um unico comando que inicia server + dashboard + abre browser + mostra status. Deve funcionar apos `npm install -g` (nao apenas em dev com `pnpm dev`)
- `cam status` funcional: mostrar se o server esta rodando, quantas sessoes ativas, quantos eventos capturados, se os hooks estao configurados corretamente. Diagnostico rapido pra saber se ta tudo certo

**Secao 2 - Dashboard Feedback Visual (4 tasks)**:
- Connection status indicator: barra/badge permanente no dashboard mostrando "Conectado - capturando eventos" ou "Desconectado - aguardando server". Usar o heartbeat SSE que ja existe (15s). Visivel em todos os temas
- Session lifecycle visual: quando SessionStart chega via SSE, mostrar notificacao/banner "Nova sessao iniciada". Quando SessionEnd chega, mostrar "Sessao encerrada". O dashboard ja recebe esses eventos mas nao faz nada visual com eles
- Agent join/leave notifications: quando um agente aparece (agent_created SSE), mostrar toast "Agente X entrou". Quando sai (agent_status=shutdown), mostrar "Agente X finalizou". Feedback visual do time se formando
- Empty state / onboarding: quando o dashboard abre sem sessao ativa, mostrar tela de "Aguardando conexao..." com instrucoes de como comecar (rodar `cam init`, rodar `claude` em outro terminal). Hoje mostra tela vazia

**Secao 3 - Cross-Platform Reliability (3 tasks)**:
- Documentar setup WSL: secao no README explicando uso com WSL/tmux, incluir `scripts/test-wsl-hook.sh` como ferramenta de diagnostico, explicar que tmux e OPCIONAL (modo in-process funciona sem ele)
- Transport resilience: adicionar fallback no transport.ts (se gateway falha, tentar nameserver, tentar localhost). Adicionar log opcional (CAM_DEBUG=1) que mostra pra qual host esta enviando
- `cam doctor` comando de diagnostico: verifica server rodando, hooks configurados, consegue fazer POST, mostra diagnostico claro de onde esta o problema. Essencial pra iniciantes que nao sabem debugar rede

**Secao 4 - Zero-Config Agent Detection (2 tasks)**:
- Funcionar sem tasks explicitas: o CAM deve mostrar atividade util mesmo com `claude "corrija o bug"` sem tasks/times. Activity feed, file watcher, e agent panel devem funcionar com um unico agente fazendo tool calls normais
- Auto-detect team formation: quando Claude Code usa TeamCreate ou Task tool, o CAM deve automaticamente criar session group e mostrar agentes aparecendo. Testes end-to-end e polish da implementacao existente no event-processor

**Secao 5 - Didactic Naming & Full Visibility (2 tasks)**:
- Friendly Agent Naming System: agente principal exibido como "Main" (ou nome do projeto), subagentes usam o name do Task/TeamCreate (ex: "researcher"), se nao tem nome gera nome amigavel automatico via hash do session_id (estilo Docker: "brave-panda"). Session ID (8 chars) como subtitle discreto. Sessoes mostradas como "Sessao #1" ou "14:30 - 16 fev" com UUID no tooltip
- Full Visibility - eliminar truncamentos: word-wrap por padrao em activity labels (nunca text-overflow ellipsis), file paths mostram filename como principal + path completo no tooltip, speech bubbles expandiveis ao clicar, agent cards com tamanho flexivel, comandos Bash com scroll horizontal. Regra: nenhum truncate sem mecanismo de "ver completo" associado

### Sprint 6 - True Observability (11 tasks) 🔜

O dashboard precisa mostrar a verdade. Descobertas do dogfooding real revelaram que nomes de agentes sao UUIDs aleatorios, contagens estao infladas, sessoes zumbi poluem a visualizacao, e o activity feed e repetitivo. Este sprint corrige tudo para que o monitoring seja genuinamente util.

**Secao 1 - Hook Accuracy (3 tasks)**:
- Implementar hook SubagentStart: novo handler que captura `agent_id` e `agent_type` do stdin quando um subagente nasce. Adicionar ao settings.json. O Claude Code JA fornece esses campos nativamente - so precisamos captura-los
- Corrigir hardcode agent_id "main" em todos os handlers: pre-tool-use, post-tool-use, stop, subagent-stop, session-start, notification, compact. Usar `session_id` do stdin como `agent_id` real. Cada processo Claude Code tem session_id unico
- Fix double counting de tool calls: `incrementToolCalls` roda tanto no PreToolUse quanto PostToolUse, inflando contagem 2x. Mudar para incrementar SOMENTE no PostToolUse

**Secao 2 - Agent Identity (2 tasks)**:
- Agent name resolution com 3 camadas: (1) `agent_type` do SubagentStart como fonte primaria, (2) `name` do Task tool input como fonte secundaria, (3) friendly name Docker-style como ultimo fallback. Persistir mapeamento session_id → nome real na tabela agents
- Correlacao Task tool → session: quando main agent usa Task tool com `name: "cli-dev"`, guardar em fila de nomes pendentes. Quando nova sessao aparece no grupo (SessionStart), associar o proximo nome pendente a essa sessao. Atualizar agent.name retroativamente

**Secao 3 - Session Lifecycle (3 tasks)**:
- Janela de tempo para ativo/inativo: substituir deteccao fixa por janela configuravel (1m/3m/5m/10m). Agentes com atividade dentro da janela = ativos no workspace. Sem atividade = inativos na InactiveBar. UI selector no dashboard para trocar janela
- Auto-cleanup de sessoes stale: job periodico no servidor que marca sessoes sem atividade ha mais de 10 minutos como "completed". Resolver sessoes zumbi (test-debug, test-wrapper, etc.) que ficam "active" eternamente por nunca receberem Stop event
- Session picker no dashboard: dropdown/tabs no shell para alternar entre sessoes e session groups. Mostrar sessao/grupo ativo atual com stats resumidos. Historico de sessoes anteriores acessivel sem poluir a visualizacao principal

**Secao 4 - Dashboard Accuracy (3 tasks)**:
- Fix StatsBar Events count: usar `session.eventCount` do banco de dados em vez de `events.length` do Zustand store (que so conta eventos recebidos via SSE apos conexao). Garantir consistencia entre todas as metricas exibidas
- Filtrar/agrupar TaskList repetitivo no Activity Feed: quando multiplos eventos TaskList consecutivos do mesmo agente, agrupar em "TaskList x5" ou permitir filtro por tool. Reduzir ruido no feed para destacar acoes reais (Edit, Bash, Write)
- Completar Full Visibility server-side: remover ou aumentar significativamente `MAX_INPUT_LENGTH = 500` e `MAX_OUTPUT_LENGTH = 500` no constants.ts. O servidor trunca dados ANTES de chegar ao dashboard, impedindo que a UI mostre informacao completa mesmo com word-wrap

### Sprint 7 - Correlation Engine v2: Reliable Task Tracking (17 tasks) 🔜

Rewrite completo do Correlation Engine. O dogfooding real revelou que o sistema de correlacao automatica entre eventos de hooks e PRD tasks **nao funciona de forma confiavel**. O time do Sprint 5 completou 14 tasks mas nenhuma foi atualizada automaticamente no banco. A causa raiz: fuzzy matching por substring entre titulos em idiomas diferentes, sem contexto de sessao, sem binding de agente, sem IDs explicitos.

**Estrategia: "Explicit First, Context Second, Fuzzy Last"** - inspirada em como Jira (PROJ-123 em commits), GitHub (#45 em PRs) e Linear (issue ID em branches) fazem correlacao: ID explicito como camada primaria, contexto como secundaria, fuzzy como fallback.

**Secao 1 - Explicit ID Strategy (3 tasks)**:
- PRD Task ID injection system via cam init --prd: gerar `.cam/task-map.json` mapeando PRD task IDs para titulos. Gerar secao no CLAUDE.md instruindo agentes a referenciar IDs. Pattern `[CAM:task-id]` em descriptions para match exato. Resolve o problema raiz: agentes nao sabem que PRD tasks existem
- TaskCreate/TaskUpdate enhanced field extraction: extrair TODOS os campos de tool_input (subject, description, tags, priority, activeForm, taskId). Tags sao fonte direta de correlacao. Armazenar tool_input completo sem truncar
- TaskList synchronization handler: parsear response do TaskList para obter tasks do Claude Code com statuses. Reconciliar contra PRD tasks por exact ID match e similaridade de titulo. Bulk-update divergencias

**Secao 2 - Context Binding (3 tasks)**:
- Session-to-Project binding automatico: quando SessionStart chega, verificar working_directory contra project paths. Auto-vincular sessao ao projeto. Toda correlacao subsequente filtra por aquele projeto (resolve scan O(n*m))
- Agent-to-Task binding com confidence boost: quando agente e atribuido a task, criar binding (agent_id -> prd_task_id). Eventos subsequentes ganham bias +0.3. Binding expira quando task completa
- Agent Context Window - estado por agente: manter current_task, last_10_tools, files_since_task_start, time_on_task. Usar para desambiguar matches. Persistir em memoria + DB

**Secao 3 - Improved Matching (3 tasks)**:
- Levenshtein + Jaro-Winkler similarity: substituir substring match por algoritmos proprios. Normalizar strings (lowercase, remover acentos, expandir abreviacoes). TypeScript puro, zero deps
- Multi-signal scoring pipeline hierarquico: 5 layers - Exact ID (1.0), Tag match (0.85-0.95), Agent binding + file path (0.7-0.85), Title similarity (0.6-0.8), Keyword overlap (0.5-0.7). Parar na primeira camada com confianca suficiente
- File-to-Task domain mapping: mapear file patterns -> task domains automaticamente a partir de PRD titles + tags

**Secao 4 - Event Intelligence (2 tasks)**:
- UserPromptSubmit intent detection: extrair intent do prompt do usuario, flaggar tasks como "in scope" (boost +0.2). Hook ja existe mas Correlation Engine ignora
- Status inference state machine: IDLE -> RESEARCHING -> IMPLEMENTING -> TESTING -> COMPLETED. Per-agent per-task. Usar Bash exit codes como sinal forte

**Secao 5 - Data Pipeline (2 tasks)**:
- Remover truncamento artificial: MAX_INPUT/OUTPUT_LENGTH de 500/5000 para 50000. Dados truncados perdem task IDs criticos
- Correlation audit log: tabela + endpoint para registrar toda tentativa de correlacao (sucesso e falha). Essencial para debugging e tuning

**Secao 6 - Integration & Validation (2 tasks)**:
- Dashboard correlation indicators: badges de confianca nos cards do Kanban (verde >0.95, amarelo >0.75, cinza manual). Debug panel com matches recentes
- End-to-end correlation test suite: fixtures com payloads reais, testes por layer, pipeline completo, regressao para falhas conhecidas. Target: >90% accuracy

**Secao 7 - Hooks & Event Chain (2 tasks)** (adicionadas via pesquisa online):
- Novos hook handlers: TaskCompleted (fornece task_id + task_subject nativamente - GOLD para correlacao), SubagentStart (agent_id + agent_type), PostToolUseFailure (captura falhas). O Claude Code ja suporta esses hooks mas o CAM nao os captura
- Correlation ID + Causation Chain: adicionar campos correlation_id e causation_id na tabela events. Padrao OpenTelemetry/Arkency - propagar contexto de task pela cadeia de eventos do mesmo agente. Permite agrupar "tudo que aconteceu para esta task" no dashboard

### Sprint 8 - Project-First Architecture (12 tasks) 🔜

Arquitetura "Project-First": o projeto e a entidade central, nao a sessao. Hoje o CAM tenta adivinhar qual projeto pertence a uma sessao usando janelas de tempo e agrupamento automatico (session_groups). Isso e complexo, fragil, e confuso para iniciantes. Este sprint substitui toda essa logica por um modelo direto: o usuario registra o projeto com `cam init`, o CAM detecta o PRD automaticamente, e quando o Claude Code abre naquele diretorio, a conexao e instantanea via `working_directory`. Um unico servidor CAM gerencia multiplos projetos simultaneamente.

**Secao 1 - Project Registry (3 tasks)**:
- Sistema de registro de projetos: tabela `project_registry` mapeando `working_directory` para `project_id`. Verificacao de unicidade (um diretorio = um projeto). API endpoints para CRUD de registros. O registro e a fonte de verdade para "quais projetos o CAM monitora"
- Comando `cam init`: CLI interativo que registra o diretorio atual como projeto CAM. Detecta nome do projeto pelo `package.json` ou nome da pasta. Pede confirmacao ao usuario. Cria arquivo `.cam/config.json` local com project_id. Mensagens claras e amigaveis para iniciantes
- Auto-detect de PRD.md com parse e confirmacao: durante `cam init`, busca `PRD.md` ou `prd.md` na raiz. Se encontrar, parseia usando o structured parser existente. Exibe resumo ("Encontrei 3 sprints, 47 tasks") e pede confirmacao. Se nao encontrar, informa que pode importar depois via dashboard ou `cam import`

**Secao 2 - Connection Architecture (3 tasks)**:
- Project Router: middleware no server que recebe eventos dos hooks e roteia para o projeto correto comparando `working_directory` do evento com os projetos registrados. Match por prefixo (suporta subdiretorios). Rejeita silenciosamente eventos de diretorios nao registrados
- Simplificar session binding: substituir logica de session_groups por vinculo direto `working_directory` para projeto. Quando SessionStart chega, o Project Router identifica o projeto e cria o binding automaticamente. Sem janelas de tempo, sem heuristicas
- Remover session_groups: deletar tabelas `session_groups` e `session_group_members`, remover endpoints `/api/session-groups/*`, remover logica de auto-grouping do event handler, remover queries relacionadas. Limpar codigo morto

**Secao 3 - Hook Management (3 tasks)**:
- Auto-instalacao de hooks via `cam init`: detectar `.claude/settings.json` (global ou local), adicionar/atualizar configuracao de hooks apontando para `@cam/hook`. Backup do settings original antes de modificar. Verificar se hooks ja existem para nao duplicar
- Validacao de hooks com `cam doctor`: comando que verifica se hooks estao corretamente instalados, se o servidor esta rodando, se o projeto esta registrado. Checklist com status (check/X) para cada item. Sugestao de correcao para cada problema encontrado
- Tratamento de diretorios nao registrados: eventos de sessoes em diretorios sem `cam init` sao silenciosamente ignorados (logados em nivel debug). Sem erros, sem warnings visiveis ao usuario. Opcao futura: notificar "projeto nao monitorado detectado"

**Secao 4 - Multi-Project Server (3 tasks)**:
- API endpoints multi-projeto: `GET /api/projects` retorna projetos registrados com status ativo/inativo/arquivado, `GET /api/projects/:id/summary` com contadores de tasks/agents/sessions, `POST /api/projects/:id/archive` para arquivar. Filtros por status
- SSE streams por projeto: parametro `project_id` no endpoint SSE para filtrar eventos. Cliente recebe apenas eventos do projeto selecionado. Suporte a trocar de projeto sem reconectar (re-subscribe)
- Comando `cam status`: exibir tabela formatada com projetos registrados, sessoes ativas, ultima atividade, e saude da conexao. Indicadores visuais para status de cada projeto. Util para debug e para o usuario entender o estado do sistema

### Sprint 9 - Dashboard Experience (16 tasks) 🔜

Redesign da experiencia do dashboard: navegacao multi-projeto, sistema unificado de configuracoes, paineis redimensionaveis, e limpeza de redundancias. Hoje o dashboard assume projeto unico, tem controles espalhados em 3 lugares diferentes (header, Agent Map header, Activity Feed header), e o Event Timeline aparece em todas as views sem contexto. Este sprint transforma o dashboard em uma experiencia profissional e personalizavel.

**Secao 1 - Multi-Project Navigation (3 tasks)**:
- Sidebar de projetos: lista lateral colapsavel com todos os projetos registrados. Cada item mostra nome, status (ativo/inativo), e contagem de tasks (completadas/total). Ordenacao: ativos primeiro, depois por ultima atividade. Botao para colapsar sidebar em modo icone
- Project switcher: clicar em um projeto na sidebar troca todo o contexto do dashboard (kanban, agents, timeline, Agent Map). Transicao suave entre projetos. URL atualiza com project_id para permitir bookmark/compartilhamento direto
- Indicador de projeto ativo: badge visual no projeto que tem sessao Claude rodando. Animacao sutil (pulse) quando eventos chegam em tempo real. Contador de agentes ativos no badge

**Secao 2 - Settings Infrastructure (3 tasks)**:
- Unified `useSettingsStore` com Zustand persist: consolidar configuracoes de theme-store (theme, accentColor), filter-store (followMode, hidePolling), session-store (activityWindow), e agent-map-store (displayMode, showLabels, showInteractions) em um unico store persistido. Chave localStorage `cam-settings`. Migrar leitura de todos os componentes para o novo store. Manter stores antigos para dados nao-configuracao (session data, events, etc.)
- SettingsModal component com navegacao por abas: modal overlay com 4 abas (Aparencia, Agent Map, Activity Feed, Avancado). Layout responsivo, fecha com Escape ou click fora. Deve funcionar em todos os 3 temas com styling apropriado (glassmorphism no Modern, pixel borders no Pixel, box-drawing no Terminal)
- Gear icon no header + atalho Ctrl+Comma: substituir ThemeSwitcher e ActivityWindowSelector no header principal por um unico icone de engrenagem. Atalho de teclado `Ctrl+,` (padrao VS Code) para abrir o modal de qualquer lugar. Badge no icone se houver configuracao nao-default

**Secao 3 - Settings Modal Content (4 tasks)**:
- Aba Aparencia: seletor de tema (Modern/Pixel/Terminal) com preview visual, color picker para accent color (8 cores pre-definidas + custom hex input), seletor de resolucao de sprites (Classic 16x16, Detailed 24x24, HD 32x32, Ultra 48x48) com preview ao vivo do sprite na resolucao selecionada
- Aba Agent Map: toggles para activity labels (ON/OFF), linhas de comunicacao (ON/OFF), modo de speech bubbles (Tecnico/Didatico com descricao de cada modo), seletor de janela de atividade (1m/3m/5m/10m) com explicacao do que cada valor significa
- Aba Activity Feed: toggle follow mode (auto-scroll ON/OFF), toggle hide polling (esconder TaskList/TaskGet repetitivos), lista editavel de tools consideradas "polling" (hoje hardcoded: TaskList, TaskGet), toggle para agrupar eventos repetitivos consecutivos
- Aba Avancado: input numerico para max eventos em memoria (default 500), timeout de speech bubbles em segundos (default 5), max linhas de comunicacao simultaneas (default 5), botao "Restaurar Padroes" que reseta todas as configuracoes para valores default com confirmacao

**Secao 4 - Resizable Panels (3 tasks)**:
- Sistema de paineis redimensionaveis: integrar biblioteca de panels (react-resizable-panels) para permitir arrastar bordas entre paineis. Minimo e maximo de largura/altura por painel. Cursor visual de resize nas bordas. Double-click na borda para resetar ao tamanho default
- Persistencia de layout: salvar tamanhos dos paineis em localStorage (chave `cam-layout`). Restaurar layout ao reabrir o dashboard. Diferentes layouts salvos por view (kanban view vs agent map view). Reset para layout default disponivel nas configuracoes
- Lock/unlock de paineis: toggle nas configuracoes (Aba Avancado) para travar/destravar redimensionamento. Quando travado, bordas nao sao arrastaveis e cursor nao muda. Indicador visual sutil de que paineis estao travados. Atalho de teclado `Ctrl+L` para toggle rapido

**Secao 5 - Layout Cleanup (3 tasks)**:
- Limpar header principal: remover componentes ThemeSwitcher e ActivityWindowSelector do header. Manter apenas: logo/titulo, ConnectionIndicator, ProjectPicker, e gear icon. Resultado: header significativamente mais limpo com apenas controles de navegacao
- Limpar Agent Map header: remover toggles de Labels, Didactic/Technical, e Lines do AgentMapHeader. Componentes devem ler configuracoes diretamente do useSettingsStore. Header do mapa fica apenas com titulo + contagem de agentes
- Event Timeline contextual: remover Event Timeline da exibicao global persistente. Timeline so aparece como painel dedicado quando selecionado, ou como painel lateral dentro de views especificas (Agent Map, Kanban). Painel pode ser aberto/fechado pelo usuario

### Sprint 10 - Visual Polish (10 tasks) 🔜

Upgrade do sistema visual: renderer Canvas 2D para sprites de alta resolucao, integracao de temas no novo sistema de settings, e refinamentos visuais gerais. Os sprites 16x16 atuais (CSS box-shadow) sao charmosos mas limitados em detalhes e performance. Este sprint introduz 4 niveis de resolucao renderizados via Canvas 2D com cache inteligente, e garante que todos os novos componentes (sidebar, settings modal, resizable panels) tenham styling consistente nos 3 temas.

**Secao 1 - Canvas Sprite Renderer (3 tasks)**:
- Canvas 2D sprite renderer com cache: substituir CSS box-shadow por rendering via OffscreenCanvas. Funcao `renderSpriteToDataUrl(pixels, gridSize, displaySize, primaryColor)` que pinta pixels no canvas e retorna data URL cached. Cache key = hash de (pose + color + resolution). Usar `image-rendering: pixelated` / `crisp-edges` para manter pixels nitidos ao escalar. Componente exibe `<img src={cachedUrl}>` em vez de div com box-shadow
- Sprite resolution config com lazy loading: dynamic import de sprite data por resolucao (`sprite-data-16.ts`, `sprite-data-24.ts`, `sprite-data-32.ts`, `sprite-data-48.ts`). Carregar apenas o arquivo da resolucao ativa. Fallback para 16x16 se resolucao maior nao disponivel. Invalidar cache quando resolucao muda no settings
- Atualizar PixelCharacter e AgentCard para Canvas renderer: substituir generateBoxShadow por novo renderSpriteToDataUrl. Manter TODAS as animacoes CSS existentes (aplicadas no container, nao nos pixels). Manter overlays de pose (coding particles, terminal cursor, confetti, zzz). Garantir backward-compatibility: se Canvas nao disponivel, fallback para box-shadow

**Secao 2 - High-Resolution Sprite Data (4 tasks)**:
- Sprite data 24x24 "Detailed": redesenhar todas as 8 poses (IDLE, CODING, READING, TERMINAL, TALKING, SEARCHING, MANAGING, CELEBRATING) em grid 24x24. Metodo hibrido: upscale dos sprites 16x16 como base + refinamento com detalhes adicionais (expressao facial, ferramenta na mao, textura de roupa). ~150 pixels por pose. Manter mesma paleta de cores (P/S/H/D/E/K/G/W/B)
- Sprite data 32x32 "HD": redesenhar todas as 8 poses em grid 32x32. Detalhes visiveis: expressoes faciais distintas, ferramentas detalhadas (teclado no CODING, livro aberto no READING, monitor no TERMINAL), sombreamento no corpo, roupas com textura. ~350 pixels por pose
- Sprite data 48x48 "Ultra": redesenhar todas as 8 poses em grid 48x48. Nivel de detalhe maximo: rosto expressivo com olhos/boca, ferramentas com detalhes internos, sombras projetadas, highlights de iluminacao, acessorios por pose (headphones no CODING, lupa brilhante no SEARCHING, clipboard detalhado no MANAGING). ~900 pixels por pose
- Sprite preview no Settings Modal: componente que renderiza um agente de exemplo na resolucao selecionada. Botao para ciclar entre as 8 poses. Mostra comparacao lado-a-lado entre resolucao atual e selecionada. Animacao de transicao suave ao trocar resolucao. Nome da resolucao com descricao (ex: "Classic 16x16 - Estilo NES nostalgico")

**Secao 3 - Theme Integration (3 tasks)**:
- Integrar SettingsModal nos 3 temas: Modern (glassmorphism, rounded corners, shadows), Pixel (pixel borders via box-shadow, Press Start 2P font, NES color palette), Terminal (box-drawing characters, green-on-black, monospace). Cada tema deve ter seu proprio wrapper de styling para o modal
- Styling de paineis redimensionaveis por tema: handles de resize estilizados para cada tema (sutil no Modern, pixel art no Pixel, caracteres ASCII no Terminal). Indicadores visuais de drag consistentes com o tema ativo
- Styling da sidebar de projetos por tema: sidebar com visual consistente para cada tema. Modern (glassmorphism lateral), Pixel (painel NES com borda pixelada), Terminal (lista com caracteres box-drawing)

---

## 11. Backlog

### v1.1 - "Intelligence" (14 tasks)

- Export de sessao/projeto (JSON, CSV, Markdown report)
- Diff viewer inline
- Dark/Light mode no tema Modern
- Performance profiling (quais tools sao mais lentas)
- Comparacao entre sessoes/sprints
- PRD parser AI-assisted com estimativa de complexidade
- CLAUDE.md template with TaskTools instructions
- Active task detection hook
- Sugestoes automaticas de dependencias entre tasks
- PRD/Workflow template for open-source distribution
- Handler PreToolUseRejected no @cam/hook
- Handler ToolError no @cam/hook
- Keyboard navigation (vim keys) no Terminal theme

### v2.0 - "Desktop App"

App desktop nativo com Tauri: system tray com status, notificacoes nativas do OS, auto-detect de sessoes Claude Code, auto-start no login. Distribuicao via `.dmg` / `.msi` / `.AppImage`.

### v3.0 - "VS Code Extension"

Extensao VS Code com panel integrado: activity feed como VS Code panel, status bar item, click-to-open em arquivos modificados, decorators nos arquivos, command palette integration. Publicacao no Marketplace.

### v4.0 - "Multi-machine"

Server centralizado (cloud), autenticacao via API keys, multi-user dashboard, historico persistente (PostgreSQL), alertas configuraveis (Slack/Discord/email), metricas de custo estimado (tokens).

---

# PARTE 4 - REFERENCE

---

## 12. Estrutura de Arquivos

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
|   |       |   |-- project.ts  # cam project (list, show, import, archive)
|   |       |   |-- sprint.ts   # cam sprint (list, create, status, activate)
|   |       |   |-- tasks.ts    # cam tasks (list, filter)
|   |       |   |-- progress.ts # cam progress (burndown terminal)
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
|   |       |   |-- agent-map-store.ts  # Estado do Agent Map (zonas, agentes, animacoes)
|   |       |-- hooks/
|   |       |   |-- use-sse.ts          # Hook para SSE connection
|   |       |   |-- use-session.ts      # Dados da sessao
|   |       |   |-- use-agents.ts       # Lista de agentes
|   |       |   |-- use-events.ts       # Feed de eventos
|   |       |   |-- use-project.ts      # Dados do projeto (Pilar 2)
|   |       |   |-- use-sprint.ts       # Dados do sprint (Pilar 2)
|   |       |   |-- use-tasks.ts        # Tasks do PRD (Pilar 2)
|   |       |   |-- use-agent-map-sync.ts # Bridge session-store -> agent-map-store
|   |       |-- components/
|   |       |   |-- agent-map/          # CORE FEATURE - Agent Map (compartilhado entre temas)
|   |       |   |   |-- AgentMap.tsx    # Componente principal do mapa
|   |       |   |   |-- AgentSprite.tsx # Sprite pixel art do agente (CSS box-shadow)
|   |       |   |   |-- MapZone.tsx     # Zona de atividade (Code, Command, Comms, etc.)
|   |       |   |   |-- MapLayout.tsx   # Layout wrapper usado por todos os temas
|   |       |   |   |-- InteractionLine.tsx  # Linhas de comunicacao entre agentes
|   |       |   |   |-- SpeechBubble.tsx     # Baloes de fala
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
|           |   |-- agent-map.ts  # AgentMapState, MapZone, SpriteState
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

## Apendice A: Decisoes Tecnicas

| # | Questao | Decisao | Status |
|---|---------|---------|--------|
| 1 | Framework do server | **Express** | Implementado |
| 2 | Bundling do hook binary | **esbuild** (tsc build) | Implementado |
| 3 | Persistencia | **SQLite** (better-sqlite3, WAL mode) | Implementado |
| 4 | Sprites do tema Pixel | **CSS box-shadow pixel art** (16x16, 3 frames) | Implementado |
| 5 | Monorepo tool | **pnpm workspaces** | Implementado |
| 6 | Keyboard nav no tema Terminal | **Custom** | Implementado |
| 7 | Graph layout (DependencyGraph) | TBD | Em aberto |
| 8 | Kanban drag & drop | TBD | Em aberto |
| 9 | AI PRD parser | TBD (deferred para v1.1) | Em aberto |
| 10 | Fuzzy matching (Correlation Engine) | TBD | Em aberto |

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

*Documento gerado em 2026-02-14. Versao 3.0.0.*
*Atualizado com Pilar 2 (PRD Tracker) em 2026-02-14.*
*Reorganizado: roadmap simplificado, tracking granular via DB (dogfooding) em 2026-02-16.*
*Reestruturado: template 4 partes (PRD/SPEC/EXECUTION/REFERENCE) em 2026-02-16.*
