const path = require('path');
const Database = require(path.join(__dirname, '..', 'packages', 'server', 'node_modules', 'better-sqlite3'));
const crypto = require('crypto');

const dbPath = path.join(__dirname, '..', 'packages', 'server', 'cam-data.db');
const db = new Database(dbPath);

const PROJECT_ID = 'b9f55006-36fe-4d98-a2ce-9f59064d7fee';
const SPRINT_ID = 'f44082d6-5cb7-4bbc-b049-259dc9731842';
const BACKLOG_SPRINT_ID = '7c782714-5925-4b15-8fea-66c4d074caa0';
const SECTION = 'Sprint 8 - Settings & Visual Polish';
const PRD_LINE_START = 8;
const now = new Date().toISOString();

function uuid() { return crypto.randomUUID(); }

const tasks = [
  // Section 1 - Settings Infrastructure (3 tasks)
  {
    id: uuid(),
    title: 'Unified useSettingsStore com Zustand persist',
    description: 'Consolidar configuracoes de theme-store (theme, accentColor), filter-store (followMode, hidePolling), session-store (activityWindow), e agent-map-store (displayMode, showLabels, showInteractions) em um unico store persistido. Chave localStorage cam-settings. Migrar leitura de todos os componentes para o novo store.',
    priority: 'high',
    complexity: 6,
    tags: JSON.stringify(['settings', 'zustand', 'infrastructure']),
    prd_section: SECTION + ' > Settings Infrastructure',
  },
  {
    id: uuid(),
    title: 'SettingsModal component com navegacao por abas',
    description: 'Modal overlay com 4 abas (Aparencia, Agent Map, Activity Feed, Avancado). Layout responsivo, fecha com Escape ou click fora. Deve funcionar em todos os 3 temas com styling apropriado.',
    priority: 'high',
    complexity: 7,
    tags: JSON.stringify(['settings', 'modal', 'ui']),
    prd_section: SECTION + ' > Settings Infrastructure',
  },
  {
    id: uuid(),
    title: 'Gear icon no header + atalho Ctrl+Comma',
    description: 'Substituir ThemeSwitcher e ActivityWindowSelector no header principal por um unico icone de engrenagem. Atalho de teclado Ctrl+, (padrao VS Code) para abrir o modal de qualquer lugar.',
    priority: 'medium',
    complexity: 4,
    tags: JSON.stringify(['settings', 'header', 'keyboard']),
    prd_section: SECTION + ' > Settings Infrastructure',
  },

  // Section 2 - Settings Modal Content (4 tasks)
  {
    id: uuid(),
    title: 'Aba Aparencia: tema, accent color, sprite detail',
    description: 'Seletor de tema (Modern/Pixel/Terminal) com preview visual, color picker para accent color (8 cores pre-definidas + custom hex input), seletor de resolucao de sprites (Classic 16x16, Detailed 24x24, HD 32x32, Ultra 48x48) com preview ao vivo.',
    priority: 'high',
    complexity: 6,
    tags: JSON.stringify(['settings', 'theme', 'appearance']),
    prd_section: SECTION + ' > Settings Modal Content',
  },
  {
    id: uuid(),
    title: 'Aba Agent Map: labels, lines, speech bubbles, activity window',
    description: 'Toggles para activity labels (ON/OFF), linhas de comunicacao (ON/OFF), modo de speech bubbles (Tecnico/Didatico), seletor de janela de atividade (1m/3m/5m/10m) com explicacao de cada valor.',
    priority: 'medium',
    complexity: 5,
    tags: JSON.stringify(['settings', 'agent-map', 'configuration']),
    prd_section: SECTION + ' > Settings Modal Content',
  },
  {
    id: uuid(),
    title: 'Aba Activity Feed: follow mode, hide polling, polling tools',
    description: 'Toggle follow mode (auto-scroll ON/OFF), toggle hide polling (esconder TaskList/TaskGet repetitivos), lista editavel de tools consideradas polling, toggle para agrupar eventos repetitivos consecutivos.',
    priority: 'medium',
    complexity: 5,
    tags: JSON.stringify(['settings', 'activity-feed', 'configuration']),
    prd_section: SECTION + ' > Settings Modal Content',
  },
  {
    id: uuid(),
    title: 'Aba Avancado: max eventos, timeouts, restaurar padroes',
    description: 'Input numerico para max eventos em memoria (default 500), timeout de speech bubbles (default 5s), max linhas de comunicacao simultaneas (default 5), botao Restaurar Padroes com confirmacao.',
    priority: 'low',
    complexity: 4,
    tags: JSON.stringify(['settings', 'advanced', 'configuration']),
    prd_section: SECTION + ' > Settings Modal Content',
  },

  // Section 3 - Header Cleanup & Theme Integration (3 tasks)
  {
    id: uuid(),
    title: 'Limpar header principal',
    description: 'Remover componentes ThemeSwitcher e ActivityWindowSelector do header. Manter apenas: logo/titulo, ConnectionIndicator, SessionPicker, ProjectSelector (ViewMode), e novo gear icon. Resultado: header significativamente mais limpo.',
    priority: 'high',
    complexity: 4,
    tags: JSON.stringify(['header', 'cleanup', 'ui']),
    prd_section: SECTION + ' > Header Cleanup & Theme Integration',
  },
  {
    id: uuid(),
    title: 'Limpar Agent Map header',
    description: 'Remover toggles de Labels, Didactic/Technical, e Lines do AgentMapHeader. Componentes devem ler configuracoes diretamente do useSettingsStore. Header do mapa fica apenas com titulo + contagem de agentes.',
    priority: 'medium',
    complexity: 3,
    tags: JSON.stringify(['agent-map', 'header', 'cleanup']),
    prd_section: SECTION + ' > Header Cleanup & Theme Integration',
  },
  {
    id: uuid(),
    title: 'Integrar SettingsModal nos 3 temas',
    description: 'Modern (glassmorphism, rounded corners, shadows), Pixel (pixel borders via box-shadow, Press Start 2P font, NES color palette), Terminal (box-drawing characters, green-on-black, monospace). Cada tema deve ter seu proprio wrapper de styling para o modal.',
    priority: 'high',
    complexity: 7,
    tags: JSON.stringify(['themes', 'modal', 'integration']),
    prd_section: SECTION + ' > Header Cleanup & Theme Integration',
  },

  // Section 4 - Canvas Sprite Renderer (3 tasks)
  {
    id: uuid(),
    title: 'Canvas 2D sprite renderer com cache',
    description: 'Substituir CSS box-shadow por rendering via OffscreenCanvas. Funcao renderSpriteToDataUrl(pixels, gridSize, displaySize, primaryColor) que pinta pixels no canvas e retorna data URL cached. Cache key = hash de (pose + color + resolution). Usar image-rendering: pixelated para pixels nitidos.',
    priority: 'critical',
    complexity: 7,
    tags: JSON.stringify(['sprites', 'canvas', 'renderer', 'performance']),
    prd_section: SECTION + ' > Canvas Sprite Renderer',
  },
  {
    id: uuid(),
    title: 'Sprite resolution config com lazy loading',
    description: 'Dynamic import de sprite data por resolucao (sprite-data-16.ts, sprite-data-24.ts, sprite-data-32.ts, sprite-data-48.ts). Carregar apenas o arquivo da resolucao ativa. Fallback para 16x16 se resolucao maior nao disponivel. Invalidar cache quando resolucao muda.',
    priority: 'high',
    complexity: 5,
    tags: JSON.stringify(['sprites', 'lazy-loading', 'configuration']),
    prd_section: SECTION + ' > Canvas Sprite Renderer',
  },
  {
    id: uuid(),
    title: 'Atualizar PixelCharacter e AgentCard para Canvas renderer',
    description: 'Substituir generateBoxShadow por novo renderSpriteToDataUrl. Manter TODAS as animacoes CSS existentes (aplicadas no container). Manter overlays de pose (coding particles, terminal cursor, confetti, zzz). Fallback para box-shadow se Canvas nao disponivel.',
    priority: 'high',
    complexity: 6,
    tags: JSON.stringify(['sprites', 'components', 'migration']),
    prd_section: SECTION + ' > Canvas Sprite Renderer',
  },

  // Section 5 - High-Resolution Sprite Data (4 tasks)
  {
    id: uuid(),
    title: 'Sprite data 24x24 Detailed (8 poses)',
    description: 'Redesenhar todas as 8 poses (IDLE, CODING, READING, TERMINAL, TALKING, SEARCHING, MANAGING, CELEBRATING) em grid 24x24. Metodo hibrido: upscale dos sprites 16x16 como base + refinamento com detalhes adicionais. ~150 pixels por pose. Mesma paleta de cores (P/S/H/D/E/K/G/W/B).',
    priority: 'high',
    complexity: 8,
    tags: JSON.stringify(['sprites', 'pixel-art', '24x24']),
    prd_section: SECTION + ' > High-Resolution Sprite Data',
  },
  {
    id: uuid(),
    title: 'Sprite data 32x32 HD (8 poses)',
    description: 'Redesenhar todas as 8 poses em grid 32x32. Detalhes visiveis: expressoes faciais, ferramentas detalhadas (teclado, livro, monitor), sombreamento no corpo, roupas com textura. ~350 pixels por pose.',
    priority: 'medium',
    complexity: 9,
    tags: JSON.stringify(['sprites', 'pixel-art', '32x32']),
    prd_section: SECTION + ' > High-Resolution Sprite Data',
  },
  {
    id: uuid(),
    title: 'Sprite data 48x48 Ultra (8 poses)',
    description: 'Redesenhar todas as 8 poses em grid 48x48. Nivel de detalhe maximo: rosto expressivo, ferramentas com detalhes internos, sombras projetadas, highlights de iluminacao, acessorios por pose. ~900 pixels por pose.',
    priority: 'medium',
    complexity: 10,
    tags: JSON.stringify(['sprites', 'pixel-art', '48x48']),
    prd_section: SECTION + ' > High-Resolution Sprite Data',
  },
  {
    id: uuid(),
    title: 'Sprite preview no Settings Modal',
    description: 'Componente que renderiza um agente de exemplo na resolucao selecionada. Botao para ciclar entre as 8 poses. Comparacao lado-a-lado entre resolucao atual e selecionada. Animacao de transicao suave ao trocar resolucao.',
    priority: 'medium',
    complexity: 5,
    tags: JSON.stringify(['sprites', 'settings', 'preview']),
    prd_section: SECTION + ' > High-Resolution Sprite Data',
  },
];

