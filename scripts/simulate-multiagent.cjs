/**
 * Multi-Agent Simulation for CAM Dashboard
 *
 * Simulates a realistic team of Claude Code agents working on a sprint:
 * - Team Lead (Opus 4.6) - orchestrates, creates tasks, spawns agents
 * - Researcher (Explore) - searches codebase, reads files
 * - Sprint Dev (sprint-dev) - implements features, edits files
 * - Test Writer (test-writer) - writes tests, runs them
 *
 * Usage: node scripts/simulate-multiagent.cjs
 * Requires: CAM server running on port 7860
 */

const http = require('http');
const crypto = require('crypto');

const API_URL = 'http://localhost:7860/api/events';
const WORKING_DIR = 'C:/Users/ADM/Downloads/claude-agent-monitor';

// Session IDs (each agent = separate session, like real tmux Teams)
const LEADER_SESSION = `sim-leader-${crypto.randomUUID().slice(0, 8)}`;
const RESEARCHER_SESSION = `sim-researcher-${crypto.randomUUID().slice(0, 8)}`;
const SPRINT_DEV_SESSION = `sim-sprintdev-${crypto.randomUUID().slice(0, 8)}`;
const TEST_WRITER_SESSION = `sim-testwriter-${crypto.randomUUID().slice(0, 8)}`;

let eventCount = 0;

