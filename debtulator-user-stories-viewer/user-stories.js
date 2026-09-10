(() => {
  "use strict";

  const SOURCE_PATH = "./docs/USER_STORIES.md";
  const PRIORITY_ORDER = { P0: 0, P1: 1, P2: 2, Future: 3, Unspecified: 4 };

  const state = {
    stories: [],
    sourceName: "USER_STORIES.md",
    sourceMarkdown: "",
    query: "",
    priorities: new Set(),
    category: "",
    actor: "",
    status: "",
    sort: "source",
    view: localStorage.getItem("debtulator-story-view") || "grid",
    summariesExpanded: false,
    activeStory: null
  };

  const el = {
    sourcePill: byId("sourcePill"),
    sourceDot: byId("sourceDot"),
    sourceLabel: byId("sourceLabel"),
    loadedTime: byId("loadedTime"),
    totalStat: byId("totalStat"),
    p0Stat: byId("p0Stat"),
    p1Stat: byId("p1Stat"),
    futureStat: byId("futureStat"),
    searchInput: byId("searchInput"),
    filtersToggle: byId("filtersToggle"),
    filtersPanel: byId("filtersPanel"),
    filterCount: byId("filterCount"),
    categorySelect: byId("categorySelect"),
    actorSelect: byId("actorSelect"),
    statusSelect: byId("statusSelect"),
    sortSelect: byId("sortSelect"),
    clearFiltersButton: byId("clearFiltersButton"),
    priorityChips: byId("priorityChips"),
    gridViewButton: byId("gridViewButton"),
    listViewButton: byId("listViewButton"),
    resultsCount: byId("resultsCount"),
    resultsContext: byId("resultsContext"),
    expandAllButton: byId("expandAllButton"),
    contentState: byId("contentState"),
    storiesGrid: byId("storiesGrid"),
    storyCardTemplate: byId("storyCardTemplate"),
    reloadButton: byId("reloadButton"),
    openFileButton: byId("openFileButton"),
    fileInput: byId("fileInput"),
    themeButton: byId("themeButton"),
    drawerBackdrop: byId("drawerBackdrop"),
    storyDrawer: byId("storyDrawer"),
    drawerKicker: byId("drawerKicker"),
    drawerTitle: byId("drawerTitle"),
    drawerBody: byId("drawerBody"),
    closeDrawerButton: byId("closeDrawerButton"),
    copyStoryButton: byId("copyStoryButton"),
    copyLinkButton: byId("copyLinkButton"),
    dropOverlay: byId("dropOverlay"),
    toast: byId("toast")
  };

  init();

  function init() {
    applyInitialTheme();
    bindEvents();
    setView(state.view);
    loadMarkdown();
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function bindEvents() {
    el.searchInput.addEventListener("input", (event) => {
      state.query = event.target.value;
      render();
    });

    el.filtersToggle.addEventListener("click", () => {
      const opening = el.filtersPanel.hidden;
      el.filtersPanel.hidden = !opening;
      el.filtersToggle.setAttribute("aria-expanded", String(opening));
    });

    el.priorityChips.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-priority]");
      if (!chip) return;
      const priority = chip.dataset.priority;

      if (priority === "all") {
        state.priorities.clear();
      } else {
        if (state.priorities.has(priority)) state.priorities.delete(priority);
        else state.priorities.add(priority);
      }
      syncPriorityChips();
      render();
    });

    el.categorySelect.addEventListener("change", (event) => {
      state.category = event.target.value;
      render();
    });
    el.actorSelect.addEventListener("change", (event) => {
      state.actor = event.target.value;
      render();
    });
    el.statusSelect.addEventListener("change", (event) => {
      state.status = event.target.value;
      render();
    });
    el.sortSelect.addEventListener("change", (event) => {
      state.sort = event.target.value;
      render();
    });

    el.clearFiltersButton.addEventListener("click", clearFilters);
    el.gridViewButton.addEventListener("click", () => setView("grid"));
    el.listViewButton.addEventListener("click", () => setView("list"));

    el.expandAllButton.addEventListener("click", () => {
      state.summariesExpanded = !state.summariesExpanded;
      el.expandAllButton.textContent = state.summariesExpanded ? "Collapse summaries" : "Expand summaries";
      document.querySelectorAll(".story-summary").forEach((summary) => {
        summary.hidden = !state.summariesExpanded;
      });
      document.querySelectorAll(".summary-toggle").forEach((button) => {
        button.textContent = state.summariesExpanded ? "Hide summary" : "Show summary";
      });
    });

    el.reloadButton.addEventListener("click", loadMarkdown);
    el.openFileButton.addEventListener("click", () => el.fileInput.click());
    el.fileInput.addEventListener("change", async () => {
      const file = el.fileInput.files?.[0];
      if (file) await loadFile(file);
      el.fileInput.value = "";
    });

    el.themeButton.addEventListener("click", toggleTheme);
    el.closeDrawerButton.addEventListener("click", closeDrawer);
    el.drawerBackdrop.addEventListener("click", closeDrawer);
    el.copyStoryButton.addEventListener("click", copyActiveStory);
    el.copyLinkButton.addEventListener("click", copyActiveLink);

    document.addEventListener("keydown", (event) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const typing = tag === "input" || tag === "textarea" || tag === "select";
      if (event.key === "/" && !typing) {
        event.preventDefault();
        el.searchInput.focus();
      }
      if (event.key === "Escape" && state.activeStory) closeDrawer();
    });

    let dragDepth = 0;
    window.addEventListener("dragenter", (event) => {
      if (!hasFiles(event)) return;
      dragDepth++;
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
      const file = [...event.dataTransfer.files].find((item) => item.name.toLowerCase().endsWith(".md"));
      if (file) await loadFile(file);
      else showToast("Drop a Markdown (.md) file");
    });

    window.addEventListener("hashchange", openStoryFromHash);
  }

  function hasFiles(event) {
    return [...(event.dataTransfer?.types || [])].includes("Files");
  }

  async function loadMarkdown() {
    setLoading();
    try {
      const response = await fetch(`${SOURCE_PATH}?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const markdown = await response.text();
      loadParsedMarkdown(markdown, "docs/USER_STORIES.md");
    } catch (error) {
      console.warn("Could not automatically load USER_STORIES.md:", error);
      setLoadError();
    }
  }

  async function loadFile(file) {
    setLoading(`Reading ${file.name}`);
    try {
      const markdown = await file.text();
      loadParsedMarkdown(markdown, file.name);
    } catch (error) {
      console.error(error);
      setGenericError("That Markdown file could not be read.");
    }
  }

  function loadParsedMarkdown(markdown, sourceName) {
    const stories = parseUserStories(markdown);
    state.stories = stories;
    state.sourceName = sourceName;
    state.sourceMarkdown = markdown;
    state.activeStory = null;

    if (!stories.length) {
      setGenericError(
        "No user stories were detected.",
        "The parser looks for story headings, “As a… I want…” statements, and common user-story list formats."
      );
      setSourceStatus("error", `0 stories · ${sourceName}`);
      return;
    }

    populateFilters(stories);
    updateStats(stories);
    setSourceStatus("ready", `${stories.length} stories · ${sourceName}`);
    el.loadedTime.textContent = formatLoadedTime(new Date());
    render();
    openStoryFromHash();
  }

  function setLoading(label = "Loading user stories") {
    el.storiesGrid.hidden = true;
    el.contentState.hidden = false;
    el.contentState.className = "content-state loading-state";
    el.contentState.innerHTML = `
      <div class="spinner" aria-hidden="true"></div>
      <h2>${escapeHtml(label)}</h2>
      <p>Reading <code>${escapeHtml(SOURCE_PATH.replace("./", ""))}</code>…</p>
    `;
    setSourceStatus("", "Loading USER_STORIES.md");
  }

  function setLoadError() {
    el.storiesGrid.hidden = true;
    el.contentState.hidden = false;
    el.contentState.className = "content-state error-state";
    el.contentState.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5M12 17h.01"></path><path d="M10.3 3.8 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.8a2 2 0 0 0-3.4 0Z"></path></svg>
      <h2>Couldn’t load <code>docs/USER_STORIES.md</code></h2>
      <p>This usually means the page was opened directly as a <code>file://</code> URL. Serve the Debtulator root with your normal local dev server, or choose the Markdown file manually.</p>
      <div class="state-actions">
        <button class="primary-button" id="stateOpenFile" type="button">Open USER_STORIES.md</button>
        <button class="secondary-button" id="stateRetry" type="button">Try again</button>
      </div>
    `;
    byId("stateOpenFile").addEventListener("click", () => el.fileInput.click());
    byId("stateRetry").addEventListener("click", loadMarkdown);
    setSourceStatus("error", "Source not loaded");
    el.loadedTime.textContent = "—";
  }

  function setGenericError(title, message = "Check the file format and try again.") {
    el.storiesGrid.hidden = true;
    el.contentState.hidden = false;
    el.contentState.className = "content-state error-state";
    el.contentState.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v5M12 17h.01"></path></svg>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(message)}</p>
      <div class="state-actions">
        <button class="primary-button" id="stateChooseAnother" type="button">Choose another file</button>
      </div>
    `;
    byId("stateChooseAnother").addEventListener("click", () => el.fileInput.click());
  }

  function setSourceStatus(type, label) {
    el.sourceDot.className = `status-dot${type ? ` ${type}` : ""}`;
    el.sourceLabel.textContent = label;
  }

  function parseUserStories(markdown) {
    const clean = markdown
      .replace(/^\uFEFF/, "")
      .replace(/\r\n?/g, "\n")
      .replace(/<!--[\s\S]*?-->/g, "");

    const lines = clean.split("\n");
    const headings = [];
    const stack = [];
    let fenced = false;

    lines.forEach((line, index) => {
      if (/^\s*```/.test(line)) {
        fenced = !fenced;
        return;
      }
      if (fenced) return;
      const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (!match) return;

      const level = match[1].length;
      const title = stripInlineMarkdown(match[2]).trim();
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop();

      const heading = {
        level,
        title,
        line: index,
        ancestors: stack.map((item) => item.title)
      };
      headings.push(heading);
      stack.push(heading);
    });

    const explicit = [];
    headings.forEach((heading, headingIndex) => {
      const nextHeading = headings[headingIndex + 1];
      const immediateEnd = nextHeading ? nextHeading.line : lines.length;
      const immediateBodyLines = lines.slice(heading.line + 1, immediateEnd);

      const nextBoundary = headings
        .slice(headingIndex + 1)
        .find((candidate) => candidate.level <= heading.level);
      const end = nextBoundary ? nextBoundary.line : lines.length;
      const bodyLines = lines.slice(heading.line + 1, end);

      if (isStoryHeading(heading.title, immediateBodyLines)) {
        explicit.push(makeStory({
          titleLine: heading.title,
          bodyLines,
          context: heading.ancestors,
          sourceIndex: heading.line,
          markdown: lines.slice(heading.line, end).join("\n"),
          ordinal: explicit.length + 1
        }));
      }
    });

    const coveredRanges = explicit.map((story) => story.sourceRange).filter(Boolean);
    const inline = scanInlineStories(lines, headings, coveredRanges, explicit.length);

    const merged = dedupeStories([...explicit, ...inline])
      .sort((a, b) => a.sourceIndex - b.sourceIndex)
      .map((story, index) => ({ ...story, sourceOrder: index }));

    return merged;
  }

  function isStoryHeading(title, bodyLines) {
    const normalized = title.trim();

    if (looksLikeStoryId(normalized)) return true;
    if (/^(?:user\s+story|story)\s*(?:[:#-]|\d)/i.test(normalized)) return true;

    const body = bodyLines.slice(0, 18).join(" ");
    const hasStatement = /\bAs\s+(?:an?|the)\b[\s\S]{0,220}?\bI\s+(?:want|need|would like|should be able)\b/i.test(body);
    const likelyStoryTitle =
      normalized.length <= 110 &&
      !/^(acceptance criteria|business rules?|notes?|definition of done|release|scope|overview|background|actors?|priority|non-functional|security|privacy)$/i.test(normalized);

    return hasStatement && likelyStoryTitle;
  }

  function scanInlineStories(lines, headings, coveredRanges, ordinalOffset) {
    const stories = [];
    let fenced = false;
    let paragraphStart = null;
    let paragraph = [];

    const flushParagraph = () => {
      if (!paragraph.length || paragraphStart == null) {
        paragraph = [];
        paragraphStart = null;
        return;
      }

      const raw = paragraph.join(" ").trim();
      if (containsStoryStatement(raw) && !isCovered(paragraphStart, coveredRanges)) {
        const context = headingContextAtLine(headings, paragraphStart);
        stories.push(makeInlineStory(raw, paragraphStart, context, ordinalOffset + stories.length + 1, paragraph.join("\n")));
      }
      paragraph = [];
      paragraphStart = null;
    };

    lines.forEach((line, index) => {
      if (/^\s*```/.test(line)) {
        flushParagraph();
        fenced = !fenced;
        return;
      }
      if (fenced) return;
      if (/^#{1,6}\s+/.test(line)) {
        flushParagraph();
        return;
      }

      const listStory = line.match(/^\s*(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s*)?(.+)$/);
      if (listStory && containsStoryStatement(listStory[1]) && !isCovered(index, coveredRanges)) {
        flushParagraph();
        const context = headingContextAtLine(headings, index);
        stories.push(makeInlineStory(listStory[1], index, context, ordinalOffset + stories.length + 1, line));
        return;
      }

      if (!line.trim()) {
        flushParagraph();
        return;
      }

      if (paragraphStart == null) paragraphStart = index;
      paragraph.push(line.replace(/^\s*>\s?/, "").trim());
      if (paragraph.join(" ").length > 700) flushParagraph();
    });

    flushParagraph();
    return stories;
  }

  function makeInlineStory(raw, sourceIndex, context, ordinal, markdown) {
    const statement = cleanStoryStatement(raw);
    const priority = extractPriority(`${context.join("\n")}\n${raw}`);
    const actor = extractActor(statement);
    const title = makeTitleFromStory(statement);
    const id = extractStoryId(raw) || `US-${String(ordinal).padStart(3, "0")}`;
    return {
      id,
      title,
      statement,
      priority,
      actor,
      status: extractMetadata(raw, ["status", "state"]) || "",
      release: extractMetadata(raw, ["release", "milestone", "slice"]) || "",
      category: deriveCategory(context),
      context,
      criteria: [],
      sourceIndex,
      sourceRange: [sourceIndex, sourceIndex],
      markdown,
      rawBody: raw
    };
  }

  function makeStory({ titleLine, bodyLines, context, sourceIndex, markdown, ordinal }) {
    const allText = `${titleLine}\n${bodyLines.join("\n")}`;
    const id = extractStoryId(titleLine) || extractStoryId(allText) || `US-${String(ordinal).padStart(3, "0")}`;
    const title = cleanStoryTitle(titleLine, id) || makeTitleFromStory(allText);
    const statement = extractStatement(bodyLines.join("\n")) || extractStatement(titleLine) || firstUsefulParagraph(bodyLines) || title;
    const criteria = extractCriteria(bodyLines);
    const actor = extractMetadata(allText, ["actor", "persona", "user"]) || extractActor(statement);
    const priority = extractPriority(allText) !== "Unspecified" ? extractPriority(allText) : extractPriority(context.join("\n"));
    const status = extractMetadata(allText, ["status", "state"]) || "";
    const release = extractMetadata(allText, ["release", "milestone", "release slice", "slice"]) || "";

    return {
      id,
      title,
      statement: cleanStoryStatement(statement),
      priority,
      actor: normalizeActor(actor),
      status: cleanMeta(status),
      release: cleanMeta(release),
      category: deriveCategory(context, titleLine),
      context,
      criteria,
      sourceIndex,
      sourceRange: [sourceIndex, sourceIndex + bodyLines.length],
      markdown,
      rawBody: bodyLines.join("\n")
    };
  }

  function dedupeStories(stories) {
    const seen = new Set();
    return stories.filter((story) => {
      const statementKey = normalizeText(story.statement).slice(0, 220);
      const idKey = story.id && !/^US-\d{3}$/.test(story.id) ? story.id.toLowerCase() : "";
      const key = idKey || statementKey || `${story.title}-${story.sourceIndex}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function isCovered(line, ranges) {
    return ranges.some(([start, end]) => line >= start && line <= end);
  }

  function headingContextAtLine(headings, line) {
    const stack = [];
    for (const heading of headings) {
      if (heading.line >= line) break;
      while (stack.length && stack[stack.length - 1].level >= heading.level) stack.pop();
      stack.push(heading);
    }
    return stack.map((item) => item.title);
  }

  function containsStoryStatement(text) {
    const plain = stripInlineMarkdown(text);
    return /\bAs\s+(?:an?|the)\b[\s\S]{0,260}?\bI\s+(?:want|need|would like|should be able)\b/i.test(plain);
  }

  function extractStatement(text) {
    const normalized = text
      .replace(/\n(?=\s*(?:I\s+(?:want|need|would like|should be able)|so that|because)\b)/gi, " ")
      .replace(/\n+/g, " ");

    const match = normalized.match(
      /\bAs\s+(?:an?|the)\b[\s\S]{0,500}?\bI\s+(?:want|need|would like|should be able)\b[\s\S]{0,650}?(?=(?:\s{2,}|Acceptance Criteria|Business Rules|Notes|$))/i
    );
    if (match) return match[0].trim();

    const line = text.split("\n").find((item) => containsStoryStatement(item));
    return line ? line.trim() : "";
  }

  function extractCriteria(lines) {
    const criteria = [];
    let inCriteria = false;
    let criteriaHeadingLevel = 7;

    lines.forEach((line) => {
      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length;
        const title = stripInlineMarkdown(heading[2]).trim();
        if (/^(?:acceptance criteria|acceptance|criteria|done when|definition of done)$/i.test(title)) {
          inCriteria = true;
          criteriaHeadingLevel = level;
          return;
        }
        if (inCriteria && level <= criteriaHeadingLevel) inCriteria = false;
      }

      const checkbox = line.match(/^\s*[-*+]\s+\[[ xX]\]\s+(.+)$/);
      const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
      const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);

      if (inCriteria && (checkbox || bullet || numbered)) {
        criteria.push(cleanCriteria((checkbox || bullet || numbered)[1]));
        return;
      }

      if (!inCriteria && checkbox && looksLikeAcceptanceCriterion(checkbox[1])) {
        criteria.push(cleanCriteria(checkbox[1]));
      }
    });

    return [...new Set(criteria.filter(Boolean))];
  }

  function looksLikeAcceptanceCriterion(text) {
    return /^(?:given|when|then|the user|user can|system|app|must|should|is|can|shows|displays|allows|prevents|requires)\b/i.test(stripInlineMarkdown(text).trim());
  }

  function cleanCriteria(text) {
    return stripInlineMarkdown(text)
      .replace(/^(?:AC\s*\d*[:.)-]\s*)/i, "")
      .trim();
  }

  function extractPriority(text) {
    const plain = stripInlineMarkdown(text);
    const explicit = plain.match(/\b(?:priority|tier)\s*[:\-–—]?\s*(P[012]|Future)\b/i);
    if (explicit) return normalizePriority(explicit[1]);

    const token = plain.match(/(?:^|\s|\(|\[|—|-)\b(P[012])\b(?:\s|:|\)|\]|—|-|$)/i);
    if (token) return normalizePriority(token[1]);

    if (/\bfuture\b/i.test(plain) && /\b(?:priority|later|roadmap|post[- ]?launch|phase)\b/i.test(plain)) return "Future";
    return "Unspecified";
  }

  function normalizePriority(value) {
    if (!value) return "Unspecified";
    const upper = value.toUpperCase();
    if (upper === "P0" || upper === "P1" || upper === "P2") return upper;
    if (value.toLowerCase() === "future") return "Future";
    return "Unspecified";
  }

  function extractMetadata(text, names) {
    const lines = text.split("\n");
    for (const line of lines) {
      const plain = stripInlineMarkdown(line)
        .replace(/^\s*[-*+]\s+/, "")
        .replace(/^\s*>\s?/, "")
        .trim();

      for (const name of names) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const match = plain.match(new RegExp(`^${escaped}\\s*[:\\-–—]\\s*(.+)$`, "i"));
        if (match) return match[1].trim();
      }
    }
    return "";
  }

  function extractActor(statement) {
    const plain = stripInlineMarkdown(statement);
    const match = plain.match(/\bAs\s+(an?|the)\s+(.+?)(?=,\s*I\b|\s+I\s+(?:want|need|would like|should be able)\b)/i);
    if (!match) return "";
    return `${match[1]} ${match[2]}`.replace(/\s+/g, " ").trim();
  }

  function normalizeActor(actor) {
    return cleanMeta(actor)
      .replace(/^the\s+/i, "")
      .replace(/^an?\s+/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function deriveCategory(context, titleLine = "") {
    const candidates = [...context].reverse();
    const excluded = /^(?:user stories?|product requirements?|requirements?|scope|overview|priority|p[012]\b|future\b|release|releases|roadmap|must have|should have|could have)$/i;

    const category = candidates.find((item) => {
      const clean = stripPriorityPrefix(stripInlineMarkdown(item)).trim();
      return clean && !excluded.test(clean) && !looksLikeStoryId(clean);
    });

    if (category) return stripPriorityPrefix(category);

    const title = stripPriorityPrefix(titleLine);
    const prefix = title.match(/^([A-Za-z][A-Za-z &/]+?)\s*[:—–-]\s+/);
    return prefix ? prefix[1].trim() : "General";
  }

  function stripPriorityPrefix(text) {
    return stripInlineMarkdown(text)
      .replace(/^\s*(?:P[012]|Future)\s*(?:[:—–-]\s*)?/i, "")
      .replace(/^\s*(?:Must|Should|Could)\s+Have\s*(?:[:—–-]\s*)?/i, "")
      .trim();
  }

  function extractStoryId(text) {
    const plain = stripInlineMarkdown(text);
    const patterns = [
      /\bUS[-_][A-Z0-9]+(?:[-_][A-Z0-9]+)*\b/i,
      /\b[A-Z]{2,8}-\d{1,4}(?:-\d{1,4})?\b/,
      /\b[A-Z]{2,8}-[A-Z]{2,8}-\d{1,4}\b/
    ];
    for (const pattern of patterns) {
      const match = plain.match(pattern);
      if (match) return match[0].replace(/_/g, "-").toUpperCase();
    }
    return "";
  }

  function looksLikeStoryId(text) {
    return Boolean(extractStoryId(text)) ||
      /^\s*(?:US|Story)\s*#?\s*\d+\b/i.test(stripInlineMarkdown(text));
  }

  function cleanStoryTitle(title, id) {
    let clean = stripInlineMarkdown(title);
    if (id) clean = clean.replace(new RegExp(escapeRegExp(id.replace(/-/g, "[-_]")), "i"), "");
    clean = clean
      .replace(/^\s*(?:user\s+story|story)\s*#?\s*\d*\s*/i, "")
      .replace(/^\s*\d+[.)]\s*/, "")
      .replace(/^[\s:—–\-|]+|[\s:—–\-|]+$/g, "")
      .trim();

    if (/^As\s+(?:an?|the)\b/i.test(clean)) return makeTitleFromStory(clean);
    return clean;
  }

  function makeTitleFromStory(text) {
    const plain = cleanStoryStatement(text);
    const match = plain.match(/\bI\s+(?:want|need|would like|should be able)\s+(?:to\s+)?(.+?)(?=\s+so that\b|\s+because\b|[.;]|$)/i);
    const goal = match?.[1]?.trim() || plain.replace(/^As\s+.+?\bI\s+/i, "").trim();
    if (!goal) return "User story";
    return sentenceCase(truncate(goal, 72));
  }

  function firstUsefulParagraph(lines) {
    const paragraphs = lines.join("\n").split(/\n\s*\n/);
    return paragraphs
      .map((paragraph) => paragraph.replace(/^\s*>\s?/gm, "").trim())
      .find((paragraph) =>
        paragraph &&
        !/^#{1,6}\s/.test(paragraph) &&
        !/^(?:\*\*)?(?:priority|actor|status|release|persona)(?:\*\*)?\s*:/i.test(paragraph)
      ) || "";
  }

  function cleanStoryStatement(text) {
    return stripInlineMarkdown(text)
      .replace(/^\s*(?:[-*+]|\d+\.)\s+/, "")
      .replace(/^\s*>\s?/, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanMeta(value) {
    return stripInlineMarkdown(value || "")
      .replace(/^[\s`]+|[\s`]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function stripInlineMarkdown(text) {
    return String(text || "")
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[*_~`]/g, "")
      .replace(/<[^>]*>/g, "")
      .trim();
  }

  function populateFilters(stories) {
    const categories = uniqueSorted(stories.map((story) => story.category).filter(Boolean));
    const actors = uniqueSorted(stories.map((story) => story.actor).filter(Boolean));
    const statuses = uniqueSorted(stories.map((story) => story.status).filter(Boolean));

    replaceOptions(el.categorySelect, "All categories", categories);
    replaceOptions(el.actorSelect, "All actors", actors);
    replaceOptions(el.statusSelect, "All statuses", statuses);
  }

  function replaceOptions(select, allLabel, values) {
    const previous = select.value;
    select.replaceChildren(new Option(allLabel, ""));
    values.forEach((value) => select.add(new Option(value, value)));
    if (values.includes(previous)) select.value = previous;
  }

  function updateStats(stories) {
    el.totalStat.textContent = stories.length;
    el.p0Stat.textContent = stories.filter((story) => story.priority === "P0").length;
    el.p1Stat.textContent = stories.filter((story) => story.priority === "P1").length;
    el.futureStat.textContent = stories.filter((story) => story.priority === "Future").length;
  }

  function render() {
    if (!state.stories.length) return;

    const filtered = getFilteredStories();

    el.contentState.hidden = true;
    el.storiesGrid.hidden = false;
    el.storiesGrid.replaceChildren();
    el.storiesGrid.classList.toggle("list-view", state.view === "list");

    if (!filtered.length) {
      el.storiesGrid.hidden = true;
      el.contentState.hidden = false;
      el.contentState.className = "content-state empty-state";
      el.contentState.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path><path d="M8.5 11h5"></path></svg>
        <h2>No stories match these filters</h2>
        <p>Try another search or clear the active filters.</p>
        <div class="state-actions">
          <button class="secondary-button" id="stateClearFilters" type="button">Clear filters</button>
        </div>
      `;
      byId("stateClearFilters").addEventListener("click", clearFilters);
    } else {
      const fragment = document.createDocumentFragment();
      filtered.forEach((story) => fragment.appendChild(createStoryCard(story)));
      el.storiesGrid.appendChild(fragment);
    }

    el.resultsCount.textContent = `${filtered.length} ${filtered.length === 1 ? "story" : "stories"}`;
    el.resultsContext.textContent = filtered.length === state.stories.length
      ? `from ${state.sourceName}`
      : `of ${state.stories.length} from ${state.sourceName}`;
    syncFilterCount();
  }

  function getFilteredStories() {
    const queryTokens = normalizeText(state.query).split(/\s+/).filter(Boolean);
    let stories = state.stories.filter((story) => {
      if (state.priorities.size && !state.priorities.has(story.priority)) return false;
      if (state.category && story.category !== state.category) return false;
      if (state.actor && story.actor !== state.actor) return false;
      if (state.status && story.status !== state.status) return false;

      if (queryTokens.length) {
        const haystack = normalizeText([
          story.id,
          story.title,
          story.statement,
          story.priority,
          story.actor,
          story.category,
          story.status,
          story.release,
          story.criteria.join(" "),
          story.rawBody
        ].join(" "));
        if (!queryTokens.every((token) => haystack.includes(token))) return false;
      }
      return true;
    });

    stories = [...stories];
    if (state.sort === "priority") {
      stories.sort((a, b) =>
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
        a.category.localeCompare(b.category) ||
        a.sourceOrder - b.sourceOrder
      );
    } else if (state.sort === "title") {
      stories.sort((a, b) => a.title.localeCompare(b.title));
    } else if (state.sort === "category") {
      stories.sort((a, b) => a.category.localeCompare(b.category) || a.sourceOrder - b.sourceOrder);
    } else if (state.sort === "criteria") {
      stories.sort((a, b) => b.criteria.length - a.criteria.length || a.sourceOrder - b.sourceOrder);
    } else {
      stories.sort((a, b) => a.sourceOrder - b.sourceOrder);
    }

    return stories;
  }

  function createStoryCard(story) {
    const card = el.storyCardTemplate.content.firstElementChild.cloneNode(true);
    card.dataset.storyId = story.id;

    const priority = card.querySelector(".priority-badge");
    priority.textContent = story.priority;
    priority.classList.add(priorityClass(story.priority));

    card.querySelector(".story-id").textContent = story.id;
    card.querySelector(".story-category").textContent = story.category;
    card.querySelector("h3").textContent = story.title;
    card.querySelector(".story-statement").textContent = story.statement;

    const actorLabel = card.querySelector(".actor-label");
    actorLabel.textContent = story.actor ? `Actor · ${story.actor}` : "Actor · Not specified";
    actorLabel.title = actorLabel.textContent;

    const criteriaCount = card.querySelector(".criteria-count");
    criteriaCount.textContent = `${story.criteria.length} ${story.criteria.length === 1 ? "criterion" : "criteria"}`;

    const summary = card.querySelector(".story-summary");
    const summaryToggle = card.querySelector(".summary-toggle");
    summary.hidden = !state.summariesExpanded;
    summaryToggle.textContent = state.summariesExpanded ? "Hide summary" : "Show summary";
    summary.innerHTML = makeCardSummary(story);

    summaryToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      summary.hidden = !summary.hidden;
      summaryToggle.textContent = summary.hidden ? "Show summary" : "Hide summary";
    });

    card.querySelector(".card-menu-button").addEventListener("click", (event) => {
      event.stopPropagation();
      openStory(story);
    });
    card.addEventListener("click", (event) => {
      if (event.target.closest("button, a, select, input")) return;
      openStory(story);
    });

    return card;
  }

  function makeCardSummary(story) {
    const bits = [];
    if (story.status) bits.push(`<strong>Status:</strong> ${escapeHtml(story.status)}`);
    if (story.release) bits.push(`<strong>Release:</strong> ${escapeHtml(story.release)}`);

    if (story.criteria.length) {
      const preview = story.criteria.slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
      bits.push(`<strong>Acceptance criteria:</strong><ul>${preview}</ul>`);
    } else {
      bits.push("No explicit acceptance criteria detected in this story block.");
    }
    return bits.join("<br>");
  }

  function openStory(story, updateHash = true) {
    state.activeStory = story;
    el.drawerKicker.textContent = `${story.category} · ${story.id}`;
    el.drawerTitle.textContent = story.title;
    el.drawerBody.innerHTML = renderDrawerStory(story);
    el.drawerBackdrop.hidden = false;
    el.storyDrawer.classList.add("open");
    el.storyDrawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (updateHash) history.replaceState(null, "", `#${encodeURIComponent(story.id)}`);
    setTimeout(() => el.closeDrawerButton.focus(), 20);
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

  function renderDrawerStory(story) {
    const badges = `
      <div class="drawer-badges">
        <span class="priority-badge ${priorityClass(story.priority)}">${escapeHtml(story.priority)}</span>
        <span class="story-id">${escapeHtml(story.id)}</span>
        <span class="story-id">${escapeHtml(story.category)}</span>
      </div>
    `;

    const details = [
      ["Actor", story.actor || "Not specified"],
      ["Priority", story.priority],
      ["Status", story.status || "Not specified"],
      ["Release", story.release || "Not specified"]
    ].map(([label, value]) => `
      <div class="detail-item">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `).join("");

    const criteria = story.criteria.length
      ? `<ul class="criteria-list">${story.criteria.map((criterion) => `
          <li>
            <span class="criteria-check" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="m7 12 3 3 7-7"></path></svg>
            </span>
            <span>${escapeHtml(criterion)}</span>
          </li>
        `).join("")}</ul>`
      : `<p class="markdown-body">No explicit acceptance criteria were detected for this story.</p>`;

    const original = story.rawBody?.trim()
      ? `<div class="markdown-body">${renderMarkdown(story.rawBody)}</div>`
      : `<p class="markdown-body">No additional Markdown content in this story block.</p>`;

    return `
      ${badges}
      <section class="drawer-section">
        <h3 class="drawer-section-title">User story</h3>
        <blockquote class="story-quote">${escapeHtml(story.statement)}</blockquote>
      </section>
      <section class="drawer-section">
        <h3 class="drawer-section-title">Details</h3>
        <div class="details-grid">${details}</div>
      </section>
      <section class="drawer-section">
        <h3 class="drawer-section-title">Acceptance criteria · ${story.criteria.length}</h3>
        ${criteria}
      </section>
      <section class="drawer-section">
        <h3 class="drawer-section-title">Original story notes</h3>
        ${original}
      </section>
    `;
  }

  function renderMarkdown(markdown) {
    const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
    let html = "";
    let inCode = false;
    let code = [];
    let listType = "";
    let paragraph = [];

    const flushParagraph = () => {
      if (!paragraph.length) return;
      html += `<p>${renderInline(paragraph.join(" "))}</p>`;
      paragraph = [];
    };
    const closeList = () => {
      if (!listType) return;
      html += `</${listType}>`;
      listType = "";
    };

    lines.forEach((line) => {
      const fence = line.match(/^\s*```(.*)$/);
      if (fence) {
        flushParagraph();
        closeList();
        if (!inCode) {
          inCode = true;
          code = [];
        } else {
          html += `<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`;
          inCode = false;
          code = [];
        }
        return;
      }
      if (inCode) {
        code.push(line);
        return;
      }

      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        closeList();
        const level = Math.min(6, Math.max(2, heading[1].length + 1));
        html += `<h${level}>${renderInline(heading[2])}</h${level}>`;
        return;
      }

      if (/^\s*---+\s*$/.test(line)) {
        flushParagraph();
        closeList();
        html += "<hr>";
        return;
      }

      const quote = line.match(/^\s*>\s?(.*)$/);
      if (quote) {
        flushParagraph();
        closeList();
        html += `<blockquote>${renderInline(quote[1])}</blockquote>`;
        return;
      }

      const ul = line.match(/^\s*[-*+]\s+(?:\[[ xX]\]\s*)?(.+)$/);
      const ol = line.match(/^\s*\d+[.)]\s+(.+)$/);
      if (ul || ol) {
        flushParagraph();
        const type = ul ? "ul" : "ol";
        if (listType && listType !== type) closeList();
        if (!listType) {
          listType = type;
          html += `<${type}>`;
        }
        html += `<li>${renderInline((ul || ol)[1])}</li>`;
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
    if (inCode) html += `<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`;
    return html;
  }

  function renderInline(text) {
    let safe = escapeHtml(text);
    safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>");
    safe = safe.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    safe = safe.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    safe = safe.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
    safe = safe.replace(/(?<!_)_([^_]+)_(?!_)/g, "<em>$1</em>");
    safe = safe.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    safe = safe.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      const decodedHref = decodeHtml(href);
      const safeHref = sanitizeHref(decodedHref);
      return safeHref ? `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer">${label}</a>` : label;
    });
    return safe;
  }

  function sanitizeHref(href) {
    const value = href.trim();
    if (/^(https?:|mailto:)/i.test(value)) return value;
    if (/^(?:\.{0,2}\/|#)/.test(value)) return value;
    return "";
  }

  function decodeHtml(value) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
  }

  function makeCopyText(story) {
    const lines = [
      `${story.id} — ${story.title}`,
      `Priority: ${story.priority}`,
      story.actor ? `Actor: ${story.actor}` : "",
      story.status ? `Status: ${story.status}` : "",
      story.release ? `Release: ${story.release}` : "",
      "",
      story.statement
    ].filter((line, index, all) => line || (index > 0 && all[index - 1]));

    if (story.criteria.length) {
      lines.push("", "Acceptance criteria:");
      story.criteria.forEach((criterion) => lines.push(`- ${criterion}`));
    }
    return lines.join("\n").trim();
  }

  async function copyActiveStory() {
    if (!state.activeStory) return;
    await copyText(makeCopyText(state.activeStory), "Story copied");
  }

  async function copyActiveLink() {
    if (!state.activeStory) return;
    const url = `${location.href.split("#")[0]}#${encodeURIComponent(state.activeStory.id)}`;
    await copyText(url, "Story link copied");
  }

  async function copyText(text, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      showToast(successMessage);
    }
  }

  function openStoryFromHash() {
    if (!state.stories.length || !location.hash) return;
    const id = decodeURIComponent(location.hash.slice(1));
    const story = state.stories.find((item) => item.id.toLowerCase() === id.toLowerCase());
    if (story) openStory(story, false);
  }

  function clearFilters() {
    state.query = "";
    state.priorities.clear();
    state.category = "";
    state.actor = "";
    state.status = "";
    el.searchInput.value = "";
    el.categorySelect.value = "";
    el.actorSelect.value = "";
    el.statusSelect.value = "";
    syncPriorityChips();
    render();
  }

  function syncPriorityChips() {
    el.priorityChips.querySelectorAll("[data-priority]").forEach((chip) => {
      const priority = chip.dataset.priority;
      const active = priority === "all" ? state.priorities.size === 0 : state.priorities.has(priority);
      chip.classList.toggle("active", active);
    });
  }

  function syncFilterCount() {
    const count =
      state.priorities.size +
      Number(Boolean(state.category)) +
      Number(Boolean(state.actor)) +
      Number(Boolean(state.status)) +
      Number(Boolean(state.query.trim()));

    el.filterCount.textContent = count;
    el.filterCount.classList.toggle("hidden", count === 0);
  }

  function setView(view) {
    state.view = view === "list" ? "list" : "grid";
    localStorage.setItem("debtulator-story-view", state.view);
    el.gridViewButton.classList.toggle("active", state.view === "grid");
    el.listViewButton.classList.toggle("active", state.view === "list");
    el.storiesGrid.classList.toggle("list-view", state.view === "list");
  }

  function applyInitialTheme() {
    const saved = localStorage.getItem("debtulator-story-theme");
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("debtulator-story-theme", next);
  }

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => el.toast.classList.remove("show"), 1800);
  }

  function priorityClass(priority) {
    return String(priority || "Unspecified").toLowerCase().replace(/\s+/g, "-");
  }

  function normalizeText(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  function uniqueSorted(values) {
    return [...new Set(values)].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }

  function formatLoadedTime(date) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(date);
  }

  function sentenceCase(text) {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function truncate(text, max) {
    const clean = text.trim();
    if (clean.length <= max) return clean;
    return `${clean.slice(0, max - 1).trimEnd()}…`;
  }

  function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
