# Debtulator User Stories Viewer

A lightweight, dependency-free browser for `docs/USER_STORIES.md`.

## Install

Extract these files into the **Debtulator project root**:

```text
debtulator/
├── docs/
│   └── USER_STORIES.md
├── user-stories.html
├── user-stories.css
└── user-stories.js
```

Then serve the project root using your normal local development server and open:

```text
/user-stories.html
```

The viewer automatically fetches:

```text
./docs/USER_STORIES.md
```

If you open the HTML directly with a `file://` URL, most browsers block JavaScript from fetching another local file. In that case, use **Open file** and select `docs/USER_STORIES.md`, or drag the Markdown file onto the page.

## Included UI

- Automatic user-story extraction from Markdown
- P0 / P1 / P2 / Future priority handling
- Search across stories, actors, criteria and notes
- Priority, category, actor and status filters
- Document-order, priority, title, category and criteria-count sorting
- Grid and list views
- Summary statistics
- Expandable card summaries
- Full story detail drawer
- Acceptance-criteria extraction
- Copy story / copy deep link
- Drag-and-drop Markdown loading
- Light and dark themes
- Responsive mobile layout
- Keyboard shortcuts (`/` to search, `Esc` to close details)
- No framework or package dependency

## Parser conventions

The parser is intentionally tolerant. It detects common formats including:

```md
## P0 — Must Have
### US-AUTH-001 — Sign in

**Actor:** Registered user
**Priority:** P0

> As a registered user, I want to sign in so that I can access my data.

#### Acceptance Criteria
- [ ] Valid credentials create a session.
- [ ] Invalid credentials show a useful error.
```

It also detects inline/list-based stories that contain standard wording such as:

```md
- As a user, I want to add a member so that I can record debts with them.
```

Priority can be inherited from surrounding P0/P1/P2/Future headings when it is not repeated inside the story.
