// Admin screens: list (empty state, sorting), new (valid and invalid), show, edit, delete,
// disable all / enable all.
import { e2e } from '../../.codex/e2e/lib.mjs';

const t = await e2e('crud');
await t.login('admin');
t.page.on('dialog', d => d.accept());

const fill = async (v) => {
  const p = t.page;
  if (v.path !== undefined) await p.fill('#view_customize_path_pattern', v.path);
  if (v.project !== undefined) await p.fill('#view_customize_project_pattern', v.project);
  if (v.position) await p.selectOption('#view_customize_insertion_position', v.position);
  if (v.type) await p.selectOption('#view_customize_customize_type', v.type);
  if (v.code !== undefined) await p.fill('#view_customize_code', v.code);
  if (v.comments !== undefined) await p.fill('#view_customize_comments', v.comments);
  if (v.enabled !== undefined) await p.setChecked('#view_customize_is_enabled', v.enabled);
  if (v.priv !== undefined) await p.setChecked('#view_customize_is_private', v.priv);
};
const ensure = (cond, msg) => { if (!cond) t.problems.push(msg); };

// start from an empty list
await t.go('/view_customizes');
while (await t.page.locator('table.view_customize tbody tr').count()) {
  await t.go('/view_customizes/' + (await t.page.locator('td.id a').first().innerText()));
  await t.page.click('.contextual a.icon-del');
  await t.settle();
}
await t.go('/view_customizes');
ensure(await t.page.locator('p.nodata').count() === 1, 'empty state not shown');
ensure(await t.page.locator('#main-menu').count() === 0, 'application menu shown on the plugin page');
await t.shot('empty', 'Empty list shows the "no data" notice, no stray application menu');

await t.go('/admin');
ensure(await t.page.locator('#admin-menu a.view_customizes, .admin-menu a:has-text("View customize"), a[href="/view_customizes"]').count() > 0, 'admin menu entry missing');
await t.shot('admin-menu', 'The administration page lists "View customize" with its SVG icon');

// invalid input
await t.go('/view_customizes/new');
await fill({ path: '([', code: '' });
await t.page.click('#view_customize-form input[name=commit]');
await t.settle();
t.check('invalid create');
ensure(await t.page.locator('#errorExplanation li').count() === 2, 'expected 2 validation errors (code blank, path pattern invalid)');
await t.shot('invalid', 'Blank code and a broken regular expression are refused with errors');
await fill({ path: '', project: '(', code: 'x' });
await t.page.click('#view_customize-form input[name=commit]');
await t.settle();
ensure(await t.page.locator('#errorExplanation li').count() === 1, 'expected 1 validation error (project pattern invalid)');
await t.shot('invalid-project', 'A broken project pattern is refused');

// create three
const create = async (v) => {
  await t.go('/view_customizes/new');
  await fill(v);
  await t.page.click('#view_customize-form input[name=commit]');
  await t.settle();
  t.check('create');
  ensure(/\/view_customizes\/\d+$/.test(t.page.url()), `create: still on ${t.page.url()}`);
  ensure(await t.page.locator('#flash_notice').count() === 1, 'create: no success notice');
  return t.page.url().split('/').pop();
};
const id1 = await create({ path: '/issues$', position: 'html_head', type: 'javascript', code: 'document.title = "VC-ONE";', comments: 'first one' });
await t.shot('created', 'After create: show page with the highlighted code and a success notice');
const id2 = await create({ position: 'html_bottom', type: 'css', code: 'body { background: #fffbe6 !important; }', priv: true });
const id3 = await create({ project: 'e2e-project', position: 'issue_show', type: 'html', code: '<p id="vc-html">html snippet</p>', enabled: false });

await t.go('/view_customizes');
ensure(await t.page.locator('table.view_customize tbody tr').count() === 3, 'list should have 3 rows');
ensure(await t.page.locator('td.comments', { hasText: 'first one' }).count() === 1, 'comment should be shown when present');
ensure(await t.page.locator('td.comments', { hasText: 'background' }).count() === 1, 'code should be shown when there is no comment');
await t.shot('list', 'List: comment when present, else the code; disabled/private rows marked');
await t.page.click('th a:has-text("Insertion position")');
await t.settle();
ensure(t.page.url().includes('sort=insertion_position'), 'sorting by insertion position did not apply');
await t.shot('list-sorted', 'List sorted by insertion position');

await t.page.click('th a:has-text("Project pattern")');
await t.settle();
ensure(t.page.url().includes('sort=project_pattern'), 'sorting by project pattern did not apply');
let pats = await t.page.locator('td.project_pattern').allInnerTexts();
ensure(pats.length === 3 && pats[2] === 'e2e-project', `ascending by project pattern: ${JSON.stringify(pats)}`);
await t.shot('list-sorted-project', 'List sorted by project pattern ascending (empty patterns first)');
await t.page.click('th a:has-text("Project pattern")');
await t.settle();
pats = await t.page.locator('td.project_pattern').allInnerTexts();
ensure(pats[0] === 'e2e-project', `descending by project pattern: ${JSON.stringify(pats)}`);
await t.shot('list-sorted-project-desc', 'Second click: descending, the project pattern first');

// edit
await t.go(`/view_customizes/${id1}/edit`);
await fill({ code: 'document.title = "VC-ONE-EDITED";', comments: 'edited' });
await t.page.click('#view_customize-form input[name=commit]');
await t.settle();
ensure(await t.page.locator('#flash_notice').count() === 1, 'update: no success notice');
ensure((await t.page.locator('table.view_customize').innerText()).includes('VC-ONE-EDITED'), 'update not shown');
await t.shot('edited', 'After update: the new code is shown');
await t.go(`/view_customizes/${id1}/edit`);
await fill({ code: '' });
await t.page.click('#view_customize-form input[name=commit]');
await t.settle();
ensure(await t.page.locator('#errorExplanation').count() === 1, 'update with blank code should be refused');
await t.shot('edit-invalid', 'Update with blank code is refused with an error');

// disable all / enable all
await t.go('/view_customizes');
await t.page.click('p.buttons a:has-text("Disable all")');
await t.settle();
t.check('disable all');
ensure(await t.page.locator('tbody tr.disable').count() === 3, 'disable all: expected 3 disabled rows');
await t.shot('disabled-all', 'After "Disable all" every row is marked disabled');
await t.page.click('p.buttons a:has-text("Enable all")');
await t.settle();
ensure(await t.page.locator('tbody tr.disable').count() === 0, 'enable all: expected 0 disabled rows');
await t.shot('enabled-all', 'After "Enable all" no row is disabled');

// delete (leave id3 behind for nothing: clean up all three)
for (const id of [id1, id2, id3]) {
  await t.go(`/view_customizes/${id}`);
  await t.page.click('.contextual a.icon-del');
  await t.settle();
  t.check('delete');
}
ensure(await t.page.locator('p.nodata').count() === 1, 'delete: list should be empty again');
await t.shot('deleted', 'After deleting all three the list is empty again');

// unknown id
await t.go('/view_customizes/99999', { status: 404 });
await t.shot('unknown', 'An unknown id gives a 404 page');
await t.done();
