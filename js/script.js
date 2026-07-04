/* =========================================================================
   PEOPLE'S PRIORITY PORTAL — APPLICATION LOGIC
   Vanilla JS, no frameworks. All data lives in LocalStorage under one key.
   ========================================================================= */

/* -------------------------------------------------------------------------
   0. STATE & CONSTANTS
   ------------------------------------------------------------------------- */
const STORAGE_KEY = "ppp_issues";
const THEME_KEY = "ppp_theme";

// In-memory mirror of persisted issues. Always kept in sync with LocalStorage.
let issues = [];

// Current UI state for search / filter / sort — re-applied on every render.
let uiState = {
  search: "",
  category: "All",
  sort: "votes", // "votes" | "newest" | "priority"
};

// Priority ranking used for sorting and for the "highest priority" stat.
const PRIORITY_RANK = { Critical: 4, High: 3, Medium: 2, Low: 1 };

// Id of the issue pending deletion (set when the confirm modal opens).
let pendingDeleteId = null;

/* -------------------------------------------------------------------------
   1. DOM REFERENCES
   ------------------------------------------------------------------------- */
const issueForm = document.getElementById("issueForm");
const issueList = document.getElementById("issueList");
const emptyState = document.getElementById("emptyState");

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const sortSelect = document.getElementById("sortSelect");

const descriptionInput = document.getElementById("issueDescription");
const descCount = document.getElementById("descCount");

const statTotalIssues = document.getElementById("statTotalIssues");
const statTotalVotes = document.getElementById("statTotalVotes");
const statTopCategory = document.getElementById("statTopCategory");
const statTopIssue = document.getElementById("statTopIssue");
const statTopIssueVotes = document.getElementById("statTopIssueVotes");

const toastContainer = document.getElementById("toastContainer");

const confirmModal = document.getElementById("confirmModal");
const confirmCancel = document.getElementById("confirmCancel");
const confirmDelete = document.getElementById("confirmDelete");

const darkModeToggle = document.getElementById("darkModeToggle");
const iconSun = document.getElementById("iconSun");
const iconMoon = document.getElementById("iconMoon");

/* -------------------------------------------------------------------------
   2. LOCALSTORAGE PERSISTENCE
   ------------------------------------------------------------------------- */

/**
 * Persist the current `issues` array to LocalStorage.
 * Called after every mutation (add / vote / delete).
 */
function saveToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
  } catch (err) {
    console.error("Failed to save issues to LocalStorage:", err);
    showToast("Couldn't save — your browser storage may be full.", "danger");
  }
}

/**
 * Load issues from LocalStorage into memory. Falls back to an empty
 * registry (with no seed data) if nothing has been stored yet, or if the
 * stored value is corrupted.
 */
function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    issues = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(issues)) issues = [];
  } catch (err) {
    console.error("Failed to load issues from LocalStorage:", err);
    issues = [];
  }
}

/* -------------------------------------------------------------------------
   3. CORE CRUD — ADD / VOTE / DELETE
   ------------------------------------------------------------------------- */

/**
 * Read the submission form, validate it, and add a new issue to the
 * registry. Triggered by the form's submit event.
 */
function addIssue(event) {
  event.preventDefault();

  const title = document.getElementById("issueTitle").value.trim();
  const category = document.getElementById("issueCategory").value;
  const priority = document.getElementById("issuePriority").value;
  const location = document.getElementById("issueLocation").value.trim();
  const description = descriptionInput.value.trim();

  if (!title || !category || !priority || !location || !description) {
    showToast("Please fill in every field before filing the case.", "danger");
    return;
  }

  const newIssue = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    title,
    category,
    priority,
    location,
    description,
    votes: 0,
    createdAt: new Date().toISOString(),
  };

  issues.unshift(newIssue); // newest cases lead the list until sorted
  saveToLocalStorage();
  renderIssues();
  updateStatistics();

  issueForm.reset();
  descCount.textContent = "0";
  showToast("Issue filed and added to the registry.", "success");

  // Scroll the new case into view on the board.
  document.getElementById("issues").scrollIntoView({ behavior: "smooth" });
}

