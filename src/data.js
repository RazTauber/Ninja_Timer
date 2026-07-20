import * as XLSX from 'xlsx-js-style';

/**
 * SECURITY POLICY — LOCAL-ONLY DATA STORAGE
 *
 * All competition data (times, competitor names, obstacle names) is CONFIDENTIAL.
 * This module enforces strictly local persistence:
 *   - Storage: browser localStorage ONLY (keys prefixed "ninja_timer_")
 *   - Export: local file download via Blob URL — never uploaded
 *   - Network: ZERO outbound requests with app data (enforced by CSP)
 *
 * DO NOT add any analytics, telemetry, cloud sync, or external API calls.
 * DO NOT transmit any competition data over the network.
 */

const STORAGE_KEYS = {
  OBSTACLES: 'ninja_timer_obstacles',
  RUNS: 'ninja_timer_runs',
  COMP_DATE: 'ninja_timer_comp_date',
  HEAT_NUMBER: 'ninja_timer_heat_number',
  HEAT_CACHE: 'ninja_timer_heat_cache',
  SESSION: 'ninja_timer_session',
  PLAYERS: 'ninja_timer_players',
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

function loadHeatNumber() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HEAT_NUMBER);
    return raw ? parseInt(raw, 10) : 1;
  } catch {
    return 1;
  }
}

function saveHeatNumber(num) {
  localStorage.setItem(STORAGE_KEYS.HEAT_NUMBER, String(num));
}

function loadHeatCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HEAT_CACHE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveHeatCache(cache) {
  localStorage.setItem(STORAGE_KEYS.HEAT_CACHE, JSON.stringify(cache));
}

function getNextHeatNumber(date) {
  const cache = loadHeatCache();
  return (cache[date] || 0) + 1;
}

function registerHeat(date, heatNumber) {
  const cache = loadHeatCache();
  cache[date] = Math.max(cache[date] || 0, heatNumber);
  saveHeatCache(cache);
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

function isActiveSession() {
  return sessionStorage.getItem(STORAGE_KEYS.SESSION) === '1';
}

function markSessionActive() {
  sessionStorage.setItem(STORAGE_KEYS.SESSION, '1');
}

function handleFreshLoad() {
  return !isActiveSession();
}

function hasLastHeatData() {
  const runs = loadRuns();
  const obstacles = loadObstacles();
  return runs.length > 0 && obstacles.length > 0;
}

function loadPlayers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PLAYERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePlayers(players) {
  localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
}

function clearLastHeatData() {
  clearRuns();
  localStorage.removeItem(STORAGE_KEYS.OBSTACLES);
  localStorage.removeItem(STORAGE_KEYS.HEAT_NUMBER);
  localStorage.removeItem(STORAGE_KEYS.PLAYERS);
}

function clearRuns() {
  localStorage.removeItem(STORAGE_KEYS.RUNS);
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(centiseconds).padStart(2, '0')}`;
}

function formatSeconds(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(centiseconds).padStart(2, '0')}`;
}

function formatHebrewDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  return `${day} ב${months[month]} ${year}`;
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
  if (run.wallFailed) return WALL_RESULTS.FAILED;
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

function getRankTime(run) {
  if (run.dnf) {
    if (run.wallFailed) {
      const wallUnlock = run.events.find(e => e.type === 'WALL_UNLOCKED');
      if (wallUnlock) return wallUnlock.time;
    }
    const fallEvent = run.events.find(e => e.type === 'FALL');
    if (fallEvent && fallEvent.obstacleStartTime != null && isFinite(fallEvent.obstacleStartTime)) {
      return fallEvent.obstacleStartTime;
    }
  }
  return run.totalTime;
}

function getObstaclesCompleted(run) {
  return run.events.filter(e => e.type === 'PASSED').length;
}

function rankRuns(runs) {
  return [...runs].sort((a, b) => {
    if (a.dnf && !b.dnf) return 1;
    if (!a.dnf && b.dnf) return -1;
    if (!a.dnf && !b.dnf) return a.totalTime - b.totalTime;
    const aObs = getObstaclesCompleted(a);
    const bObs = getObstaclesCompleted(b);
    if (aObs !== bObs) return bObs - aObs;
    return getRankTime(a) - getRankTime(b);
  });
}

