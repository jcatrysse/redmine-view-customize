# Redmine 7 migration: redmine-view-customize

Start a Claude Code (or Codex) session on this repository, branch `redmine70-migration`, with:

> Read CLAUDE.md and docs/REDMINE7-MIGRATION.md, then carry out the Redmine 7 migration of this
> plugin as described there, on branch redmine70-migration. That includes the plugin's tests on
> PostgreSQL and MariaDB, every function exercised end to end on a real running Redmine in a
> browser (with and without permissions, failure paths included) with screenshots you looked at,
> and an OpenAI review of the diff when OPENAI_API_KEY is set. Report to me in Dutch at the end.

This file is the plan and the memory of that work. Update it as you go: verdicts, results,
what is left. Written 2026-10-06 from a measured analysis (report at the bottom).

## Status

| | |
|---|---|
| Plugin id | `view_customize` |
| GEOxyz runs today | `master` |
| Upstream | onozaty/redmine-view-customize master @ cdec221 (2026-07-05, tag v3.6.0) |
| Runs on Redmine 7 as is | JA |
| Upstream sync | SYNC AANBEVOLEN: installeer v3.6.0 (tag v3.6.0, cdec221825f0a29c3babe2aa501e062fecbdc97a): SVG-iconen (3.5.3/3.5.4) en verwijdering van activerecord-compatible_legacy_migration voor Rails 8.1 (7f257c7); geen nieuwe migratie |
| After sync | n.v.t. |
| Complexity (1 trivial .. 5 rewrite) | 1 |
| Measured on | Redmine 7.0.1 (7.0-stable-GEOxyz + latest 7.0-stable), Rails 8.1.3.1, Ruby 3.3.6, PostgreSQL 16 and MariaDB 10.11 |
| Branch head when this file was written | `c0c19a1` |

## Already on this branch

- nothing: the branch equals the branch GEOxyz runs today.

## Work list for the migration session

In this order: things that break, security, the GEOxyz changes, the open items, then the checks.

**Open items from the analysis** (Dutch; where they repeat a priority item, the priority item wins)

1. Jan: onozaty/redmine-view-customize forken naar jcatrysse zodat een redmine70-migration-branch (op v3.6.0) en een harness-run mogelijk worden
2. opgeslagen snippets exporteren (SELECT ... FROM view_customizes) en greppen op selectors die in 7.0 veranderden: #top-menu, #account, #loggedas (weg), #quick-search, #header, .icon-*, gravatar->avatar, .subject (nu 2x door sticky header), fieldset/legend, #history/.journal
3. elke geraakte snippet testen op een 7.0-testinstance op de paden uit path_pattern
4. v3.6.0 installeren en bundle install draaien (Gemfile-gem valt weg); redmine:plugins:migrate is een no-op

**Checks**

5. Run the plugin's whole test suite on Redmine 7.0-stable-GEOxyz with PostgreSQL AND MariaDB, and once on 5.1-stable if the branch is meant to stay 5.1-compatible.
6. Check Redmine 7 webhooks against this plugin (see "Rules"), and note the result here even if nothing is needed.
7. Verify every feature of the plugin by hand on a running Redmine 7 (screenshots).

## GEOxyz changes to review or re-apply

None: this branch carries no GEOxyz commits of its own (upstream code only).

## After the upgrade (production)

Actions the person doing the upgrade must take, or know about, for this plugin:

