/**
 * Seed script: Replace old Sprint 8 (17 tasks) with new Sprints 8, 9, 10 (38 tasks)
 *
 * Sprint 8 - Project-First Architecture (12 tasks, prd_line_start=8)
 * Sprint 9 - Dashboard Experience (16 tasks, prd_line_start=9)
 * Sprint 10 - Visual Polish (10 tasks, prd_line_start=10)
 *
 * Run from packages/server/: node ../../scripts/seed-sprint8-9-10.cjs
 */

const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'packages', 'server', 'cam-data.db');
// If running from packages/server/, use local path instead
const altDbPath = path.join(process.cwd(), 'cam-data.db');
const fs = require('fs');
const finalDbPath = fs.existsSync(dbPath) ? dbPath : altDbPath;
console.log('Using DB:', finalDbPath);
const db = new Database(finalDbPath);

const PROJECT_ID = 'b9f55006-36fe-4d98-a2ce-9f59064d7fee';
const MVP_SPRINT_ID = 'f44082d6-5cb7-4bbc-b049-259dc9731842';

function uuid() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString().replace('T', ' ').replace('Z', '');
}

// ============================================================
// Step 1: Delete old Sprint 8 tasks
// ============================================================
console.log('\n=== Step 1: Delete old Sprint 8 tasks ===');

const oldTasks = db.prepare(
  "SELECT id, title FROM prd_tasks WHERE prd_section LIKE 'Sprint 8%'"
).all();

console.log(`Found ${oldTasks.length} old Sprint 8 tasks to delete:`);
oldTasks.forEach(t => console.log(`  - ${t.title}`));

const deleteResult = db.prepare(
  "DELETE FROM prd_tasks WHERE prd_section LIKE 'Sprint 8%'"
).run();

console.log(`Deleted ${deleteResult.changes} tasks.`);

// ============================================================
// Step 2: Insert new Sprint 8 tasks (Project-First Architecture)
// ============================================================
console.log('\n=== Step 2: Insert Sprint 8 - Project-First Architecture (12 tasks) ===');