function sendEvent(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const url = new URL(API_URL);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        eventCount++;
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          console.error(`  [ERROR] ${res.statusCode}: ${body}`);
          reject(new Error(body));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function ts(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString();
}

// ===== Event Builders =====

function sessionStart(sessionId, model = 'claude-opus-4-6') {
  return {
    hook: 'SessionStart',
    session_id: sessionId,
    agent_id: sessionId,
    timestamp: ts(),
    data: {
      working_directory: WORKING_DIR,
      model,
      session_id: sessionId,
    },
  };
}

function userPrompt(sessionId, prompt) {
  return {
    hook: 'UserPromptSubmit',
    session_id: sessionId,
    agent_id: sessionId,
    timestamp: ts(),
    data: { working_directory: WORKING_DIR },
    input: prompt,
  };
}

function toolUse(sessionId, agentId, hook, tool, input, output, durationMs) {
  const toolInput = typeof input === 'string' ? input : JSON.stringify(input);
  const toolOutput = typeof output === 'string' ? output : JSON.stringify(output);
  return {
    hook,
    session_id: sessionId,
    agent_id: agentId || sessionId,
    timestamp: ts(),
    tool,
    data: {
      tool_name: tool,
      tool_input: toolInput,
      tool_output: toolOutput,
      duration_ms: durationMs,
      working_directory: WORKING_DIR,
    },
  };
}

function preToolUse(sessionId, tool, input) {
  return toolUse(sessionId, sessionId, 'PreToolUse', tool, input, '', 0);
}

function postToolUse(sessionId, tool, input, output, duration = 50) {
  return toolUse(sessionId, sessionId, 'PostToolUse', tool, input, output, duration);
}

function taskToolUse(sessionId, name, subagentType, description) {
  return {
    hook: 'PostToolUse',
    session_id: sessionId,
    agent_id: sessionId,
    timestamp: ts(),
    tool: 'Task',
    data: {
      tool_name: 'Task',
      tool_input: JSON.stringify({ name, subagent_type: subagentType, description, prompt: description }),
      tool_output: JSON.stringify({ status: 'completed', result: 'Agent task completed successfully' }),
      duration_ms: 15000,
      working_directory: WORKING_DIR,
    },
  };
}

function taskCreate(sessionId, subject) {
  return {
    hook: 'PostToolUse',
    session_id: sessionId,
    agent_id: sessionId,
    timestamp: ts(),
    tool: 'TaskCreate',
    data: {
      tool_name: 'TaskCreate',
      tool_input: JSON.stringify({ subject, description: `Implement: ${subject}` }),
      tool_output: JSON.stringify({ id: crypto.randomUUID(), status: 'pending' }),
      subject,
      duration_ms: 20,
      working_directory: WORKING_DIR,
    },
  };
}

function taskUpdate(sessionId, taskId, status, subject) {
  return {
    hook: 'PostToolUse',
    session_id: sessionId,
    agent_id: sessionId,
    timestamp: ts(),
    tool: 'TaskUpdate',
    data: {
      tool_name: 'TaskUpdate',
      tool_input: JSON.stringify({ taskId, status, subject }),
      tool_output: JSON.stringify({ ok: true }),
      duration_ms: 15,
      working_directory: WORKING_DIR,
    },
  };
}

function sendMessage(sessionId, recipient, content) {
  return {
    hook: 'PostToolUse',
    session_id: sessionId,
    agent_id: sessionId,
    timestamp: ts(),
    tool: 'SendMessage',
    data: {
      tool_name: 'SendMessage',
      tool_input: JSON.stringify({ type: 'message', recipient, content }),
      tool_output: JSON.stringify({ delivered: true }),
      duration_ms: 30,
      working_directory: WORKING_DIR,
    },
  };
}

function teamCreate(sessionId, teamName) {
  return {
    hook: 'PostToolUse',
    session_id: sessionId,
    agent_id: sessionId,
    timestamp: ts(),
    tool: 'TeamCreate',
    data: {
      tool_name: 'TeamCreate',
      tool_input: JSON.stringify({ team_name: teamName, description: 'Sprint 12 implementation team' }),
      tool_output: JSON.stringify({ ok: true }),
      duration_ms: 100,
      working_directory: WORKING_DIR,
    },
  };
}

function errorEvent(sessionId, tool, error) {
  return {
    hook: 'PostToolUseFailure',
    session_id: sessionId,
    agent_id: sessionId,
    timestamp: ts(),
    tool,
    data: {
      tool_name: tool,
      error_message: error,
      working_directory: WORKING_DIR,
    },
  };
}

function stopEvent(sessionId) {
  return {
    hook: 'Stop',
    session_id: sessionId,
    agent_id: sessionId,
    timestamp: ts(),
    data: { working_directory: WORKING_DIR },
  };
}

function subagentStart(sessionId) {
  return {
    hook: 'SubagentStart',
    session_id: sessionId,
    agent_id: sessionId,
    timestamp: ts(),
    data: { working_directory: WORKING_DIR },
  };
}

function sessionEnd(sessionId) {
  return {
    hook: 'SessionEnd',
    session_id: sessionId,
    agent_id: sessionId,
    timestamp: ts(),
    data: { working_directory: WORKING_DIR },
  };
}

// ===== Simulation Scenarios =====

async function simulateLeader() {
  console.log('\n🎯 [Team Lead] Starting session...');

  // Session start
  await sendEvent(sessionStart(LEADER_SESSION, 'claude-opus-4-6'));
  await sleep(300);

  // User prompt
  await sendEvent(userPrompt(LEADER_SESSION, 'Implementar Sprint 12: Docs Restructure e tmux-First. Crie um time e distribua as tarefas.'));
  await sleep(500);

  // Read PRD
  console.log('  📖 Reading PRD...');
  await sendEvent(preToolUse(LEADER_SESSION, 'Read', { file_path: 'docs/PRD/PRD.md' }));
  await sleep(200);
  await sendEvent(postToolUse(LEADER_SESSION, 'Read', { file_path: 'docs/PRD/PRD.md' }, 'PRD v3.0 content...', 120));
  await sleep(300);

  // Read sprint template
  await sendEvent(preToolUse(LEADER_SESSION, 'Read', { file_path: 'docs/SPRINTS/sprint-template.md' }));
  await sleep(150);
  await sendEvent(postToolUse(LEADER_SESSION, 'Read', { file_path: 'docs/SPRINTS/sprint-template.md' }, 'Sprint template content...', 80));
  await sleep(400);

  // Create tasks
  console.log('  📋 Creating tasks...');
  const tasks = [
    'Atualizar sprint template com seção de contexto',
    'Preencher sprint files com conteúdo dos sprints',
    'Remover sprints detalhados do PRD.md',
    'Atualizar README.md para refletir codebase',
    'Implementar cam doctor verificar tmux',
    'Dashboard: aviso tracking parcial in-process',
  ];

  for (const task of tasks) {
    await sendEvent(taskCreate(LEADER_SESSION, task));
    await sleep(200);
  }

  // Create team
  console.log('  👥 Creating team...');
  await sendEvent(teamCreate(LEADER_SESSION, 'sprint-12'));
  await sleep(500);

  // Spawn researcher
  console.log('  🚀 Spawning researcher...');
  await sendEvent(taskToolUse(LEADER_SESSION, 'researcher', 'Explore', 'Pesquisar estrutura atual dos docs e sprint files'));
  await sleep(800);

  // Spawn sprint-dev
  console.log('  🚀 Spawning sprint-dev...');
  await sendEvent(taskToolUse(LEADER_SESSION, 'sprint-dev', 'sprint-dev', 'Implementar tasks 1-4 do Sprint 12'));
  await sleep(800);

  // Spawn test-writer
  console.log('  🚀 Spawning test-writer...');
  await sendEvent(taskToolUse(LEADER_SESSION, 'test-writer', 'test-writer', 'Escrever testes para cam doctor e tracking parcial'));
  await sleep(500);

  // Send messages to agents
  await sendEvent(sendMessage(LEADER_SESSION, 'researcher', 'Pesquise a estrutura dos docs/ e reporte quais sprint files estão vazios'));
  await sleep(300);
  await sendEvent(sendMessage(LEADER_SESSION, 'sprint-dev', 'Comece pelo sprint template, depois preencha os sprint files'));
  await sleep(300);
  await sendEvent(sendMessage(LEADER_SESSION, 'test-writer', 'Foque nos testes de cam doctor primeiro'));
  await sleep(400);

  // Read some files while waiting
  console.log('  📖 Reviewing architecture...');
  await sendEvent(preToolUse(LEADER_SESSION, 'Read', { file_path: 'packages/cli/src/commands/doctor.ts' }));
  await sleep(200);
  await sendEvent(postToolUse(LEADER_SESSION, 'Read', { file_path: 'packages/cli/src/commands/doctor.ts' }, 'Doctor command implementation...', 95));
  await sleep(300);

  await sendEvent(preToolUse(LEADER_SESSION, 'Glob', { pattern: 'docs/SPRINTS/*.md' }));
  await sleep(100);
  await sendEvent(postToolUse(LEADER_SESSION, 'Glob', { pattern: 'docs/SPRINTS/*.md' }, 'sprint-01.md\nsprint-02.md\n...sprint-12.md\nsprint-template.md', 45));
  await sleep(500);

  // Grep for references
  await sendEvent(preToolUse(LEADER_SESSION, 'Grep', { pattern: 'tmux', path: 'packages/' }));
  await sleep(150);
  await sendEvent(postToolUse(LEADER_SESSION, 'Grep', { pattern: 'tmux', path: 'packages/' }, 'packages/cli/src/commands/doctor.ts:15: check tmux\npackages/server/src/services/...' , 200));

  console.log('  ⏸️  Leader idle, monitoring agents...');
  await sendEvent(stopEvent(LEADER_SESSION));
}

async function simulateResearcher() {
  await sleep(2000); // Start after leader spawns it

  console.log('\n🔍 [Researcher] Starting session...');
  await sendEvent(sessionStart(RESEARCHER_SESSION, 'claude-sonnet-4-6'));
  await sleep(300);

  // Search docs structure
  console.log('  🔎 Searching docs structure...');
  const searchFiles = [
    { tool: 'Glob', input: { pattern: 'docs/**/*.md' }, output: 'docs/PRD/PRD.md\ndocs/PRD/prd-template.md\ndocs/SPRINTS/sprint-01.md\n...12 files' },
    { tool: 'Glob', input: { pattern: 'docs/SPRINTS/sprint-*.md' }, output: 'sprint-01.md through sprint-12.md + sprint-template.md' },
    { tool: 'Read', input: { file_path: 'docs/SPRINTS/sprint-01.md' }, output: '# Sprint 1 - Core Infrastructure\n\n(empty - needs content from PRD)' },
    { tool: 'Read', input: { file_path: 'docs/SPRINTS/sprint-05.md' }, output: '# Sprint 5\n\n(empty)' },
    { tool: 'Read', input: { file_path: 'docs/SPRINTS/sprint-11.md' }, output: '# Sprint 11 - Real User Polish\n\n(empty)' },
    { tool: 'Read', input: { file_path: 'docs/SPRINTS/sprint-template.md' }, output: '# Sprint N - Title\n## Tasks\n- [ ] task 1' },
    { tool: 'Grep', input: { pattern: 'Sprint \\d+', path: 'docs/PRD/PRD.md' }, output: 'Found 42 matches: Sprint 1 through Sprint 12 sections' },
    { tool: 'Read', input: { file_path: 'docs/PRD/PRD.md', limit: 100 }, output: '# CAM PRD v3.0\n## Parte 1 - O QUE\n...' },
    { tool: 'Grep', input: { pattern: 'cam doctor', path: 'packages/cli/src/' }, output: 'packages/cli/src/commands/doctor.ts:1: export function doctorCommand...' },
    { tool: 'Read', input: { file_path: 'packages/cli/src/commands/doctor.ts' }, output: 'export function doctorCommand() { /* checks */ }' },
    { tool: 'Grep', input: { pattern: 'tmux|in-process|teammateMode', path: 'packages/' }, output: '3 matches across 2 files' },
    { tool: 'Read', input: { file_path: 'README.md' }, output: '# Claude Agent Monitor (CAM)\n\nMission Control for Claude Code agents...' },
  ];

  for (const file of searchFiles) {
    await sendEvent(preToolUse(RESEARCHER_SESSION, file.tool, file.input));
    await sleep(100 + Math.random() * 200);
    await sendEvent(postToolUse(RESEARCHER_SESSION, file.tool, file.input, file.output, 50 + Math.random() * 150));
    await sleep(200 + Math.random() * 400);
  }

  // Send findings back to leader
  console.log('  📨 Reporting findings to leader...');
  await sendEvent(sendMessage(RESEARCHER_SESSION, 'team-lead', 'Pesquisa concluída: todos os 12 sprint files estão VAZIOS. Sprint template básico (sem seção de contexto). PRD.md tem todo o conteúdo dos sprints na Parte 3. README desatualizado.'));
  await sleep(300);

  // Send to sprint-dev
  await sendEvent(sendMessage(RESEARCHER_SESSION, 'sprint-dev', 'Sprint files vazios. Conteúdo está no PRD.md Parte 3 (linhas 450-900). Template precisa de seção CONTEXTO antes das TASKS.'));
  await sleep(400);

  console.log('  ✅ Researcher done, shutting down...');
  await sendEvent(stopEvent(RESEARCHER_SESSION));
  await sleep(1000);
  await sendEvent(sessionEnd(RESEARCHER_SESSION));
}

async function simulateSprintDev() {
  await sleep(3500); // Start after researcher

  console.log('\n🛠️  [Sprint Dev] Starting session...');
  await sendEvent(sessionStart(SPRINT_DEV_SESSION, 'claude-sonnet-4-6'));
  await sleep(300);

  // Phase 1: Update sprint template
  console.log('  📝 Updating sprint template...');
  await sendEvent(preToolUse(SPRINT_DEV_SESSION, 'Read', { file_path: 'docs/SPRINTS/sprint-template.md' }));
  await sleep(150);
  await sendEvent(postToolUse(SPRINT_DEV_SESSION, 'Read', { file_path: 'docs/SPRINTS/sprint-template.md' }, 'Current template content...', 60));
  await sleep(300);

  await sendEvent(preToolUse(SPRINT_DEV_SESSION, 'Edit', { file_path: 'docs/SPRINTS/sprint-template.md', old_string: '# Sprint N', new_string: '# Sprint N - Title\n\n## Contexto\n### Estado Atual\n### Pesquisa\n### Referências\n\n## Tasks' }));
  await sleep(200);
  await sendEvent(postToolUse(SPRINT_DEV_SESSION, 'Edit', { file_path: 'docs/SPRINTS/sprint-template.md' }, 'File edited successfully', 45));
  await sleep(400);

  // Phase 2: Fill sprint files (simulating a few)
  console.log('  📝 Filling sprint files...');
  const sprintFiles = [
    { name: 'sprint-01.md', title: 'Core Infrastructure', lines: 45 },
    { name: 'sprint-02.md', title: 'Agent Map', lines: 32 },
    { name: 'sprint-03.md', title: 'SSE Pilar 2', lines: 18 },
    { name: 'sprint-04.md', title: 'Agent Map v2: Mission Floor', lines: 52 },
    { name: 'sprint-05.md', title: 'Developer Experience', lines: 41 },
    { name: 'sprint-06.md', title: 'True Observability', lines: 38 },
    { name: 'sprint-07.md', title: 'Correlation Engine v2', lines: 55 },
    { name: 'sprint-08.md', title: 'Project-First Architecture', lines: 40 },
  ];

  for (const sprint of sprintFiles) {
    // Read PRD section for this sprint
    await sendEvent(preToolUse(SPRINT_DEV_SESSION, 'Grep', { pattern: `Sprint ${sprint.name.match(/\d+/)[0]}`, path: 'docs/PRD/PRD.md' }));
    await sleep(100);
    await sendEvent(postToolUse(SPRINT_DEV_SESSION, 'Grep', { pattern: `Sprint ${sprint.name.match(/\d+/)[0]}` }, `Found section: ${sprint.title}`, 80));
    await sleep(200);

    // Write sprint file
    await sendEvent(preToolUse(SPRINT_DEV_SESSION, 'Write', { file_path: `docs/SPRINTS/${sprint.name}` }));
    await sleep(150);
    await sendEvent(postToolUse(SPRINT_DEV_SESSION, 'Write', { file_path: `docs/SPRINTS/${sprint.name}` }, `Wrote ${sprint.lines} lines`, 120));
    await sleep(300);
  }

  // Phase 3: Update README
  console.log('  📝 Updating README.md...');
  await sendEvent(preToolUse(SPRINT_DEV_SESSION, 'Read', { file_path: 'README.md' }));
  await sleep(150);
  await sendEvent(postToolUse(SPRINT_DEV_SESSION, 'Read', { file_path: 'README.md' }, 'Current README content...', 90));
  await sleep(300);

  await sendEvent(preToolUse(SPRINT_DEV_SESSION, 'Edit', { file_path: 'README.md', old_string: 'old setup section', new_string: 'updated setup with tmux instructions' }));
  await sleep(200);
  await sendEvent(postToolUse(SPRINT_DEV_SESSION, 'Edit', { file_path: 'README.md' }, 'File edited successfully', 55));
  await sleep(300);

  // Phase 4: Implement cam doctor tmux check
  console.log('  🔧 Implementing cam doctor tmux check...');
  await sendEvent(preToolUse(SPRINT_DEV_SESSION, 'Read', { file_path: 'packages/cli/src/commands/doctor.ts' }));
  await sleep(150);
  await sendEvent(postToolUse(SPRINT_DEV_SESSION, 'Read', { file_path: 'packages/cli/src/commands/doctor.ts' }, 'Doctor command code...', 75));
  await sleep(300);

  await sendEvent(preToolUse(SPRINT_DEV_SESSION, 'Edit', { file_path: 'packages/cli/src/commands/doctor.ts' }));
  await sleep(200);
  await sendEvent(postToolUse(SPRINT_DEV_SESSION, 'Edit', { file_path: 'packages/cli/src/commands/doctor.ts' }, 'Added tmux check to doctor command', 60));
  await sleep(300);

  // Run build to check
  console.log('  🔨 Building...');
  await sendEvent(preToolUse(SPRINT_DEV_SESSION, 'Bash', { command: 'pnpm --filter @claudecam/cli build' }));
  await sleep(500);
  await sendEvent(postToolUse(SPRINT_DEV_SESSION, 'Bash', { command: 'pnpm --filter @claudecam/cli build' }, 'Build successful ✓', 3200));
  await sleep(400);

  // Simulate a build error and fix
  console.log('  ❌ Build error! Fixing...');
  await sendEvent(preToolUse(SPRINT_DEV_SESSION, 'Bash', { command: 'pnpm typecheck' }));
  await sleep(400);
  await sendEvent(errorEvent(SPRINT_DEV_SESSION, 'Bash', 'Type error: Property tmuxAvailable does not exist on type DoctorResult'));
  await sleep(500);

  // Fix the error
  await sendEvent(preToolUse(SPRINT_DEV_SESSION, 'Read', { file_path: 'packages/shared/src/types/cli.ts' }));
  await sleep(150);
  await sendEvent(postToolUse(SPRINT_DEV_SESSION, 'Read', { file_path: 'packages/shared/src/types/cli.ts' }, 'DoctorResult type...', 60));
  await sleep(200);

  await sendEvent(preToolUse(SPRINT_DEV_SESSION, 'Edit', { file_path: 'packages/shared/src/types/cli.ts' }));
  await sleep(200);
  await sendEvent(postToolUse(SPRINT_DEV_SESSION, 'Edit', { file_path: 'packages/shared/src/types/cli.ts' }, 'Added tmuxAvailable to DoctorResult', 40));
  await sleep(300);

  // Rebuild
  await sendEvent(preToolUse(SPRINT_DEV_SESSION, 'Bash', { command: 'pnpm build' }));
  await sleep(600);
  await sendEvent(postToolUse(SPRINT_DEV_SESSION, 'Bash', { command: 'pnpm build' }, 'All packages built successfully ✓', 8500));
  await sleep(400);

  // Phase 5: Dashboard warning for in-process mode
  console.log('  🖥️  Adding in-process tracking warning...');
  await sendEvent(preToolUse(SPRINT_DEV_SESSION, 'Read', { file_path: 'packages/dashboard/src/components/themes/modern/ModernShell.tsx' }));
  await sleep(150);
  await sendEvent(postToolUse(SPRINT_DEV_SESSION, 'Read', { file_path: 'packages/dashboard/src/components/themes/modern/ModernShell.tsx' }, 'ModernShell component...', 110));
  await sleep(300);

  await sendEvent(preToolUse(SPRINT_DEV_SESSION, 'Edit', { file_path: 'packages/dashboard/src/components/themes/modern/ModernShell.tsx' }));
  await sleep(200);
  await sendEvent(postToolUse(SPRINT_DEV_SESSION, 'Edit', { file_path: 'packages/dashboard/src/components/themes/modern/ModernShell.tsx' }, 'Added InProcessWarning component', 55));
  await sleep(300);

  // Report completion
  console.log('  📨 Reporting to leader...');
  await sendEvent(sendMessage(SPRINT_DEV_SESSION, 'team-lead', 'Sprint 12 tasks 1-6 implementados: template atualizado, 8 sprint files preenchidos, README atualizado, cam doctor com check tmux, warning in-process no dashboard. Build passou.'));
  await sleep(400);

  // Mark tasks completed
  await sendEvent(taskUpdate(SPRINT_DEV_SESSION, '1', 'completed', 'Atualizar sprint template com seção de contexto'));
  await sleep(200);
  await sendEvent(taskUpdate(SPRINT_DEV_SESSION, '2', 'completed', 'Preencher sprint files com conteúdo dos sprints'));
  await sleep(200);
  await sendEvent(taskUpdate(SPRINT_DEV_SESSION, '4', 'completed', 'Atualizar README.md para refletir codebase'));
  await sleep(200);
  await sendEvent(taskUpdate(SPRINT_DEV_SESSION, '5', 'completed', 'Implementar cam doctor verificar tmux'));
  await sleep(200);
  await sendEvent(taskUpdate(SPRINT_DEV_SESSION, '6', 'completed', 'Dashboard: aviso tracking parcial in-process'));
  await sleep(300);

  console.log('  ✅ Sprint Dev done!');
  await sendEvent(stopEvent(SPRINT_DEV_SESSION));
}

async function simulateTestWriter() {
  await sleep(5000); // Start later

  console.log('\n🧪 [Test Writer] Starting session...');
  await sendEvent(sessionStart(TEST_WRITER_SESSION, 'claude-haiku-4-5-20251001'));
  await sleep(300);

  // Research existing tests
  console.log('  🔎 Researching existing tests...');
  await sendEvent(preToolUse(TEST_WRITER_SESSION, 'Glob', { pattern: 'packages/cli/src/**/*.test.ts' }));
  await sleep(100);
  await sendEvent(postToolUse(TEST_WRITER_SESSION, 'Glob', { pattern: 'packages/cli/src/**/*.test.ts' }, 'doctor.test.ts\ninit.test.ts', 40));
  await sleep(200);

  await sendEvent(preToolUse(TEST_WRITER_SESSION, 'Read', { file_path: 'packages/cli/src/commands/doctor.test.ts' }));
  await sleep(150);
  await sendEvent(postToolUse(TEST_WRITER_SESSION, 'Read', { file_path: 'packages/cli/src/commands/doctor.test.ts' }, 'Existing doctor tests...', 70));
  await sleep(300);

  // Read the implementation to test
  await sendEvent(preToolUse(TEST_WRITER_SESSION, 'Read', { file_path: 'packages/cli/src/commands/doctor.ts' }));
  await sleep(150);
  await sendEvent(postToolUse(TEST_WRITER_SESSION, 'Read', { file_path: 'packages/cli/src/commands/doctor.ts' }, 'Doctor command with tmux check...', 80));
  await sleep(300);

  // Write tests for cam doctor tmux check
  console.log('  📝 Writing tmux check tests...');
  await sendEvent(preToolUse(TEST_WRITER_SESSION, 'Edit', { file_path: 'packages/cli/src/commands/doctor.test.ts' }));
  await sleep(200);
  await sendEvent(postToolUse(TEST_WRITER_SESSION, 'Edit', { file_path: 'packages/cli/src/commands/doctor.test.ts' }, 'Added 4 new test cases for tmux detection', 55));
  await sleep(400);

  // Write tests for in-process warning
  console.log('  📝 Writing dashboard warning tests...');
  await sendEvent(preToolUse(TEST_WRITER_SESSION, 'Glob', { pattern: 'packages/dashboard/src/**/*.test.{ts,tsx}' }));
  await sleep(100);
  await sendEvent(postToolUse(TEST_WRITER_SESSION, 'Glob', { pattern: 'packages/dashboard/src/**/*.test.{ts,tsx}' }, '0 files found', 35));
  await sleep(200);

  await sendEvent(preToolUse(TEST_WRITER_SESSION, 'Write', { file_path: 'packages/dashboard/src/components/InProcessWarning.test.tsx' }));
  await sleep(200);
  await sendEvent(postToolUse(TEST_WRITER_SESSION, 'Write', { file_path: 'packages/dashboard/src/components/InProcessWarning.test.tsx' }, 'Created test file with 3 test cases', 90));
  await sleep(400);

  // Run tests
  console.log('  🧪 Running tests...');
  await sendEvent(preToolUse(TEST_WRITER_SESSION, 'Bash', { command: 'pnpm --filter @claudecam/cli test -- --grep "doctor"' }));
  await sleep(600);
  await sendEvent(postToolUse(TEST_WRITER_SESSION, 'Bash', { command: 'pnpm --filter @claudecam/cli test -- --grep "doctor"' }, 'Tests: 4 passed, 0 failed ✓', 4500));
  await sleep(400);

  // Test fails first time
  await sendEvent(preToolUse(TEST_WRITER_SESSION, 'Bash', { command: 'pnpm --filter @claudecam/cli test' }));
  await sleep(500);
  await sendEvent(errorEvent(TEST_WRITER_SESSION, 'Bash', 'Test failed: expected tmuxAvailable to be false when tmux is not in PATH'));
  await sleep(400);

  // Fix test
  console.log('  🔧 Fixing failing test...');
  await sendEvent(preToolUse(TEST_WRITER_SESSION, 'Edit', { file_path: 'packages/cli/src/commands/doctor.test.ts' }));
  await sleep(200);
  await sendEvent(postToolUse(TEST_WRITER_SESSION, 'Edit', { file_path: 'packages/cli/src/commands/doctor.test.ts' }, 'Fixed mock for PATH without tmux', 45));
  await sleep(300);

  // Re-run tests
  await sendEvent(preToolUse(TEST_WRITER_SESSION, 'Bash', { command: 'pnpm --filter @claudecam/cli test' }));
  await sleep(500);
  await sendEvent(postToolUse(TEST_WRITER_SESSION, 'Bash', { command: 'pnpm --filter @claudecam/cli test' }, 'Tests: 12 passed, 0 failed ✓', 5200));
  await sleep(300);

  // Report to leader
  console.log('  📨 Reporting to leader...');
  await sendEvent(sendMessage(TEST_WRITER_SESSION, 'team-lead', 'Testes prontos: 4 testes cam doctor tmux + 3 testes InProcessWarning. Todos passando. Um bug encontrado e corrigido no mock do PATH.'));
  await sleep(300);

  console.log('  ✅ Test Writer done!');
  await sendEvent(stopEvent(TEST_WRITER_SESSION));
  await sleep(1000);
  await sendEvent(sessionEnd(TEST_WRITER_SESSION));
}

// ===== Leader Phase 2: Review & Complete =====

async function simulateLeaderPhase2() {
  await sleep(18000); // After all agents report

  console.log('\n🎯 [Team Lead] Phase 2: Reviewing results...');

  // Wake leader up with new prompt
  await sendEvent(userPrompt(LEADER_SESSION, 'Revisar o trabalho dos agentes e finalizar o sprint'));
  await sleep(500);

  // Review sprint files
  await sendEvent(preToolUse(LEADER_SESSION, 'Glob', { pattern: 'docs/SPRINTS/sprint-*.md' }));
  await sleep(100);
  await sendEvent(postToolUse(LEADER_SESSION, 'Glob', { pattern: 'docs/SPRINTS/sprint-*.md' }, '12 sprint files found, all non-empty ✓', 40));
  await sleep(300);

  await sendEvent(preToolUse(LEADER_SESSION, 'Read', { file_path: 'docs/SPRINTS/sprint-template.md' }));
  await sleep(150);
  await sendEvent(postToolUse(LEADER_SESSION, 'Read', { file_path: 'docs/SPRINTS/sprint-template.md' }, 'Updated template with Contexto section ✓', 70));
  await sleep(300);

  // Verify build
  console.log('  🔨 Verifying full build...');
  await sendEvent(preToolUse(LEADER_SESSION, 'Bash', { command: 'pnpm build && pnpm typecheck' }));
  await sleep(800);
  await sendEvent(postToolUse(LEADER_SESSION, 'Bash', { command: 'pnpm build && pnpm typecheck' }, 'Build: OK ✓\nTypecheck: OK ✓', 12000));
  await sleep(400);

  // Git operations
  console.log('  📦 Committing changes...');
  await sendEvent(preToolUse(LEADER_SESSION, 'Bash', { command: 'git status' }));
  await sleep(200);
  await sendEvent(postToolUse(LEADER_SESSION, 'Bash', { command: 'git status' }, 'modified: 14 files, 2 new files', 150));
  await sleep(300);

  await sendEvent(preToolUse(LEADER_SESSION, 'Bash', { command: 'git add -A && git commit -m "feat: Sprint 12 - Docs Restructure & tmux-First"' }));
  await sleep(300);
  await sendEvent(postToolUse(LEADER_SESSION, 'Bash', { command: 'git commit' }, '[main abc1234] feat: Sprint 12 - Docs Restructure & tmux-First\n 16 files changed, 482 insertions(+), 127 deletions(-)', 2500));
  await sleep(400);

  // Final task update
  await sendEvent(taskUpdate(LEADER_SESSION, '3', 'completed', 'Remover sprints detalhados do PRD.md'));
  await sleep(200);

  // Send shutdown to agents
  console.log('  🔄 Shutting down team...');
  await sendEvent(sendMessage(LEADER_SESSION, 'sprint-dev', 'Sprint 12 completo! Obrigado pelo trabalho. Shutdown.'));
  await sleep(500);

  console.log('  ✅ Sprint 12 simulation complete!');
  await sendEvent(stopEvent(LEADER_SESSION));

  // End all remaining sessions
  await sleep(1000);
  await sendEvent(sessionEnd(SPRINT_DEV_SESSION));
  await sleep(300);
  await sendEvent(sessionEnd(LEADER_SESSION));
}

// ===== Main =====

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  CAM Multi-Agent Simulation                     ║');
  console.log('║  Sprint 12: Docs Restructure & tmux-First       ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║  Agents:                                        ║');
  console.log('║  🎯 Team Lead    (Opus 4.6)   - orchestrate     ║');
  console.log('║  🔍 Researcher   (Sonnet 4.6) - explore code    ║');
  console.log('║  🛠️  Sprint Dev   (Sonnet 4.6) - implement       ║');
  console.log('║  🧪 Test Writer  (Haiku 4.5)  - write tests     ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`\nServer: ${API_URL}`);
  console.log(`Sessions: ${LEADER_SESSION.slice(0, 20)}... (+ 3 more)\n`);

  // Verify server is up
  try {
    await sendEvent({ hook: 'SessionStart', session_id: 'sim-ping', data: { working_directory: WORKING_DIR } });
    // Clean up ping session
    await sendEvent({ hook: 'SessionEnd', session_id: 'sim-ping', data: { working_directory: WORKING_DIR } });
    console.log('✅ Server connection verified!\n');
    eventCount = 0; // Reset count after ping
  } catch (err) {
    console.error('❌ Cannot connect to CAM server on port 7860!');
    console.error('   Run: pnpm dev');
    process.exit(1);
  }

  // Run all agents in parallel (like real Teams)
  await Promise.all([
    simulateLeader(),
    simulateResearcher(),
    simulateSprintDev(),
    simulateTestWriter(),
    simulateLeaderPhase2(),
  ]);

  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║  ✅ Simulation Complete!                          ║`);
  console.log(`║  Total events sent: ${String(eventCount).padEnd(28)}║`);
  console.log(`║  Open dashboard: http://localhost:7861            ║`);
  console.log(`╚══════════════════════════════════════════════════╝`);
}

main().catch(err => {
  console.error('Simulation failed:', err.message);
  process.exit(1);
});
