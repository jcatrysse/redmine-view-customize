// The core function: code inserted at the five insertion positions, filtered by path pattern
// and project pattern, honouring "enabled" and "private", for every kind of user.
import { e2e } from '../../.codex/e2e/lib.mjs';
import { login, removeAll, create } from '../e2e-helpers/vc.mjs';

const t = await e2e('insertion');
const ensure = (cond, msg) => { if (!cond) t.problems.push(msg); };
await login(t, 'admin');
await removeAll(t);

const mark = (name, extra = '') => `document.documentElement.dataset.${name} = (parseInt(document.documentElement.dataset.${name} || '0') + 1); ${extra}`;
await create(t, { position: 'html_head', type: 'javascript', code: mark('vcHead'), comments: 'head js' });
await create(t, { position: 'html_head', type: 'css', path: '/issues$', code: 'body { outline: 6px solid #e8590c !important; }', comments: 'css on issue lists' });
await create(t, { position: 'html_bottom', type: 'javascript', code: mark('vcBottom'), comments: 'bottom js' });
await create(t, { position: 'issue_form', type: 'javascript', code: mark('vcForm'), comments: 'issue form js' });
await create(t, { position: 'issue_show', type: 'html', code: '<p id="vc-issue-show" style="background:#d3f9d8;padding:6px">VC issue show html</p>', comments: 'issue show html' });
await create(t, { position: 'issues_context_menu', type: 'html', code: '<li><a href="#" id="vc-menu-link">VC custom menu entry</a></li>', comments: 'context menu html' });
await create(t, { position: 'html_head', type: 'javascript', path: '/wiki', code: mark('vcWiki'), comments: 'wiki only' });
await create(t, { position: 'html_bottom', type: 'html', project: '^e2e-private$', code: '<p id="vc-private-project">VC only in e2e-private</p>', comments: 'project pattern' });
await create(t, { position: 'html_head', type: 'javascript', code: mark('vcDisabled'), enabled: false, comments: 'disabled' });
await create(t, { position: 'html_head', type: 'javascript', code: mark('vcPrivate'), priv: true, comments: 'private to admin' });
await t.go('/view_customizes');
await t.shot('configured', 'The ten customizations used by this scenario');

const data = () => t.page.evaluate(() => ({ ...document.documentElement.dataset }));
const has = (sel) => t.page.locator(sel).count();

async function check(who, lookups) {
  await t.login(who);
  await t.go('/');
  let d = await data();
  const priv = who === 'admin' ? '1' : undefined;
  ensure(d.vcHead === '1', `${who} /: head JS must run once (got ${d.vcHead})`);
  ensure(d.vcBottom === '1', `${who} /: bottom JS must run once (got ${d.vcBottom})`);
  ensure(d.vcDisabled === undefined, `${who} /: disabled customization ran`);
  ensure(d.vcPrivate === priv, `${who} /: private customization ${priv ? 'must' : 'must not'} run (got ${d.vcPrivate})`);
  ensure(d.vcWiki === undefined, `${who} /: wiki-only customization ran on /`);
  ensure(d.vcForm === undefined, `${who} /: issue form code ran outside the form`);
  if (lookups.shot) await t.shot(`home-${who}`, `${who}: head and bottom code ran; the private one only for its author, the disabled one never`);

  await t.go('/projects/e2e-project/issues');
  const outline = await t.page.evaluate(() => getComputedStyle(document.body).outlineStyle);
  ensure(outline === 'solid', `${who} issue list: CSS for /issues$ not applied`);
  await t.go('/projects/e2e-project/wiki');
  d = await data();
  ensure(d.vcWiki === '1', `${who} wiki: path-pattern JS must run once (got ${d.vcWiki})`);
  const outlineWiki = await t.page.evaluate(() => getComputedStyle(document.body).outlineStyle);
  ensure(outlineWiki === 'none', `${who} wiki: CSS for /issues$ applied on the wiki`);
  ensure(await has('#vc-private-project') === 0, `${who} e2e-project: project pattern html shown in the wrong project`);

  await t.go('/issues/1');
  ensure(await has('#vc-issue-show') === 1, `${who} /issues/1: issue show html missing`);
  d = await data();
  // the issue page contains the (hidden) edit form, which is rendered with the same hook
  // (the reporter role may not edit, so there is no edit form for that user)
  const expectedForm = who === 'reporter' ? undefined : '1';
  ensure(d.vcForm === expectedForm, `${who} issue show: the edit form's code ran ${d.vcForm} time(s), expected ${expectedForm}`);
  if (lookups.shot) await t.shot(`issue-show-${who}`, `${who}: "bottom of issue detail" HTML is shown on the issue page`);

  await t.go('/projects/e2e-project/issues/new');
  d = await data();
  ensure(d.vcForm === '1', `${who} new issue: form code must run once (got ${d.vcForm})`);
  ensure(await has('#vc-issue-show') === 0, `${who} new issue: issue-show html shown on the form`);
  // the form is rebuilt through ajax when the tracker changes: the code must run again
  const trackers = await t.page.locator('#issue_tracker_id option').evaluateAll(o => o.map(x => x.value));
  if (trackers.length > 1) {
    const current = await t.page.inputValue('#issue_tracker_id');
    const other = trackers.find(v => v !== current);
    await t.page.selectOption('#issue_tracker_id', other);
    await t.page.waitForFunction(() => parseInt(document.documentElement.dataset.vcForm) >= 2, null, { timeout: 10000 })
      .catch(() => t.problems.push(`${who} new issue: form code did not run again after the tracker change`));
  }
  d = await data();
  ensure(d.vcForm === '2', `${who} new issue: expected 2 runs after the tracker change, got ${d.vcForm}`);
  if (lookups.shot) await t.shot(`issue-form-${who}`, `${who}: form code ran at load and again after the tracker change (data-vc-form=${d.vcForm})`);

  await t.go('/projects/e2e-project/issues');
  await t.page.click('table.issues tr.issue td.status >> nth=0', { button: 'right' });
  await t.page.waitForSelector('#context-menu ul', { timeout: 10000 }).catch(() => t.problems.push(`${who}: context menu did not open`));
  ensure(await has('#context-menu #vc-menu-link') === 1, `${who}: context menu HTML missing`);
  if (lookups.shot) await t.shot(`context-menu-${who}`, `${who}: the context menu ends with the customization's own entry`, { full: false });
}

await check('admin', { shot: true });
await check('manager', { shot: true });
await check('reporter', { shot: false });

// the project pattern: only in e2e-private, only for members
await t.login('manager');
await t.go('/projects/e2e-private');
ensure(await has('#vc-private-project') === 1, 'manager e2e-private: project pattern html missing');
await t.shot('project-pattern', 'manager: HTML bottom for ^e2e-private$ shows in that project');
await t.login('outsider');
await t.go('/projects/e2e-private', { status: 403 });
ensure(await has('#vc-private-project') === 0, 'outsider: customization leaked into a refused page');
await t.shot('project-pattern-refused', 'outsider: the private project is refused and shows no project-specific code');

// anonymous (login page) still gets the global code
await t.anonymous();
await t.go('/login');
const d = await data();
ensure(d.vcHead === '1' && d.vcPrivate === undefined, 'anonymous: head code must run, private must not');
await t.shot('anonymous', 'anonymous: global code runs on the login page too');

await login(t, 'admin');
await removeAll(t);
await t.done();