- bundle install (3.6.0 dropped the activerecord-compatible_legacy_migration gem); migrations are a no-op.
- Export the stored snippets and check them against the Redmine 7 markup (header/user menu, #loggedas is gone, CSS icons are gone, sticky issue header duplicates .subject).

## How to test

```sh
./.codex/redmine_clone.sh 7.0-stable-GEOxyz      # or 5.1-stable / 6.1-stable / 7.0-stable
./.codex/test_setup.sh                                 # RMP_DB=mariadb for MariaDB, RMP_PROVISION_DB=0 if a server runs
./.codex/test_plugin.sh                                # minitest + rspec of this plugin
```

```sh
./.codex/start_server.sh       # real Redmine (production mode) with this plugin, seeded users and projects
./.codex/e2e.sh                # browser: smoke over the plugin's pages, core issue flows, test/e2e/*.mjs
./.codex/openai_review.sh      # independent OpenAI review of the diff, only when OPENAI_API_KEY is set
```
Write one scenario per function in `test/e2e/<function>.mjs` (example at the top of
`.codex/e2e/lib.mjs`); screenshots and a table per scenario land in `docs/e2e/`. Users:
`admin`, `manager` (every permission), `reporter` (no plugin permissions), `outsider` (no
membership); password `Redmine7Test!`. Needs Node with Playwright and Chromium
(`npm install -g playwright && npx playwright install --with-deps chromium`).

On GitHub the same runs by hand only: Actions > "Redmine tests (manual)" > Run workflow (tick
"e2e" for the browser run; screenshots come back as an artifact).

The coordinator's harness (`plugin-check.sh` in the migration kit, kept outside this repo) adds a
browser smoke test of every page the plugin adds and runs all GEOxyz plugins together; the
results quoted in the analysis come from it.

## How the migration session works (same for every plugin)

1. **Start**: `git fetch && git checkout redmine70-migration && git pull`. Read this whole file,
   including the analysis report at the bottom. Do not reopen decisions recorded here.
2. **Baseline, before you change anything**:
   - the plugin's tests on Redmine 7.0-stable-GEOxyz with PostgreSQL and with MariaDB;
   - a real running Redmine with this plugin (`./.codex/start_server.sh`) and the browser run
     (`./.codex/e2e.sh`: smoke over every page the plugin adds, plus the core issue flows).
   Write the numbers here. Something already broken now is a finding, not your regression.
3. **Inventory of functions**: list every function of the plugin in this file, in a table
   "function | how a user reaches it | scenario | screenshot". Take them from the README,
   `init.rb` (permissions, menus, settings, project modules), routes, hooks and view
   overrides, macros, mail handling, API endpoints, rake tasks and cron jobs. This table is the
   coverage list for step 8; a function that is not in it will not be tested.
4. **GEOxyz changes**: go through the table above, one item at a time. Each kept or re-made change
   is its own commit with a test that proves it. Record the verdict in the table.
5. **Work list**: then the numbered list, in order. One concern per commit.
6. **Portability**: everything must run on Redmine's supported databases (PostgreSQL,
   MySQL/MariaDB; SQLite where the plugin already supports it). Migrations must be reversible and
   are run down and up on PostgreSQL and MariaDB.
7. **Together**: run with the other GEOxyz plugins installed (the migration kit's harness, or
   `RMP_EXTRA_PLUGINS`). A failure that only appears in combination is a finding to record here.
8. **End to end, visually, every function**: on the real Redmine from `start_server.sh`
   (production mode, the way GEOxyz runs it), write one scenario per function in
   `test/e2e/<function>.mjs` with `.codex/e2e/lib.mjs` and run them with `./.codex/e2e.sh`.
   - Each function as the users that matter: `admin`, `manager` (every permission, the
     plugin's included), `reporter` (member without the plugin's permissions), `outsider`
     (no membership, private project must stay invisible).
   - The failure paths too: setting off, permission absent, empty state, invalid input, the
     value that used to raise. A refusal that is shown is evidence as much as a success.
   - One screenshot per function and per path, with a caption saying what it proves. Open
     every screenshot and look at it: a picture nobody looked at proves nothing. Commit them
     in `docs/e2e/` and list them in the inventory table.
   - Functions without a page (mail in and out, REST API, rake tasks, cron, webhooks): exercise
     them against the same running instance (mails land in `redmine/tmp/mails`, `t.mails()`
     reads them; API through `t.page.request`) and record command and result.
   - Before pictures where behaviour or layout changes: the branch GEOxyz runs today, on
     Redmine 5.1, same scenarios, `RMP_E2E_OUT=docs/e2e/before`.
   - Run the whole e2e set once on MariaDB as well (`RMP_DB=mariadb`, then `start_server.sh --reset`).
9. **Independent review**: first your own, adversarial: re-read the whole diff as if someone
   else wrote it and you are paid to reject it. Then, **when `OPENAI_API_KEY` is set in the
   session**, `./.codex/openai_review.sh`: it sends the diff of this branch to an OpenAI model
   and writes `docs/reviews/openai-<date>-<sha>.md`. Every finding gets a `Resolution:` line
   there (fixed in <commit>, with a test, or why not). Fix, re-run the tests and the e2e set,
   and run the review again until it has nothing new that you accept. Without the key: write
   "OpenAI review: skipped, no OPENAI_API_KEY" in the report; never send code anywhere else.