const sprint8Tasks = [
  // Section 1 - Project Registry (3)
  {
    title: 'Sistema de registro de projetos (project_registry)',
    description: 'Tabela project_registry mapeando working_directory para project_id. Verificacao de unicidade (um diretorio = um projeto). API endpoints para CRUD de registros. O registro e a fonte de verdade para "quais projetos o CAM monitora".',
    prd_section: 'Sprint 8 - Project-First Architecture > Project Registry',
    priority: 'critical',
    tags: '["backend","database","architecture"]',
  },
  {
    title: 'Comando cam init',
    description: 'CLI interativo que registra o diretorio atual como projeto CAM. Detecta nome do projeto pelo package.json ou nome da pasta. Pede confirmacao ao usuario. Cria arquivo .cam/config.json local com project_id. Mensagens claras e amigaveis para iniciantes.',
    prd_section: 'Sprint 8 - Project-First Architecture > Project Registry',
    priority: 'critical',
    tags: '["cli","onboarding","ux"]',
  },
  {
    title: 'Auto-detect de PRD.md com parse e confirmacao',
    description: 'Durante cam init, busca PRD.md ou prd.md na raiz. Se encontrar, parseia usando o structured parser existente. Exibe resumo ("Encontrei 3 sprints, 47 tasks") e pede confirmacao. Se nao encontrar, informa que pode importar depois via dashboard ou cam import.',
    prd_section: 'Sprint 8 - Project-First Architecture > Project Registry',
    priority: 'high',
    tags: '["cli","prd","parser"]',
  },
  // Section 2 - Connection Architecture (3)
  {
    title: 'Project Router middleware',
    description: 'Middleware no server que recebe eventos dos hooks e roteia para o projeto correto comparando working_directory do evento com os projetos registrados. Match por prefixo (suporta subdiretorios). Rejeita silenciosamente eventos de diretorios nao registrados.',
    prd_section: 'Sprint 8 - Project-First Architecture > Connection Architecture',
    priority: 'critical',
    tags: '["backend","server","routing"]',
  },
  {
    title: 'Simplificar session binding (working_directory direto)',
    description: 'Substituir logica de session_groups por vinculo direto working_directory para projeto. Quando SessionStart chega, o Project Router identifica o projeto e cria o binding automaticamente. Sem janelas de tempo, sem heuristicas.',
    prd_section: 'Sprint 8 - Project-First Architecture > Connection Architecture',
    priority: 'high',
    tags: '["backend","refactor","simplification"]',
  },
  {
    title: 'Remover session_groups e codigo relacionado',
    description: 'Deletar tabelas session_groups e session_group_members, remover endpoints /api/session-groups/*, remover logica de auto-grouping do event handler, remover queries relacionadas. Limpar codigo morto.',
    prd_section: 'Sprint 8 - Project-First Architecture > Connection Architecture',
    priority: 'high',
    tags: '["backend","cleanup","database"]',
  },
  // Section 3 - Hook Management (3)
  {
    title: 'Auto-instalacao de hooks via cam init',
    description: 'Detectar .claude/settings.json (global ou local), adicionar/atualizar configuracao de hooks apontando para @cam/hook. Backup do settings original antes de modificar. Verificar se hooks ja existem para nao duplicar.',
    prd_section: 'Sprint 8 - Project-First Architecture > Hook Management',
    priority: 'high',
    tags: '["cli","hooks","configuration"]',
  },
  {
    title: 'Validacao de hooks com cam doctor',
    description: 'Comando que verifica se hooks estao corretamente instalados, se o servidor esta rodando, se o projeto esta registrado. Checklist com status (check/X) para cada item. Sugestao de correcao para cada problema encontrado.',
    prd_section: 'Sprint 8 - Project-First Architecture > Hook Management',
    priority: 'medium',
    tags: '["cli","diagnostics","ux"]',
  },
  {
    title: 'Tratamento de diretorios nao registrados',
    description: 'Eventos de sessoes em diretorios sem cam init sao silenciosamente ignorados (logados em nivel debug). Sem erros, sem warnings visiveis ao usuario. Opcao futura: notificar "projeto nao monitorado detectado".',
    prd_section: 'Sprint 8 - Project-First Architecture > Hook Management',
    priority: 'medium',
    tags: '["backend","error-handling"]',
  },
  // Section 4 - Multi-Project Server (3)
  {
    title: 'API endpoints multi-projeto',
    description: 'GET /api/projects retorna projetos registrados com status ativo/inativo/arquivado, GET /api/projects/:id/summary com contadores de tasks/agents/sessions, POST /api/projects/:id/archive para arquivar. Filtros por status.',
    prd_section: 'Sprint 8 - Project-First Architecture > Multi-Project Server',
    priority: 'high',
    tags: '["backend","api","multi-project"]',
  },
  {
    title: 'SSE streams por projeto',
    description: 'Parametro project_id no endpoint SSE para filtrar eventos. Cliente recebe apenas eventos do projeto selecionado. Suporte a trocar de projeto sem reconectar (re-subscribe).',
    prd_section: 'Sprint 8 - Project-First Architecture > Multi-Project Server',
    priority: 'high',
    tags: '["backend","sse","multi-project"]',
  },
  {
    title: 'Comando cam status',
    description: 'Exibir tabela formatada com projetos registrados, sessoes ativas, ultima atividade, e saude da conexao. Indicadores visuais para status de cada projeto. Util para debug e para o usuario entender o estado do sistema.',
    prd_section: 'Sprint 8 - Project-First Architecture > Multi-Project Server',
    priority: 'medium',
    tags: '["cli","diagnostics","multi-project"]',
  },
];

// ============================================================
// Step 3: Insert Sprint 9 tasks (Dashboard Experience)
// ============================================================
console.log('\n=== Step 3: Insert Sprint 9 - Dashboard Experience (16 tasks) ===');

