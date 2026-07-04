# People's Priority Portal

A centralized, no-backend civic platform where citizens file constituency issues and vote them into priority order, so representatives can see at a glance what their ward actually cares about.

Built for a hackathon with plain **HTML / CSS / vanilla JavaScript** and **LocalStorage** — no frameworks, no server, no build step. Open `index.html` and it works.

---

## ✨ Features

- **File an issue** — title, category, description, location, and priority
- **Vote** on existing issues to push them up the rankings
- **Withdraw (delete)** an issue, with a confirmation modal
- **Search** across title, location, and description in real time
- **Filter** by category (Roads, Water Supply, Electricity, Healthcare, Education, Garbage, Drainage, Transport, Public Safety, Other)
- **Sort** by highest votes, newest first, or priority level
- **Live statistics**: total issues, total votes, top category, and the single highest-priority case
- **Dark mode** toggle, persisted across sessions
- **Toast notifications** for every action (add, vote, delete)
- **Empty state** messaging when no cases match the current filters
- **Fully responsive**, down to small mobile screens
- **Data persists** in the browser via LocalStorage — refresh-proof

---

## 🗂 Project Structure

```
peoples-priority-portal/
├── index.html        # Markup: navbar, hero, stats, form, board, footer
├── css/
│   └── style.css      # Design system, layout, responsive rules, animations
├── js/
│   └── script.js      # All application logic (CRUD, search/filter/sort, storage)
└── README.md
```

---

## 🎨 Design Language

The UI borrows from the visual world of a **public case registry / records office**:

- A deep navy + parchment palette with a rubber-stamp **gold** accent standing in for an official seal
- `Fraunces` (serif) for headings, evoking printed civic documents; `Source Sans 3` for body copy; `JetBrains Mono` for data-like numbers and labels
- Priority levels render as tilted **stamp badges**, like an ink stamp on a physical file
- The hero features faint **ledger lines**, referencing the ruled registry book this app digitizes

---

## 🧠 How Data Works

Everything lives under a single LocalStorage key, `ppp_issues`, as a JSON array of issue objects:

```json
{
  "id": "m3x1a2b9c",
  "title": "Streetlight outage on 5th Cross",
  "category": "Electricity",
  "priority": "High",
  "location": "Ward 12, Near Central Market",
  "description": "Three lights have been out for two weeks...",
  "votes": 4,
  "createdAt": "2026-07-04T10:15:00.000Z"
}
```

Theme preference is stored separately under `ppp_theme` (`"light"` or `"dark"`).

No issues ship pre-seeded — the registry starts empty and grows as citizens file cases.

---

## 🔧 Core Functions (`js/script.js`)

| Function | Purpose |
|---|---|
| `addIssue()` | Validates and submits the issue form, adds a new case |
| `renderIssues()` | Applies search/filter/sort and paints the issue grid |
| `voteIssue(id)` | Increments a case's vote count |
| `deleteIssue(id)` | Opens the confirmation modal for withdrawing a case |
| `confirmDeleteIssue()` | Performs the actual removal after confirmation |
| `saveToLocalStorage()` | Persists the issues array |
| `loadFromLocalStorage()` | Restores issues on page load |
| `searchIssues()` | Reads the search box and re-renders |
| `filterIssues()` | Reads the category dropdown and re-renders |
| `updateStatistics()` | Recomputes and paints the four live stats |
| `toggleDarkMode()` | Switches themes and persists the choice |

---

## 🚀 Running It

No install, no dependencies, no server required.

1. Download / clone the project folder.
2. Open `index.html` directly in any modern browser.
3. Start filing issues — everything saves automatically.

> Tip: since it's pure static files, you can also drop this folder onto any static host (GitHub Pages, Netlify, Vercel) with zero configuration.

---

## ⚠️ Known Limitations

- Data is local to a single browser — it is **not shared** between citizens or devices (no backend, by design for this hackathon build).
- No authentication — anyone with access to the browser can vote or withdraw any case.
- LocalStorage has a practical size ceiling (~5–10MB per origin), which is more than sufficient for typical constituency-scale use.

---

## 📄 License

Built as a hackathon submission. Free to use, adapt, and extend.
