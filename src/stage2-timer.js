import { saveRun, loadRuns, clearLastHeatData, formatTime, formatSeconds, formatHebrewDate, loadCompDate, downloadRunsCSV, WALL_RESULTS, normalizeWallResult, OBSTACLE_EN, loadHeatNumber, loadPlayers, rankRuns, getObstaclesCompleted, getRankTime, esc } from './data.js';

const HOLD_DURATION = 1200;
const RANK_UPDATE_INTERVAL = 500;

function computeLiveRank(activeRun, obstacles) {
  if (!activeRun || !activeRun.timerStarted) return null;

  const runs = loadRuns();
  if (runs.length === 0) return { rank: 1, total: 1, trend: null };

  const elapsed = Date.now() - activeRun.startTime;
  const passedCount = activeRun.events.filter(e => e.type === 'PASSED').length;

  // Wall is treated as an obstacle — runner is NOT a finisher until wall result
  // is recorded (MEGA_WALL or WALL). During the wall stage they rank as a DNF
  // with all regular obstacles completed, using elapsed time.
  const wallCompleted = activeRun.events.some(
    e => e.type === 'WALL_RESULT' && e.wallResult !== WALL_RESULTS.FAILED
  );
  const isFinisher = wallCompleted;

  const hypothetical = {
    dnf: !isFinisher,
    totalTime: elapsed,
    events: activeRun.events,
    wallFailed: false,
  };

  const allRuns = [...runs, hypothetical];
  const sorted = [...allRuns].sort((a, b) => {
    if (a.dnf && !b.dnf) return 1;
    if (!a.dnf && b.dnf) return -1;
    if (!a.dnf && !b.dnf) return a.totalTime - b.totalTime;
    const aObs = getObstaclesCompleted(a);
    const bObs = getObstaclesCompleted(b);
    if (aObs !== bObs) return bObs - aObs;
    return getRankTime(a) - getRankTime(b);
  });

  const rank = sorted.indexOf(hypothetical) + 1;
  return { rank, total: allRuns.length, trend: null };
}

