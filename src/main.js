import './style.css';
import { renderSetup } from './stage1-setup.js';
import { renderTimer } from './stage2-timer.js';
import { renderExport } from './stage3-export.js';
import { loadObstacles, handleFreshLoad } from './data.js';

/** Resize the transparent logo to a clean 64×64 favicon. */
function applyLogoFavicon() {
  const img = new Image();
  img.onload = () => {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, S, S);

    let link = document.querySelector("link[rel='icon']");
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.type = 'image/png';
    link.href = c.toDataURL('image/png');
  };
  img.src = '/ninja-logo.png';
}

applyLogoFavicon();
handleFreshLoad();

const app = document.getElementById('app');

function goToSetup() {
  renderSetup(app, (obstacles) => {
    goToTimer(obstacles);
  });
}

function goToTimer(obstacles) {
  if (!obstacles || obstacles.length === 0) {
    obstacles = loadObstacles();
  }
  if (!obstacles || obstacles.length === 0) {
    goToSetup();
    return;
  }
  renderTimer(app, obstacles, (destination) => {
    if (destination === 'setup') goToSetup();
    else if (destination === 'export') goToExport();
  });
}

function goToExport() {
  renderExport(app, () => {
    const obstacles = loadObstacles();
    goToTimer(obstacles);
  });
}

goToSetup();
