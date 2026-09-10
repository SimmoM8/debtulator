const DebtulatorStories = (() => {
  "use strict";

  const SOURCE_PATH = "../docs/USER_STORIES.md";
  const REFRESH_INTERVAL_MS = 4000;

  const IMPLEMENTATION = {
    fully: { label: "Fully implemented", short: "[FI]", order: 0 },
    partly: { label: "Partly implemented", short: "[PI]", order: 1 },
    not: { label: "Not implemented", short: "—", order: 2 }
  };

  const PRIORITY = {
    P0: { label: "P0 — Core", order: 0 },
    P1: { label: "P1 — Collaboration & Growth", order: 1 },
    P2: { label: "P2 — Advanced", order: 2 },
    Future: { label: "Future — Regulated", order: 3 }
  };

  const state = {
    data: { stories: [], actors: [], areas: [] },
    sourceText: "",
    sourceName: "../docs/USER_STORIES.md",
    filters: {
      implementation: new Set(),
      priority: new Set(),
      actor: new Set(),
      area: new Set()
    },
    query: "",
    sort: "document",
    view: "grid",
    activeStory: null,
    autoRefresh: true,
    refreshTimer: null,
    loading: false
  };

  let el = {};

  function boot() {
    cacheElements();
    restorePreferences();
    bindEvents();
    updateViewButtons();
    loadFromProject({ announce: false });
    startRefreshLoop();
  }

  function cacheElements() {
    const ids = [
      "sourceState","sourceDot","sourceText","monitorLabel","lastChecked",
      "totalStat","fullyStat","partlyStat","notStat",
      "searchInput","sortSelect","gridViewButton","listViewButton",
      "mobileFiltersButton","mobileFilterCount","filtersSidebar","sidebarBackdrop","closeFiltersButton",
      "implementationFilters","priorityFilters","actorFilters","areaFilters","actorDefinitionCount",
      "clearAllButton","autoRefreshToggle","resultsCount","resultsDescription","activeFilterChips",
      "contentState","storiesGrid","storyTemplate","reloadButton","openFileButton","fileInput","themeButton",
      "drawerBackdrop","storyDrawer","drawerKicker","drawerTitle","drawerContent","closeDrawerButton",
      "copyStoryButton","copyLinkButton","dropOverlay","toast"
    ];
    ids.forEach((id) => { el[id] = document.getElementById(id); });
  }

  function restorePreferences() {
    const savedTheme = localStorage.getItem("debtulator-stories-theme");
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = savedTheme || (prefersDark ? "dark" : "light");

    state.view = localStorage.getItem("debtulator-stories-view") === "list" ? "list" : "grid";
    state.autoRefresh = localStorage.getItem("debtulator-stories-auto-refresh") !== "false";
    el.autoRefreshToggle.checked = state.autoRefresh;
    updateMonitorLabel();
  }

  function bindEvents() {
    el.searchInput.addEventListener("input", (event) => {
      state.query = event.target.value;
      render();
    });

    el.sortSelect.addEventListener("change", (event) => {
      state.sort = event.target.value;
      render();
    });

    el.gridViewButton.addEventListener("click", () => setView("grid"));
    el.listViewButton.addEventListener("click", () => setView("list"));

    el.reloadButton.addEventListener("click", () => loadFromProject({ announce: true }));
    el.openFileButton.addEventListener("click", () => el.fileInput.click());
    el.fileInput.addEventListener("change", async () => {
      const file = el.fileInput.files?.[0];
      if (file) await loadLocalFile(file);
      el.fileInput.value = "";
    });

    el.themeButton.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("debtulator-stories-theme", next);
    });

    el.clearAllButton.addEventListener("click", clearFilters);

    el.autoRefreshToggle.addEventListener("change", () => {
      state.autoRefresh = el.autoRefreshToggle.checked;
      localStorage.setItem("debtulator-stories-auto-refresh", String(state.autoRefresh));
      updateMonitorLabel();
    });

    document.querySelectorAll("[data-overview-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        const value = button.dataset.overviewFilter;
        state.filters.implementation.clear();
        if (value !== "all") state.filters.implementation.add(value);
        syncFilterInputs();
        render();
      });
    });

    document.querySelectorAll(".filter-section-title").forEach((button) => {
      button.addEventListener("click", () => {
        const section = button.closest(".filter-section");
        const collapsed = section.classList.toggle("collapsed");
        button.setAttribute("aria-expanded", String(!collapsed));
      });
    });

    el.mobileFiltersButton.addEventListener("click", openSidebar);
    el.closeFiltersButton.addEventListener("click", closeSidebar);
    el.sidebarBackdrop.addEventListener("click", closeSidebar);

    el.closeDrawerButton.addEventListener("click", closeDrawer);
    el.drawerBackdrop.addEventListener("click", closeDrawer);
    el.copyStoryButton.addEventListener("click", copyActiveStory);
    el.copyLinkButton.addEventListener("click", copyActiveLink);

    document.addEventListener("keydown", (event) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const typing = ["input", "textarea", "select"].includes(tag);
      if (event.key === "/" && !typing) {
        event.preventDefault();
        el.searchInput.focus();
      }
      if (event.key === "Escape") {
        if (state.activeStory) closeDrawer();
        else closeSidebar();
      }
    });

    window.addEventListener("hashchange", openFromHash);

    let dragDepth = 0;
    window.addEventListener("dragenter", (event) => {
      if (!hasFiles(event)) return;
      dragDepth += 1;
      el.dropOverlay.classList.add("visible");
    });
    window.addEventListener("dragleave", (event) => {
      if (!hasFiles(event)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) el.dropOverlay.classList.remove("visible");
    });
    window.addEventListener("dragover", (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
    });
    window.addEventListener("drop", async (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth = 0;
      el.dropOverlay.classList.remove("visible");
      const file = [...event.dataTransfer.files].find((candidate) => candidate.name.toLowerCase().endsWith(".md"));
      if (file) await loadLocalFile(file);
      else toast("Please drop a Markdown (.md) file");
    });
  }

  function startRefreshLoop() {
    clearInterval(state.refreshTimer);
    state.refreshTimer = setInterval(() => {
      if (state.autoRefresh && !state.loading && state.sourceName === "../docs/USER_STORIES.md") {
        loadFromProject({ silent: true });
      }
    }, REFRESH_INTERVAL_MS);
  }

  async function loadFromProject({ announce = false, silent = false } = {}) {
    if (!silent) setLoading();
    state.loading = true;

    try {
      const response = await fetch(`${SOURCE_PATH}?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const markdown = await response.text();

      const changed = markdown !== state.sourceText;
      if (changed || !state.data.stories.length) {
        applyMarkdown(markdown, "../docs/USER_STORIES.md");
        if (announce && state.data.stories.length) toast(`Loaded ${state.data.stories.length} stories`);
        else if (silent && changed) toast("USER_STORIES.md updated");
      } else if (!silent) {
        showStories();
        render();
      }

      setSourceState("ready", `${state.data.stories.length} stories · live source`);
      el.lastChecked.textContent = `Last checked ${formatTime(new Date())}`;
    } catch (error) {
      if (!state.data.stories.length) showLoadError();
      else setSourceState("error", "Source check failed · showing last load");
      el.lastChecked.textContent = "Could not check project source";
      console.warn("USER_STORIES.md could not be loaded:", error);
    } finally {
      state.loading = false;
    }
  }

  async function loadLocalFile(file) {
    setLoading(`Reading ${file.name}`);
    state.loading = true;
    try {
      const markdown = await file.text();
      applyMarkdown(markdown, file.name);
      setSourceState("ready", `${state.data.stories.length} stories · ${file.name}`);
      el.lastChecked.textContent = "Manual file loaded";
      toast(`Loaded ${state.data.stories.length} stories`);
    } catch (error) {
      showError("That Markdown file could not be read.", "Choose another Markdown file and try again.");
      console.error(error);
    } finally {
      state.loading = false;
    }
  }

  function applyMarkdown(markdown, sourceName) {
    const data = parseDocument(markdown);
    if (!data.stories.length) {
      showError("No user stories found.", "The viewer expects story headings such as “## AUTH-001 — Create an account”.");
      return;
    }

    state.sourceText = markdown;
    state.sourceName = sourceName;
    state.data = data;

    pruneFilters();
    renderSidebar();
    updateOverview();
    showStories();
    render();
    openFromHash();
  }

  function parseDocument(markdown) {
    const text = String(markdown || "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    const lines = text.split("\n");
    const actors = parseCanonicalActors(lines);
    const stories = [];
    let currentArea = "General";

    for (let index = 0; index < lines.length; index += 1) {
      const major = lines[index].match(/^#\s+(\d+)\.\s+(.+?)\s*$/);
      if (major) {
        currentArea = cleanText(major[2]);
        continue;
      }

      const storyHeading = lines[index].match(/^##\s+([A-Z][A-Z0-9-]*-\d{3})\s+[—–-]\s+(.+?)\s*$/);
      if (!storyHeading) continue;

      const start = index;
      let end = lines.length;
      for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
        if (/^(?:#\s|##\s)/.test(lines[cursor])) {
          end = cursor;
          break;
        }
      }

      const blockLines = lines.slice(start + 1, end);
      const blockText = blockLines.join("\n");
      const actorRaw = readMetadataLine(blockLines, "Actor");
      const priorityRaw = readMetadataLine(blockLines, "Priority");
      const implementationRaw = readMetadataLine(blockLines, "Implementation status");

      const story = {
        id: storyHeading[1],
        title: cleanText(storyHeading[2]),
        area: currentArea,
        actor: canonicaliseActor(actorRaw, actors, blockLines),
        priority: canonicalisePriority(priorityRaw),
        implementation: canonicaliseImplementation(implementationRaw),
        statement: parseStoryStatement(blockLines),
        criteria: parseAcceptanceCriteria(blockLines),
        notesMarkdown: stripStoryMetadataAndStatement(blockLines).trim(),
        sourceOrder: stories.length,
        sourceLine: start + 1,
        rawMarkdown: lines.slice(start, end).join("\n")
      };

      stories.push(story);
      index = end - 1;
    }

    const usedAreas = unique(stories.map((story) => story.area));
    return {
      actors,
      areas: usedAreas,
      stories,
      diagnostics: {
        storyCount: stories.length,
        unclassifiedActorCount: stories.filter((story) => !story.actor).length
      }
    };
  }

  function parseCanonicalActors(lines) {
    const actors = [];
    let inActors = false;

    for (const line of lines) {
      if (/^#\s+4\.\s+Actors\s*$/i.test(line)) {
        inActors = true;
        continue;
      }
      if (inActors && /^#\s+\d+\./.test(line)) break;
      if (!inActors) continue;

      const actorHeading = line.match(/^##\s+4\.([1-7])\s+(.+?)\s*$/);
      if (actorHeading) actors.push(cleanText(actorHeading[2]));
    }

    return unique(actors).slice(0, 7);
  }

  function readMetadataLine(lines, name) {
    const prefix = `**${name}:**`;
    const line = lines.find((candidate) => candidate.trim().toLowerCase().startsWith(prefix.toLowerCase()));
    if (!line) return "";
    return cleanText(line.trim().slice(prefix.length));
  }

  function canonicaliseActor(raw, canonicalActors, blockLines) {
    const rawNormal = normalise(raw);
    let match = canonicalActors.find((actor) => normalise(actor) === rawNormal);
    if (match) return match;

    match = canonicalActors.find((actor) => rawNormal && (rawNormal.includes(normalise(actor)) || normalise(actor).includes(rawNormal)));
    if (match) return match;

    const statement = parseStoryStatement(blockLines);
    const statementNormal = normalise(statement);
    match = canonicalActors.find((actor) => statementNormal.includes(normalise(actor)));
    return match || "";
  }

  function canonicalisePriority(raw) {
    const value = cleanText(raw);
    if (/^P0\b/i.test(value)) return "P0";
    if (/^P1\b/i.test(value)) return "P1";
    if (/^P2\b/i.test(value)) return "P2";
    if (/^Future\b/i.test(value)) return "Future";
    return "";
  }

  function canonicaliseImplementation(raw) {
    const value = cleanText(raw).toLowerCase();
    if (/\[?fi\]?/.test(value) || /fully\s+implemented/.test(value)) return "fully";
    if (/\[?pi\]?/.test(value) || /part(?:ly|ially)\s+implemented/.test(value)) return "partly";
    return "not";
  }

  function parseStoryStatement(lines) {
    const cleaned = lines.map((line) => cleanText(line)).filter(Boolean);
    const asIndex = cleaned.findIndex((line) => /^As\s+(?:an?|the)\b/i.test(line));
    if (asIndex < 0) return "";

    const parts = [cleaned[asIndex]];
    for (let i = asIndex + 1; i < Math.min(cleaned.length, asIndex + 5); i += 1) {
      if (/^I\s+(?:want|need|would like|should be able)\b/i.test(cleaned[i]) || /^so that\b/i.test(cleaned[i])) {
        parts.push(cleaned[i]);
      } else if (parts.length >= 3) {
        break;
      }
    }
    return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  function parseAcceptanceCriteria(lines) {
    const criteria = [];
    let inside = false;
    let headingLevel = 0;

    for (const line of lines) {
      const heading = line.match(/^(#{3,6})\s+(.+?)\s*$/);
      if (heading) {
        const level = heading[1].length;
        const title = cleanText(heading[2]);
        if (/^Acceptance criteria$/i.test(title)) {
          inside = true;
          headingLevel = level;
          continue;
        }
        if (inside && level <= headingLevel) {
          inside = false;
        }
      }

      if (!inside) continue;
      const bullet = line.match(/^\s*[-*+]\s+(?:\[[ xX]\]\s*)?(.+?)\s*$/);
      const numbered = line.match(/^\s*\d+[.)]\s+(.+?)\s*$/);
      if (bullet || numbered) criteria.push(cleanText((bullet || numbered)[1]));
    }

    return criteria;
  }

  function stripStoryMetadataAndStatement(lines) {
    let inAcceptance = false;
    const output = [];

    for (const line of lines) {
      if (/^\*\*(?:Actor|Priority|Implementation status):\*\*/i.test(line.trim())) continue;
      const plain = cleanText(line);
      if (/^As\s+(?:an?|the)\b/i.test(plain) || /^I\s+(?:want|need|would like|should be able)\b/i.test(plain) || /^so that\b/i.test(plain)) continue;
      if (/^###\s+Acceptance criteria\s*$/i.test(line.trim())) {
        inAcceptance = true;
        continue;
      }
      if (inAcceptance) {
        if (/^#{1,3}\s+/.test(line)) inAcceptance = false;
        else continue;
      }
      output.push(line);
    }

    return output.join("\n").replace(/^\s+|\s+$/g, "");
  }

  function renderSidebar() {
    renderImplementationFilters();
    renderCheckboxGroup(el.priorityFilters, [
      { value: "P0", label: PRIORITY.P0.label },
      { value: "P1", label: PRIORITY.P1.label },
      { value: "P2", label: PRIORITY.P2.label },
      { value: "Future", label: PRIORITY.Future.label }
    ], "priority");

    renderCheckboxGroup(
      el.actorFilters,
      state.data.actors.map((actor) => ({ value: actor, label: actor })),
      "actor"
    );

    renderCheckboxGroup(
      el.areaFilters,
      state.data.areas.map((area) => ({ value: area, label: area })),
      "area"
    );

    el.actorDefinitionCount.textContent = `${state.data.actors.length} defined`;
    syncFilterInputs();
  }

  function renderImplementationFilters() {
    const counts = countBy(state.data.stories, (story) => story.implementation);
    el.implementationFilters.innerHTML = ["fully", "partly", "not"].map((key) => {
      const definition = IMPLEMENTATION[key];
      const note = key === "fully" ? "Complete story" : key === "partly" ? "Some required behaviour exists" : "No implementation marker";
      return `
        <button class="status-filter ${key}" type="button" data-status="${key}">
          <span class="status-filter-check">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 12 3 3 7-7"></path></svg>
          </span>
          <span class="status-filter-copy">
            <strong>${escapeHtml(definition.label)}</strong>
            <small>${escapeHtml(note)}</small>
          </span>
          <span class="status-filter-count">${counts[key] || 0}</span>
        </button>
      `;
    }).join("");

    el.implementationFilters.querySelectorAll("[data-status]").forEach((button) => {
      button.addEventListener("click", () => {
        toggleSetValue(state.filters.implementation, button.dataset.status);
        syncFilterInputs();
        render();
      });
    });
  }

  function renderCheckboxGroup(container, options, dimension) {
    const counts = countBy(state.data.stories, (story) => story[dimension]);
    container.innerHTML = options.map(({ value, label }) => `
      <label class="filter-option">
        <input type="checkbox" data-filter-dimension="${dimension}" value="${escapeAttribute(value)}">
        <span class="check-box">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 12 3 3 7-7"></path></svg>
        </span>
        <span class="filter-option-label">${escapeHtml(label)}</span>
        <span class="filter-option-count">${counts[value] || 0}</span>
      </label>
    `).join("");

    container.querySelectorAll("input[data-filter-dimension]").forEach((input) => {
      input.addEventListener("change", () => {
        const set = state.filters[dimension];
        if (input.checked) set.add(input.value);
        else set.delete(input.value);
        render();
      });
    });
  }

  function syncFilterInputs() {
    el.implementationFilters.querySelectorAll("[data-status]").forEach((button) => {
      button.classList.toggle("selected", state.filters.implementation.has(button.dataset.status));
    });

    document.querySelectorAll("input[data-filter-dimension]").forEach((input) => {
      const dimension = input.dataset.filterDimension;
      input.checked = state.filters[dimension].has(input.value);
    });
  }

  function pruneFilters() {
    const valid = {
      implementation: new Set(["fully", "partly", "not"]),
      priority: new Set(Object.keys(PRIORITY)),
      actor: new Set(state.data.actors),
      area: new Set(state.data.areas)
    };

    Object.entries(state.filters).forEach(([dimension, set]) => {
      [...set].forEach((value) => {
        if (!valid[dimension].has(value)) set.delete(value);
      });
    });
  }

  function updateOverview() {
    const counts = countBy(state.data.stories, (story) => story.implementation);
    el.totalStat.textContent = state.data.stories.length;
    el.fullyStat.textContent = counts.fully || 0;
    el.partlyStat.textContent = counts.partly || 0;
    el.notStat.textContent = counts.not || 0;
  }

  function render() {
    if (!state.data.stories.length) return;
    const stories = filteredStories();

    el.storiesGrid.replaceChildren();
    el.storiesGrid.classList.toggle("list-view", state.view === "list");

    if (!stories.length) {
      el.storiesGrid.hidden = true;
      el.contentState.hidden = false;
      el.contentState.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path><path d="M8 11h6"></path></svg>
        <h2>No stories match</h2>
        <p>Remove one or more filters, or try a different search.</p>
        <div class="state-actions"><button class="secondary-button" id="emptyClearButton" type="button">Clear filters</button></div>
      `;
      document.getElementById("emptyClearButton").addEventListener("click", clearFilters);
    } else {
      el.contentState.hidden = true;
      el.storiesGrid.hidden = false;
      const fragment = document.createDocumentFragment();
      stories.forEach((story) => fragment.appendChild(createStoryCard(story)));
      el.storiesGrid.appendChild(fragment);
    }

    el.resultsCount.textContent = `${stories.length} ${stories.length === 1 ? "story" : "stories"}`;
    el.resultsDescription.textContent = stories.length === state.data.stories.length
      ? `from ${state.sourceName}`
      : `of ${state.data.stories.length} from ${state.sourceName}`;

    renderActiveFilters();
    updateFilterCount();
  }

  function filteredStories() {
    const tokens = normalise(state.query).split(/\s+/).filter(Boolean);

    const stories = state.data.stories.filter((story) => {
      if (state.filters.implementation.size && !state.filters.implementation.has(story.implementation)) return false;
      if (state.filters.priority.size && !state.filters.priority.has(story.priority)) return false;
      if (state.filters.actor.size && !state.filters.actor.has(story.actor)) return false;
      if (state.filters.area.size && !state.filters.area.has(story.area)) return false;

      if (tokens.length) {
        const searchable = normalise([
          story.id, story.title, story.area, story.actor, story.priority,
          IMPLEMENTATION[story.implementation]?.label || "",
          story.statement, story.criteria.join(" "), story.notesMarkdown
        ].join(" "));
        if (!tokens.every((token) => searchable.includes(token))) return false;
      }
      return true;
    });

    return [...stories].sort(sortStories);
  }

  function sortStories(a, b) {
    switch (state.sort) {
      case "implementation":
        return IMPLEMENTATION[a.implementation].order - IMPLEMENTATION[b.implementation].order || a.sourceOrder - b.sourceOrder;
      case "priority":
        return (PRIORITY[a.priority]?.order ?? 99) - (PRIORITY[b.priority]?.order ?? 99) || a.sourceOrder - b.sourceOrder;
      case "id":
        return a.id.localeCompare(b.id, undefined, { numeric: true });
      case "title":
        return a.title.localeCompare(b.title);
      case "area":
        return a.area.localeCompare(b.area) || a.sourceOrder - b.sourceOrder;
      case "criteria":
        return b.criteria.length - a.criteria.length || a.sourceOrder - b.sourceOrder;
      default:
        return a.sourceOrder - b.sourceOrder;
    }
  }

  function createStoryCard(story) {
    const card = el.storyTemplate.content.firstElementChild.cloneNode(true);
    card.classList.add(`status-${story.implementation}`);
    card.dataset.storyId = story.id;

    const implementation = card.querySelector(".implementation-badge");
    implementation.classList.add(story.implementation);
    implementation.textContent = IMPLEMENTATION[story.implementation].label;

    const priority = card.querySelector(".priority-badge");
    priority.classList.add(priorityClass(story.priority));
    priority.textContent = story.priority === "Future" ? "Future" : (story.priority || "—");

    card.querySelector(".story-id").textContent = story.id;
    card.querySelector(".story-area").textContent = story.area;
    card.querySelector("h3").textContent = story.title;
    card.querySelector(".story-statement").textContent = story.statement || "No user-story statement detected.";
    card.querySelector(".story-actor").textContent = story.actor || "Actor not classified";
    card.querySelector(".story-actor").title = story.actor || "Actor not classified";
    card.querySelector(".criteria-count").textContent = `${story.criteria.length} ${story.criteria.length === 1 ? "criterion" : "criteria"}`;

    card.querySelector(".story-open-button").addEventListener("click", (event) => {
      event.stopPropagation();
      openStory(story);
    });
    card.addEventListener("click", (event) => {
      if (event.target.closest("button, a, input, select")) return;
      openStory(story);
    });

    return card;
  }

  function renderActiveFilters() {
    const chips = [];
    const add = (dimension, value, label) => chips.push({ dimension, value, label });

    state.filters.implementation.forEach((value) => add("implementation", value, IMPLEMENTATION[value].label));
    state.filters.priority.forEach((value) => add("priority", value, PRIORITY[value]?.label || value));
    state.filters.actor.forEach((value) => add("actor", value, value));
    state.filters.area.forEach((value) => add("area", value, value));

    if (state.query.trim()) chips.push({ dimension: "query", value: state.query, label: `Search: ${state.query}` });

    el.activeFilterChips.innerHTML = chips.map((chip, index) => `
      <button class="active-chip" type="button" data-chip-index="${index}">
        <span>${escapeHtml(chip.label)}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"></path></svg>
      </button>
    `).join("");

    el.activeFilterChips.querySelectorAll("[data-chip-index]").forEach((button) => {
      button.addEventListener("click", () => {
        const chip = chips[Number(button.dataset.chipIndex)];
        if (chip.dimension === "query") {
          state.query = "";
          el.searchInput.value = "";
        } else {
          state.filters[chip.dimension].delete(chip.value);
          syncFilterInputs();
        }
        render();
      });
    });
  }

  function updateFilterCount() {
    const count = Object.values(state.filters).reduce((sum, set) => sum + set.size, 0) + Number(Boolean(state.query.trim()));
    el.mobileFilterCount.textContent = count;
    el.mobileFilterCount.classList.toggle("hidden", count === 0);
  }

  function openStory(story, updateHash = true) {
    state.activeStory = story;
    el.drawerKicker.textContent = `${story.area} · ${story.id}`;
    el.drawerTitle.textContent = story.title;
    el.drawerContent.innerHTML = renderStoryDrawer(story);
    el.drawerBackdrop.hidden = false;
    el.storyDrawer.classList.add("open");
    el.storyDrawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    if (updateHash) history.replaceState(null, "", `#${encodeURIComponent(story.id)}`);
    setTimeout(() => el.closeDrawerButton.focus(), 10);
  }

  function renderStoryDrawer(story) {
    const criteria = story.criteria.length
      ? `<ul class="criteria-list">${story.criteria.map((item) => `
          <li><span class="criteria-tick"><svg viewBox="0 0 24 24"><path d="m7 12 3 3 7-7"></path></svg></span><span>${escapeHtml(item)}</span></li>
        `).join("")}</ul>`
      : `<p class="markdown-body">No explicit acceptance criteria are listed for this story.</p>`;

    const notes = story.notesMarkdown
      ? `<div class="markdown-body">${renderMarkdown(story.notesMarkdown)}</div>`
      : `<p class="markdown-body">No additional story notes are present.</p>`;

    return `
      <div class="drawer-badges">
        <span class="implementation-badge ${story.implementation}">${escapeHtml(IMPLEMENTATION[story.implementation].label)}</span>
        <span class="priority-badge ${priorityClass(story.priority)}">${escapeHtml(story.priority === "Future" ? "Future — Regulated" : story.priority)}</span>
        <span class="story-id">${escapeHtml(story.id)}</span>
      </div>

      <section class="drawer-section">
        <h3 class="drawer-section-title">User story</h3>
        <blockquote class="story-quote">${escapeHtml(story.statement || "No user-story statement detected.")}</blockquote>
      </section>

      <section class="drawer-section">
        <h3 class="drawer-section-title">Metadata</h3>
        <div class="detail-grid">
          <div class="detail"><span>Actor</span><strong>${escapeHtml(story.actor || "Not classified")}</strong></div>
          <div class="detail"><span>Priority</span><strong>${escapeHtml(PRIORITY[story.priority]?.label || "Not specified")}</strong></div>
          <div class="detail"><span>Implementation</span><strong>${escapeHtml(IMPLEMENTATION[story.implementation].label)}</strong></div>
          <div class="detail"><span>Feature area</span><strong>${escapeHtml(story.area)}</strong></div>
        </div>
      </section>

      <section class="drawer-section">
        <h3 class="drawer-section-title">Acceptance criteria · ${story.criteria.length}</h3>
        ${criteria}
      </section>

      <section class="drawer-section">
        <h3 class="drawer-section-title">Additional requirements</h3>
        ${notes}
      </section>
    `;
  }

  function closeDrawer() {
    if (!state.activeStory) return;
    state.activeStory = null;
    el.storyDrawer.classList.remove("open");
    el.storyDrawer.setAttribute("aria-hidden", "true");
    el.drawerBackdrop.hidden = true;
    document.body.style.overflow = "";
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  }

  function openFromHash() {
    if (!state.data.stories.length || !location.hash) return;
    const id = decodeURIComponent(location.hash.slice(1));
    const story = state.data.stories.find((candidate) => candidate.id.toLowerCase() === id.toLowerCase());
    if (story) openStory(story, false);
  }

  function openSidebar() {
    el.filtersSidebar.classList.add("open");
    el.sidebarBackdrop.hidden = false;
  }

  function closeSidebar() {
    el.filtersSidebar.classList.remove("open");
    el.sidebarBackdrop.hidden = true;
  }

  function setView(view) {
    state.view = view === "list" ? "list" : "grid";
    localStorage.setItem("debtulator-stories-view", state.view);
    updateViewButtons();
    render();
  }

  function updateViewButtons() {
    el.gridViewButton.classList.toggle("active", state.view === "grid");
    el.listViewButton.classList.toggle("active", state.view === "list");
  }

  function clearFilters() {
    Object.values(state.filters).forEach((set) => set.clear());
    state.query = "";
    el.searchInput.value = "";
    syncFilterInputs();
    render();
  }

  function toggleSetValue(set, value) {
    if (set.has(value)) set.delete(value);
    else set.add(value);
  }

  function setLoading(label = "Reading user stories") {
    el.storiesGrid.hidden = true;
    el.contentState.hidden = false;
    el.contentState.innerHTML = `
      <div class="spinner" aria-hidden="true"></div>
      <h2>${escapeHtml(label)}</h2>
      <p>Loading <code>docs/USER_STORIES.md</code>…</p>
    `;
    setSourceState("", "Reading docs/USER_STORIES.md");
  }

  function showStories() {
    el.contentState.hidden = true;
    el.storiesGrid.hidden = false;
  }

  function showLoadError() {
    showError(
      "Couldn’t load docs/USER_STORIES.md",
      "Serve the Debtulator root through a local web server, or open the Markdown file manually. Browsers normally block local file-to-file reads when the HTML is opened directly with file://."
    );
    setSourceState("error", "Project source unavailable");
  }

  function showError(title, description) {
    el.storiesGrid.hidden = true;
    el.contentState.hidden = false;
    el.contentState.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5M12 17h.01"></path><path d="M10.3 3.8 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.8a2 2 0 0 0-3.4 0Z"></path></svg>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(description)}</p>
      <div class="state-actions">
        <button class="primary-button" id="stateOpenFileButton" type="button">Open Markdown file</button>
        <button class="secondary-button" id="stateRetryButton" type="button">Try again</button>
      </div>
    `;
    document.getElementById("stateOpenFileButton").addEventListener("click", () => el.fileInput.click());
    document.getElementById("stateRetryButton").addEventListener("click", () => loadFromProject({ announce: true }));
  }

  function setSourceState(type, text) {
    el.sourceDot.className = `source-dot${type ? ` ${type}` : ""}`;
    el.sourceText.textContent = text;
  }

  function updateMonitorLabel() {
    el.monitorLabel.textContent = state.autoRefresh ? "Auto-refresh enabled" : "Auto-refresh paused";
  }

  async function copyActiveStory() {
    if (!state.activeStory) return;
    const story = state.activeStory;
    const lines = [
      `${story.id} — ${story.title}`,
      `Actor: ${story.actor || "Not classified"}`,
      `Priority: ${PRIORITY[story.priority]?.label || story.priority}`,
      `Implementation status: ${IMPLEMENTATION[story.implementation].short}`,
      "",
      story.statement
    ];
    if (story.criteria.length) {
      lines.push("", "Acceptance criteria:");
      story.criteria.forEach((criterion) => lines.push(`- ${criterion}`));
    }
    await copyText(lines.join("\n").trim(), "Story copied");
  }

  async function copyActiveLink() {
    if (!state.activeStory) return;
    await copyText(`${location.href.split("#")[0]}#${encodeURIComponent(state.activeStory.id)}`, "Story link copied");
  }

  async function copyText(text, message) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const field = document.createElement("textarea");
      field.value = text;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    toast(message);
  }

  function renderMarkdown(markdown) {
    const lines = String(markdown || "").split("\n");
    let html = "";
    let list = "";
    let paragraph = [];

    const flushParagraph = () => {
      if (!paragraph.length) return;
      html += `<p>${inlineMarkdown(paragraph.join(" "))}</p>`;
      paragraph = [];
    };
    const closeList = () => {
      if (!list) return;
      html += `</${list}>`;
      list = "";
    };

    lines.forEach((line) => {
      const heading = line.match(/^(#{3,6})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        closeList();
        html += `<h3>${inlineMarkdown(heading[2])}</h3>`;
        return;
      }

      const bullet = line.match(/^\s*[-*+]\s+(?:\[[ xX]\]\s*)?(.+)$/);
      const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
      if (bullet || numbered) {
        flushParagraph();
        const nextList = bullet ? "ul" : "ol";
        if (list && list !== nextList) closeList();
        if (!list) {
          list = nextList;
          html += `<${list}>`;
        }
        html += `<li>${inlineMarkdown((bullet || numbered)[1])}</li>`;
        return;
      }

      const quote = line.match(/^\s*>\s?(.+)$/);
      if (quote) {
        flushParagraph();
        closeList();
        html += `<blockquote>${inlineMarkdown(quote[1])}</blockquote>`;
        return;
      }

      if (!line.trim()) {
        flushParagraph();
        closeList();
        return;
      }
      paragraph.push(line.trim());
    });

    flushParagraph();
    closeList();
    return html;
  }

  function inlineMarkdown(value) {
    let safe = escapeHtml(value);
    safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>");
    safe = safe.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    safe = safe.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    safe = safe.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
    safe = safe.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    return safe;
  }

  function cleanText(value) {
    return String(value || "")
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[*_~`]/g, "")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalise(value) {
    return cleanText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  function countBy(items, keyFn) {
    return items.reduce((counts, item) => {
      const key = keyFn(item);
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function priorityClass(priority) {
    return priority === "Future" ? "future" : String(priority || "").toLowerCase();
  }

  function formatTime(date) {
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(date);
  }

  function hasFiles(event) {
    return [...(event.dataTransfer?.types || [])].includes("Files");
  }

  function toast(message) {
    el.toast.textContent = message;
    el.toast.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.toast.classList.remove("show"), 1700);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  return {
    boot,
    parseDocument,
    canonicaliseImplementation,
    canonicalisePriority
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = DebtulatorStories;
}

if (typeof document !== "undefined") {
  DebtulatorStories.boot();
}
