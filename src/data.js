const STORAGE_KEYS = {
  OBSTACLES: 'ninja_timer_obstacles',
  RUNS: 'ninja_timer_runs',
  COMP_DATE: 'ninja_timer_comp_date',
};

const ALL_OBSTACLES = [
  { he: 'הגלשנים', en: 'Slide Surfer' },
  { he: 'המטריות', en: 'Ring Around The Rosie' },
  { he: 'לצאת מהמסגרת', en: 'Close The Gap' },
  { he: 'עובר ושב', en: 'Overpass' },
  { he: 'סולם הסלמון אל גלילי החוטים', en: 'Salmon Ladder to Patriot Pass' },
  { he: 'סולם הסלמון אל שינוי תפיסה', en: 'Salmon Ladder to Hopscotch' },
  { he: 'הקליידוסקופ', en: 'Kaleidoscope' },
  { he: 'שובר הלסתות', en: 'Jaw Breaker' },
  { he: 'ממיר המתח', en: 'Inverter' },
  { he: 'שלושת החישוקים', en: 'Ring Turn' },
  { he: 'סוכריה על מקל / מקל סבא', en: 'Suspended Staffs' },
  { he: 'סולם הסלמון אל זנב הפרה', en: 'Salmon Ladder to Launch Lasso' },
  { he: 'המצפן / העפיפונים / מכשול הרסקין', en: 'Surfer Kite' },
  { he: 'הקימורים המסוכנים', en: 'Dangerous Curves' },
  { he: 'הקופסאות', en: 'Box Office' },
  { he: 'קובייה הונגרית', en: 'Cubes' },
  { he: 'גשר הלהבים', en: 'Razors Edge' },
  { he: 'הטוויסטר הכפול', en: 'Double Twister' },
  { he: 'הפעמונים', en: 'Ring The Bells' },
  { he: 'סולם הסלמון אל התמרורים', en: 'Salmon Ladder to Road Signs' },
  { he: 'המנעולים', en: 'Padlock' },
  { he: 'סולם הסלמון המתגלגל / רול סלמון', en: 'Salmon Roll' },
  { he: 'גלגלי האופניים', en: 'Swinging Bowties' },
  { he: 'הבוכנות', en: 'Piston Plunge' },
  { he: 'סולם הסלמון אל הדרקון', en: "Salmon Ladder to Dragon's Back" },
  { he: 'לכל הכיוונים', en: 'Fallout' },
  { he: 'שבירת הברק', en: 'Lightning Bolts' },
  { he: 'הבניין', en: 'Vertical Wall Flip' },
  { he: 'כלוב הכרישים', en: 'Shark Cage' },
  { he: 'הפרופלור', en: 'Propellor Bar' },
  { he: 'עיגול פינות', en: 'Cutting Corners' },
  { he: 'הגה הקפטן', en: "Captain's Wheel" },
  { he: 'אחיזה גבוהה', en: 'Up For Grabs' },
  { he: 'סולם הסלמון הטלסקופי', en: 'Salmon Ladder Telescopic Bar' },
  { he: 'ידיות הכוח אל קצה הרשת', en: 'The Clacker to High Net' },
  { he: 'נדנדת הלהבים', en: 'Swinging Blades' },
  { he: 'ציר הפרפר', en: 'Butterfly Wall' },
  { he: 'רחוק מהעין', en: 'Blindside' },
  { he: 'קפיצת התופסנים', en: 'Snapback' },
  { he: 'מעבר הנטיפים', en: 'Stalactites' },
  { he: 'תלוי במשקל', en: 'Weight For It' },
  { he: 'גלגלי השיניים אל קצה הרשת', en: 'Clockwork to High Net' },
  { he: 'גשר הקוביות', en: 'Block Run' },
  { he: 'הכוורת', en: 'Beehive' },
  { he: 'הגשר השבור', en: 'Broken Bridge' },
  { he: 'זינוק הטבעת', en: 'Ring Swing' },
  { he: 'טבעות ההברגה', en: 'Heavy Metal' },
  { he: 'כוח עליון', en: 'Crank It Up' },
  { he: 'טביעות האצבע', en: 'Helix Catch' },
  { he: 'הפחים המרחפים אל קצה הרשת', en: 'Fly Shelf Grab to High Net' },
  { he: 'המהפך', en: 'Flipped Around' },
  { he: 'הגה כוח', en: 'Rolling Thunder' },
  { he: 'קפיצה בזמן', en: 'Déjà Vu' },
  { he: 'מתלה אצבעות הברזל', en: 'Crazy Cliffhanger' },
  { he: 'סולם סלמון כפול אל מעבר השרביט', en: 'Double Salmon to Baton Pass' },
  { he: 'הלוחות הצפים', en: 'Floating Doors' },
  { he: 'קפיצת מוט המתח', en: 'Flying Bar' },
];