function downloadRunsCSV(runs, obstacles) {
  const currentHeat = loadHeatNumber();
  const obstacleHeaders = obstacles.flatMap(o => [`${obstacleLabel(o)} — זינוק`, `${obstacleLabel(o)} — תוצאה`]);
  const headers = ['תאריך', 'מקצה', 'דירוג', 'סדר', 'מתחרה', ...obstacleHeaders, 'זמן סה"כ', 'סיים?', 'תוצאת קיר'];

  const sortedForRank = rankRuns(runs);
  const rankMap = new Map(sortedForRank.map((r, i) => [r, i + 1]));

  const headlineText = `נינג'ה ישראל — תוצאות תחרות — ${formatHebrewDate(loadCompDate())} — מקצה ${currentHeat}`;

  const dataRows = sortedForRank.map((run) => {
    const runDate = new Date(run.startTime);
    const dateStr = `${String(runDate.getDate()).padStart(2, '0')}/${String(runDate.getMonth() + 1).padStart(2, '0')}/${runDate.getFullYear()}`;

    const obstacleTimes = {};
    for (const event of run.events) {
      if (event.type === 'PASSED' && event.obstacle) {
        obstacleTimes[event.obstacle] = formatSeconds(event.time);
      }
    }

    const finished = !run.dnf && obstacles.every(o => o in obstacleTimes);
    const order = run.startOrder ?? (runs.indexOf(run) + 1);
    const rank = rankMap.get(run);

    return [
      dateStr,
      run.heatNumber ?? currentHeat,
      rank,
      order,
      run.contestantName,
      ...obstacles.flatMap(o => {
        const startEvt = run.events.find(e => e.type === 'OBSTACLE_START' && e.obstacle === o);
        const startCol = startEvt ? formatSeconds(startEvt.time) : '-';
        let resultCol;
        if (obstacleTimes[o]) {
          resultCol = obstacleTimes[o];
        } else {
          const fell = run.events.find(e => e.type === 'FALL' && e.obstacle === o);
          if (fell) {
            const displayTime = fell.obstacleStartTime != null ? fell.obstacleStartTime : fell.time;
            resultCol = formatSeconds(displayTime) + ' (נפילה)';
          } else {
            resultCol = '-';
          }
        }
        return [startCol, resultCol];
      }),
      formatSeconds(run.totalTime),
      finished ? 'כן' : 'לא',
      wallResultDisplay(run),
    ];
  });

  const wsData = [[headlineText], headers, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws['!cols'] = headers.map((h, i) => {
    if (i === 4) return { wch: 22 };
    if (h.includes('זינוק') || h.includes('תוצאה')) return { wch: 16 };
    if (i <= 3) return { wch: 10 };
    return { wch: 18 };
  });
  if (!ws['!merges']) ws['!merges'] = [];
  ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } });

  const totalCols = headers.length;
  const totalRows = dataRows.length + 2;

  const thin = { style: 'thin', color: { rgb: '162050' } };
  const borderAll = { top: thin, bottom: thin, left: thin, right: thin };

  const titleStyle = {
    font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '0A1430' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: borderAll,
  };

  const headerStyle = {
    font: { bold: true, sz: 11, color: { rgb: 'C8D4F0' } },
    fill: { fgColor: { rgb: '1E52E0' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: borderAll,
  };

  const obstStartHeaderStyle = {
    font: { bold: true, sz: 10, color: { rgb: 'D8E4F8' } },
    fill: { fgColor: { rgb: '2A68F8' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: borderAll,
  };

  const obstResultHeaderStyle = {
    font: { bold: true, sz: 10, color: { rgb: 'D8E4F8' } },
    fill: { fgColor: { rgb: '1E52E0' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: borderAll,
  };

  const dataStyleEven = {
    font: { sz: 11, color: { rgb: '060810' } },
    fill: { fgColor: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderAll,
  };

  const dataStyleOdd = {
    font: { sz: 11, color: { rgb: '060810' } },
    fill: { fgColor: { rgb: 'E8EDF8' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderAll,
  };

  const nameStyleEven = {
    font: { bold: true, sz: 11, color: { rgb: '0A1430' } },
    fill: { fgColor: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: borderAll,
  };

  const nameStyleOdd = {
    font: { bold: true, sz: 11, color: { rgb: '0A1430' } },
    fill: { fgColor: { rgb: 'E8EDF8' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: borderAll,
  };

  const fallStyle = (isOdd) => ({
    font: { sz: 11, color: { rgb: 'CC1A22' } },
    fill: { fgColor: { rgb: isOdd ? 'F8E0E1' : 'FCECED' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderAll,
  });

  const finishedYesStyle = (isOdd) => ({
    font: { bold: true, sz: 11, color: { rgb: 'B8860B' } },
    fill: { fgColor: { rgb: isOdd ? 'FFF5D0' : 'FFFBE6' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderAll,
  });

  const finishedNoStyle = (isOdd) => ({
    font: { bold: true, sz: 11, color: { rgb: 'CC1A22' } },
    fill: { fgColor: { rgb: isOdd ? 'F8E0E1' : 'FCECED' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderAll,
  });

  const megaWallStyle = (isOdd) => ({
    font: { bold: true, sz: 11, color: { rgb: 'E8B500' } },
    fill: { fgColor: { rgb: isOdd ? 'FFF5D0' : 'FFFBE6' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderAll,
  });

  const wallPassStyle = (isOdd) => ({
    font: { bold: true, sz: 11, color: { rgb: 'B8860B' } },
    fill: { fgColor: { rgb: isOdd ? 'FFF8DC' : 'FFFDF0' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderAll,
  });

  const wallFailStyle = (isOdd) => ({
    font: { bold: true, sz: 11, color: { rgb: 'CC1A22' } },
    fill: { fgColor: { rgb: isOdd ? 'F8E0E1' : 'FCECED' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderAll,
  });

  const rankStyle = (isOdd, rank) => {
    const base = {
      font: { bold: true, sz: 12, color: { rgb: '060810' } },
      fill: { fgColor: { rgb: isOdd ? 'E8EDF8' : 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: borderAll,
    };
    if (rank === 1) { base.fill = { fgColor: { rgb: 'FFF5D0' } }; base.font.color = { rgb: 'E8B500' }; }
    else if (rank === 2) { base.fill = { fgColor: { rgb: 'E8EDF8' } }; base.font.color = { rgb: '5870A0' }; }
    else if (rank === 3) { base.fill = { fgColor: { rgb: 'F5E6D0' } }; base.font.color = { rgb: '8B5E3C' }; }
    return base;
  };

  const finishedColIdx = totalCols - 2;
  const wallColIdx = totalCols - 1;

  for (let c = 0; c < totalCols; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) ws[addr].s = titleStyle;
  }

  for (let c = 0; c < totalCols; c++) {
    const addr = XLSX.utils.encode_cell({ r: 1, c });
    if (ws[addr]) {
      const hText = headers[c] || '';
      if (hText.includes('זינוק')) ws[addr].s = obstStartHeaderStyle;
      else if (hText.includes('תוצאה')) ws[addr].s = obstResultHeaderStyle;
      else ws[addr].s = headerStyle;
    }
  }

  for (let r = 0; r < dataRows.length; r++) {
    const isOdd = r % 2 === 1;
    const row = dataRows[r];
    const rowRank = row[2];

    for (let c = 0; c < totalCols; c++) {
      const addr = XLSX.utils.encode_cell({ r: r + 2, c });
      if (!ws[addr]) continue;
      const val = String(ws[addr].v || '');

      if (c === 2) {
        ws[addr].s = rankStyle(isOdd, rowRank);
      } else if (c === 4) {
        ws[addr].s = isOdd ? nameStyleOdd : nameStyleEven;
      } else if (c === finishedColIdx) {
        ws[addr].s = val === 'כן' ? finishedYesStyle(isOdd) : finishedNoStyle(isOdd);
      } else if (c === wallColIdx) {
        if (val.includes('MEGA')) ws[addr].s = megaWallStyle(isOdd);
        else if (val.includes('✓')) ws[addr].s = wallPassStyle(isOdd);
        else if (val.includes('✕') || val.includes('Failed')) ws[addr].s = wallFailStyle(isOdd);
        else ws[addr].s = isOdd ? dataStyleOdd : dataStyleEven;
      } else if (val.includes('נפילה')) {
        ws[addr].s = fallStyle(isOdd);
      } else {
        ws[addr].s = isOdd ? dataStyleOdd : dataStyleEven;
      }
    }
  }

  ws['!rows'] = [{ hpx: 32 }, { hpx: 28 }, ...dataRows.map(() => ({ hpx: 24 }))];

  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(wb, ws, 'תוצאות');

  const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);

  const compDate = loadCompDate();
  const dateStr = compDate || getTodayISO();
  const filename = `תוצאות-נינגה-${dateStr}-מקצה-${currentHeat}.xlsx`;

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
  loadHeatNumber,
  saveHeatNumber,
  loadHeatCache,
  saveHeatCache,
  getNextHeatNumber,
  registerHeat,
  loadPlayers,
  savePlayers,
  loadRuns,
  saveRun,
  clearRuns,
  handleFreshLoad,
  hasLastHeatData,
  clearLastHeatData,
  markSessionActive,
  isActiveSession,
  formatTime,
  formatSeconds,
  formatHebrewDate,
  getTodayISO,
  getRankTime,
  getObstaclesCompleted,
  rankRuns,
  normalizeWallResult,
  wallResultDisplay,
  downloadRunsCSV,
  esc,
};