// Insert all tasks
const insertTask = db.prepare(`
  INSERT INTO prd_tasks (id, project_id, sprint_id, title, description, status, priority, complexity, tags, prd_section, prd_line_start, created_at, updated_at, depends_on, blocked_by)
  VALUES (?, ?, ?, ?, ?, 'planned', ?, ?, ?, ?, ?, ?, ?, '[]', '[]')
`);

const insertMany = db.transaction((taskList) => {
  for (const t of taskList) {
    insertTask.run(
      t.id, PROJECT_ID, SPRINT_ID,
      t.title, t.description,
      t.priority, t.complexity, t.tags,
      t.prd_section, PRD_LINE_START,
      now, now
    );
  }
});

insertMany(tasks);
console.log(`Inserted ${tasks.length} Sprint 8 tasks`);

// Update sprint total_tasks
db.prepare('UPDATE sprints SET total_tasks = total_tasks + ? WHERE id = ?').run(tasks.length, SPRINT_ID);
const sprint = db.prepare('SELECT total_tasks, completed_tasks FROM sprints WHERE id = ?').get(SPRINT_ID);
console.log(`Sprint MVP: ${sprint.total_tasks} total, ${sprint.completed_tasks} completed`);

// Update project total_tasks
db.prepare('UPDATE projects SET total_tasks = total_tasks + ? WHERE id = ?').run(tasks.length, PROJECT_ID);
const project = db.prepare('SELECT total_tasks, completed_tasks FROM projects WHERE id = ?').get(PROJECT_ID);
console.log(`Project: ${project.total_tasks} total, ${project.completed_tasks} completed`);