/**
 * Increment the vote count for a given issue and re-render.
 * @param {string} id
 */
function voteIssue(id) {
  const issue = issues.find((i) => i.id === id);
  if (!issue) return;

  issue.votes += 1;
  saveToLocalStorage();
  renderIssues();
  updateStatistics();
  showToast(`Vote recorded for "${issue.title}".`, "success");
}

/**
 * Open the confirmation modal for deleting an issue. The actual removal
 * happens in confirmDeleteIssue(), wired to the modal's confirm button.
 * @param {string} id
 */
function deleteIssue(id) {
  pendingDeleteId = id;
  confirmModal.hidden = false;
}

/** Executes the deletion once the user confirms in the modal. */
function confirmDeleteIssue() {
  if (!pendingDeleteId) return;

  const issue = issues.find((i) => i.id === pendingDeleteId);
  issues = issues.filter((i) => i.id !== pendingDeleteId);
  saveToLocalStorage();
  renderIssues();
  updateStatistics();

  closeConfirmModal();
  showToast(issue ? `"${issue.title}" was withdrawn.` : "Case withdrawn.", "danger");
}

function closeConfirmModal() {
  confirmModal.hidden = true;
  pendingDeleteId = null;
}

/* -------------------------------------------------------------------------
   4. SEARCH / FILTER / SORT
   ------------------------------------------------------------------------- */

/**
 * Reads the search box and updates ui state + re-renders.
 * Matches against title, location, and description (case-insensitive).
 */
function searchIssues() {
  uiState.search = searchInput.value.trim().toLowerCase();
  renderIssues();
}

/**
 * Reads the category filter and updates ui state + re-renders.
 */
function filterIssues() {
  uiState.category = categoryFilter.value;
  renderIssues();
}

/** Reads the sort dropdown and updates ui state + re-renders. */
function applySort() {
  uiState.sort = sortSelect.value;
  renderIssues();
}

/**
 * Applies the current search + filter + sort settings to the raw issues
 * array and returns a new, ready-to-render array. Pure function — does
 * not mutate `issues`.
 */
function getVisibleIssues() {
  let result = [...issues];

  if (uiState.search) {
    result = result.filter((issue) => {
      const haystack = `${issue.title} ${issue.location} ${issue.description}`.toLowerCase();
      return haystack.includes(uiState.search);
    });
  }

  if (uiState.category !== "All") {
    result = result.filter((issue) => issue.category === uiState.category);
  }

  switch (uiState.sort) {
    case "votes":
      result.sort((a, b) => b.votes - a.votes);
      break;
    case "newest":
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    case "priority":
      result.sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
      break;
  }

  return result;
}

/* -------------------------------------------------------------------------
   5. RENDERING
   ------------------------------------------------------------------------- */

/** Escapes user-entered text before it's dropped into innerHTML. */
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

const CATEGORY_ICON_PATH = "M12 21s-7-5.33-7-11a7 7 0 0 1 14 0c0 5.67-7 11-7 11Z"; // pin

