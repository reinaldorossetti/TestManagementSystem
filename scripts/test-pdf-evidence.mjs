const LOGIN_USERS =
  /(standard_user|locked_out_user|problem_user|performance_glitch_user|error_user|visual_user)/;

const userFromTestName = (name) => {
  const m = name.match(LOGIN_USERS);
  return m?.[1] ?? null;
};

const resolveResultsFolderFromExecution = (exec) => {
  if (exec.results_folder?.trim()) return exec.results_folder.trim();
  if (exec.results_path?.trim()) {
    const normalized = exec.results_path.replace(/\\/g, '/');
    const match = normalized.match(/(?:^|\/)results\/([^/]+)(?:\/|$)/i);
    if (match?.[1]) return match[1];
  }
  return exec.id;
};

const resolveStepScreenshotPath = (st, tc, manifest) => {
  if (st.screenshot_path) return st.screenshot_path;
  if (!manifest?.browserScreenshots?.length) return undefined;
  const shots = manifest.browserScreenshots;
  const user = userFromTestName(tc.name);
  const text = st.text.toLowerCase();
  if (st.step_type === 'WHEN' && user) return shots.find((s) => s.includes(`when-${user}`));
  if (text.includes('bloqueado') || tc.name.includes('locked_out'))
    return shots.find((s) => s.includes('then-bloqueado'));
  if (text.includes('produtos') || text.includes('area de produtos'))
    return shots.find((s) => s.includes('then-produtos'));
  if (text.includes('usuario autenticado') || text.includes('nome do usuario')) {
    if (user) return shots.find((s) => s.includes(`then-usuario-${user}`));
  }
  return undefined;
};

const base = process.argv[2] || 'http://localhost:3001';

const dbRes = await fetch(`${base}/api/database`);
const dbPayload = await dbRes.json();
const db = dbPayload.data ?? dbPayload;
const ex = db.executions[0];
if (!ex) {
  console.error('Nenhuma execução no banco.');
  process.exit(1);
}

const resultsFolder = resolveResultsFolderFromExecution(ex);
console.log('Execution:', ex.id);
console.log('Results folder:', resultsFolder);

const evidenceRes = await fetch(`${base}/api/terminal/evidence?folder=${encodeURIComponent(resultsFolder)}`);
const evidence = await evidenceRes.json();
console.log('Browser shots:', evidence.browserScreenshots?.length ?? 0);
console.log('Test reports:', Object.keys(evidence.testReports ?? {}).length);

const tc = db.test_cases.find((t) => t.execution_id === ex.id);
const caseSteps = db.steps.filter((s) => s.test_case_id === tc.id);
let loaded = 0;
let failed = 0;

for (const st of caseSteps) {
  const shotPath = resolveStepScreenshotPath(st, tc, evidence);
  if (!shotPath) {
    console.log(`  SKIP ${st.step_type}: no path`);
    continue;
  }
  const url = `${base}/api/terminal/screenshot?folder=${encodeURIComponent(resultsFolder)}&path=${encodeURIComponent(shotPath)}`;
  const res = await fetch(url);
  if (res.ok) {
    loaded++;
    console.log(`  OK ${st.step_type}: ${shotPath} (${res.headers.get('content-type')})`);
  } else {
    failed++;
    console.log(`  FAIL ${st.step_type}: ${shotPath} status=${res.status}`);
  }
}

console.log(`\nLoaded ${loaded}, failed ${failed} for first test case.`);