10. **After the upgrade**: anything the production upgrade must do for this plugin (data fixes,
    settings, cron, files, removed features) goes into the section "After the upgrade".
11. **Finish**: update "Status", the inventory and the work list in this file, push
    `redmine70-migration`, and report: what changed, test numbers on both databases, e2e
    numbers (scenarios, screenshots, problems), the review result, what is left, what needs Jan.

### Stop and ask Jan when
- a GEOxyz change would be lost or behave differently for users;
- a new gem, a new setting with user impact, or a schema change not required by Redmine 7 seems needed;
- the change would send data to an external service (the OpenAI review of the code diff is the
  one exception Jan approved, and only when the key is present);
- upstream and GEOxyz disagree on behaviour and both are defensible.

## Rules

- **Target**: Redmine 7.0-stable-GEOxyz (https://github.com/jcatrysse/redmine), Rails 8.1, Ruby 3.3+.
  Core sources for comparison: branches `5.1-stable`, `6.1-stable`, `7.0-stable`, `7.0-stable-GEOxyz`.
- **Evidence**: never report a test, lint, browser check or review as passed without having seen
  it. Quote the summary lines; list the screenshots. "Should work" is not a result, and a green
  test suite is not proof that a feature works in the browser.
- **Tests**: never skip, delete or weaken a test. A test that encodes Redmine 5 markup or
  behaviour is updated to Redmine 7, with the reason in the commit. Every fix gets a test that
  fails without it.
- **Minimal diffs** in the plugin's own style. No reformatting, no unrelated refactoring.
  Something wrong elsewhere: write it down here, do not fix it in passing.
- **Security**: authorization on every action and entry point; `safe_attributes`, never
  `to_unsafe_hash` into `update`; no SQL built from params; no secrets in logs; no `html_safe` on
  user input.
- **Webhooks (new in Redmine 7)**: core sends issue payloads (core `issues/show.api.rsb`, rendered
  as the webhook owner) to webhook endpoints, past plugin hooks and controller patches. If the
  plugin hides, adds or changes issue data, make webhooks consistent with that or record why not.
- **Redmine 7 conventions**: SVG icons through `sprite_icon` (the `icon icon-*` CSS is gone),
  Propshaft assets under `assets/` (`/assets/plugin_assets/<id>/...`), the new header and user menu,
  `ContextMenus::*Controller`, Loofah-based text formatting, Chart.js as an ES module, sudo mode
  (on by default: `t.sudo()` in a scenario). The breaker list is in the migration kit's CHECKLIST.md.
- **Locales**: keep the locales the plugin ships in sync; translate a new key by matching the
  closest existing key in the same file, not from scratch; do not add new languages.
- **5.1 compatibility**: prefer fixes that also run on Redmine 5.1 so they can be merged early;
  say so when a fix cannot.
- **Git**: work on `redmine70-migration` only; never push to the default branch; never force-push
  a branch someone else uses. Descriptive commit messages (what and why).
- **GitHub Actions**: manual only (`workflow_dispatch`). Do not add push, pull_request or schedule
  triggers.

## Definition of done

- All items of the work list are done or explicitly deferred with a reason, in this file.
- The plugin's tests are green on Redmine 7.0-stable-GEOxyz with PostgreSQL and MariaDB
  (numbers in this file); boot, production-like eager load, migrations up/down OK.
- Every function in the inventory exercised end to end on a real running Redmine, with and
  without permissions and on its failure paths; `./.codex/e2e.sh` green; screenshots looked at,
  committed in `docs/e2e/` and listed.
- Review done: your own, and the OpenAI review when the key is present, every finding resolved
  in `docs/reviews/`.
- No new failure when run together with the other GEOxyz plugins.
- "After the upgrade" lists every action production needs; "Status" is current.


## Analysis report (2026-10-06, Dutch)

# view_customize
- Gebruikte branch: onbekend - GEOxyz draait upstream zonder fork; welke versie op 5.1 staat is niet bekend (op de server: `grep version plugins/view_customize/init.rb`) - plugin id `view_customize`
- Upstream: onozaty/redmine-view-customize - upstream HEAD master @ cdec221 (2026-07-05) = tag v3.6.0
- Fork t.o.v. upstream: geen fork, dus geen eigen commits; ontbrekende upstream-commits hangen af van de geïnstalleerde versie (zie §2)
- Andere relevante branches: geen; upstream werkt op master en tagt releases

## 1. Werkt out of the box op Redmine 7?   niet getest (geen fork)
De code kon niet naar deze container gehaald worden: er is geen fork in het fork-netwerk van Jan om via te fetchen. Er is dus geen harness-run. Wat wel vaststaat, uit het web en uit de core-broncode:
- redmine.org noemt 3.6.0 (2026-07-05) compatibel met 7.0.x (en 6.1, 6.0, 5.1, 5.0, 4.x). 3.5.4 en ouder claimen geen 7.0.
- Upstream CI (`.circleci/config.yml`) test "latest Redmine" op PostgreSQL en MySQL (Ruby 3.3), plus 6.1, 6.0, 5.1, 5.0, 4.2 en 4.1. In juli 2026 was "latest" 7.0. Dat is een claim van upstream, door ons niet gemeten.
- De vijf hooks die de plugin gebruikt bestaan nog in 7.0 (gecontroleerd in `origin/7.0-stable`): `view_layouts_base_html_head`, `view_layouts_base_body_bottom`, `view_issues_form_details_bottom`, `view_issues_show_details_bottom`, `view_issues_context_menu_end` (nu in `app/views/context_menus/issues.html.erb:181`, onder `ContextMenus::IssuesController`).
- Redmine 7 heeft geen Content-Security-Policy-initializer (`config/initializers/` bevat er geen), dus inline `<script>`/`<style>` uit view_customize wordt nog uitgevoerd. jQuery is nog globaal (`$` zit ook in `layouts/base.html.erb`).
- Het model (`app/models/view_customize.rb`, v3.6.0) bevat niets van de lijst met constructies die op R7 een fout geven: geen `serialize`, geen `enum`, geen `to_s(:db)`.

## 2. Upstream sync?   SYNC AANBEVOLEN
Installeer **v3.6.0** (tag `v3.6.0`, commit `cdec221825f0a29c3babe2aa501e062fecbdc97a`) in `plugins/view_customize` (de map moet zo heten). Relevante commits sinds 3.5.2 (de laatste release die alleen tot 5.1 ging):
- R6/R7-compat: 3.5.3 "Replace PNG icons with SVG for future Redmine compatibility"; 3.5.4 `5efb915` "Remove unnecessary icon styles"; 3.6.0 `7f257c7` "Avoid Redmine 7.0 ActiveSupport::Configurable deprecation warning". Die laatste haalt de gem `activerecord-compatible_legacy_migration` weg (Gemfile verwijderd) en zet de 8 migraties op `ActiveRecord::Migration[4.2]`. De gem gaf op Rails 8.1 een deprecation en verdwijnt in Rails 8.2.
- Rest (ruis): CI-matrix, devcontainer, Bundler 4-fixes. 3.6.0 laat Redmine 3.x vallen.
- Geen nieuwe migratie (de laatste blijft `008`). `rake redmine:plugins:migrate` is dus een no-op, maar draai het toch. Na de upgrade: `bundle install`, want de oude Gemfile-gem valt weg.
- Conflicten en eigen commits: n.v.t. (geen fork).

## 3. Werkt na sync op Redmine 7?   n.v.t.
Niet getest (geen fork, geen code in de container).

## 4. Complexiteit en blokkers   score 1 (plugin) / 3 (opgeslagen snippets)
- Blokkers in de plugin: geen gevonden in wat via het web leesbaar was (init.rb, after_init.rb, view_hook.rb, model, migraties). Niet geverifieerd met een harness.
- **Stille breuken: de opgeslagen customizations (tabel `view_customizes`), niet de plugin.** Elke JS/CSS/HTML-snippet in de database is tegen de 5.1-markup geschreven. In 7.0 veranderde onder meer het volgende (gemeten met diff `origin/5.1-stable`..`origin/7.0-stable`):
  - Header en gebruikersmenu (#43937, #31353): `#top-menu` is nu `<nav class="top-menu" id="top-menu">` met `.general-menu`/`.profile-menu`. `#loggedas` bestaat niet meer (0 keer in 7.0-views). `#account` is voor ingelogde gebruikers een Stimulus-dropdown (`#account.dropdown` > `.dropdown-content.hidden`). Snippets die links in `#account ul` of `#top-menu ul` zoeken of toevoegen, of tekst uit `#loggedas` lezen, missen hun doel.
  - Iconen (#43206): de CSS-iconen `icon icon-*` (achtergrondafbeelding) zijn weg; core tekent `sprite_icon` (inline SVG). Een snippet die een link met `class="icon icon-xxx"` toevoegt, verliest het icoon maar blijft werken. Core levert `app/assets/stylesheets/legacy-icons-compat.css` om de oude iconen terug te halen.
  - Issue-detailpagina (`issues/show.html.erb`, 96 regels gewijzigd): nieuwe sticky header (`#sticky-issue-header`, met een tweede `.subject`), dus een selector op `.subject` raakt nu twee elementen. Verder `.gravatar-with-child` → `.avatar-with-child`, `div.description` met Stimulus `quote-reply`, de wiki van de beschrijving heeft nu `#issue_description_wiki`, `#history.journals`, de vorige/volgende-navigatie is nu `span.pagination > ul.pages`, en de quote-link is verplaatst.
  - Issue-formulier (#43279 en andere): fieldset-randen vereenvoudigd, `f.text_area` → `f.textarea` met Stimulus-attributen, help- en "nieuw"-links met `sprite_icon`. De veld-id's (`issue_status_id`, `issue_custom_field_values_N`, `#all_attributes`, `#attributes`) zijn ongewijzigd, dus snippets die velden tonen of verbergen werken meestal nog.
  - Context-menu: zelfde template-pad, nieuwe controller (#44169). De CSS-iconen zijn uit `context_menu.css` verwijderd (`0d75b3ec6`).
- Overlap met Redmine 7 core: geen directe. Kijk wel per snippet of 7.0 het nu zelf doet: standaard vervaldatum (#31518), standaard privévlag (#9432), toegewezene per groep (#44015), toegewezene automatisch als watcher (#2716). Een snippet die dat in 5.1 met JS nabootste, is dan dubbel.
- Open werk voor ansif:
  1. Laat Jan `onozaty/redmine-view-customize` forken naar `jcatrysse/redmine-view-customize`. Dan kan een volgende sessie hem fetchen, door de harness halen en een `redmine70-migration`-branch op v3.6.0 maken.
  2. Exporteer alle snippets: `SELECT id, path_pattern, project_pattern, insertion_position, customize_type, is_enabled, is_private, comments, code FROM view_customizes ORDER BY id;`.
  3. Grep die export op `#top-menu`, `#account`, `#loggedas`, `#quick-search`, `#header`, `#main-menu`, `.icon-`, `gravatar`, `.subject`, `.contextual`, `fieldset`, `legend`, `#history`, `.journal`. Test elke treffer op een 7.0-testinstance, met de pagina-paden uit `path_pattern`.
  4. Installeer v3.6.0 op de 7.0-testomgeving en controleer het beheerscherm (Administratie → View customize), want daar zitten de SVG-iconen van 3.5.3.

## Branch redmine70-migration
- Basis: n.v.t. (geen fork; aanbevolen basis na forken: tag v3.6.0 @ cdec221)
- Commits: geen
- Eindresultaat harness: niet gedraaid
- Rollback migraties: n.v.t. (niet getest; 8 eigen migraties, `Migration[4.2]` vanaf 3.6.0)


## Aanvulling coordinator (2026-10-06, na het forken)
Jan forkte de plugin naar `jcatrysse/redmine-view-customize`. `redmine70-migration` = tag v3.6.0 (cdec221), zonder wijzigingen.
Gemeten met de harness:
- PostgreSQL: boot 3.6.0, eager load, 8 migraties, rollback naar 0 en terug OK, **minitest 11 runs, 0 failures**, smoke 64/64.
- MariaDB 10.11: identiek, rollback OK, 11 runs 0 failures, smoke 64/64.
- Functioneel (MariaDB, browser): een JS-customization op pad `/issues` wordt alleen op de issuelijst uitgevoerd (niet op de wiki), een CSS-customization op `.*` werkt overal, het beheerscherm toont de lijst met SVG-iconen, 0 JS-fouten.
De plugin zelf is dus klaar voor 7.0. Wat overblijft, zijn de opgeslagen snippets (zie hierboven), na de migratie.

