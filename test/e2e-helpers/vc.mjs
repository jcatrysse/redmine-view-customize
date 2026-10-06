// Helpers shared by the scenarios in test/e2e: create and remove customizations through
// the plugin's own admin screens (as admin).
export async function login(t, who = 'admin') {
  await t.login(who);
  t.page.on('dialog', d => d.accept());
}

export async function removeAll(t) {
  await t.go('/view_customizes');
  while (await t.page.locator('table.view_customize tbody tr').count()) {
    await t.go('/view_customizes/' + (await t.page.locator('td.id a').first().innerText()));
    await t.page.click('.contextual a.icon-del');
    await t.settle();
  }
}

// v: { path, project, position, type, code, comments, enabled, priv }; returns the id
export async function create(t, v) {
  const p = t.page;
  await t.go('/view_customizes/new');
  if (v.path !== undefined) await p.fill('#view_customize_path_pattern', v.path);
  if (v.project !== undefined) await p.fill('#view_customize_project_pattern', v.project);
  if (v.position) await p.selectOption('#view_customize_insertion_position', v.position);
  if (v.type) await p.selectOption('#view_customize_customize_type', v.type);
  await p.fill('#view_customize_code', v.code);
  if (v.comments !== undefined) await p.fill('#view_customize_comments', v.comments);
  if (v.enabled !== undefined) await p.setChecked('#view_customize_is_enabled', v.enabled);
  if (v.priv !== undefined) await p.setChecked('#view_customize_is_private', v.priv);
  await p.click('#view_customize-form input[name=commit]');
  await t.settle();
  t.check('create customize');
  const m = t.page.url().match(/\/view_customizes\/(\d+)$/);
  if (!m) { t.problems.push(`create customize failed, on ${t.page.url()}`); return null; }
  return m[1];
}
