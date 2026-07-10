import { loadRuns, clearRuns, loadObstacles, formatSeconds, downloadRunsCSV } from './data.js';

export function renderExport(app, onBack) {
  const runs = loadRuns();
  const obstacles = loadObstacles();

  app.innerHTML = `
    <div class="stage-container">
      <h1 class="page-title">ייצוא תוצאות</h1>

      ${runs.length === 0 ? `
        <p class="empty-hint">עדיין לא נרשמו ריצות. חזרו אחורה ותתחילו לתזמן מתחרים!</p>
      ` : `
        <p class="stage-hint">${runs.length} מתחרים נרשמו</p>

        <div class="runs-preview">
          ${runs.map(run => {
            const passed = run.events.filter(e => e.type === 'PASSED');
            const falls = run.events.filter(e => e.type === 'FALL');
            const finished = passed.length === obstacles.length;
            return `
            <div class="run-card">
              <div class="run-card-header">
                <span class="run-card-name">${run.contestantName}</span>
                <span class="run-card-time ${finished ? '' : 'dnf-label'}">${finished ? formatSeconds(run.totalTime) + " שנ'" : 'נפילה'}</span>
              </div>
              <div class="run-card-stats">
                ${passed.length}/${obstacles.length} מכשולים
                ${falls.length > 0 ? `· ${falls.length} ${falls.length === 1 ? 'נפילה' : 'נפילות'}` : ''}
              </div>
            </div>
          `}).join('')}
        </div>

        <button class="btn-primary btn-download">
          ⬇ הורדת CSV
        </button>

        <button class="btn-danger btn-clear">
          מחיקת כל הנתונים
        </button>
      `}

      <button class="btn-secondary btn-back">→ חזרה לתחרות</button>
    </div>
  `;

  const downloadBtn = app.querySelector('.btn-download');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      downloadRunsCSV(runs, obstacles);
    });
  }

  const clearBtn = app.querySelector('.btn-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('האם אתם בטוחים? פעולה זו תמחק את כל הריצות שנרשמו.')) {
        clearRuns();
        renderExport(app, onBack);
      }
    });
  }

  app.querySelector('.btn-back').addEventListener('click', () => {
    onBack();
  });
}
