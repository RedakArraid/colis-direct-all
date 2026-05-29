import { expect, type Page, type TestInfo } from '@playwright/test';

interface BrowserIssue {
  type: 'console-error' | 'page-error' | 'http-5xx';
  message: string;
  url?: string;
  status?: number;
}

interface BrowserWarning {
  type: 'http-4xx' | 'tls-console-warning';
  message: string;
  url?: string;
  status?: number;
}

const ignoredConsoleFragments = [
  'Download the React DevTools',
];

const warningConsoleFragments = [
  'An SSL certificate error occurred when fetching the script.',
];

export function collectBrowserDiagnostics(page: Page) {
  const issues: BrowserIssue[] = [];
  const warnings: BrowserWarning[] = [];

  page.on('console', (message) => {
    if (message.type() !== 'error') return;

    const text = message.text();
    if (ignoredConsoleFragments.some((fragment) => text.includes(fragment))) return;

    if (warningConsoleFragments.some((fragment) => text.includes(fragment))) {
      warnings.push({
        type: 'tls-console-warning',
        message: text,
        url: message.location().url,
      });
      return;
    }

    issues.push({
      type: 'console-error',
      message: text,
      url: message.location().url,
    });
  });

  page.on('pageerror', (error) => {
    issues.push({
      type: 'page-error',
      message: error.message,
    });
  });

  page.on('response', (response) => {
    const status = response.status();
    if (status >= 500) {
      issues.push({
        type: 'http-5xx',
        message: `${status} ${response.statusText()}`,
        status,
        url: response.url(),
      });
      return;
    }

    if (status >= 400) {
      warnings.push({
        type: 'http-4xx',
        message: `${status} ${response.statusText()}`,
        status,
        url: response.url(),
      });
    }
  });

  return {
    issues,
    warnings,
    async attach(testInfo: TestInfo) {
      if (issues.length > 0) {
        await testInfo.attach('browser-critical-issues', {
          body: JSON.stringify(issues, null, 2),
          contentType: 'application/json',
        });
      }

      if (warnings.length > 0) {
        await testInfo.attach('browser-warnings', {
          body: JSON.stringify(warnings, null, 2),
          contentType: 'application/json',
        });
      }
    },
  };
}

export async function expectNoCriticalBrowserIssues(
  diagnostics: ReturnType<typeof collectBrowserDiagnostics>,
  testInfo: TestInfo,
) {
  await diagnostics.attach(testInfo);
  expect(diagnostics.issues, 'Erreurs console, page errors ou HTTP 5xx detectees').toEqual([]);
}