const sprint9Tasks = [
  // Section 1 - Multi-Project Navigation (3)
  {
    title: 'Sidebar de projetos',
    description: 'Lista lateral colapsavel com todos os projetos registrados. Cada item mostra nome, status (ativo/inativo), e contagem de tasks (completadas/total). Ordenacao: ativos primeiro, depois por ultima atividade. Botao para colapsar sidebar em modo icone.',
    prd_section: 'Sprint 9 - Dashboard Experience > Multi-Project Navigation',
    priority: 'critical',
    tags: '["frontend","dashboard","multi-project"]',
  },
  {
    title: 'Project switcher',
    description: 'Clicar em um projeto na sidebar troca todo o contexto do dashboard (kanban, agents, timeline, Agent Map). Transicao suave entre projetos. URL atualiza com project_id para permitir bookmark/compartilhamento direto.',
    prd_section: 'Sprint 9 - Dashboard Experience > Multi-Project Navigation',
    priority: 'critical',
    tags: '["frontend","dashboard","routing"]',
  },
  {
    title: 'Indicador de projeto ativo',
    description: 'Badge visual no projeto que tem sessao Claude rodando. Animacao sutil (pulse) quando eventos chegam em tempo real. Contador de agentes ativos no badge.',
    prd_section: 'Sprint 9 - Dashboard Experience > Multi-Project Navigation',
    priority: 'high',
    tags: '["frontend","dashboard","ux"]',
  },
  // Section 2 - Settings Infrastructure (3)
  {
    title: 'Unified useSettingsStore com Zustand persist',
    description: 'Consolidar configuracoes de theme-store (theme, accentColor), filter-store (followMode, hidePolling), session-store (activityWindow), e agent-map-store (displayMode, showLabels, showInteractions) em um unico store persistido. Chave localStorage cam-settings. Migrar leitura de todos os componentes para o novo store.',
    prd_section: 'Sprint 9 - Dashboard Experience > Settings Infrastructure',
    priority: 'high',
    tags: '["frontend","zustand","settings"]',
  },
  {
    title: 'SettingsModal component com navegacao por abas',
    description: 'Modal overlay com 4 abas (Aparencia, Agent Map, Activity Feed, Avancado). Layout responsivo, fecha com Escape ou click fora. Deve funcionar em todos os 3 temas com styling apropriado.',
    prd_section: 'Sprint 9 - Dashboard Experience > Settings Infrastructure',
    priority: 'high',
    tags: '["frontend","component","settings"]',
  },
  {
    title: 'Gear icon no header + atalho Ctrl+Comma',
    description: 'Substituir ThemeSwitcher e ActivityWindowSelector no header principal por um unico icone de engrenagem. Atalho de teclado Ctrl+, (padrao VS Code) para abrir o modal de qualquer lugar. Badge no icone se houver configuracao nao-default.',
    prd_section: 'Sprint 9 - Dashboard Experience > Settings Infrastructure',
    priority: 'high',
    tags: '["frontend","header","settings"]',
  },
  // Section 3 - Settings Modal Content (4)
  {
    title: 'Aba Aparencia (tema, accent color, sprite resolution)',
    description: 'Seletor de tema (Modern/Pixel/Terminal) com preview visual, color picker para accent color (8 cores pre-definidas + custom hex input), seletor de resolucao de sprites com preview ao vivo.',
    prd_section: 'Sprint 9 - Dashboard Experience > Settings Modal Content',
    priority: 'medium',
    tags: '["frontend","settings","theme"]',
  },
  {
    title: 'Aba Agent Map (labels, lines, speech bubbles)',
    description: 'Toggles para activity labels (ON/OFF), linhas de comunicacao (ON/OFF), modo de speech bubbles (Tecnico/Didatico), seletor de janela de atividade (1m/3m/5m/10m) com explicacao.',
    prd_section: 'Sprint 9 - Dashboard Experience > Settings Modal Content',
    priority: 'medium',
    tags: '["frontend","settings","agent-map"]',
  },
  {
    title: 'Aba Activity Feed (follow mode, hide polling)',
    description: 'Toggle follow mode (auto-scroll ON/OFF), toggle hide polling (esconder TaskList/TaskGet repetitivos), lista editavel de tools consideradas polling, toggle para agrupar eventos repetitivos.',
    prd_section: 'Sprint 9 - Dashboard Experience > Settings Modal Content',
    priority: 'medium',
    tags: '["frontend","settings","activity-feed"]',
  },
  {
    title: 'Aba Avancado (max eventos, timeouts, restaurar padroes)',
    description: 'Input numerico para max eventos em memoria (default 500), timeout de speech bubbles (default 5s), max linhas de comunicacao (default 5), botao Restaurar Padroes com confirmacao.',
    prd_section: 'Sprint 9 - Dashboard Experience > Settings Modal Content',
    priority: 'medium',
    tags: '["frontend","settings","advanced"]',
  },
  // Section 4 - Resizable Panels (3)
  {
    title: 'Sistema de paineis redimensionaveis',
    description: 'Integrar biblioteca de panels (react-resizable-panels) para permitir arrastar bordas entre paineis. Minimo e maximo de largura/altura por painel. Cursor visual de resize nas bordas. Double-click na borda para resetar ao tamanho default.',
    prd_section: 'Sprint 9 - Dashboard Experience > Resizable Panels',
    priority: 'high',
    tags: '["frontend","layout","ux"]',
  },
  {
    title: 'Persistencia de layout dos paineis',
    description: 'Salvar tamanhos dos paineis em localStorage (chave cam-layout). Restaurar layout ao reabrir o dashboard. Diferentes layouts salvos por view (kanban view vs agent map view). Reset para layout default nas configuracoes.',
    prd_section: 'Sprint 9 - Dashboard Experience > Resizable Panels',
    priority: 'medium',
    tags: '["frontend","persistence","layout"]',
  },
  {
    title: 'Lock/unlock de paineis',
    description: 'Toggle nas configuracoes (Aba Avancado) para travar/destravar redimensionamento. Quando travado, bordas nao sao arrastaveis e cursor nao muda. Indicador visual sutil. Atalho Ctrl+L para toggle rapido.',
    prd_section: 'Sprint 9 - Dashboard Experience > Resizable Panels',
    priority: 'medium',
    tags: '["frontend","settings","layout"]',
  },
  // Section 5 - Layout Cleanup (3)
  {
    title: 'Limpar header principal',
    description: 'Remover componentes ThemeSwitcher e ActivityWindowSelector do header. Manter apenas: logo/titulo, ConnectionIndicator, ProjectPicker, e gear icon. Resultado: header significativamente mais limpo.',
    prd_section: 'Sprint 9 - Dashboard Experience > Layout Cleanup',
    priority: 'high',
    tags: '["frontend","header","cleanup"]',
  },
  {
    title: 'Limpar Agent Map header',
    description: 'Remover toggles de Labels, Didactic/Technical, e Lines do AgentMapHeader. Componentes devem ler configuracoes diretamente do useSettingsStore. Header do mapa fica apenas com titulo + contagem de agentes.',
    prd_section: 'Sprint 9 - Dashboard Experience > Layout Cleanup',
    priority: 'high',
    tags: '["frontend","agent-map","cleanup"]',
  },
  {
    title: 'Event Timeline contextual',
    description: 'Remover Event Timeline da exibicao global persistente. Timeline so aparece como painel dedicado quando selecionado, ou como painel lateral dentro de views especificas (Agent Map, Kanban). Painel pode ser aberto/fechado pelo usuario.',
    prd_section: 'Sprint 9 - Dashboard Experience > Layout Cleanup',
    priority: 'high',
    tags: '["frontend","timeline","layout"]',
  },
];

