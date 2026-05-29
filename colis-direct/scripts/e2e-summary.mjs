import fs from 'node:fs';
import path from 'node:path';

const resultsPath = path.resolve('test-results/e2e-results.json');
const outputPath = path.resolve('test-results/e2e-summary.md');

function ensureOutputDir() {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
}

function readResults() {
  if (!fs.existsSync(resultsPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
}

function walkSuites(suites, tests = []) {
  for (const suite of suites || []) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        tests.push({
          title: [...(suite.title ? [suite.title] : []), spec.title].filter(Boolean).join(' > '),
          project: test.projectName,
          expectedStatus: test.expectedStatus,
          outcomes: test.results || [],
        });
      }
    }
    walkSuites(suite.suites, tests);
  }
  return tests;
}

function statusFor(test) {
  if (test.outcomes.length === 0) return 'skipped';
  const last = test.outcomes[test.outcomes.length - 1];
  return last.status || 'unknown';
}

function formatDuration(ms = 0) {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function stripAnsi(value = '') {
  return value.replace(/\u001b\[[0-9;]*m/g, '');
}

function firstError(test) {
  for (const result of test.outcomes) {
    if (result.error?.message) return stripAnsi(result.error.message);
    if (Array.isArray(result.errors) && result.errors[0]?.message) {
      return stripAnsi(result.errors[0].message);
    }
  }
  return '';
}

function attachmentBody(test, name) {
  for (const result of test.outcomes) {
    for (const attachment of result.attachments || []) {
      if (attachment.name !== name || !attachment.body) continue;
      return Buffer.from(attachment.body, 'base64').toString('utf8');
    }
  }
  return '';
}

function main() {
  ensureOutputDir();
  const data = readResults();

  if (!data) {
    fs.writeFileSync(outputPath, '# Rapport E2E staging\n\nAucun resultat Playwright trouve.\n');
    console.log(`Resume E2E genere: ${outputPath}`);
    return;
  }

  const tests = walkSuites(data.suites);
  const counts = tests.reduce(
    (acc, test) => {
      const status = statusFor(test);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {},
  );

  const failed = tests.filter((test) => ['failed', 'timedOut', 'interrupted'].includes(statusFor(test)));
  const skipped = tests.filter((test) => statusFor(test) === 'skipped');

  const lines = [
    '# Rapport E2E staging',
    '',
    `Genere le ${new Date().toLocaleString('fr-FR')}`,
    '',
    '## Synthese',
    '',
    `- Total: ${tests.length}`,
    `- Reussis: ${counts.passed || 0}`,
    `- Echoues: ${(counts.failed || 0) + (counts.timedOut || 0) + (counts.interrupted || 0)}`,
    `- Skippes: ${skipped.length}`,
    '',
  ];

  if (failed.length > 0) {
    lines.push('## Problemes detectes', '');
    for (const test of failed) {
      const last = test.outcomes[test.outcomes.length - 1] || {};
      lines.push(`- ${test.title} [${test.project}]`);
      lines.push(`  - Statut: ${statusFor(test)}`);
      lines.push(`  - Duree: ${formatDuration(last.duration || 0)}`);
      const error = firstError(test).split('\n').slice(0, 6).join('\n');
      if (error) {
        lines.push('  - Erreur:');
        lines.push('```text');
        lines.push(error);
        lines.push('```');
      }
      const criticalIssues = attachmentBody(test, 'browser-critical-issues');
      if (criticalIssues) {
        lines.push('  - Diagnostics navigateur:');
        lines.push('```json');
        lines.push(criticalIssues);
        lines.push('```');
      }
    }
    lines.push('');
  }

  if (skipped.length > 0) {
    lines.push('## Tests non actifs', '');
    for (const test of skipped) {
      lines.push(`- ${test.title} [${test.project}]`);
    }
    lines.push('');
  }

  lines.push('## Rapports utiles', '');
  lines.push('- Rapport HTML: `playwright-report/index.html`');
  lines.push('- Resultats JSON: `test-results/e2e-results.json`');
  lines.push('- Traces/screenshots/videos: `test-results/`');
  lines.push('');

  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`);
  console.log(`Resume E2E genere: ${outputPath}`);
}

main();
