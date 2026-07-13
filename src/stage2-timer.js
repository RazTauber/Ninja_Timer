import { saveRun, loadRuns, clearRuns, formatTime, formatSeconds, formatHebrewDate, loadCompDate, downloadRunsCSV, WALL_RESULTS, normalizeWallResult, OBSTACLE_EN, loadHeatNumber, getRankTime, esc } from './data.js';

const HOLD_DURATION = 1200;

export function renderTimer(app, obstacles, onFinish) {
  let contestantName = '';
  let activeRun = null;

  function showNewCompModal(runCount, { onExport, onDelete }) {
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box">
        <p class="modal-title">תחרות חדשה</p>
        <p class="modal-body">יש ${runCount} ריצות שנרשמו. מה לעשות לפני שמתחילים מחדש?</p>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-export">ייצא — Export</button>
          <button class="modal-btn modal-btn-delete">מחק — Delete</button>
          <button class="modal-btn modal-btn-cancel">ביטול</button>
        </div>
      </div>
    `;

    overlay.querySelector('.modal-btn-export').addEventListener('click', () => {
      overlay.remove();
      onExport();
    });
    overlay.querySelector('.modal-btn-delete').addEventListener('click', () => {
      overlay.remove();
      onDelete();
    });
    overlay.querySelector('.modal-btn-cancel').addEventListener('click', () => {
      overlay.remove();
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
  }

  function renderCompetitionView() {
    const runs = loadRuns();
    const compDate = loadCompDate();
    const dateLabel = formatHebrewDate(compDate) || 'תחרות';
    const heatNum = loadHeatNumber();

    app.innerHTML = `
      <div class="comp-layout">
        <header class="comp-header">
          <div class="header-right">
            <button class="header-btn btn-new-comp" title="התחלת תחרות חדשה">
              <span class="btn-arrow-back">→</span>
              <span>חדש</span>
            </button>
            <div class="header-info">
              <span class="header-date">${dateLabel} · מקצה ${heatNum}</span>
              <span class="header-stats">${obstacles.length} מכשולים · ${runs.length} ריצות</span>
            </div>
          </div>
          <img src="/ninja-logo.png" alt="נינג'ה ישראל 2026" class="header-logo" />
          <button class="header-btn btn-export-excel" ${runs.length === 0 ? 'disabled' : ''}>
            <span>⬇</span>
            ייצוא לאקסל
          </button>
        </header>

        <main class="comp-main">
          <div id="runner-section"></div>
          <div id="scoreboard-section"></div>
        </main>
      </div>
    `;

    app.querySelector('.btn-new-comp').addEventListener('click', () => {
      const runs = loadRuns();
      if (runs.length === 0) {
        if (activeRun) {
          clearInterval(activeRun.timerInterval);
          activeRun = null;
        }
        onFinish('setup');
        return;
      }
      showNewCompModal(runs.length, {
        onExport: () => {
          downloadRunsCSV(loadRuns(), obstacles);
          if (activeRun) {
            clearInterval(activeRun.timerInterval);
            activeRun = null;
          }
          clearRuns();
          onFinish('setup');
        },
        onDelete: () => {
          if (activeRun) {
            clearInterval(activeRun.timerInterval);
            activeRun = null;
          }
          clearRuns();
          onFinish('setup');
        },
      });
    });

    const exportBtn = app.querySelector('.btn-export-excel');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        if (exportBtn.disabled) return;
        downloadRunsCSV(loadRuns(), obstacles);
      });
    }

    renderRunnerSection();
    renderScoreboard();
  }

  function renderRunnerSection() {
    const section = document.getElementById('runner-section');
    if (!section) return;

    if (activeRun) {
      renderActiveTimer(section);
      return;
    }

    section.innerHTML = `
      <div class="card runner-card">
        <div class="card-title">
          <span class="card-icon">🚩</span>
          המתחרה הבא
        </div>
        <div class="name-row">
          <input type="text" class="name-input" placeholder="הזינו שם מתחרה..." value="${esc(contestantName)}" autofocus />
          <button class="btn-start-run" ${contestantName.length === 0 ? 'disabled' : ''}>
            <span class="card-icon">🚩</span>
            התחלת ריצה
          </button>
        </div>
        <p class="input-hint">השעון מתחיל ברגע לחיצת זינוק במכשול הראשון. לחצו Enter כדי להתחיל.</p>
      </div>
    `;

    const input = section.querySelector('.name-input');
    const startBtn = section.querySelector('.btn-start-run');

    input.addEventListener('input', () => {
      contestantName = input.value.trim();
      startBtn.disabled = contestantName.length === 0;
    });

    const startHandler = () => {
      if (contestantName.length > 0) {
        startNewRun();
      }
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && contestantName.length > 0) {
        e.preventDefault();
        startHandler();
      }
    });

    startBtn.addEventListener('click', startHandler);
    setTimeout(() => input.focus(), 50);
  }

  function startNewRun() {
    activeRun = {
      contestantName,
      startTime: null,
      startISO: null,
      currentObstacleIndex: 0,
      events: [{ time: 0, type: 'STARTED', obstacle: null }],
      timerInterval: null,
      finished: false,
      timerStarted: false,
    };

    renderRunnerSection();
  }

  function renderActiveTimer(section) {
    if (!activeRun) return;

    const run = activeRun;
    const elapsed = !run.timerStarted ? 0 : run.wallUnlocked ? run.wallPendingTime : Date.now() - run.startTime;
    const currentIdx = run.currentObstacleIndex;
    const passedCount = run.events.filter(e => e.type === 'PASSED').length;
    const progressPct = Math.round((passedCount / obstacles.length) * 100);

    section.innerHTML = `
      <div class="card timer-card ${run.wallUnlocked ? 'timer-card-wall-open' : ''}">
        <div class="timer-top">
          <div class="timer-info">
            <span class="timer-status">${run.wallUnlocked ? '🏆 הקיר פתוח!' : !run.timerStarted ? '🏁 ממתין לזינוק' : '⏱ בריצה'}</span>
            <span class="timer-player">${esc(run.contestantName)}</span>
          </div>
          <div class="timer-display">
            <span class="timer-value">${formatTime(elapsed)}</span>
          </div>
        </div>

        <div class="timer-progress-bar">
          <div class="progress-labels">
            <span>${passedCount} / ${obstacles.length} מכשולים</span>
            <span>${progressPct}%</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${progressPct}%"></div>
          </div>
        </div>

        <div class="obstacles-list">
          ${obstacles.map((name, i) => {
            const passEvent = run.events.find(e => e.type === 'PASSED' && e.obstacle === name);
            const fallEvent = run.events.find(e => e.type === 'FALL' && e.obstacle === name);
            const isCurrent = i === currentIdx && !run.finished;
            const isPassed = !!passEvent;
            const isFallen = !!fallEvent;
            const isLocked = i > currentIdx && !run.finished;

            let statusClass = '';
            let content = '';

            const startEvent = run.events.find(e => e.type === 'OBSTACLE_START' && e.obstacle === name);

            if (isPassed) {
              statusClass = 'obstacle-passed';
              const startLabel = startEvent ? `<span class="split-start">ז׳ ${formatSeconds(startEvent.time)}</span>` : '';
              content = `<span class="split-badge">✓ ${startLabel}${formatSeconds(passEvent.time)}</span>`;
            } else if (isFallen) {
              statusClass = 'obstacle-fallen';
              const startLabel = startEvent ? `<span class="split-start">ז׳ ${formatSeconds(startEvent.time)}</span>` : '';
              content = `<span class="fall-badge">✕ נפילה ${startLabel}${formatSeconds(fallEvent.time)}</span>`;
            } else if (isCurrent) {
              statusClass = 'obstacle-current';
              const isLast = i === obstacles.length - 1;

              if (!startEvent) {
                content = `
                  <div class="obstacle-actions">
                    <button class="action-btn btn-start-obstacle" data-index="${i}">
                      <span>🏁</span> זינוק
                    </button>
                  </div>
                `;
              } else {
                content = `
                  <div class="obstacle-actions">
                    <span class="start-time-badge">ז׳ ${formatSeconds(startEvent.time)}</span>
                    <button class="action-btn btn-pass" data-index="${i}">
                      <span>✓</span> ${isLast ? 'החזיקו לסיום' : 'עבר'}
                    </button>
                    <button class="action-btn btn-fall" data-index="${i}">
                      <span>✕</span> נפילה
                    </button>
                  </div>
                `;
              }
            } else if (isLocked) {
              statusClass = 'obstacle-locked';
              content = `<span class="lock-label">🔒 נעול</span>`;
            }

            return `
              <div class="obstacle-row ${statusClass}">
                <div class="obstacle-badge ${isPassed ? 'badge-passed' : isCurrent ? 'badge-current' : isFallen ? 'badge-fallen' : 'badge-locked'}">${i + 1}</div>
                <div class="obstacle-name-wrap">
                  <span class="obstacle-name">${name}</span>
                  <span class="obstacle-name-en">${OBSTACLE_EN.get(name) || ''}</span>
                </div>
                ${content}
              </div>
            `;
          }).join('')}

          ${run.wallUnlocked ? `
            <div class="obstacle-row obstacle-wall-unlocked">
              <div class="obstacle-badge badge-wall">🧱</div>
              <span class="obstacle-name">הקיר</span>
              <div class="wall-row-actions">
                <button class="btn-wall-mega">🔥 MEGA Wall</button>
                <button class="btn-wall-regular">✓ Wall</button>
                <button class="btn-wall-failed">✕ Failed</button>
              </div>
            </div>
          ` : `
            <div class="obstacle-row obstacle-wall-locked">
              <div class="obstacle-badge badge-wall">🧱</div>
              <span class="obstacle-name">הקיר</span>
              <span class="lock-label">🔒 נעול — סיימו את כל המכשולים</span>
            </div>
          `}
        </div>

        <div class="timer-footer">
          <button class="footer-btn btn-cancel-run">
            <span>→</span> ביטול ריצה
          </button>
          ${run.events.length > 1 ? `
            <button class="footer-btn btn-undo-last">
              <span>↩</span> ביטול הקלקה אחרונה
            </button>
          ` : ''}
        </div>
      </div>
    `;

    attachTimerEvents(section);
  }

  function handleWallResult(result) {
    if (!activeRun) return;
    const elapsed = activeRun.wallPendingTime;

    activeRun.events.push({
      time: elapsed,
      type: 'WALL_RESULT',
      obstacle: null,
      wallResult: result,
    });

    finishRun(elapsed, result);
  }

  function attachTimerEvents(section) {
    if (!activeRun) return;

    const timerCard = section.querySelector('.timer-card');
    if (timerCard) {
      timerCard.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (e.target.closest('.btn-pass') || e.target.closest('.btn-fall') || e.target.closest('.btn-start-obstacle')) {
            e.preventDefault();
          }
        }
      });
    }

    const wallMegaBtn = section.querySelector('.btn-wall-mega');
    if (wallMegaBtn) {
      wallMegaBtn.addEventListener('click', () => handleWallResult(WALL_RESULTS.MEGA_WALL));
    }
    const wallRegBtn = section.querySelector('.btn-wall-regular');
    if (wallRegBtn) {
      wallRegBtn.addEventListener('click', () => handleWallResult(WALL_RESULTS.WALL));
    }
    const wallFailBtn = section.querySelector('.btn-wall-failed');
    if (wallFailBtn) {
      wallFailBtn.addEventListener('click', () => handleWallResult(WALL_RESULTS.FAILED));
    }

    section.querySelectorAll('.btn-start-obstacle').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        handleObstacleStart(idx);
      });
    });

    section.querySelectorAll('.btn-pass').forEach(btn => {
      const idx = parseInt(btn.dataset.index, 10);
      const isLast = idx === obstacles.length - 1;

      if (isLast) {
        setupHoldButton(btn, (pressStart) => {
          handlePass(idx, pressStart);
        });
      } else {
        btn.addEventListener('click', () => {
          handlePass(idx);
        });
      }
    });

    section.querySelectorAll('.btn-fall').forEach(btn => {
      setupHoldButton(btn, (pressStart) => {
        const idx = parseInt(btn.dataset.index, 10);
        handleFall(idx, pressStart);
      });
    });

    const cancelBtn = section.querySelector('.btn-cancel-run');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        cancelRun();
      });
    }

    const undoBtn = section.querySelector('.btn-undo-last');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        undoLastAction();
      });
    }
  }

  function setupHoldButton(btn, onComplete) {
    let holdTimer = null;
    let startedAt = null;
    let progressEl = null;

    function createProgress() {
      progressEl = document.createElement('div');
      progressEl.className = 'hold-progress';
      btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
      btn.appendChild(progressEl);
    }

    function startHold(e) {
      e.preventDefault();
      if (holdTimer) return;

      startedAt = Date.now();
      createProgress();

      const animate = () => {
        if (!startedAt || !progressEl) return;
        const elapsed = Date.now() - startedAt;
        const pct = Math.min((elapsed / HOLD_DURATION) * 100, 100);
        progressEl.style.width = `${pct}%`;

        if (pct >= 100) {
          endHold();
          onComplete(Date.now());
          return;
        }
        holdTimer = requestAnimationFrame(animate);
      };
      holdTimer = requestAnimationFrame(animate);
    }

    function endHold() {
      if (holdTimer) {
        cancelAnimationFrame(holdTimer);
        holdTimer = null;
      }
      startedAt = null;
      if (progressEl) {
        progressEl.remove();
        progressEl = null;
      }
    }

    btn.addEventListener('pointerdown', startHold);
    btn.addEventListener('pointerup', endHold);
    btn.addEventListener('pointerleave', endHold);
    btn.addEventListener('pointercancel', endHold);
    btn.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  }

  function handleObstacleStart(obstacleIndex) {
    if (!activeRun) return;

    if (!activeRun.timerStarted) {
      const now = Date.now();
      activeRun.startTime = now;
      activeRun.startISO = new Date(now).toISOString();
      activeRun.timerStarted = true;
      activeRun.timerInterval = setInterval(() => {
        const tv = document.querySelector('.timer-value');
        if (tv && activeRun) {
          tv.textContent = formatTime(Date.now() - activeRun.startTime);
        }
      }, 16);
    }

    const elapsed = Date.now() - activeRun.startTime;
    const obstacleName = obstacles[obstacleIndex];

    activeRun.events.push({ time: elapsed, type: 'OBSTACLE_START', obstacle: obstacleName });

    renderRunnerSection();
  }

  function handlePass(obstacleIndex, pressStart) {
    if (!activeRun) return;
    const elapsed = (pressStart ?? Date.now()) - activeRun.startTime;
    const obstacleName = obstacles[obstacleIndex];

    const startEvent = activeRun.events.find(e => e.type === 'OBSTACLE_START' && e.obstacle === obstacleName);
    const obstacleStartTime = startEvent ? startEvent.time : 0;

    activeRun.events.push({ time: elapsed, type: 'PASSED', obstacle: obstacleName, obstacleStartTime });
    activeRun.currentObstacleIndex++;

    if (activeRun.currentObstacleIndex >= obstacles.length) {
      unlockWall(elapsed);
      return;
    }

    renderRunnerSection();
  }

  function unlockWall(elapsed) {
    if (!activeRun) return;
    clearInterval(activeRun.timerInterval);
    activeRun.timerInterval = null;
    activeRun.finished = true;
    activeRun.wallUnlocked = true;
    activeRun.wallPendingTime = elapsed;
    activeRun.wallResult = null;

    activeRun.events.push({ time: elapsed, type: 'WALL_UNLOCKED', obstacle: null });

    renderRunnerSection();
  }

  function handleFall(obstacleIndex, pressStart) {
    if (!activeRun) return;
    const elapsed = (pressStart ?? Date.now()) - activeRun.startTime;
    const obstacleName = obstacles[obstacleIndex];

    const startEvent = activeRun.events.find(e => e.type === 'OBSTACLE_START' && e.obstacle === obstacleName);
    const obstacleStartTime = startEvent ? startEvent.time : 0;

    activeRun.events.push({ time: elapsed, type: 'FALL', obstacle: obstacleName, obstacleStartTime });

    clearInterval(activeRun.timerInterval);
    activeRun.timerInterval = null;
    activeRun.finished = true;

    activeRun.events.push({ time: elapsed, type: 'COMPLETED', obstacle: null });

    const run = {
      contestantName: activeRun.contestantName,
      startTime: activeRun.startISO,
      events: [...activeRun.events],
      totalTime: elapsed,
      dnf: true,
      heatNumber: loadHeatNumber(),
    };
    saveRun(run);

    activeRun = null;
    contestantName = '';

    updateHeaderStats();
    renderRunnerSection();
    renderScoreboard();
  }

  function finishRun(totalTime, wallResult) {
    if (!activeRun) return;

    clearInterval(activeRun.timerInterval);
    activeRun.timerInterval = null;

    activeRun.events.push({ time: totalTime, type: 'COMPLETED', obstacle: null });

    const run = {
      contestantName: activeRun.contestantName,
      startTime: activeRun.startISO,
      events: [...activeRun.events],
      totalTime,
      dnf: false,
      wallResult,
      wallAttempts: 3,
      megaWall: wallResult === WALL_RESULTS.MEGA_WALL,
      heatNumber: loadHeatNumber(),
    };
    saveRun(run);

    activeRun = null;
    contestantName = '';

    updateHeaderStats();
    renderRunnerSection();
    renderScoreboard();
  }

  function cancelRun() {
    if (!activeRun) return;
    clearInterval(activeRun.timerInterval);
    activeRun = null;
    renderRunnerSection();
  }

  function restartTimerInterval() {
    if (!activeRun.timerInterval) {
      activeRun.timerInterval = setInterval(() => {
        const tv = document.querySelector('.timer-value');
        if (tv && activeRun) {
          tv.textContent = formatTime(Date.now() - activeRun.startTime);
        }
      }, 16);
    }
  }

  function undoLastAction() {
    if (!activeRun || activeRun.events.length <= 1) return;

    const lastEvent = activeRun.events[activeRun.events.length - 1];
    activeRun.events.pop();

    if (lastEvent.type === 'PASSED') {
      activeRun.currentObstacleIndex = Math.max(0, activeRun.currentObstacleIndex - 1);
    }

    if (activeRun.wallUnlocked) {
      if (lastEvent.type === 'WALL_UNLOCKED') {
        const prevEvent = activeRun.events[activeRun.events.length - 1];
        if (prevEvent && prevEvent.type === 'PASSED') {
          activeRun.events.pop();
          activeRun.currentObstacleIndex = Math.max(0, activeRun.currentObstacleIndex - 1);
        }
        activeRun.wallUnlocked = false;
        activeRun.wallPendingTime = null;
        activeRun.wallResult = null;
        activeRun.finished = false;
        restartTimerInterval();
      }
    }

    if (lastEvent.type === 'FALL') {
      restartTimerInterval();
      activeRun.finished = false;
    }

    if (lastEvent.type === 'OBSTACLE_START') {
      const remainingStarts = activeRun.events.filter(e => e.type === 'OBSTACLE_START');
      if (remainingStarts.length === 0) {
        clearInterval(activeRun.timerInterval);
        activeRun.timerInterval = null;
        activeRun.timerStarted = false;
        activeRun.startTime = null;
        activeRun.startISO = null;
      }
    }

    renderRunnerSection();
  }

  function updateHeaderStats() {
    const runs = loadRuns();
    const statsEl = document.querySelector('.header-stats');
    if (statsEl) {
      statsEl.textContent = `${obstacles.length} מכשולים · ${runs.length} ריצות`;
    }
    const exportBtn = document.querySelector('.btn-export-excel');
    if (exportBtn) {
      exportBtn.disabled = runs.length === 0;
    }
  }

  function renderScoreboard() {
    const section = document.getElementById('scoreboard-section');
    if (!section) return;

    const runs = loadRuns();

    // Build start-order map before sorting (backward-compat: use array index for old runs)
    const orderMap = new Map(runs.map((r, i) => [r, r.startOrder ?? (i + 1)]));

    const sortedRuns = [...runs].sort((a, b) => {
      if (a.dnf && !b.dnf) return 1;
      if (!a.dnf && b.dnf) return -1;
      if (a.dnf && b.dnf) return getRankTime(a) - getRankTime(b);
      return a.totalTime - b.totalTime;
    });

    section.innerHTML = `
      <div class="card scoreboard-card">
        <div class="scoreboard-header">
          <span class="card-icon">🏆</span>
          <h2 class="scoreboard-title">תוצאות בזמן אמת</h2>
          <span class="scoreboard-count">${runs.length} ריצות</span>
        </div>

        ${runs.length === 0 ? `
          <div class="scoreboard-empty">
            <div class="empty-icon">⏱</div>
            <p>עדיין לא נרשמו ריצות.</p>
            <p class="empty-sub">הזמנים יופיעו כאן כשהמתחרים יסיימו.</p>
          </div>
        ` : `
          <div class="scoreboard-table-wrap">
            <table class="scoreboard-table">
              <thead>
                <tr>
                  <th class="th-rank">דירוג</th>
                  <th class="th-order">סדר</th>
                  <th>מתחרה</th>
                  ${obstacles.map(o => `<th class="th-obstacle"><span class="th-he">${o}</span><span class="th-en">${OBSTACLE_EN.get(o) || ''}</span></th>`).join('')}
                  <th class="th-mega" title="תוצאת קיר">קיר</th>
                  <th>סה"כ</th>
                </tr>
              </thead>
              <tbody>
                ${sortedRuns.map((run, rankIdx) => {
                  const rank = rankIdx + 1;
                  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
                  const obstacleTimes = {};
                  for (const e of run.events) {
                    if (e.type === 'PASSED' && e.obstacle) {
                      obstacleTimes[e.obstacle] = e.time;
                    }
                  }
                  const isDNF = run.dnf;
                  const startOrder = orderMap.get(run);
                  return `
                    <tr class="${isDNF ? 'row-dnf' : ''}">
                      <td class="td-rank">${medal}</td>
                      <td class="td-order">${startOrder}</td>
                      <td class="td-name">${esc(run.contestantName)}</td>
                      ${obstacles.map(o => {
                        const t = obstacleTimes[o];
                        if (t !== undefined) {
                          return `<td class="td-obstacle">${formatSeconds(t)}</td>`;
                        }
                        const fell = run.events.find(e => e.type === 'FALL' && e.obstacle === o);
                        if (fell) {
                          return `<td class="td-obstacle td-fall">${formatSeconds(fell.time)}</td>`;
                        }
                        return `<td class="td-obstacle td-empty">-</td>`;
                      }).join('')}
                      ${(() => {
                        const wr = normalizeWallResult(run);
                        if (!wr) return '<td class="td-wall td-empty">-</td>';
                        if (wr === WALL_RESULTS.MEGA_WALL) return '<td class="td-wall td-wall-mega">🔥 MEGA</td>';
                        if (wr === WALL_RESULTS.WALL) return '<td class="td-wall td-wall-pass">✓</td>';
                        if (wr === WALL_RESULTS.FAILED) return '<td class="td-wall td-wall-fail">✕</td>';
                        return '<td class="td-wall td-empty">-</td>';
                      })()}
                      <td class="td-total ${isDNF ? 'td-dnf' : ''}">${formatSeconds(run.totalTime)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  }

  renderCompetitionView();
}
