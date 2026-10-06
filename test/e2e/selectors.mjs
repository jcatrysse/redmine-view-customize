// Evidence for the audit of stored snippets: how many elements the markup that snippets
// typically target has on key pages. Never fails; writes <out>/selectors-table.md, to be
// compared between Redmine 5.1 and 7.0 (RMP_E2E_OUT=docs/e2e/redmine-5.1 for the 5.1 run).
import fs from 'node:fs';
import path from 'node:path';
import { e2e } from '../../.codex/e2e/lib.mjs';

const t = await e2e('selectors');
const OUT = process.env.RMP_E2E_OUT || 'docs/e2e';
const pages = {
  home: '/',
  'issue list': '/projects/e2e-project/issues',
  'issue': '/issues/1',
  'new issue': '/projects/e2e-project/issues/new',
  'my account': '/my/account',
};
const selectors = ['#top-menu', '#top-menu ul', '#account', '#account ul', '#loggedas', '#quick-search', '#header',
  '#main-menu', '.icon', '[class*="icon-"]', 'svg.icon-svg', '.gravatar-with-child', '.avatar-with-child', '.subject',
  '.contextual', 'fieldset', 'legend', '#history', '.journal', '#all_attributes', '#attributes', '#issue_status_id',
  '#issue_description_wiki', '#sticky-issue-header', 'table.issues', '#content'];

await t.login('manager');
const rows = {};
for (const [name, url] of Object.entries(pages)) {
  await t.go(url);
  rows[name] = await t.page.evaluate(sels => Object.fromEntries(sels.map(s => [s, document.querySelectorAll(s).length])), selectors);
}
const names = Object.keys(pages);
const lines = ['| selector | ' + names.join(' | ') + ' |', '|---|' + names.map(() => '---|').join('')];
for (const s of selectors) lines.push(`| \`${s}\` | ` + names.map(n => rows[n][s]).join(' | ') + ' |');
fs.writeFileSync(path.join(OUT, 'selectors-table.md'), `# Elements per selector (manager)\n\nRun ${new Date().toISOString()} against ${t.BASE}.\n\n` + lines.join('\n') + '\n');
await t.done();
