// ViewCustomize.context.user.apiKey is only in the page when an active customization that applies
// to that page opts in ("Use API access key"), also with "Automatically create API access key" on.
import { e2e } from '../../.codex/e2e/lib.mjs';
import { login, removeAll, create } from '../e2e-helpers/vc.mjs';

const t = await e2e('apikey');
const ensure = (cond, msg) => { if (!cond) t.problems.push(msg); };
const dump = 'document.documentElement.dataset.vcKey = String(ViewCustomize.context.user.apiKey);';
const key = () => t.page.evaluate(() => document.documentElement.dataset.vcKey);

async function setting(on) {
  await t.go('/settings/plugin/view_customize');
  await t.page.setChecked('input[type=checkbox]#settings_create_api_access_key', on);
  await t.page.click('#settings-form input[name=commit], form input[type=submit]');
  await t.settle();
}

await login(t, 'admin');
await removeAll(t);
await setting(true);
const id = await create(t, { position: 'html_bottom', type: 'javascript', path: '/issues$', code: dump, comments: 'dump the key' });
await t.go(`/view_customizes/${id}/edit`);
ensure(!(await t.page.isChecked('#view_customize_use_api_key')), 'the option should be off for a new customization');
await t.shot('form-off', 'The customization form: "Use API access key" is off by default, with its explanation');
await t.go(`/view_customizes/${id}`);
ensure((await t.page.locator('table.view_customize').innerText()).match(/Use API access key\s+no/), 'show: option should read no');

// 1. not opted in, setting ON: no key in the page, none created
for (const who of ['manager', 'reporter']) {
  await t.login(who);
  await t.go('/projects/e2e-project/issues');
  ensure(await key() === 'null', `${who}: the key must not be in the page when no customization asks for it (got ${await key()})`);
}
await t.shot('not-opted-in', 'reporter: setting ON but nothing asks for the key, the page gets apiKey = null');

// 2. opted in
await login(t, 'admin');
await t.go(`/view_customizes/${id}/edit`);
await t.page.setChecked('#view_customize_use_api_key', true);
await t.page.click('#view_customize-form input[name=commit]');
await t.settle();
ensure((await t.page.locator('table.view_customize').innerText()).match(/Use API access key\s+yes/), 'show: option should read yes after saving');
await t.shot('show-on', 'Show page after opting in');

for (const who of ['manager', 'reporter']) {
  await t.login(who);
  await t.go('/projects/e2e-project/issues');
  const k = await key();
  ensure(/^[0-9a-f]{40}$/.test(k), `${who}: the key must be in the page on a matching path (got ${k})`);
  const res = await t.page.request.get(t.BASE + '/users/current.json', { headers: { 'X-Redmine-API-Key': k } });
  ensure(res.status() === 200 && (await res.json()).user.login === who, `${who}: the key does not work (${res.status()})`);
  await t.go('/');
  await t.go('/projects/e2e-project/wiki');
  ensure((await t.page.evaluate(() => ViewCustomize.context.user.apiKey)) === null, `${who}: the key must not be on a path the customization does not match`);
}
await t.login('reporter');
await t.go('/projects/e2e-project/issues');
await t.shot('opted-in', 'reporter: the opted-in customization applies here, the key is in the context (value on the page via the dump)');

// 3. anonymous never gets a key
await login(t, 'admin');
await removeAll(t);
await create(t, { position: 'html_head', type: 'javascript', code: dump, apiKey: true, comments: 'every page, opted in' });
await t.anonymous();
await t.go('/login');
ensure(await key() === 'null', `anonymous: never a key (got ${await key()})`);
await t.shot('anonymous', 'anonymous on the login page: apiKey = null although an opted-in customization applies');

// 4. disabled customization does not count
await login(t, 'admin');
await removeAll(t);
await create(t, { position: 'html_head', type: 'javascript', code: dump, comments: 'enabled, not opted in (dumps the key)' });
await create(t, { position: 'html_head', type: 'javascript', code: '/* nothing */', apiKey: true, enabled: false, comments: 'disabled, opted in' });
await t.login('manager');
await t.go('/');
ensure(await key() === 'null', `a disabled customization must not release the key (got ${await key()})`);

await login(t, 'admin');
await removeAll(t);
await setting(false);
await t.done();
