// The plugin has no project permissions: everything is for administrators. Every user
// who is not an administrator, and anonymous, must be refused on every action,
// including the ones that change data.
import { e2e } from '../../.codex/e2e/lib.mjs';
import { login, removeAll, create } from '../e2e-helpers/vc.mjs';

const t = await e2e('permissions');
const ensure = (cond, msg) => { if (!cond) t.problems.push(msg); };

await login(t, 'admin');
await removeAll(t);
const id = await create(t, { position: 'html_head', type: 'css', code: 'body { color: inherit; }', comments: 'permission probe' });
await t.go('/settings/plugin/view_customize');
ensure(await t.page.locator('input[type=checkbox]#settings_create_api_access_key').count() === 1, 'admin: plugin settings page has no option');
await t.shot('settings-admin', 'admin: the plugin settings page with the API access key option');

// a state-changing request with a valid CSRF token, as the given user
async function attempt(method, url, body) {
  return t.page.evaluate(async ({ method, url, body }) => {
    const token = document.querySelector('meta[name=csrf-token]').content;
    const res = await fetch(url, {
      method, redirect: 'manual',
      headers: { 'X-CSRF-Token': token, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    return res.status;
  }, { method, url, body });
}

for (const who of ['manager', 'reporter', 'outsider']) {
  await t.login(who);
  await t.go('/my/page');
  for (const p of ['/view_customizes', '/view_customizes/new', `/view_customizes/${id}`, `/view_customizes/${id}/edit`, '/settings/plugin/view_customize']) {
    await t.go(p, { status: 403 });
  }
  await t.shot(`index-refused-${who}`, `${who}: /view_customizes is refused (403)`);
  await t.go('/settings/plugin/view_customize', { status: 403 });
  await t.shot(`settings-refused-${who}`, `${who}: the plugin settings page is refused (403)`);
  await t.go('/my/page');
  const checks = [
    ['POST', '/view_customizes', 'view_customize[code]=x&view_customize[insertion_position]=html_head&view_customize[customize_type]=css'],
    ['PATCH', `/view_customizes/${id}`, 'view_customize[code]=hacked'],
    ['PUT', '/view_customizes', 'view_customize[is_enabled]=0'],
    ['DELETE', `/view_customizes/${id}`, ''],
  ];
  for (const [m, u, b] of checks) {
    const s = await attempt(m, u, b);
    ensure(s === 403, `${who}: ${m} ${u} answered ${s}, expected 403`);
  }
  t.check(`${who} refused fetches`, { requests: ['403 fetch'] });
}

await t.anonymous();
for (const p of ['/view_customizes', '/view_customizes/new', `/view_customizes/${id}`]) {
  await t.page.goto(t.BASE + p);
  await t.settle();
  ensure(new URL(t.page.url()).pathname === '/login', `anonymous: ${p} did not redirect to the login page (${t.page.url()})`);
}
await t.shot('anonymous-login', 'anonymous: the plugin pages redirect to the login page');

// nothing was changed by the refused attempts
await login(t, 'admin');
await t.go(`/view_customizes/${id}`);
ensure((await t.page.locator('table.view_customize').innerText()).includes('permission probe'), 'the record changed or vanished');
ensure((await t.page.locator('table.view_customize').innerText()).includes('body { color: inherit; }'), 'the code changed');
ensure((await t.page.locator('table.view_customize').innerText()).match(/Enabled\s+yes/), 'the record was disabled');
await t.shot('unchanged', 'admin: the record is unchanged after all refused attempts');
await removeAll(t);
await t.done();
