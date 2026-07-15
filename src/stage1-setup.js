import { ALL_OBSTACLES, OBSTACLE_EN, MAX_OBSTACLES, MIN_OBSTACLES, loadObstacles, saveObstacles, loadCompDate, saveCompDate, getTodayISO, loadHeatNumber, saveHeatNumber, getNextHeatNumber, registerHeat, loadPlayers, savePlayers, clearLastHeatData, hasLastHeatData, markSessionActive, esc } from './data.js';

export function renderSetup(app, onConfirm, onContinue) {
  let selectedList = [];
  let playerList = loadPlayers();
  let compDate = loadCompDate() || getTodayISO();
  let heatNumber = hasLastHeatData() ? loadHeatNumber() : getNextHeatNumber(compDate);
  let poolFilter = '';

  function render() {
    const count = selectedList.length;
    const canStart = count >= MIN_OBSTACLES && playerList.length > 0;
    const canAdd = count < MAX_OBSTACLES;
    const canContinue = onContinue && hasLastHeatData();
    const availableObstacles = ALL_OBSTACLES.filter(o => !selectedList.includes(o.he));

    app.innerHTML = `
      <div class="stage-container">
        <div class="brand-hero">
          <img src="/ninja-logo.png" alt="נינג'ה ישראל 2026" class="brand-logo" />
          <p class="brand-tagline">בניית המסלול</p>
        </div>
        <p class="stage-hint">קבעו את תאריך התחרות ובנו את סדר המכשולים לפי הסדר.</p>

        <div class="setup-card">
          <div class="card-section">
            <div class="date-heat-row">
              <div class="date-field">
                <label class="field-label">
                  <span class="field-icon">📅</span>
                  תאריך התחרות
                </label>
                <input type="date" class="date-input" value="${compDate}" />
              </div>
              <div class="heat-field">
                <label class="field-label">
                  <span class="field-icon">🔢</span>
                  מקצה
                </label>
                <input type="number" class="heat-input" min="1" value="${heatNumber}" />
              </div>
            </div>
          </div>

          <div class="card-section">
            <div class="section-header">
              <h3 class="section-title">מתחרים</h3>
              <span class="obstacle-counter ${playerList.length > 0 ? 'counter-ready' : ''}">${playerList.length}</span>
            </div>
            <div class="player-add-row">
              <input type="text" class="player-name-input" placeholder="הזינו שם מתחרה..." />
              <button class="btn-add-player">+ הוסף</button>
            </div>
            ${playerList.length === 0 ? `
              <p class="empty-hint">עדיין לא נרשמו מתחרים — הוסיפו שמות לפני תחילת המקצה.</p>
            ` : `
              <div class="player-list">
                ${playerList.map((name, i) => `
                  <div class="player-item">
                    <div class="order-badge player-badge">${i + 1}</div>
                    <span class="player-name">${esc(name)}</span>
                    <button class="order-btn remove-player-btn" data-index="${i}" title="הסר">✕</button>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <div class="card-section">
            <div class="section-header">
              <h3 class="section-title">סדר המסלול</h3>
              <span class="obstacle-counter ${canStart ? 'counter-ready' : ''}">${count}/${MAX_OBSTACLES}</span>
            </div>

            ${count === 0 ? `
              <p class="empty-hint">עדיין לא נבחרו מכשולים — הוסיפו מהמאגר למטה לפי הסדר שבו המתחרים יעברו אותם.</p>
            ` : `
              <div class="order-list">
                ${selectedList.map((heKey, i) => `
                  <div class="order-item">
                    <div class="order-badge">${i + 1}</div>
                    <div class="order-name-wrap">
                      <span class="order-name">${esc(heKey)}</span>
                      <span class="order-name-en">${esc(OBSTACLE_EN.get(heKey) || '')}</span>
                    </div>
                    <div class="order-buttons">
                      <button class="order-btn move-up" data-index="${i}" ${i === 0 ? 'disabled' : ''} title="הזז למעלה">↑</button>
                      <button class="order-btn move-down" data-index="${i}" ${i === count - 1 ? 'disabled' : ''} title="הזז למטה">↓</button>
                      <button class="order-btn remove-btn" data-index="${i}" title="הסר">✕</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>

        <div class="setup-card pool-card">
          <div class="pool-header">
            <h3 class="section-title">מאגר המכשולים</h3>
            ${availableObstacles.length > 0 ? `<span class="pool-count">${availableObstacles.length} זמינים</span>` : ''}
          </div>
          <div class="pool-search-wrap">
            <span class="pool-search-icon">🔍</span>
            <input type="text" class="pool-search" placeholder="חפשו מכשול..." value="${poolFilter}" />
            ${poolFilter ? '<button class="pool-search-clear" title="נקה חיפוש">✕</button>' : ''}
          </div>
          <div class="obstacle-pool-scroll">
            <div class="obstacle-pool">
              ${availableObstacles.map(({ he, en }) => `
                <button class="pool-chip" data-obstacle="${esc(he)}" data-en="${esc(en)}" ${!canAdd ? 'disabled' : ''} title="${esc(he)} — ${esc(en)}">
                  <span class="pool-plus">+</span>
                  <span class="pool-chip-names">
                    <span class="pool-name">${esc(he)}</span>
                    <span class="pool-name-en">${esc(en)}</span>
                  </span>
                </button>
              `).join('')}
              ${availableObstacles.length === 0 ? `<p class="pool-empty">כל המכשולים נבחרו</p>` : ''}
              <p class="pool-no-results" style="display:none">לא נמצאו מכשולים תואמים</p>
            </div>
          </div>
        </div>

        <div class="custom-obstacle-row">
          <input type="text" class="custom-obstacle-input" placeholder="שם מכשול חדש..." ${!canAdd ? 'disabled' : ''} />
          <button class="btn-add-custom" ${!canAdd ? 'disabled' : ''}>+ הוסף</button>
        </div>

        <div class="start-section">
          <p class="start-hint">${canStart ? `המסלול נעול, ${playerList.length} מתחרים רשומים. מוכנים להתחרות.` : count < MIN_OBSTACLES ? `בחרו לפחות ${MIN_OBSTACLES} מכשולים כדי להתחיל.` : 'הוסיפו לפחות מתחרה אחד כדי להתחיל.'}</p>
          <div class="start-buttons-row">
            <button class="btn-start-comp" ${!canStart ? 'disabled' : ''}>
              <span class="btn-label">התחל מקצה</span>
              <span class="btn-arrow" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </span>
            </button>
            ${canContinue ? `
              <button class="btn-continue-heat">
                <span class="btn-label">המשך תחרות</span>
                <span class="btn-arrow" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </span>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    app.querySelector('.date-input').addEventListener('change', (e) => {
      compDate = e.target.value;
      saveCompDate(compDate);
      if (!hasLastHeatData()) {
        heatNumber = getNextHeatNumber(compDate);
        saveHeatNumber(heatNumber);
        const heatInput = app.querySelector('.heat-input');
        if (heatInput) heatInput.value = heatNumber;
      }
    });

    const heatInput = app.querySelector('.heat-input');
    if (heatInput) {
      heatInput.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10);
        if (val >= 1) {
          heatNumber = val;
          saveHeatNumber(heatNumber);
        }
      });
    }

    const playerInput = app.querySelector('.player-name-input');
    const addPlayerBtn = app.querySelector('.btn-add-player');

    function addPlayer() {
      const name = playerInput.value.trim();
      if (!name) return;
      const isDuplicate = playerList.some(p => p.toLowerCase() === name.toLowerCase());
      if (isDuplicate) return;
      playerList.push(name);
      savePlayers(playerList);
      render();
    }

    if (addPlayerBtn) {
      addPlayerBtn.addEventListener('click', addPlayer);
    }
    if (playerInput) {
      playerInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addPlayer();
        }
      });
    }

    app.querySelectorAll('.remove-player-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        playerList.splice(idx, 1);
        savePlayers(playerList);
        render();
      });
    });

    const searchInput = app.querySelector('.pool-search');
    const clearBtn = app.querySelector('.pool-search-clear');

    function applyPoolFilter(term) {
      poolFilter = term;
      const chips = app.querySelectorAll('.pool-chip');
      const noResults = app.querySelector('.pool-no-results');
      const lowerTerm = term.toLowerCase();
      let visibleCount = 0;

      chips.forEach(chip => {
        const he = chip.dataset.obstacle;
        const en = chip.dataset.en || '';
        const match = !term || he.includes(term) || en.toLowerCase().includes(lowerTerm);
        chip.style.display = match ? '' : 'none';
        if (match) visibleCount++;
      });

      if (noResults) {
        noResults.style.display = (chips.length > 0 && visibleCount === 0) ? '' : 'none';
      }
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        applyPoolFilter(searchInput.value.trim());
      });
      if (poolFilter) applyPoolFilter(poolFilter);
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        poolFilter = '';
        searchInput.value = '';
        applyPoolFilter('');
        searchInput.focus();
      });
    }

    app.querySelectorAll('.pool-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        if (selectedList.length >= MAX_OBSTACLES) return;
        const name = chip.dataset.obstacle;
        selectedList.push(name);
        render();
      });
    });

    app.querySelectorAll('.move-up').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        if (idx > 0) {
          [selectedList[idx], selectedList[idx - 1]] = [selectedList[idx - 1], selectedList[idx]];
          render();
        }
      });
    });

    app.querySelectorAll('.move-down').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        if (idx < selectedList.length - 1) {
          [selectedList[idx], selectedList[idx + 1]] = [selectedList[idx + 1], selectedList[idx]];
          render();
        }
      });
    });

    app.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        selectedList.splice(idx, 1);
        render();
      });
    });

    const customInput = app.querySelector('.custom-obstacle-input');
    const addCustomBtn = app.querySelector('.btn-add-custom');

    function addCustomObstacle() {
      const name = customInput.value.trim();
      if (!name || selectedList.length >= MAX_OBSTACLES) return;
      if (selectedList.includes(name)) return;
      selectedList.push(name);
      render();
    }

    if (addCustomBtn) {
      addCustomBtn.addEventListener('click', addCustomObstacle);
    }
    if (customInput) {
      customInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addCustomObstacle();
        }
      });
    }

    const startBtn = app.querySelector('.btn-start-comp');
    if (startBtn && canStart) {
      startBtn.addEventListener('click', () => {
        clearLastHeatData();
        saveObstacles(selectedList);
        savePlayers(playerList);
        saveCompDate(compDate);
        saveHeatNumber(heatNumber);
        registerHeat(compDate, heatNumber);
        markSessionActive();
        onConfirm(selectedList);
      });
    }

    const continueBtn = app.querySelector('.btn-continue-heat');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        onContinue();
      });
    }
  }

  render();
}
