// ViewCustomize.context (JavaScript) and the "create API access key" setting.
import { e2e } from '../../.codex/e2e/lib.mjs';
import { login, removeAll, create } from '../e2e-helpers/vc.mjs';

const t = await e2e('context');
const ensure = (cond, msg) => { if (!cond) t.problems.push(msg); };

await login(t, 'admin');
await removeAll(t);
await create(t, { position: 'html_bottom', type: 'javascript',
  code: 'document.documentElement.dataset.vcContext = JSON.stringify(ViewCustomize.context);' +
        'var pre = document.createElement("pre"); pre.id = "vc-context"; pre.style.cssText = "font-size:11px;white-space:pre-wrap;padding:8px;border:1px solid #888"; pre.textContent = JSON.stringify(ViewCustomize.context, null, 1); document.body.appendChild(pre);',
  comments: 'dump the context' });
// the issue part comes from the "bottom of issue detail" hook
await create(t, { position: 'issue_show', type: 'javascript',
  code: 'document.documentElement.dataset.vcIssue = JSON.stringify(ViewCustomize.context.issue);', comments: 'issue context' });

const ctx = async () => JSON.parse(await t.page.evaluate(() => document.documentElement.dataset.vcContext));

// setting off (default): no API key is created
await t.go('/settings/plugin/view_customize');
ensure(!(await t.page.isChecked('input[type=checkbox]#settings_create_api_access_key')), 'the setting should be off by default');

await t.login('manager');
await t.go('/issues/1');
let c = await ctx();
ensure(c.user.login === 'manager' && c.user.admin === false, `user context wrong: ${JSON.stringify(c.user)}`);
ensure(c.user.mail === 'manager@example.net', 'user mail missing');
ensure(Array.isArray(c.user.groups) && Array.isArray(c.user.customFields), 'user groups/customFields missing');
ensure(c.user.apiKey === null || c.user.apiKey === undefined, `API key created although the setting is off: ${c.user.apiKey}`);
ensure(c.project && c.project.identifier === 'e2e-project' && c.project.roles.some(r => r.name === 'E2E full'), `project context wrong: ${JSON.stringify(c.project)}`);
const issue = JSON.parse(await t.page.evaluate(() => document.documentElement.dataset.vcIssue));
ensure(issue.id === 1 && issue.author.name === 'Redmine Admin', `issue context wrong: ${JSON.stringify(issue)}`);
ensure(issue.totalEstimatedHours === 4 && issue.totalSpentHours === 1.5, `issue hours wrong: ${JSON.stringify(issue)}`);
ensure(issue.lastUpdatedBy && issue.lastUpdatedBy.name === 'Manager E2E', `lastUpdatedBy wrong: ${JSON.stringify(issue)}`);
await t.shot('context-manager', 'manager on an issue: user, project (with roles) and issue context, no API key (setting off)');

await t.go('/');
c = await ctx();
ensure(c.project === undefined, 'a page outside a project must have no project context');
ensure(c.issue === undefined, 'a page outside an issue must have no issue context');

await t.login('reporter');
await t.go('/projects/e2e-project');
c = await ctx();
ensure(c.project.roles.some(r => r.name === 'Reporter'), 'reporter role missing from the project context');
await t.login('outsider');
await t.go('/projects/e2e-project');
c = await ctx();
ensure(c.project.roles.some(r => r.name === 'Non member'), `outsider on a public project should have the Non member role, got ${JSON.stringify(c.project.roles)}`);
await t.shot('context-outsider', 'outsider on a public project: roles = Non member');
await t.anonymous();
await t.go('/projects/e2e-project');
c = await ctx();
ensure(c.user.id !== undefined && c.user.login === '', `anonymous user context wrong: ${JSON.stringify(c.user)}`);

// setting on: the API key is created automatically
await login(t, 'admin');
await t.go('/settings/plugin/view_customize');
await t.page.click('label[for=settings_create_api_access_key]');
ensure(await t.page.isChecked('input[type=checkbox]#settings_create_api_access_key'), 'clicking the label did not tick the option');
await t.page.click('#settings-form input[name=commit], form input[type=submit]');
await t.settle();
await t.go('/settings/plugin/view_customize');
ensure(await t.page.isChecked('input[type=checkbox]#settings_create_api_access_key'), 'the setting was not saved');
await t.shot('settings-on', 'admin: "Automatically create API access key" saved as ON');

await t.login('reporter');
await t.go('/');
c = await ctx();
ensure(typeof c.user.apiKey === 'string' && c.user.apiKey.length >= 20, `API key not created with the setting on: ${c.user.apiKey}`);
await t.shot('context-apikey', 'reporter: with the setting on the context carries an API key (created on this very request)');
const key = c.user.apiKey;
const who = await t.page.request.get(t.BASE + '/users/current.json', { headers: { 'X-Redmine-API-Key': key } });
ensure(who.status() === 200 && (await who.json()).user.login === 'reporter', `the API key does not work: ${who.status()}`);
await t.go('/');
c = await ctx();
ensure(c.user.apiKey === key, 'the API key changed between requests');

// back to the default
await login(t, 'admin');
await t.go('/settings/plugin/view_customize');
await t.page.setChecked('input[type=checkbox]#settings_create_api_access_key', false);
await t.page.click('#settings-form input[name=commit], form input[type=submit]');
await t.settle();
await removeAll(t);
await t.done();
