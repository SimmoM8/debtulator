# Debtulator Blueprint

**Debtulator Blueprint** is the internal product-requirements browser for Debtulator.

It lives as an isolated root-level package:

```text
debtulator/
├── docs/
│   └── USER_STORIES.md
└── blueprint/
    ├── index.html
    ├── styles.css
    ├── app.js
    ├── package.json
    └── README.md
```

## Source of truth

Blueprint does **not** contain or copy the authoritative user-story document.

At runtime it reads:

```text
../docs/USER_STORIES.md
```

That means `docs/USER_STORIES.md` remains the single source of truth for the project.

## Dynamic updates

With **Auto-refresh source** enabled, Blueprint checks the Markdown source every four seconds using a no-cache request.

When the document changes, it reparses and rebuilds:

- stories;
- implementation-status counts;
- priorities;
- the seven canonical actor filters;
- feature-area filters;
- acceptance criteria;
- search data; and
- all visible result counts.

Adding new stories or sections does not require editing Blueprint.

## Canonical actors

Actor filters come only from the seven definitions under `# 4. Actors` / `## 4.1` through `## 4.7`.

Free-form wording inside individual stories cannot create extra actor filter values.

## Implementation status

- `[FI]` — Fully implemented
- `[PI]` — Partly implemented
- blank — Not implemented

Implementation status is intentionally the primary filter group.

## Multi-select filtering

Select as many or as few filters as required.

Selections within a category use **OR**. Different categories combine using **AND**.

Example:

`[PI] + [Not implemented]` and `P0 + P1` and `Authenticated User`

means:

> implementation is Partly implemented OR Not implemented,
> AND priority is P0 OR P1,
> AND actor is Authenticated User.

## Running

Serve the Debtulator root directory with any local development server, then open:

```text
/blueprint/
```

Opening `blueprint/index.html` directly with a `file://` URL can prevent the browser from reading `../docs/USER_STORIES.md` because of browser local-file security rules. The manual **Open file** and drag-and-drop options remain available for that case.