export function renderTimer(app, obstacles, onFinish) {
  let contestantName = '';
  let activeRun = null;
  let rankInterval = null;
  let lastRank = null;

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
          stopRankInterval();
          activeRun = null;
        }
        clearLastHeatData();
        onFinish('setup');
        return;
      }
      showNewCompModal(runs.length, {
        onExport: () => {
          downloadRunsCSV(loadRuns(), obstacles);
          if (activeRun) {
            clearInterval(activeRun.timerInterval);
            stopRankInterval();
            activeRun = null;
          }
          clearLastHeatData();
          onFinish('setup');
        },
        onDelete: () => {
          if (activeRun) {
            clearInterval(activeRun.timerInterval);
            stopRankInterval();
            activeRun = null;
          }
          clearLastHeatData();
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

    const players = loadPlayers();
    const runs = loadRuns();
    const ranNames = new Set(runs.map(r => r.contestantName));

    section.innerHTML = `
      <div class="card runner-card">
        <div class="card-title">
          <span class="card-icon">🚩</span>
          המתחרה הבא
        </div>
        ${players.length > 0 ? `
          <p class="picker-label">בחרו מתחרה מהרשימה:</p>
          <div class="player-chips">
            ${players.map(name => `
              <button class="player-chip ${contestantName === name ? 'player-chip-selected' : ''} ${ranNames.has(name) ? 'player-chip-ran' : ''}" data-name="${esc(name)}">
                ${esc(name)}
                ${ranNames.has(name) ? '<span class="chip-check">✓</span>' : ''}
              </button>
            `).join('')}
          </div>
          <div class="picker-divider"><span>או הזינו שם חדש</span></div>
        ` : ''}
        <div class="name-row">
          <input type="text" class="name-input" placeholder="הזינו שם מתחרה..." value="${esc(contestantName)}" ${players.length > 0 ? '' : 'autofocus'} />
          <button class="btn-start-run" ${contestantName.length === 0 ? 'disabled' : ''}>
            <span class="card-icon">🚩</span>
            התחלת ריצה
          </button>
        </div>
        <p class="input-hint">השעון מתחיל ברגע לחיצת זינוק במכשול הראשון.</p>
      </div>
    `;

    const input = section.querySelector('.name-input');
    const startBtn = section.querySelector('.btn-start-run');

    section.querySelectorAll('.player-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        contestantName = chip.dataset.name;
        input.value = contestantName;
        startBtn.disabled = false;
        section.querySelectorAll('.player-chip').forEach(c => c.classList.remove('player-chip-selected'));
        chip.classList.add('player-chip-selected');
      });
    });

    input.addEventListener('input', () => {
      contestantName = input.value.trim();
      startBtn.disabled = contestantName.length === 0;
      section.querySelectorAll('.player-chip').forEach(c => c.classList.remove('player-chip-selected'));
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
    if (players.length === 0) {
      setTimeout(() => input.focus(), 50);
    }
  }

  function startNewRun() {
    const players = loadPlayers();
    const canonical = players.find(p => p.toLowerCase() === contestantName.toLowerCase());
    if (canonical) contestantName = canonical;

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
    const elapsed = !run.timerStarted ? 0 : Date.now() - run.startTime;
    const currentIdx = run.currentObstacleIndex;
    const passedCount = run.events.filter(e => e.type === 'PASSED').length;
    const progressPct = Math.round((passedCount / obstacles.length) * 100);

    if (run.timerStarted && !run.finished && !run.timerInterval) {
      run.timerInterval = setInterval(() => {
        const tv = document.querySelector('.timer-value');
        if (tv && activeRun) {
          tv.textContent = formatTime(Date.now() - activeRun.startTime);
        }
      }, 16);
    }

    if (run.timerStarted && !run.finished && !rankInterval) {
      updateRankBadge();
      rankInterval = setInterval(updateRankBadge, RANK_UPDATE_INTERVAL);
    }

    section.innerHTML = `
      <div class="card timer-card ${run.wallUnlocked ? 'timer-card-wall-open' : ''}">
        <div class="timer-top">
          <div class="timer-info">
            <span class="timer-status">${run.wallUnlocked ? '🏆 הקיר פתוח! ⏱' : run.allObstaclesPassed ? '🧱 מוכן לקיר ⏱' : !run.timerStarted ? '🏁 ממתין לזינוק' : '⏱ בריצה'}</span>
            <span class="timer-player">${esc(run.contestantName)}</span>
          </div>
          <div class="timer-display">
            <span class="timer-value">${formatTime(elapsed)}</span>
          </div>
          <div class="live-rank-badge" id="live-rank-badge"></div>
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

        <div class="compact-obstacle-display">
          ${(() => {
            if (run.allObstaclesPassed || run.wallUnlocked || run.finished) {
              const lastIdx = obstacles.length - 1;
              const lastName = obstacles[lastIdx];
              const lastPass = run.events.find(e => e.type === 'PASSED' && e.obstacle === lastName);
              const lastStart = run.events.find(e => e.type === 'OBSTACLE_START' && e.obstacle === lastName);
              return `
                <div class="obstacle-context obstacle-passed">
                  <div class="obstacle-badge badge-passed">${lastIdx + 1}</div>
                  <div class="obstacle-name-wrap">
                    <span class="obstacle-name">${esc(lastName)}</span>
                    <span class="obstacle-name-en">${esc(OBSTACLE_EN.get(lastName) || '')}</span>
                  </div>
                  <span class="split-badge">✓ ${lastStart ? `<span class="split-start">ז׳ ${formatSeconds(lastStart.time)}</span>` : ''}${lastPass ? formatSeconds(lastPass.time) : ''}</span>
                </div>
              `;
            }

            const prevIdx = currentIdx - 1;
            let prevHtml = '';
            if (prevIdx >= 0) {
              const prevName = obstacles[prevIdx];
              const prevPass = run.events.find(e => e.type === 'PASSED' && e.obstacle === prevName);
              const prevStart = run.events.find(e => e.type === 'OBSTACLE_START' && e.obstacle === prevName);
              if (prevPass) {
                prevHtml = `
                  <div class="obstacle-context obstacle-passed">
                    <div class="obstacle-badge badge-passed">${prevIdx + 1}</div>
                    <div class="obstacle-name-wrap">
                      <span class="obstacle-name">${esc(prevName)}</span>
                      <span class="obstacle-name-en">${esc(OBSTACLE_EN.get(prevName) || '')}</span>
                    </div>
                    <span class="split-badge">✓ ${prevStart ? `<span class="split-start">ז׳ ${formatSeconds(prevStart.time)}</span>` : ''}${formatSeconds(prevPass.time)}</span>
                  </div>
                `;
              }
            }

            const curName = obstacles[currentIdx];
            const curStart = run.events.find(e => e.type === 'OBSTACLE_START' && e.obstacle === curName);
            const curFall = run.events.find(e => e.type === 'FALL' && e.obstacle === curName);
            let curContent = '';

            if (curFall) {
              curContent = `<span class="fall-badge">✕ נפילה ${curStart ? `<span class="split-start">ז׳ ${formatSeconds(curStart.time)}</span>` : ''}${formatSeconds(curFall.time)}</span>`;
            } else if (!curStart) {
              curContent = `
                <div class="obstacle-actions">
                  <button class="action-btn btn-start-obstacle" data-index="${currentIdx}">
                    <span>🏁</span> זינוק
                  </button>
                </div>
              `;
            } else {
              curContent = `
                <div class="obstacle-actions">
                  <span class="start-time-badge">ז׳ ${formatSeconds(curStart.time)}</span>
                  <button class="action-btn btn-pass" data-index="${currentIdx}">
                    <span>✓</span> עבר
                  </button>
                  <button class="action-btn btn-fall" data-index="${currentIdx}">
                    <span>✕</span> נפילה
                  </button>
                </div>
              `;
            }

            const remaining = obstacles.length - currentIdx - 1;

            return `
              ${prevHtml}
              <div class="obstacle-row obstacle-current">
                <div class="obstacle-badge badge-current">${currentIdx + 1}</div>
                <div class="obstacle-name-wrap">
                  <span class="obstacle-name">${esc(curName)}</span>
                  <span class="obstacle-name-en">${esc(OBSTACLE_EN.get(curName) || '')}</span>
                </div>
                ${curContent}
              </div>
              ${remaining > 0 ? `<div class="remaining-label">נותרו ${remaining} מכשולים + הקיר</div>` : ''}
            `;
          })()}

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
          ` : run.allObstaclesPassed ? `
            <div class="obstacle-row obstacle-wall-ready">
              <div class="obstacle-badge badge-wall-ready">🧱</div>
              <div class="obstacle-name-wrap">
                <span class="obstacle-name">הקיר</span>
              </div>
              <div class="obstacle-actions">
                <button class="action-btn btn-start-wall">
                  <span>🏁</span> התחלת קיר
                </button>
              </div>
            </div>
          ` : `
            <div class="obstacle-row obstacle-wall-locked">
              <div class="obstacle-badge badge-wall">🧱</div>
              <span class="obstacle-name">הקיר</span>
              <span class="lock-label">🔒 נעול</span>
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

  function updateRankBadge() {
    const badge = document.getElementById('live-rank-badge');
    if (!badge || !activeRun) return;

    const result = computeLiveRank(activeRun, obstacles);
    if (!result) { badge.innerHTML = ''; return; }

    const { rank, total } = result;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
    const trendIcon = lastRank !== null
      ? (rank < lastRank ? ' ↑' : rank > lastRank ? ' ↓' : '')
      : '';
    lastRank = rank;

    badge.innerHTML = `
      <span class="rank-number">${medal || '#'}${medal ? '' : rank}</span>
      <span class="rank-context">מתוך ${total}${trendIcon}</span>
    `;
    badge.className = `live-rank-badge ${rank <= 3 ? 'rank-podium' : ''}`;
  }

  function stopRankInterval() {
    if (rankInterval) {
      clearInterval(rankInterval);
      rankInterval = null;
    }
    lastRank = null;
  }

  function handleWallResult(result) {
    if (!activeRun || activeRun.finished) return;
    activeRun.finished = true;
    stopRankInterval();
    const elapsed = Date.now() - activeRun.startTime;

    activeRun.events.push({
      time: elapsed,
      type: 'WALL_RESULT',
      obstacle: null,
      wallResult: result,
    });

    clearInterval(activeRun.timerInterval);
    activeRun.timerInterval = null;
    activeRun.finished = true;

    if (result === WALL_RESULTS.FAILED) {
      finishRunWallFailed(elapsed);
    } else {
      finishRun(elapsed, result);
    }
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

    const startWallBtn = section.querySelector('.btn-start-wall');
    if (startWallBtn) {
      startWallBtn.addEventListener('click', () => {
        if (!activeRun || activeRun.finished) return;
        const elapsed = Date.now() - activeRun.startTime;
        unlockWall(elapsed);
      });
    }

    section.querySelectorAll('.btn-pass').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        handlePass(idx);
      });
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
          // Record time at PRESS START, not hold completion — the hold is a UI
          // safeguard only; the athlete's actual moment is when operator pressed.
          const pressStart = startedAt;
          endHold();
          onComplete(pressStart);
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
    const obstacleName = obstacles[obstacleIndex];
    if (activeRun.events.some(e => e.type === 'OBSTACLE_START' && e.obstacle === obstacleName)) return;

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

    activeRun.events.push({ time: elapsed, type: 'OBSTACLE_START', obstacle: obstacleName });

    renderRunnerSection();
  }

  function handlePass(obstacleIndex, pressStart) {
    if (!activeRun || activeRun.finished) return;
    if (obstacleIndex !== activeRun.currentObstacleIndex) return;
    const obstacleName = obstacles[obstacleIndex];
    if (activeRun.events.some(e => e.type === 'PASSED' && e.obstacle === obstacleName)) return;

    const startEvent = activeRun.events.find(e => e.type === 'OBSTACLE_START' && e.obstacle === obstacleName);
    if (!startEvent) return;

    const elapsed = (pressStart ?? Date.now()) - activeRun.startTime;
    const obstacleStartTime = startEvent.time;

    activeRun.events.push({ time: elapsed, type: 'PASSED', obstacle: obstacleName, obstacleStartTime });
    activeRun.currentObstacleIndex++;

    if (activeRun.currentObstacleIndex >= obstacles.length) {
      activeRun.allObstaclesPassed = true;
      activeRun.allObstaclesPassedTime = elapsed;
      renderRunnerSection();
      return;
    }

    renderRunnerSection();
  }

  function unlockWall(elapsed) {
    if (!activeRun) return;
    activeRun.wallUnlocked = true;
    activeRun.wallUnlockTime = elapsed;
    activeRun.wallResult = null;

    activeRun.events.push({ time: elapsed, type: 'WALL_UNLOCKED', obstacle: null });

    renderRunnerSection();
  }

  function handleFall(obstacleIndex, pressStart) {
    if (!activeRun || activeRun.finished) return;
    if (obstacleIndex !== activeRun.currentObstacleIndex) return;
    const obstacleName = obstacles[obstacleIndex];
    if (activeRun.events.some(e => e.type === 'FALL' && e.obstacle === obstacleName)) return;

    const startEvent = activeRun.events.find(e => e.type === 'OBSTACLE_START' && e.obstacle === obstacleName);
    if (!startEvent) return;

    const elapsed = (pressStart ?? Date.now()) - activeRun.startTime;
    const obstacleStartTime = startEvent.time;

    activeRun.events.push({ time: elapsed, type: 'FALL', obstacle: obstacleName, obstacleStartTime });

    clearInterval(activeRun.timerInterval);
    activeRun.timerInterval = null;
    activeRun.finished = true;
    stopRankInterval();

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

  function finishRunWallFailed(totalTime) {
    if (!activeRun) return;

    activeRun.events.push({ time: totalTime, type: 'COMPLETED', obstacle: null });

    const run = {
      contestantName: activeRun.contestantName,
      startTime: activeRun.startISO,
      events: [...activeRun.events],
      totalTime,
      dnf: true,
      wallResult: WALL_RESULTS.FAILED,
      wallFailed: true,
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

    if (activeRun.timerInterval) {
      clearInterval(activeRun.timerInterval);
      activeRun.timerInterval = null;
    }

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
    stopRankInterval();
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
      if (activeRun.allObstaclesPassed) {
        activeRun.allObstaclesPassed = false;
        activeRun.allObstaclesPassedTime = null;
      }
    }

    if (lastEvent.type === 'WALL_UNLOCKED') {
      activeRun.wallUnlocked = false;
      activeRun.wallUnlockTime = null;
      activeRun.wallResult = null;
      activeRun.allObstaclesPassed = true;
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

    const sortedRuns = rankRuns(runs);

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
                  ${obstacles.map((o, i) => `<th class="th-obstacle"><span class="th-num">${i + 1}</span><span class="th-he">${o}</span><span class="th-en">${OBSTACLE_EN.get(o) || ''}</span></th>`).join('')}
                  <th class="th-mega" title="תוצאת קיר">קיר</th>
                  <th>סה"כ</th>
                </tr>
              </thead>
              <tbody>
                ${sortedRuns.map((run, rankIdx) => {
                  const rank = rankIdx + 1;
                  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
                  const obstacleStartTimes = {};
                  const fellAt = {};
                  for (const e of run.events) {
                    if (e.type === 'OBSTACLE_START' && e.obstacle) {
                      obstacleStartTimes[e.obstacle] = e.time;
                    }
                    if (e.type === 'FALL' && e.obstacle) {
                      fellAt[e.obstacle] = true;
                    }
                  }
                  const isDNF = run.dnf;
                  const startOrder = orderMap.get(run);
                  const rankClass = !isDNF && rank <= 3 ? `row-rank-${rank}` : '';
                  return `
                    <tr class="${isDNF ? 'row-dnf' : rankClass}">
                      <td class="td-rank">${medal}</td>
                      <td class="td-order">${startOrder}</td>
                      <td class="td-name">${esc(run.contestantName)}</td>
                      ${obstacles.map(o => {
                        const t = obstacleStartTimes[o];
                        if (t !== undefined) {
                          const isFall = fellAt[o];
                          return `<td class="td-obstacle ${isFall ? 'td-fall' : ''}">${formatSeconds(t)}</td>`;
                        }
                        return `<td class="td-obstacle td-empty">-</td>`;
                      }).join('')}
                      ${(() => {
                        const wr = normalizeWallResult(run);
                        if (!wr) return '<td class="td-wall td-empty">-</td>';
                        if (wr === WALL_RESULTS.MEGA_WALL) return '<td class="td-wall td-wall-mega">🔥 MEGA</td>';
                        if (wr === WALL_RESULTS.WALL) return '<td class="td-wall td-wall-pass">✓</td>';
                        if (wr === WALL_RESULTS.FAILED) {
                          const wallUnlock = run.events.find(e => e.type === 'WALL_UNLOCKED');
                          const wallStartTime = wallUnlock ? formatSeconds(wallUnlock.time) : '✕';
                          return `<td class="td-wall td-wall-fail">${wallStartTime}</td>`;
                        }
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