// ============================================================
// Step 4: Insert Sprint 10 tasks (Visual Polish)
// ============================================================
console.log('\n=== Step 4: Insert Sprint 10 - Visual Polish (10 tasks) ===');

const sprint10Tasks = [
  // Section 1 - Canvas Sprite Renderer (3)
  {
    title: 'Canvas 2D sprite renderer com cache',
    description: 'Substituir CSS box-shadow por rendering via OffscreenCanvas. Funcao renderSpriteToDataUrl(pixels, gridSize, displaySize, primaryColor) que pinta pixels no canvas e retorna data URL cached. Cache key = hash de (pose + color + resolution). Usar image-rendering: pixelated/crisp-edges.',
    prd_section: 'Sprint 10 - Visual Polish > Canvas Sprite Renderer',
    priority: 'high',
    tags: '["frontend","canvas","sprites","performance"]',
  },
  {
    title: 'Sprite resolution config com lazy loading',
    description: 'Dynamic import de sprite data por resolucao (sprite-data-16.ts, sprite-data-24.ts, sprite-data-32.ts, sprite-data-48.ts). Carregar apenas o arquivo da resolucao ativa. Fallback para 16x16. Invalidar cache quando resolucao muda.',
    prd_section: 'Sprint 10 - Visual Polish > Canvas Sprite Renderer',
    priority: 'high',
    tags: '["frontend","sprites","lazy-loading"]',
  },
  {
    title: 'Atualizar PixelCharacter e AgentCard para Canvas renderer',
    description: 'Substituir generateBoxShadow por novo renderSpriteToDataUrl. Manter TODAS as animacoes CSS existentes. Manter overlays de pose. Garantir backward-compatibility: se Canvas nao disponivel, fallback para box-shadow.',
    prd_section: 'Sprint 10 - Visual Polish > Canvas Sprite Renderer',
    priority: 'high',
    tags: '["frontend","sprites","refactor"]',
  },
  // Section 2 - High-Resolution Sprite Data (4)
  {
    title: 'Sprite data 24x24 Detailed (8 poses)',
    description: 'Redesenhar todas as 8 poses em grid 24x24. Metodo hibrido: upscale dos sprites 16x16 como base + refinamento. ~150 pixels por pose. Manter mesma paleta de cores (P/S/H/D/E/K/G/W/B).',
    prd_section: 'Sprint 10 - Visual Polish > High-Resolution Sprite Data',
    priority: 'medium',
    tags: '["frontend","sprites","pixel-art"]',
  },
  {
    title: 'Sprite data 32x32 HD (8 poses)',
    description: 'Redesenhar todas as 8 poses em grid 32x32. Detalhes visiveis: expressoes faciais distintas, ferramentas detalhadas, sombreamento no corpo. ~350 pixels por pose.',
    prd_section: 'Sprint 10 - Visual Polish > High-Resolution Sprite Data',
    priority: 'medium',
    tags: '["frontend","sprites","pixel-art"]',
  },
  {
    title: 'Sprite data 48x48 Ultra (8 poses)',
    description: 'Redesenhar todas as 8 poses em grid 48x48. Nivel de detalhe maximo: rosto expressivo, ferramentas com detalhes internos, sombras projetadas, highlights de iluminacao. ~900 pixels por pose.',
    prd_section: 'Sprint 10 - Visual Polish > High-Resolution Sprite Data',
    priority: 'low',
    tags: '["frontend","sprites","pixel-art"]',
  },
  {
    title: 'Sprite preview no Settings Modal',
    description: 'Componente que renderiza um agente de exemplo na resolucao selecionada. Botao para ciclar entre as 8 poses. Comparacao lado-a-lado entre resolucao atual e selecionada. Animacao de transicao suave.',
    prd_section: 'Sprint 10 - Visual Polish > High-Resolution Sprite Data',
    priority: 'medium',
    tags: '["frontend","sprites","settings"]',
  },
  // Section 3 - Theme Integration (3)
  {
    title: 'Integrar SettingsModal nos 3 temas',
    description: 'Modern (glassmorphism, rounded corners, shadows), Pixel (pixel borders via box-shadow, Press Start 2P font, NES color palette), Terminal (box-drawing characters, green-on-black, monospace). Cada tema deve ter seu proprio wrapper de styling.',
    prd_section: 'Sprint 10 - Visual Polish > Theme Integration',
    priority: 'high',
    tags: '["frontend","themes","settings"]',
  },
  {
    title: 'Styling de paineis redimensionaveis por tema',
    description: 'Handles de resize estilizados para cada tema (sutil no Modern, pixel art no Pixel, caracteres ASCII no Terminal). Indicadores visuais de drag consistentes com o tema ativo.',
    prd_section: 'Sprint 10 - Visual Polish > Theme Integration',
    priority: 'medium',
    tags: '["frontend","themes","layout"]',
  },
  {
    title: 'Styling da sidebar de projetos por tema',
    description: 'Sidebar com visual consistente para cada tema. Modern (glassmorphism lateral), Pixel (painel NES com borda pixelada), Terminal (lista com caracteres box-drawing).',
    prd_section: 'Sprint 10 - Visual Polish > Theme Integration',
    priority: 'medium',
    tags: '["frontend","themes","sidebar"]',
  },
];

