# Auditing stored snippets for Redmine 7

The plugin itself runs on Redmine 7. What can break are the snippets stored in the table
`view_customizes`: they were written against the Redmine 5.1 markup. Run this on a copy of the
production database (or on production, it only reads):

```sh
cd /path/to/redmine
RAILS_ENV=production bundle exec rails runner plugins/view_customize/docs/audit_snippets.rb
```

It lists every snippet that mentions markup that changed in Redmine 7, with the reason. Then test
each listed snippet on a Redmine 7 test instance, on the paths of its `path_pattern`.

The same export as SQL, if you prefer to grep yourself:

```sql
SELECT id, path_pattern, project_pattern, insertion_position, customize_type, is_enabled, is_private, comments, code
FROM view_customizes ORDER BY id;
```

## What changed (measured, `test/e2e/selectors.mjs`: elements per selector, 5.1 against 7.0)

Tables: `docs/e2e/redmine-5.1/selectors-table.md` and `docs/e2e/selectors-table.md`.

| selector | Redmine 5.1 | Redmine 7.0 | effect on a snippet |
|---|---|---|---|
| `#loggedas` | 1 | 0 | gone; the user name is in the `#account` dropdown now |
| `#account ul`, `#top-menu ul` | 1, 2 | 1, 2 | exist, but `#account` is a Stimulus dropdown (`.dropdown-content.hidden`) |
| `.icon`, `[class*=icon-]` | CSS icons | SVG (`svg.icon-svg`, 5 to 54 per page) | a link with `class="icon icon-xxx"` loses its image, still works |
| `.gravatar-with-child` | 1 on an issue | 0 (now `.avatar-with-child`) | renamed |
| `.subject` on an issue | 3 | 4 | the sticky issue header repeats it; a selector hits two elements |
| `#sticky-issue-header` | 0 | 1 | new |
| `#issue_description_wiki` | 0 | 1 | new |
| `#history`, `.journal`, `#all_attributes`, `#attributes`, `#issue_status_id`, `table.issues`, `#main-menu`, `.contextual`, `fieldset`, `legend`, `#quick-search`, `#header` | present | present | same ids; check fieldset/legend styling, the context menu markup and the `.contextual` links (icons) |

The hook positions of the plugin (`html_head`, `html_bottom`, `issue_form`, `issue_show`,
`issues_context_menu`) all still fire on Redmine 7 (`test/e2e/insertion.mjs`).

The stored code can also overlap with what Redmine 7 does itself: default due date, default
private flag, assignee by group, assignee as watcher. A snippet that imitated these is now
redundant, or doubles the behaviour.