// Handle 'Theme customization' backlog task - mark completed since Sprint 8 covers it
const themeTask = db.prepare("SELECT id, title, status FROM prd_tasks WHERE title LIKE '%Theme customization%'").get();
if (themeTask) {
  db.prepare("UPDATE prd_tasks SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?").run(now, now, themeTask.id);
  db.prepare('UPDATE sprints SET completed_tasks = completed_tasks + 1 WHERE id = ?').run(BACKLOG_SPRINT_ID);
  db.prepare('UPDATE projects SET completed_tasks = completed_tasks + 1 WHERE id = ?').run(PROJECT_ID);
  console.log(`Marked backlog task as completed: ${themeTask.title}`);
}

// Verify
const s8tasks = db.prepare("SELECT prd_section, COUNT(*) as cnt FROM prd_tasks WHERE prd_section LIKE 'Sprint 8%' GROUP BY prd_section ORDER BY prd_section").all();
console.log('\nSprint 8 sections:');
s8tasks.forEach(s => console.log(`  ${s.prd_section} (${s.cnt} tasks)`));

const allSections = db.prepare("SELECT DISTINCT prd_line_start, SUBSTR(prd_section, 1, INSTR(prd_section || ' >', ' >') - 1) as sprint_name, COUNT(*) as cnt FROM prd_tasks WHERE sprint_id = ? GROUP BY prd_line_start ORDER BY prd_line_start").all(SPRINT_ID);
console.log('\nAll MVP sections:');
allSections.forEach(s => console.log(`  [${s.prd_line_start}] ${s.sprint_name} (${s.cnt} tasks)`));

db.close();
console.log('\nDone!');