// ============================================================
// Step 5: Insert all tasks into DB
// ============================================================

const insertStmt = db.prepare(`
  INSERT INTO prd_tasks (id, project_id, sprint_id, title, description, status, priority, tags, prd_section, prd_line_start, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, 'planned', ?, ?, ?, ?, ?, ?)
`);

const timestamp = now();

const insertTasks = db.transaction((tasks, prdLineStart) => {
  let count = 0;
  for (const task of tasks) {
    insertStmt.run(
      uuid(),
      PROJECT_ID,
      MVP_SPRINT_ID,
      task.title,
      task.description,
      task.priority,
      task.tags,
      task.prd_section,
      prdLineStart,
      timestamp,
      timestamp
    );
    count++;
  }
  return count;
});

const s8Count = insertTasks(sprint8Tasks, 8);
console.log(`Inserted ${s8Count} Sprint 8 tasks.`);

const s9Count = insertTasks(sprint9Tasks, 9);
console.log(`Inserted ${s9Count} Sprint 9 tasks.`);

const s10Count = insertTasks(sprint10Tasks, 10);
console.log(`Inserted ${s10Count} Sprint 10 tasks.`);

// ============================================================
// Step 6: Update MVP sprint total_tasks count
// ============================================================
console.log('\n=== Step 6: Update MVP sprint totals ===');

