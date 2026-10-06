# crud

Run 2026-10-06T19:45:31.804Z against http://127.0.0.1:3000.

| screenshot | user | URL | shows |
|---|---|---|---|
| ![](crud-empty.png) | admin | `/view_customizes` | Empty list shows the "no data" notice, no stray application menu |
| ![](crud-admin-menu.png) | admin | `/admin` | The administration page lists "View customize" with its SVG icon |
| ![](crud-invalid.png) | admin | `/view_customizes` | Blank code and a broken regular expression are refused with errors |
| ![](crud-invalid-project.png) | admin | `/view_customizes` | A broken project pattern is refused |
| ![](crud-created.png) | admin | `/view_customizes/3` | After create: show page with the highlighted code and a success notice |
| ![](crud-list.png) | admin | `/view_customizes` | List: comment when present, else the code; disabled/private rows marked |
| ![](crud-list-sorted.png) | admin | `/view_customizes?sort=insertion_position%2Cid%3Adesc` | List sorted by insertion position |
| ![](crud-edited.png) | admin | `/view_customizes/3` | After update: the new code is shown |
| ![](crud-edit-invalid.png) | admin | `/view_customizes/3` | Update with blank code is refused with an error |
| ![](crud-disabled-all.png) | admin | `/view_customizes` | After "Disable all" every row is marked disabled |
| ![](crud-enabled-all.png) | admin | `/view_customizes` | After "Enable all" no row is disabled |
| ![](crud-deleted.png) | admin | `/view_customizes` | After deleting all three the list is empty again |
| ![](crud-unknown.png) | admin | `/view_customizes/99999` | An unknown id gives a 404 page |