/** Builds the HTML for a single issue card. */
function renderIssueCard(issue) {
  const priorityClass = `priority-stamp--${issue.priority.toLowerCase()}`;
  const dateLabel = new Date(issue.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return `
    <article class="issue-card" data-id="${issue.id}">
      <div class="issue-card__top">
        <span class="issue-card__category">${escapeHTML(issue.category)}</span>
        <span class="priority-stamp ${priorityClass}">${escapeHTML(issue.priority)}</span>
      </div>

      <h3 class="issue-card__title">${escapeHTML(issue.title)}</h3>
      <p class="issue-card__desc">${escapeHTML(issue.description)}</p>

      <div class="issue-card__meta">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="${CATEGORY_ICON_PATH}"/><circle cx="12" cy="10" r="2.5"/></svg>
        <span>${escapeHTML(issue.location)}</span>
      </div>

      <div class="issue-card__footer">
        <button class="vote-btn" onclick="voteIssue('${issue.id}')" aria-label="Vote for this issue">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          <span class="vote-count">${issue.votes}</span>
        </button>
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="issue-card__timestamp">Filed ${dateLabel}</span>
          <button class="delete-btn" onclick="deleteIssue('${issue.id}')" aria-label="Withdraw this issue" title="Withdraw case">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"/></svg>
          </button>
        </div>
      </div>
    </article>
  `;
}

/**
 * Renders the issue board: applies current search/filter/sort, injects
 * the resulting cards into the DOM, and toggles the empty state.
 */
function renderIssues() {
  const visible = getVisibleIssues();

  if (visible.length === 0) {
    issueList.innerHTML = "";
    emptyState.hidden = false;
  } else {
    emptyState.hidden = true;
    issueList.innerHTML = visible.map(renderIssueCard).join("");
  }
}

/* -------------------------------------------------------------------------
   6. LIVE STATISTICS
   ------------------------------------------------------------------------- */

/**
 * Recomputes and paints: total issues, total votes, top category, and the
 * single highest-priority / highest-voted case.
 */
function updateStatistics() {
  const total = issues.length;
  const totalVotes = issues.reduce((sum, i) => sum + i.votes, 0);

  statTotalIssues.textContent = total;
  statTotalVotes.textContent = totalVotes;

  if (total === 0) {
    statTopCategory.textContent = "—";
    statTopIssue.textContent = "—";
    statTopIssueVotes.textContent = "no cases yet";
    return;
  }

  // Top category = category with the most filed issues.
  const categoryCounts = {};
  issues.forEach((i) => {
    categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1;
  });
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
  statTopCategory.textContent = `${topCategory[0]} (${topCategory[1]})`;

  // Highest priority case = ranked first by priority level, tie-broken by votes.
  const ranked = [...issues].sort((a, b) => {
    const priorityDiff = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    return priorityDiff !== 0 ? priorityDiff : b.votes - a.votes;
  });
  const topIssue = ranked[0];
  statTopIssue.textContent = topIssue.title;
  statTopIssueVotes.textContent = `${topIssue.priority} priority · ${topIssue.votes} votes`;
}

/* -------------------------------------------------------------------------
   7. DARK MODE
   ------------------------------------------------------------------------- */

/** Toggles dark mode, updates the icon, and persists the preference. */
function toggleDarkMode() {
  const isDark = document.body.classList.toggle("dark-mode");
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  iconSun.style.display = isDark ? "none" : "block";
  iconMoon.style.display = isDark ? "block" : "none";
}

/** Applies the saved theme preference on page load. */
function loadThemePreference() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark") {
    document.body.classList.add("dark-mode");
    iconSun.style.display = "none";
    iconMoon.style.display = "block";
  }
}

/* -------------------------------------------------------------------------
   8. TOAST NOTIFICATIONS
   ------------------------------------------------------------------------- */

/**
 * Shows a transient toast message.
 * @param {string} message
 * @param {"success"|"danger"|"info"} type
 */
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast--leaving");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, 2800);
}

/* -------------------------------------------------------------------------
   9. EVENT WIRING & INIT
   ------------------------------------------------------------------------- */

function initEventListeners() {
  issueForm.addEventListener("submit", addIssue);

  searchInput.addEventListener("input", searchIssues);
  categoryFilter.addEventListener("change", filterIssues);
  sortSelect.addEventListener("change", applySort);

  descriptionInput.addEventListener("input", () => {
    descCount.textContent = descriptionInput.value.length;
  });

  darkModeToggle.addEventListener("click", toggleDarkMode);

  confirmCancel.addEventListener("click", closeConfirmModal);
  confirmDelete.addEventListener("click", confirmDeleteIssue);
  confirmModal.addEventListener("click", (e) => {
    if (e.target === confirmModal) closeConfirmModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !confirmModal.hidden) closeConfirmModal();
  });
}

/** Application bootstrap — runs once the DOM is ready. */
function init() {
  loadThemePreference();
  loadFromLocalStorage();
  initEventListeners();
  renderIssues();
  updateStatistics();
}

document.addEventListener("DOMContentLoaded", init);