const totalTasks = db.prepare(
  "SELECT COUNT(*) as cnt FROM prd_tasks WHERE sprint_id = ?"
).get(MVP_SPRINT_ID);

const completedTasks = db.prepare(
  "SELECT COUNT(*) as cnt FROM prd_tasks WHERE sprint_id = ? AND status = 'completed'"
).get(MVP_SPRINT_ID);

db.prepare(
  "UPDATE sprints SET total_tasks = ?, completed_tasks = ? WHERE id = ?"
).run(totalTasks.cnt, completedTasks.cnt, MVP_SPRINT_ID);

console.log(`MVP sprint: ${completedTasks.cnt}/${totalTasks.cnt} tasks`);

// ============================================================
// Step 7: Update project totals
// ============================================================
const projectTotal = db.prepare(
  "SELECT COUNT(*) as cnt FROM prd_tasks WHERE project_id = ?"
).get(PROJECT_ID);

const projectCompleted = db.prepare(
  "SELECT COUNT(*) as cnt FROM prd_tasks WHERE project_id = ? AND status = 'completed'"
).get(PROJECT_ID);

db.prepare(
  "UPDATE projects SET total_tasks = ?, completed_tasks = ? WHERE id = ?"
).run(projectTotal.cnt, projectCompleted.cnt, PROJECT_ID);

console.log(`Project total: ${projectCompleted.cnt}/${projectTotal.cnt} tasks`);

// ============================================================
// Verify
// ============================================================
console.log('\n=== Verification ===');

const sections = db.prepare(`
  SELECT prd_section, prd_line_start, COUNT(*) as cnt,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as done
  FROM prd_tasks
  WHERE prd_line_start >= 8
  GROUP BY prd_section
  ORDER BY prd_line_start, prd_section
`).all();

sections.forEach(s => {
  console.log(`  [line=${s.prd_line_start}] ${s.done}/${s.cnt} | ${s.prd_section}`);
});

console.log('\nDone!');
db.close();