const OBSTACLE_EN = new Map(ALL_OBSTACLES.map(o => [o.he, o.en]));

function obstacleLabel(heKey) {
  const en = OBSTACLE_EN.get(heKey);
  return en ? `${heKey} — ${en}` : heKey;
}

const MAX_OBSTACLES = 10;
const MIN_OBSTACLES = 3;

function loadObstacles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OBSTACLES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveObstacles(obstacles) {
  localStorage.setItem(STORAGE_KEYS.OBSTACLES, JSON.stringify(obstacles));
}

function loadCompDate() {
  try {
    return localStorage.getItem(STORAGE_KEYS.COMP_DATE) || '';
  } catch {
    return '';
  }
}

function saveCompDate(date) {
  localStorage.setItem(STORAGE_KEYS.COMP_DATE, date);
}

function loadRuns() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RUNS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRun(run) {
  const runs = loadRuns();
  run.startOrder = runs.length + 1;
  runs.push(run);
  localStorage.setItem(STORAGE_KEYS.RUNS, JSON.stringify(runs));
}

function clearRuns() {
  localStorage.removeItem(STORAGE_KEYS.RUNS);
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = ms % 1000;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

function formatSeconds(ms) {
  return (ms / 1000).toFixed(2);
}

function formatHebrewDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  return `${d.getDate()} ב${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function esc(v) {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const WALL_RESULTS = { MEGA_WALL: 'MEGA_WALL', WALL: 'WALL', FAILED: 'FAILED' };

function normalizeWallResult(run) {
  if (run.wallResult) return run.wallResult;
  if (run.dnf) return null;
  return run.megaWall ? WALL_RESULTS.MEGA_WALL : WALL_RESULTS.WALL;
}

function wallResultDisplay(run) {
  const wr = normalizeWallResult(run);
  if (!wr) return '-';
  if (wr === WALL_RESULTS.MEGA_WALL) return 'MEGA Wall 🔥';
  if (wr === WALL_RESULTS.WALL) return 'Wall ✓';
  if (wr === WALL_RESULTS.FAILED) return 'Failed ✕';
  return '-';
}

function downloadRunsCSV(runs, obstacles) {
  const headers = ['תאריך', 'דירוג', 'סדר', 'מתחרה', ...obstacles.map(o => obstacleLabel(o)), 'זמן נפילה', 'סיים?', 'תוצאת קיר'];

  // Compute time-based rank for each run (finishers before DNFs, both by totalTime asc)
  const sortedForRank = [...runs].sort((a, b) => {
    if (a.dnf && !b.dnf) return 1;
    if (!a.dnf && b.dnf) return -1;
    return a.totalTime - b.totalTime;
  });
  const rankMap = new Map(sortedForRank.map((r, i) => [r, i + 1]));

  const dataRows = sortedForRank.map((run) => {
    const runDate = new Date(run.startTime);
    const dateStr = `${String(runDate.getDate()).padStart(2, '0')}/${String(runDate.getMonth() + 1).padStart(2, '0')}/${runDate.getFullYear()}`;

    const obstacleTimes = {};
    for (const event of run.events) {
      if (event.type === 'PASSED' && event.obstacle) {
        obstacleTimes[event.obstacle] = (event.time / 1000).toFixed(2);
      }
    }

    const fallEvent = run.events.find(e => e.type === 'FALL');
    const fallTime = fallEvent ? (fallEvent.time / 1000).toFixed(2) : '-';
    const finished = obstacles.every(o => o in obstacleTimes);

    const order = run.startOrder ?? (runs.indexOf(run) + 1);
    const rank = rankMap.get(run);

    return [
      dateStr,
      rank,
      order,
      run.contestantName,
      ...obstacles.map(o => {
        if (obstacleTimes[o]) return obstacleTimes[o];
        const fell = run.events.find(e => e.type === 'FALL' && e.obstacle === o);
        return fell ? (fell.time / 1000).toFixed(2) + ' (נפילה)' : '-';
      }),
      fallTime,
      finished ? 'כן' : 'לא',
      wallResultDisplay(run),
    ];
  });

  // Build an HTML table that Excel opens with full RTL + design-system branding
  const headerHtml = headers.map(h => `<th>${esc(h)}</th>`).join('');
  const rowsHtml = dataRows.map(row =>
    `<tr>${row.map((cell, i) => {
      const str = String(cell);
      let cls = '';
      if (i === 1) cls = 'cell-rank';
      else if (i === 2) cls = 'cell-order';
      else if (str === '-') cls = 'cell-dash';
      else if (str.includes('נפילה')) cls = 'cell-fall';
      else if (i === row.length - 1 && str.includes('MEGA')) cls = 'cell-wall-mega';
      else if (i === row.length - 1 && str.includes('Wall')) cls = 'cell-wall-pass';
      else if (i === row.length - 1 && str.includes('Failed')) cls = 'cell-wall-fail';
      else if (i === row.length - 3 && str !== '-') cls = 'cell-finish';
      return `<td class="${cls}">${esc(str)}</td>`;
    }).join('')}</tr>`
  ).join('\n');

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      direction: rtl;
      font-family: Arial, Calibri, sans-serif;
      background: #FFFFFF;
      color: #1A1A2E;
      margin: 0;
      padding: 16px;
    }
    h2 {
      font-family: Arial, sans-serif;
      font-size: 18px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #1E52E0;
      margin-bottom: 12px;
    }
    table {
      border-collapse: collapse;
      direction: rtl;
      width: 100%;
    }
    th {
      background: #1E52E0;
      color: #FFFFFF;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      border: 1px solid #BBCBE8;
      padding: 8px 12px;
      text-align: right;
    }
    td {
      border: 1px solid #DDDEEF;
      padding: 7px 12px;
      text-align: right;
      background: #FFFFFF;
      color: #1A1A2E;
      font-size: 12px;
    }
    tr:nth-child(even) td { background: #F4F6FC; }
    .cell-finish { color: #B8860B; font-weight: 700; }
    .cell-fall   { color: #CC1A22; font-weight: 700; }
    .cell-dnf    { color: #CC1A22; }
    .cell-dash   { color: #AAAACC; }
    .cell-rank   { color: #1E52E0; font-weight: 800; font-size: 13px; text-align: center; }
    .cell-order  { color: #8899CC; font-size: 11px; text-align: center; }
    .cell-wall-mega { color: #B8860B; font-weight: 700; font-size: 14px; text-align: center; }
    .cell-wall-pass { color: #1E52E0; font-weight: 600; text-align: center; }
    .cell-wall-fail { color: #CC1A22; font-weight: 600; text-align: center; }
  </style>
</head>
<body>
<h2>נינג'ה ישראל — תוצאות תחרות</h2>
<table>
  <thead><tr>${headerHtml}</tr></thead>
  <tbody>${rowsHtml}</tbody>
</table>
</body>
</html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const filename = `תוצאות-נינגה-${dateStr}.xls`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export {
  ALL_OBSTACLES,
  OBSTACLE_EN,
  obstacleLabel,
  MAX_OBSTACLES,
  MIN_OBSTACLES,
  WALL_RESULTS,
  loadObstacles,
  saveObstacles,
  loadCompDate,
  saveCompDate,
  loadRuns,
  saveRun,
  clearRuns,
  formatTime,
  formatSeconds,
  formatHebrewDate,
  getTodayISO,
  normalizeWallResult,
  wallResultDisplay,
  downloadRunsCSV,
};
