// Routine Finder (Google Sheets source)
// Sheet URL:
// https://docs.google.com/spreadsheets/d/1Xecbn3wwH19R6yQrgvz7plNusfk2qExpFC855zVhZ0E

const els = {
  q: document.getElementById("q"),
  day: document.getElementById("day"),
  slot: document.getElementById("slot"),
  course: document.getElementById("course"),
  teacher: document.getElementById("teacher"),
  semsec: document.getElementById("semsec"),
  room: document.getElementById("room"),
  tbody: document.getElementById("tbody"),
  count: document.getElementById("count"),
  reset: document.getElementById("reset"),
};

/* ================= HELPERS ================= */
const uniq = arr => Array.from(new Set(arr.filter(Boolean)));

function slotOrder(slot) {
  const m = /slot\s*(\d+)/i.exec(slot || "");
  return m ? Number(m[1]) : 9999;
}

function fillSelect(el, values, label) {
  el.innerHTML = "";
  el.append(new Option(label, ""));
  values.forEach(v => el.append(new Option(v, v)));
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function currentFilters() {
  return {
    q: els.q.value.trim().toLowerCase(),
    day: els.day.value,
    slot: els.slot.value,
    course: els.course.value,
    teacher: els.teacher.value,
    semsec: els.semsec.value,
    room: els.room.value,
  };
}

function hasAnyFilter() {
  return Object.values(currentFilters()).some(v => v);
}

/* ================= FILTER ================= */
function applyFilters(rows) {
  const f = currentFilters();

  return rows.filter(r => {
    const matchQ =
      !f.q ||
      [
        r.Day,
        r["Time Slot"],
        r["Course Code"],
        r.Teacher,
        r["Semester & Section"],
        r.Room,
      ]
        .join(" ")
        .toLowerCase()
        .includes(f.q);

    return (
      matchQ &&
      (!f.day || r.Day === f.day) &&
      (!f.slot || r["Time Slot"] === f.slot) &&
      (!f.course || r["Course Code"] === f.course) &&
      (!f.teacher || r.Teacher === f.teacher) &&
      (!f.semsec || r["Semester & Section"] === f.semsec) &&
      (!f.room || r.Room === f.room)
    );
  });
}

const DAY_ORDER = {
  "Sunday": 1,
  "Monday": 2,
  "Tuesday": 3,
  "Wednesday": 4,
  "Thursday": 5,
  "Friday": 6,
  "Saturday": 7,
};

function dayOrder(day) {
  return DAY_ORDER[day] ?? 99;
}

/* ================= RENDER ================= */
function render(rows) {
  // 🚫 No filter → show nothing
  if (!hasAnyFilter()) {
    els.tbody.innerHTML = "";
    els.count.textContent = "Select a filter to view routine";
    return;
  }

  const filtered = applyFilters(rows);

  filtered.sort((a, b) => {
    if (a.Day !== b.Day) return dayOrder(a.Day) - dayOrder(b.Day);
    const sa = slotOrder(a["Time Slot"]);
    const sb = slotOrder(b["Time Slot"]);
    if (sa !== sb) return sa - sb;
    return (a["Course Code"] || "").localeCompare(b["Course Code"] || "");
  });

  els.count.textContent = `${filtered.length} class(es) found`;

  if (!filtered.length) {
    els.tbody.innerHTML =
      `<tr><td colspan="6" class="muted">No matches. Try another filter.</td></tr>`;
    return;
  }

  els.tbody.innerHTML = filtered.map(r => `
    <tr>
      <td><span class="badge">${escapeHtml(r.Day)}</span></td>
      <td>${escapeHtml(r["Time Slot"])}</td>
      <td><span class="badge">${escapeHtml(r["Course Code"])}</span></td>
      <td>${escapeHtml(r.Teacher)}</td>
      <td>${escapeHtml(r["Semester & Section"])}</td>
      <td>${escapeHtml(r.Room)}</td>
    </tr>
  `).join("");
}

/* ================= INIT ================= */
async function init() {
  // Your Google Sheet
  const SHEET_ID = "1Xecbn3wwH19R6yQrgvz7plNusfk2qExpFC855zVhZ0E";
  const SHEET_NAME = "Class Schedule Data Presentation"; // change only if tab name is different

  const url = `https://opensheet.elk.sh/${SHEET_ID}/${SHEET_NAME}`;

let rows = [];

try {
  const res = await fetch(url);
  rows = await res.json();
  localStorage.setItem("routineData", JSON.stringify(rows));
} catch {
  rows = JSON.parse(localStorage.getItem("routineData") || "[]");
}

  // Populate filters
  // ✅ FIX: sort days by custom order (Sunday before Monday)
  fillSelect(
    els.day,
    uniq(rows.map(r => r.Day)).sort((a, b) => dayOrder(a) - dayOrder(b)),
    "All days"
  );

  fillSelect(
    els.slot,
    uniq(rows.map(r => r["Time Slot"])).sort((a,b)=>slotOrder(a)-slotOrder(b)),
    "All slots"
  );

  fillSelect(els.course, uniq(rows.map(r => r["Course Code"])).sort(), "All courses");
  fillSelect(els.teacher, uniq(rows.map(r => r.Teacher)).sort(), "All teachers");
  fillSelect(
    els.semsec,
    uniq(rows.map(r => r["Semester & Section"])).sort(),
    "All semesters"
  );
  fillSelect(els.room, uniq(rows.map(r => r.Room)).sort(), "All rooms");

  // Events
  ["input","change"].forEach(ev =>
    els.q.addEventListener(ev, () => render(rows))
  );

  [els.day, els.slot, els.course, els.teacher, els.semsec, els.room]
    .forEach(el => el.addEventListener("change", () => render(rows)));

 els.reset.addEventListener("click", () => {
  els.q.value = "";

  [
    els.day,
    els.slot,
    els.course,
    els.teacher,
    els.semsec,
    els.room
  ].forEach(el => el.value = "");

  els.tbody.innerHTML = "";
  els.count.textContent = "Select a filter to view routine";
});


  // Initial state
  els.tbody.innerHTML = "";
  els.count.textContent = "Select a filter to view routine";
}

init().catch(err => {
  console.error(err);
  els.count.textContent = "Failed to load routine from Google Sheet";
});
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}