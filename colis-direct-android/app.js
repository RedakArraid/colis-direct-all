/* ═══════════════════════════════════════════════════════════════════
   ColisDirect Android App — Main Application
   Version: 2.0.0 — Full audit & logo integration
   Architecture: Vanilla JS SPA with screen-based routing
═══════════════════════════════════════════════════════════════════ */

'use strict';

/* ── Inline Developer Console & Diagnostics ────────────────────── */
(function() {
  const logs = [];
  window.addEventListener('error', function(e) {
    const errorMsg = `[ERROR] ${e.message} at ${e.filename || 'app.js'}:${e.lineno || '?'}:${e.colno || '?'}`;
    logs.push(errorMsg);
    showDebugConsole();
  });
  window.addEventListener('unhandledrejection', function(e) {
    const errorMsg = `[PROMISE REJECTION] ${e.reason}`;
    logs.push(errorMsg);
    showDebugConsole();
  });
  
  window.logDebug = function(msg) {
    logs.push(`[LOG] ${msg}`);
    console.log(msg);
  };

  function showDebugConsole() {
    let devBox = document.getElementById('debug-dev-box');
    if (!devBox) {
      devBox = document.createElement('div');
      devBox.id = 'debug-dev-box';
      devBox.style.cssText = 'position:fixed;top:10px;left:10px;right:10px;background:rgba(15,15,15,0.95);color:#FF6C00;padding:16px;z-index:999999;font-family:monospace;font-size:12px;white-space:pre-wrap;border-radius:12px;border:2px solid #FF6C00;box-shadow:0 10px 30px rgba(0,0,0,0.5);max-height:80vh;overflow-y:auto;';
      document.body.appendChild(devBox);
    }
    devBox.innerHTML = `<h3 style="margin:0 0 8px;border-bottom:1px solid #FF6C00;padding-bottom:4px;display:flex;justify-content:space-between;align-items:center;"><span>Console de Diagnostic</span><button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:#fff;cursor:pointer;font-weight:bold;font-size:14px;">✕</button></h3>` + 
      logs.map(l => {
        const color = l.includes('ERROR') || l.includes('REJECTION') ? '#EF4444' : '#10B981';
        return `<div style="color:${color};margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:4px;">${l}</div>`;
      }).join('');
  }
  
  // Invisible developer trigger: tap 3 times quickly in the top-left corner (x<50, y<50)
  let taps = 0;
  window.addEventListener('click', function(e) {
    if (e.clientX < 50 && e.clientY < 50) {
      taps++;
      if (taps >= 3) {
        taps = 0;
        showDebugConsole();
      }
    } else {
      taps = 0;
    }
  });
})();

/* ── Logo SVG (real logo.png integration — brand faithful) ──────── */
const LOGO_SVG = `<img src="logo.png" alt="ColisDirect Logo" class="logo-img-main" />`;
const LOGO_SMALL = `<img src="logo.png" alt="ColisDirect" class="logo-img-small" />`;
const LOGO_SPLASH = `<img src="logo.png" alt="ColisDirect Splash" class="logo-img-splash" />`;


/* ── SVG Icons library ─────────────────────────────────────────── */
const ICONS = {
  package:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
  truck:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect width="9" height="8" x="11" y="11" rx="1"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`,
  mapPin:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  search:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
  user:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  bell:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
  home:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  plus:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>`,
  chevronRight:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
  chevronLeft:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`,
  checkCircle:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  clock:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  xCircle:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>`,
  settings:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  logOut:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`,
  mail:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  lock:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  phone:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6.72 6.72l.82-.82a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  eye:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`,
  shield:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  store:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/></svg>`,
  creditCard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`,
  alertTriangle:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`,
  info:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`,
  navigation: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
  download:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
  share2:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>`,
  helpCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>`,
  message:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  zap:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  box:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
  receipt:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/></svg>`,
  star:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  arrowRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" x2="19" y1="12" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
  users:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  closeX:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>`,
  edit:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  globe:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  packageCheck:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/><path d="m17 13 2 2 4-4"/></svg>`,
  list:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>`,
  printer:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>`,
  copy:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
  wallet:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>`,
  bike:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>`,
  book:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>`,
  tag:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>`,
};

function icon(name, size = 20, color = 'currentColor') {
  const svg = ICONS[name] || ICONS.package;
  return svg.replace('<svg ', `<svg width="${size}" height="${size}" style="color:${color};flex-shrink:0;vertical-align:middle" `);
}

/* ── State Management ──────────────────────────────────────────── */
const State = {
  user: null,
  currentScreen: 'home',
  prevScreenStack: [],
  notifications: [],
  trackingResult: null,

  load() {
    try {
      const saved = localStorage.getItem('cd_state_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.user = parsed.user || null;
        this.notifications = parsed.notifications && parsed.notifications.length
          ? parsed.notifications
          : this._defaultNotifications();
      } else {
        this.notifications = this._defaultNotifications();
      }
    } catch(e) {
      this.notifications = this._defaultNotifications();
    }
  },

  save() {
    try {
      localStorage.setItem('cd_state_v2', JSON.stringify({
        user: this.user,
        notifications: this.notifications,
      }));
    } catch(e) {}
  },

  _defaultNotifications() {
    return [
      { id: 1, type: 'delivery', title: 'Colis disponible', body: 'Votre colis CD202605280002CI est disponible au relais Korhogo Marché.', time: 'Il y a 5 min', unread: true, icon: 'packageCheck', color: '#FF6C00', bg: '#FFF3E8' },
      { id: 2, type: 'transit', title: 'Colis en transit', body: 'Votre colis CD202605290001CI est en route vers Bouaké. Arrivée estimée : aujourd\'hui.', time: 'Il y a 2h', unread: true, icon: 'truck', color: '#2F6BE0', bg: '#EEF4FF' },
      { id: 3, type: 'payment', title: 'Paiement confirmé', body: 'Votre paiement de 2 500 FCFA pour le colis 1234AB a été validé avec succès.', time: 'Hier 14:30', unread: false, icon: 'creditCard', color: '#16A34A', bg: '#E6F6EC' },
      { id: 4, type: 'promo', title: 'Offre spéciale 🎁', body: 'Profitez de -20% sur votre prochain envoi avec le code COLIS20. Valable jusqu\'au 31 mai.', time: 'Il y a 2 jours', unread: false, icon: 'star', color: '#F5B400', bg: '#FEF8E7' },
    ];
  },

  get unreadCount() {
    return this.user ? this.notifications.filter(n => n.unread).length : 0;
  },

  pushScreen(screen) {
    if (this.prevScreenStack[this.prevScreenStack.length - 1] !== screen) {
      this.prevScreenStack.push(screen);
      if (this.prevScreenStack.length > 10) this.prevScreenStack.shift();
    }
  },

  popScreen() {
    this.prevScreenStack.pop();
    return this.prevScreenStack[this.prevScreenStack.length - 1] || 'home';
  }
};

/* ── API Client ────────────────────────────────────────────────── */
const API = {
  baseUrl: 'https://api.colisdirect.com',

  async request(method, path, data = null) {
    const token = localStorage.getItem('cd_token');
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (data) opts.body = JSON.stringify(data);
    try {
      const res = await fetch(this.baseUrl + path, opts);
      const json = await res.json();
      if (!res.ok) return { error: json.error || json.message || 'Erreur serveur' };
      return { data: json };
    } catch(e) {
      return { error: 'Connexion impossible. Vérifiez votre réseau.' };
    }
  },

  signIn: (id, pwd, isPhone) => API.request('POST', '/api/auth/signin', isPhone ? { phone: id, password: pwd } : { email: id, password: pwd }),
  signUp: (payload) => API.request('POST', '/api/auth/signup', payload),
  getMe: () => API.request('GET', '/api/auth/me'),
};

/* ── Demo Data ─────────────────────────────────────────────────── */
const DEMO_SHIPMENTS = [
  {
    id: '1', tracking_number: 'CD202605290001CI', shipment_code: '1234AB',
    sender_first_name: 'Kader', sender_last_name: 'Diallo', sender_commune: 'Abidjan Plateau',
    recipient_first_name: 'Aminata', recipient_last_name: 'Koné', recipient_commune: 'Bouaké',
    current_status: 'IN_TRANSIT', payment_status: 'paid', payment_method: 'paystack',
    price: 2500, weight: 2, package_type: 'moyen', home_delivery: false,
    created_at: '2026-05-28T10:00:00Z',
    origin_relay: { name: 'Relais Plateau', address: 'Rue du Commerce', commune: 'Plateau', phone: '+225 07 00 11 22' },
    destination_relay: { name: 'Relais Bouaké Centre', address: 'Av. de la République', commune: 'Bouaké', phone: '+225 07 33 44 55' },
    events: [
      { status: 'IN_TRANSIT', timestamp: '2026-05-29T07:00:00Z', notes: 'Départ du relais d\'Abidjan vers Bouaké' },
      { status: 'RELAY_ORIGIN_RECEIVED', timestamp: '2026-05-28T14:00:00Z', notes: 'Reçu et scanné au relais de départ' },
      { status: 'READY_FOR_DROP_OFF', timestamp: '2026-05-28T10:00:00Z', notes: 'Commande créée et paiement validé' },
    ]
  },
  {
    id: '2', tracking_number: 'CD202605280002CI', shipment_code: '5678CD',
    sender_first_name: 'Kader', sender_last_name: 'Diallo', sender_commune: 'Abidjan Cocody',
    recipient_first_name: 'Ibrahim', recipient_last_name: 'Traoré', recipient_commune: 'Korhogo',
    current_status: 'AVAILABLE_FOR_PICKUP', payment_status: 'paid', payment_method: 'relay_cash',
    price: 3500, weight: 5, package_type: 'grand', home_delivery: false,
    created_at: '2026-05-27T09:00:00Z',
    destination_relay: { name: 'Relais Korhogo Marché', address: 'Place du marché central', commune: 'Korhogo', phone: '+225 07 66 77 88', hours: 'Lun–Sam 8h–20h' },
    events: [
      { status: 'AVAILABLE_FOR_PICKUP', timestamp: '2026-05-29T06:00:00Z', notes: 'Disponible au retrait — Présentez votre code 5678CD' },
      { status: 'RELAY_FINAL_RECEIVED', timestamp: '2026-05-28T20:00:00Z', notes: 'Arrivé au relais de livraison' },
      { status: 'IN_TRANSIT', timestamp: '2026-05-28T08:00:00Z', notes: 'Pris en charge par le transporteur' },
      { status: 'CARRIER_COLLECTED', timestamp: '2026-05-27T15:00:00Z', notes: 'Collecté au relais de départ' },
    ]
  },
  {
    id: '3', tracking_number: 'CD202605270003CI', shipment_code: '9012EF',
    sender_first_name: 'Kader', sender_last_name: 'Diallo', sender_commune: 'Abidjan Yopougon',
    recipient_first_name: 'Fatou', recipient_last_name: 'Coulibaly', recipient_commune: 'San-Pédro',
    current_status: 'PICKED_UP_BY_CUSTOMER', payment_status: 'paid', payment_method: 'paystack',
    price: 4000, weight: 8, package_type: 'grand', home_delivery: false,
    created_at: '2026-05-25T11:00:00Z',
    events: [
      { status: 'PICKED_UP_BY_CUSTOMER', timestamp: '2026-05-27T10:00:00Z', notes: 'Retiré par Fatou Coulibaly' },
      { status: 'AVAILABLE_FOR_PICKUP', timestamp: '2026-05-26T18:00:00Z', notes: 'Disponible au retrait' },
      { status: 'RELAY_FINAL_RECEIVED', timestamp: '2026-05-26T12:00:00Z', notes: 'Arrivé au relais de San-Pédro' },
      { status: 'IN_TRANSIT', timestamp: '2026-05-25T16:00:00Z', notes: 'En route' },
      { status: 'RELAY_ORIGIN_RECEIVED', timestamp: '2026-05-25T12:00:00Z', notes: 'Déposé au relais de Yopougon' },
    ]
  },
  {
    id: '4', tracking_number: 'CD202605260004CI', shipment_code: '3456GH',
    sender_first_name: 'Kader', sender_last_name: 'Diallo', sender_commune: 'Abidjan Plateau',
    recipient_first_name: 'Seydou', recipient_last_name: 'Bamba', recipient_commune: 'Yamoussoukro',
    current_status: 'READY_FOR_DROP_OFF', payment_status: 'paid', payment_method: 'paystack',
    price: 1800, weight: 1, package_type: 'petit', home_delivery: false,
    created_at: '2026-05-29T08:00:00Z',
    origin_relay: { name: 'Relais Plateau Commerce', address: 'Rue du Commerce', commune: 'Plateau', phone: '+225 07 00 11 22' },
    events: [
      { status: 'READY_FOR_DROP_OFF', timestamp: '2026-05-29T08:00:00Z', notes: 'Commande créée — Déposez votre colis chez le relais de départ' },
    ]
  },
];

const DEMO_RELAY_POINTS = [
  { id: '1', name: 'Relais Abidjan Plateau', address: '12 Rue du Commerce, Plateau', commune: 'Plateau', phone: '+225 07 00 11 22', hours: 'Lun–Sam 7h30–20h', distance: '0.3 km', packages_count: 12, status: 'open' },
  { id: '2', name: 'Relais Cocody Riviera', address: 'Cité SIPIM, Bâtiment A', commune: 'Cocody', phone: '+225 07 22 33 44', hours: 'Lun–Dim 8h–21h', distance: '1.2 km', packages_count: 7, status: 'open' },
  { id: '3', name: 'Relais Yopougon Marché', address: 'Av. du Marché Central', commune: 'Yopougon', phone: '+225 07 44 55 66', hours: 'Lun–Sam 8h–19h', distance: '3.5 km', packages_count: 23, status: 'open' },
  { id: '4', name: 'Relais Abobo Baoulé', address: 'Rue des Jardins, Abobo', commune: 'Abobo', phone: '+225 07 55 66 77', hours: 'Lun–Ven 8h–18h', distance: '5.1 km', packages_count: 4, status: 'closed' },
  { id: '5', name: 'Relais Bouaké Centre', address: 'Place de la République', commune: 'Bouaké', phone: '+225 07 33 44 55', hours: 'Lun–Sam 8h–20h', distance: '362 km', packages_count: 15, status: 'open' },
  { id: '6', name: 'Relais Yamoussoukro', address: 'Avenue Félix Houphouët-Boigny', commune: 'Yamoussoukro', phone: '+225 07 88 99 00', hours: 'Lun–Sam 8h–19h', distance: '240 km', packages_count: 9, status: 'open' },
];

/* ── Status/Progress Helpers ───────────────────────────────────── */
function getStatusBadge(status) {
  const map = {
    'READY_FOR_DROP_OFF': { label: 'En attente de dépôt', cls: 'badge-yellow' },
    'PICKUP_PENDING': { label: 'Ramassage planifié', cls: 'badge-blue' },
    'RELAY_ORIGIN_RECEIVED': { label: 'Au relais de départ', cls: 'badge-orange' },
    'CARRIER_COLLECTED': { label: 'Pris par transporteur', cls: 'badge-orange' },
    'IN_TRANSIT': { label: 'En transit', cls: 'badge-blue' },
    'RELAY_FINAL_RECEIVED': { label: 'Au relais de livraison', cls: 'badge-orange' },
    'AVAILABLE_FOR_PICKUP': { label: 'Disponible au retrait', cls: 'badge-green' },
    'PICKED_UP_BY_CUSTOMER': { label: 'Retiré ✓', cls: 'badge-green' },
    'DELIVERED': { label: 'Livré ✓', cls: 'badge-green' },
    'DELIVERED_TO_CUSTOMER': { label: 'Livré à domicile ✓', cls: 'badge-green' },
    'CANCELLED': { label: 'Annulé', cls: 'badge-red' },
    'RETURN_TO_SENDER': { label: 'Retour expéditeur', cls: 'badge-yellow' },
    'PAYMENT_AWAITING_VALIDATION': { label: 'Paiement en cours', cls: 'badge-yellow' },
    'PAYMENT_CONFIRMED_AWAITING_DROP': { label: 'À déposer', cls: 'badge-orange' },
    'PAYMENT_PENDING_AT_RELAY': { label: 'Paiement au relais', cls: 'badge-yellow' },
    'PAYMENT_RECEIVED_AT_RELAY': { label: 'Paiement reçu', cls: 'badge-green' },
  };
  return map[status?.toUpperCase()] || { label: status || 'Inconnu', cls: 'badge-gray' };
}

function getTrackingInfo(shipment) {
  if (!shipment) return { steps: [], progress: 0, currentStepLabel: '', currentStepSublabel: '' };

  const currentStatus = (shipment.current_status || '').toUpperCase();
  const isHomeDelivery = !!shipment.home_delivery;
  const isHomePickup = (shipment.pickup_method || '') === 'home_pickup';

  const RELAY_STEPS = [
    { id: 'created', label: 'Commande créée', sublabel: 'En attente de dépôt', statuses: ['READY_FOR_DROP_OFF', 'PAYMENT_AWAITING_VALIDATION', 'PAYMENT_CONFIRMED_AWAITING_DROP', 'PAYMENT_PENDING_AT_RELAY'], icon: 'package' },
    { id: 'origin_relay', label: 'Déposé au relais', sublabel: 'Pris en charge au départ', statuses: ['RELAY_ORIGIN_RECEIVED', 'PAYMENT_RECEIVED_AT_RELAY'], icon: 'store' },
    { id: 'transit', label: 'En transit', sublabel: 'Acheminement en cours', statuses: ['CARRIER_COLLECTED', 'IN_TRANSIT'], icon: 'truck' },
    { id: 'dest_relay', label: 'Au relais de livraison', sublabel: 'Disponible au retrait', statuses: ['RELAY_FINAL_RECEIVED', 'AVAILABLE_FOR_PICKUP'], icon: 'store' },
    { id: 'done', label: 'Retiré', sublabel: 'Livraison terminée', statuses: ['PICKED_UP_BY_CUSTOMER'], icon: 'checkCircle' }
  ];

  const HOME_STEPS_RELAY = [
    { id: 'created', label: 'Commande créée', sublabel: 'En attente de dépôt', statuses: ['READY_FOR_DROP_OFF', 'PAYMENT_AWAITING_VALIDATION', 'PAYMENT_CONFIRMED_AWAITING_DROP', 'PAYMENT_PENDING_AT_RELAY'], icon: 'package' },
    { id: 'origin_relay', label: 'Déposé au relais', sublabel: 'Pris en charge au départ', statuses: ['RELAY_ORIGIN_RECEIVED', 'PAYMENT_RECEIVED_AT_RELAY'], icon: 'store' },
    { id: 'transit', label: 'En transit', sublabel: 'Acheminement en cours', statuses: ['CARRIER_COLLECTED', 'IN_TRANSIT'], icon: 'truck' },
    { id: 'done', label: 'Livré à domicile', sublabel: 'Livraison terminée', statuses: ['DELIVERED', 'DELIVERED_TO_CUSTOMER'], icon: 'home' }
  ];

  const HOME_PICKUP_STEPS_RELAY = [
    { id: 'created', label: 'Commande créée', sublabel: 'En attente de ramassage', statuses: ['PICKUP_PENDING', 'READY_FOR_DROP_OFF', 'PAYMENT_AWAITING_VALIDATION', 'PAYMENT_CONFIRMED_AWAITING_DROP'], icon: 'package' },
    { id: 'pickup', label: 'Ramassage', sublabel: 'Collecté chez l\'expéditeur', statuses: ['CARRIER_COLLECTED'], icon: 'home' },
    { id: 'transit', label: 'En transit', sublabel: 'En route vers le relais de livraison', statuses: ['IN_TRANSIT'], icon: 'truck' },
    { id: 'dest_relay', label: 'Au relais de livraison', sublabel: 'Disponible au retrait', statuses: ['RELAY_FINAL_RECEIVED', 'AVAILABLE_FOR_PICKUP'], icon: 'store' },
    { id: 'done', label: 'Retiré', sublabel: 'Livraison terminée', statuses: ['PICKED_UP_BY_CUSTOMER'], icon: 'checkCircle' }
  ];

  const HOME_STEPS_DIRECT = [
    { id: 'created', label: 'Commande créée', sublabel: 'En attente de ramassage', statuses: ['PICKUP_PENDING', 'READY_FOR_DROP_OFF', 'PAYMENT_AWAITING_VALIDATION', 'PAYMENT_CONFIRMED_AWAITING_DROP'], icon: 'package' },
    { id: 'pickup', label: 'Ramassage', sublabel: 'Collecté chez l\'expéditeur', statuses: ['CARRIER_COLLECTED'], icon: 'home' },
    { id: 'transit', label: 'En transit', sublabel: 'Acheminement en cours', statuses: ['IN_TRANSIT'], icon: 'truck' },
    { id: 'done', label: 'Livré à domicile', sublabel: 'Livraison terminée', statuses: ['DELIVERED', 'DELIVERED_TO_CUSTOMER'], icon: 'home' }
  ];

  const STEP_DONE_STATUSES = new Set([
    'READY_FOR_DROP_OFF', 'PAYMENT_AWAITING_VALIDATION', 'PAYMENT_CONFIRMED_AWAITING_DROP', 'PAYMENT_PENDING_AT_RELAY',
    'PICKUP_PENDING',
    'RELAY_ORIGIN_RECEIVED',
    'PICKED_UP_BY_CUSTOMER', 'DELIVERED', 'DELIVERED_TO_CUSTOMER',
  ]);

  let steps = RELAY_STEPS;
  if (isHomePickup) {
    if (isHomeDelivery) {
      steps = HOME_STEPS_DIRECT;
    } else {
      steps = HOME_PICKUP_STEPS_RELAY;
    }
  } else {
    if (isHomeDelivery) {
      steps = HOME_STEPS_RELAY;
    } else {
      steps = RELAY_STEPS;
    }
  }

  const idx = steps.findIndex(s => s.statuses.includes(currentStatus));
  let activeStep = 1;
  if (idx === -1) {
    activeStep = 1;
  } else {
    activeStep = STEP_DONE_STATUSES.has(currentStatus) ? idx + 1 : idx;
  }

  if (activeStep > steps.length) activeStep = steps.length;
  if (activeStep < 1) activeStep = 1;

  const progress = Math.round((activeStep / steps.length) * 100);

  const timelineSteps = steps.map((step, i) => {
    let statusClass = 'pending';
    if (i < activeStep) {
      statusClass = 'done';
    } else if (i === activeStep) {
      statusClass = 'active';
    }

    return {
      ...step,
      status: statusClass,
      time: shipment.events?.find(e => step.statuses.includes(e.status?.toUpperCase()))?.timestamp
        ? formatDateTime(shipment.events.find(e => step.statuses.includes(e.status?.toUpperCase())).timestamp)
        : null
    };
  });

  const activeStepObj = steps[Math.min(activeStep, steps.length - 1)];
  const currentStepLabel = activeStepObj ? activeStepObj.label : '';
  let currentStepSublabel = activeStepObj ? activeStepObj.sublabel : '';
  if (currentStatus === 'RELAY_FINAL_RECEIVED') {
    currentStepSublabel = 'Arrivé au relais, mise à disposition en cours';
  }

  return {
    steps: timelineSteps,
    progress: progress,
    currentStepLabel,
    currentStepSublabel
  };
}

function getProgressPercent(shipment) {
  if (!shipment) return 0;
  const sObj = typeof shipment === 'string' ? { current_status: shipment } : shipment;
  return getTrackingInfo(sObj).progress;
}

function getStatusLabel(status) {
  const map = {
    READY_FOR_DROP_OFF: 'En attente de dépôt',
    PICKUP_PENDING: 'Ramassage à domicile planifié',
    RELAY_ORIGIN_RECEIVED: 'Déposé au point relais d\'origine',
    CARRIER_COLLECTED: 'Pris en charge par le transporteur',
    IN_TRANSIT: 'En transit',
    RELAY_FINAL_RECEIVED: 'Arrivé au point relais de livraison',
    AVAILABLE_FOR_PICKUP: 'Disponible au retrait',
    PICKED_UP_BY_CUSTOMER: 'Retiré par le destinataire',
    DELIVERED: 'Livré à domicile',
    DELIVERED_TO_CUSTOMER: 'Livré au destinataire',
    CANCELLED: 'Annulé',
    RETURN_TO_SENDER: 'Retour à l\'expéditeur',
  };
  return map[status?.toUpperCase()] || status || 'Inconnu';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' à ' +
         d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/* ── Router ────────────────────────────────────────────────────── */
const Router = {
  navigate(screenId, options = {}) {
    if (window.logDebug) window.logDebug("Router.navigate: " + screenId);
    // Track history
    if (!options.isBack && State.currentScreen !== screenId) {
      State.pushScreen(State.currentScreen);
    }
    State.currentScreen = screenId;

    // Switch screens
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`screen-${screenId}`);
    if (target) {
      if (window.logDebug) window.logDebug("Router.navigate: activating screen " + `screen-${screenId}`);
      target.classList.add('active');
      target.scrollTop = 0;
    } else {
      if (window.logDebug) window.logDebug("Router.navigate ERROR: " + `screen-${screenId}` + " not found in DOM");
    }

    // Nav visibility
    const noNavScreens = ['login', 'create-shipment', 'onboarding'];
    const nav = document.getElementById('bottom-nav');
    if (nav) nav.style.display = noNavScreens.includes(screenId) ? 'none' : 'flex';

    const fab = document.getElementById('fab-send');
    if (fab) fab.style.display = ['home', 'shipments'].includes(screenId) ? 'flex' : 'none';

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.screen === screenId);
    });

    // Render
    this._render(screenId, options);
  },

  back() {
    const prev = State.popScreen();
    this.navigate(prev, { isBack: true });
  },

  _render(screenId, options) {
    const renders = {
      'home':              renderHome,
      'shipments':         renderShipments,
      'tracking':          () => renderTracking(options.trackingNumber),
      'tracking-detail':   () => renderTrackingDetail(options.shipment || State.trackingResult),
      'profile':           renderProfile,
      'notifications':     renderNotifications,
      'login':             renderLogin,
      'create-shipment':   renderCreateShipment,
      'map':               renderMap,
      'pricing':           renderPricing,
      'about':             renderAbout,
      'settings':          renderSettings,
      'partner':           renderPartner,
      'cancel-shipment':   () => renderCancelShipment(options.shipment),
    };
    const fn = renders[screenId];
    if (fn) {
      if (window.logDebug) window.logDebug("Router._render: rendering " + screenId);
      fn(options);
    } else {
      if (window.logDebug) window.logDebug("Router._render ERROR: no renderer for " + screenId);
    }
  }
};

/* ── Toast ─────────────────────────────────────────────────────── */
const Toast = {
  timer: null,
  show(message, type = 'default', duration = 3200) {
    const el = document.getElementById('toast');
    if (!el) return;
    if (this.timer) clearTimeout(this.timer);
    el.className = 'toast';
    if (type !== 'default') el.classList.add(type);
    const iconMap = { success: 'checkCircle', error: 'xCircle', warning: 'alertTriangle', default: 'info' };
    el.innerHTML = `${icon(iconMap[type] || 'info', 18)}<span>${message}</span>`;
    el.classList.add('show');
    this.timer = setTimeout(() => el.classList.remove('show'), duration);
  }
};

/* ── Sheet (Bottom Modal) ──────────────────────────────────────── */
const Sheet = {
  open(content, title = '') {
    const backdrop = document.getElementById('sheet-backdrop');
    const sheet = document.getElementById('bottom-sheet');
    const sheetTitle = sheet.querySelector('.sheet-title');
    const sheetBody = sheet.querySelector('.sheet-body');
    sheetTitle.textContent = title;
    sheetTitle.style.display = title ? 'block' : 'none';
    sheetBody.innerHTML = content;
    backdrop.classList.add('open');
    sheet.classList.add('open');
    document.body.style.overflow = 'hidden';
  },
  close() {
    document.getElementById('sheet-backdrop')?.classList.remove('open');
    document.getElementById('bottom-sheet')?.classList.remove('open');
    document.body.style.overflow = '';
  }
};

/* ═══════════════════════════════════════════════════════════════════
   SCREEN RENDERERS
═══════════════════════════════════════════════════════════════════ */

/* ── HOME ──────────────────────────────────────────────────────── */
function renderHome() {
  const el = document.getElementById('screen-home');
  if (!el) return;

  const activeShipments = State.user ? DEMO_SHIPMENTS.filter(s =>
    !['PICKED_UP_BY_CUSTOMER','DELIVERED','DELIVERED_TO_CUSTOMER','CANCELLED','RETURN_TO_SENDER'].includes(s.current_status)
  ) : [];

  el.innerHTML = `
    <!-- Header with real logo -->
    <div class="app-header">
      <div class="app-header-logo" onclick="Router.navigate('home')" style="cursor:pointer">
        ${LOGO_SMALL}
        <span class="logo-text" style="color:#000000">COLISDIRECT</span>
      </div>
      <button class="header-action" onclick="Router.navigate('notifications')" style="position:relative" id="btn-notif-home">
        ${icon('bell', 20)}
        ${State.unreadCount > 0 ? `<span class="badge-dot"></span>` : ''}
      </button>
    </div>

    <!-- Hero Orange -->
    <div class="home-hero">
      <div style="position:relative;z-index:1">
        <div class="home-greeting">Bonjour ${State.user ? State.user.first_name + ' 👋' : '👋'}</div>
        <div class="home-name">${State.user ? 'Que souhaitez-vous faire ?' : 'Bienvenue sur ColisDirect'}</div>

        <!-- Quick Track -->
        <div class="track-card" style="margin-top:18px">
          <div class="track-card-label" style="color:#ffffff">${icon('search', 13, '#ffffff')} &nbsp;Suivi rapide</div>
          <div class="track-input-row">
            <input class="track-input" id="home-track-input"
              placeholder="Ex: CD202605290001CI"
              maxlength="30"
              oninput="this.value=this.value.toUpperCase()"
              onkeydown="if(event.key==='Enter')handleHomeTrack()" />
            <button class="track-btn" id="home-track-btn" onclick="handleHomeTrack()">Suivre</button>
          </div>
        </div>


      </div>
    </div>

    <!-- Services -->
    <div class="card" style="margin:16px;border-radius:20px;overflow:hidden">
      <div class="section-label" style="padding:14px 16px 6px">Services rapides</div>
      <div class="services-grid">
        <div class="service-item" id="svc-envoyer" onclick="Router.navigate('create-shipment')">
          <div class="service-icon" style="background:#FFF3E8">${icon('package', 24, '#FF6C00')}</div>
          <span class="service-label" style="text-align:center">Envoyer un colis</span>
        </div>
        <div class="service-item" id="svc-relais" onclick="Router.navigate('map')">
          <div class="service-icon" style="background:#E6F6EC">${icon('mapPin', 24, '#16A34A')}</div>
          <span class="service-label" style="text-align:center">Trouver un relais</span>
        </div>
      </div>
    </div>

    <!-- Colis actifs -->
    ${activeShipments.length > 0 ? `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0 16px;margin-bottom:10px">
        <h3 style="font-size:15px;font-weight:700;color:#1A1A1A">Colis en cours</h3>
        <button onclick="Router.navigate('shipments')" style="font-size:12px;font-weight:700;color:#FF6C00;background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:2px">
          Tout voir ${icon('chevronRight', 14, '#FF6C00')}
        </button>
      </div>
      <div class="scroll-x" style="padding-bottom:4px;margin-bottom:20px">
        <div class="scroll-x-inner">
          ${activeShipments.map(s => renderPackageCard(s)).join('')}
        </div>
      </div>
    ` : `
      <div style="padding:0 16px;margin-bottom:4px">
        <div style="background:#FFF3E8;border-radius:16px;padding:16px;display:flex;align-items:center;gap:12px;cursor:pointer" onclick="Router.navigate('create-shipment')">
          <div style="width:44px;height:44px;background:#FF6C00;border-radius:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            ${icon('plus', 24, 'white')}
          </div>
          <div>
            <div style="font-size:14px;font-weight:700;color:#1A1A1A">Envoyez votre premier colis</div>
            <div style="font-size:12px;color:#6B7280;margin-top:2px">Simple, rapide et sécurisé</div>
          </div>
          ${icon('chevronRight', 18, '#FF6C00')}
        </div>
      </div>
    `}



    <!-- Partenaires CTA -->
    <div style="padding:0 16px 16px">
      <div style="background:linear-gradient(135deg,#FF6C00,#FF8533);border-radius:20px;padding:20px">
        <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px">Rejoignez-nous</div>
        <div style="font-size:18px;font-weight:800;color:#fff;margin-bottom:8px">Devenez partenaire</div>
        <p style="font-size:13px;color:rgba(255,255,255,0.8);margin-bottom:16px;line-height:1.5">Livreur agréé ou point relais — développez votre activité avec ColisDirect.</p>
        <div style="display:flex;gap:10px">
          <button class="btn btn-sm" style="flex:1;font-size:12px;background:rgba(0,0,0,0.35);color:#fff;border:1.5px solid rgba(255,255,255,0.4);border-radius:12px" onclick="Router.navigate('partner', { partnerType: 'livreur' })">
            ${icon('bike', 14, 'white')} Livreur
          </button>
          <button class="btn btn-sm" style="flex:1;font-size:12px;background:rgba(255,255,255,0.18);color:#fff;border:1.5px solid rgba(255,255,255,0.5);border-radius:12px" onclick="Router.navigate('partner', { partnerType: 'relais' })">
            ${icon('store', 14, 'white')} Point relais
          </button>
        </div>
      </div>
    </div>

    <!-- Tarifs CTA -->
    <div style="padding:0 16px 28px">
      <div style="background:linear-gradient(135deg,#0f0f0f 0%,#1a1a2e 100%);border-radius:20px;padding:20px;text-align:center">
        <div style="font-size:11px;font-weight:700;color:#FF6C00;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Tarifs transparents</div>
        <div style="font-size:22px;font-weight:800;color:#fff">Dès <span style="color:#FF6C00">600 FCFA</span></div>
        <p style="font-size:13px;color:rgba(255,255,255,0.65);margin:8px 0 16px;line-height:1.5">Envoyez partout en Côte d'Ivoire.</p>
        <button class="btn btn-primary btn-full" onclick="Router.navigate('pricing')" style="font-size:14px;padding:12px 20px">
          Voir tous les tarifs ${icon('arrowRight', 16)}
        </button>
      </div>
    </div>
  `;
}

function handleHomeTrack() {
  const input = document.getElementById('home-track-input');
  const btn = document.getElementById('home-track-btn');
  const val = input?.value?.trim().toUpperCase();
  if (!val) { Toast.show('Entrez un numéro de suivi', 'warning'); return; }

  if (btn) { btn.textContent = '...'; btn.disabled = true; }
  setTimeout(() => {
    if (btn) { btn.textContent = 'Suivre'; btn.disabled = false; }
    Router.navigate('tracking', { trackingNumber: val });
  }, 300);
}

function openSupport() {
  Sheet.open(`
    <div style="padding:8px 0 16px;text-align:center">
      <div style="width:56px;height:56px;background:#FFF3E8;border-radius:16px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center">
        ${icon('helpCircle', 28, '#FF6C00')}
      </div>
      <div style="font-size:17px;font-weight:700;color:#1A1A1A;margin-bottom:4px">Support client</div>
      <div style="font-size:13px;color:#6B7280;margin-bottom:20px">Disponible 24h/24 et 7j/7</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <a href="tel:+22507000000" class="btn btn-primary btn-full" style="text-decoration:none">
          ${icon('phone', 18)} Appeler le support
        </a>
        <a href="mailto:support@colisdirect.ci" class="btn btn-outline btn-full" style="text-decoration:none">
          ${icon('mail', 18)} Envoyer un email
        </a>
        <button class="btn btn-ghost btn-full" onclick="Sheet.close()">Fermer</button>
      </div>
    </div>
  `, 'Assistance');
}

function renderPackageCard(s) {
  const badge = getStatusBadge(s.current_status);
  const progress = getProgressPercent(s);
  return `
    <div class="pkg-card" onclick="showShipmentDetail('${s.id}')">
      <div class="pkg-card-header">
        <div>
          <div class="pkg-tracking">${s.shipment_code}</div>
          <div style="font-size:10px;color:#6B7280;margin-top:1px">${formatDate(s.created_at)}</div>
        </div>
        <span class="badge ${badge.cls}" style="font-size:10px;padding:3px 8px">${badge.label}</span>
      </div>
      <div class="pkg-route">${s.sender_commune.split(' ').pop()} → ${s.recipient_commune.split(' ').pop()}</div>
      <div style="font-size:12px;color:#6B7280;margin-top:2px">Pour : ${s.recipient_first_name} ${s.recipient_last_name}</div>
      <div class="pkg-progress" style="margin-top:10px">
        <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
        <div style="display:flex;justify-content:space-between;margin-top:4px">
          <span style="font-size:10px;color:#6B7280">Progression</span>
          <span style="font-size:10px;font-weight:700;color:#FF6C00">${progress}%</span>
        </div>
      </div>
    </div>
  `;
}

/* ── SHIPMENTS ─────────────────────────────────────────────────── */
let shipmentsTab = 'all';
let shipmentsQuery = '';

function renderShipments() {
  const el = document.getElementById('screen-shipments');
  if (!el) return;

  if (!State.user) {
    el.innerHTML = `
      <div class="app-header">
        <div style="font-size:17px;font-weight:700;color:#1A1A1A;flex:1">Mes colis</div>
      </div>
      <div class="empty-state" style="padding-top:60px">
        <div class="empty-icon">${icon('package', 36, '#FF6C00')}</div>
        <div class="empty-title">Suivez vos colis</div>
        <div class="empty-sub">Connectez-vous pour voir l'historique de vos colis et suivre vos envois en temps réel.</div>
        <button class="btn btn-primary" style="margin-top:20px;padding:14px 32px" onclick="Router.navigate('login')">
          Se connecter
        </button>
        <button class="btn btn-ghost" onclick="Router.navigate('login')" style="margin-top:4px">
          Créer un compte
        </button>
      </div>
    `;
    return;
  }

  const all = DEMO_SHIPMENTS;
  const active = all.filter(s => !['PICKED_UP_BY_CUSTOMER','DELIVERED','DELIVERED_TO_CUSTOMER','CANCELLED','RETURN_TO_SENDER'].includes(s.current_status));
  const delivered = all.filter(s => ['PICKED_UP_BY_CUSTOMER','DELIVERED','DELIVERED_TO_CUSTOMER'].includes(s.current_status));

  let list = shipmentsTab === 'active' ? active : shipmentsTab === 'delivered' ? delivered : all;
  if (shipmentsQuery) {
    const q = shipmentsQuery.toLowerCase();
    list = list.filter(s =>
      s.tracking_number.toLowerCase().includes(q) || s.shipment_code.toLowerCase().includes(q) ||
      `${s.recipient_first_name} ${s.recipient_last_name}`.toLowerCase().includes(q) ||
      s.recipient_commune.toLowerCase().includes(q) || s.sender_commune.toLowerCase().includes(q)
    );
  }

  el.innerHTML = `
    <div class="app-header">
      <div style="font-size:17px;font-weight:700;color:#1A1A1A;flex:1">Mes colis</div>
      <button class="header-action" onclick="Router.navigate('create-shipment')" title="Nouveau colis">
        ${icon('plus', 20)}
      </button>
    </div>

    <div class="chip-tabs" style="margin:12px 0 4px;padding-bottom:2px">
      <div class="chip ${shipmentsTab==='all'?'active':''}" onclick="setShipmentsTab('all')">Tous (${all.length})</div>
      <div class="chip ${shipmentsTab==='active'?'active':''}" onclick="setShipmentsTab('active')">En cours (${active.length})</div>
      <div class="chip ${shipmentsTab==='delivered'?'active':''}" onclick="setShipmentsTab('delivered')">Livrés (${delivered.length})</div>
    </div>

    <div class="search-bar">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input class="search-input" id="shipment-search" value="${shipmentsQuery}" placeholder="N° de suivi, destinataire, commune…" oninput="filterShipments(this.value)" />
    </div>

    <div id="shipments-list">
      ${list.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">${icon('package', 36, '#FF6C00')}</div>
          <div class="empty-title">Aucun colis trouvé</div>
          <div class="empty-sub">${shipmentsQuery ? 'Essayez un autre terme de recherche.' : 'Commencez par envoyer votre premier colis.'}</div>
          ${!shipmentsQuery ? `<button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="Router.navigate('create-shipment')">${icon('plus', 16)} Envoyer un colis</button>` : ''}
        </div>
      ` : list.map(s => renderShipmentListItem(s)).join('')}
    </div>
  `;
}

function setShipmentsTab(tab) {
  shipmentsTab = tab;
  shipmentsQuery = '';
  renderShipments();
}

function filterShipments(q) {
  shipmentsQuery = q;
  const all = DEMO_SHIPMENTS;
  let list = shipmentsTab === 'active'
    ? all.filter(s => !['PICKED_UP_BY_CUSTOMER','DELIVERED','DELIVERED_TO_CUSTOMER','CANCELLED','RETURN_TO_SENDER'].includes(s.current_status))
    : shipmentsTab === 'delivered'
      ? all.filter(s => ['PICKED_UP_BY_CUSTOMER','DELIVERED','DELIVERED_TO_CUSTOMER'].includes(s.current_status))
      : all;
  if (q) {
    const lq = q.toLowerCase();
    list = list.filter(s =>
      s.tracking_number.toLowerCase().includes(lq) || s.shipment_code.toLowerCase().includes(lq) ||
      `${s.recipient_first_name} ${s.recipient_last_name}`.toLowerCase().includes(lq) ||
      s.recipient_commune.toLowerCase().includes(lq)
    );
  }
  const container = document.getElementById('shipments-list');
  if (!container) return;
  container.innerHTML = list.length === 0
    ? `<div class="empty-state"><div class="empty-title" style="font-size:14px;color:#6B7280">Aucun résultat pour "${q}"</div></div>`
    : list.map(s => renderShipmentListItem(s)).join('');
}

function renderShipmentListItem(s) {
  const badge = getStatusBadge(s.current_status);
  const progress = getProgressPercent(s);
  const bgColor = { 'badge-green': '#E6F6EC', 'badge-orange': '#FFF3E8', 'badge-blue': '#EEF4FF', 'badge-red': '#FEF2F2', 'badge-yellow': '#FEF8E7' }[badge.cls] || '#F6F7F9';
  const fgColor = { 'badge-green': '#16A34A', 'badge-orange': '#FF6C00', 'badge-blue': '#2F6BE0', 'badge-red': '#DC2626', 'badge-yellow': '#B45309' }[badge.cls] || '#6B7280';
  return `
    <div class="list-item" onclick="showShipmentDetail('${s.id}')">
      <div class="list-item-icon" style="background:${bgColor}">${icon('package', 20, fgColor)}</div>
      <div class="list-item-content">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <span style="font-size:12px;font-family:monospace;font-weight:800;color:#FF6C00">${s.shipment_code}</span>
          <span class="badge ${badge.cls}" style="font-size:9px;padding:2px 7px">${badge.label}</span>
        </div>
        <div class="list-item-title">${s.recipient_first_name} ${s.recipient_last_name}</div>
        <div class="list-item-sub">${s.sender_commune} → ${s.recipient_commune}</div>
        <div style="margin-top:6px">
          <div class="progress-bar" style="height:3px"><div class="progress-fill" style="width:${progress}%"></div></div>
        </div>
      </div>
      <div class="list-item-right">
        <div style="text-align:right">
          <div style="font-size:13px;font-weight:800;color:#FF6C00">${s.price?.toLocaleString()} F</div>
          <div style="font-size:10px;color:#9CA3AF;margin-top:2px">${formatDate(s.created_at)}</div>
        </div>
        ${icon('chevronRight', 16, '#D1D5DB')}
      </div>
    </div>
  `;
}

function showShipmentDetail(id) {
  const s = DEMO_SHIPMENTS.find(x => x.id === id);
  if (!s) return;
  State.trackingResult = s;
  Router.navigate('tracking-detail', { shipment: s });
}

/* ── TRACKING ──────────────────────────────────────────────────── */
function renderTracking(prefill = '') {
  const el = document.getElementById('screen-tracking');
  if (!el) return;

  el.innerHTML = `
    <div class="app-header">
      <div style="font-size:17px;font-weight:700;color:#1A1A1A;flex:1">Suivi de colis</div>
      <button class="header-action" onclick="Router.navigate('create-shipment')" title="Envoyer un colis">
        ${icon('package', 20)}
      </button>
    </div>

    <div style="background:linear-gradient(135deg,#FF6C00,#FF8533);padding:24px 16px 30px">
      <div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:4px">Suivez votre colis</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-bottom:18px">Entrez votre numéro de suivi ci-dessous</div>
      <div style="background:rgba(255,255,255,0.15);border-radius:16px;padding:14px;backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.2)">
        <div style="display:flex;gap:8px">
          <input id="tracking-input" value="${prefill}"
            style="flex:1;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,0.95);border:none;font-size:14px;font-family:monospace;color:#1A1A1A;outline:none;letter-spacing:0.04em"
            placeholder="Ex: CD202605290001CI"
            oninput="this.value=this.value.toUpperCase()"
            onkeydown="if(event.key==='Enter')doTrack()" />
          <button id="track-btn" onclick="doTrack()"
            style="padding:12px 16px;background:#0f0f0f;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all 0.15s;white-space:nowrap">
            ${icon('search', 16, 'white')} Suivre
          </button>
        </div>
      </div>
    </div>

    <div id="tracking-result-zone" style="padding:16px"></div>

    <!-- Recent demo -->
    ${State.user ? `
      <div class="section-label" style="padding:8px 16px 6px">Recherches récentes</div>
      ${DEMO_SHIPMENTS.slice(0,3).map(s => `
        <div class="list-item" onclick="quickTrack('${s.tracking_number}')">
          <div class="list-item-icon" style="background:#FFF3E8">${icon('clock', 16, '#FF6C00')}</div>
          <div class="list-item-content">
            <div style="font-size:12px;font-family:monospace;font-weight:700;color:#FF6C00;letter-spacing:0.04em">${s.tracking_number}</div>
            <div class="list-item-sub">${s.sender_commune} → ${s.recipient_commune} · ${s.recipient_first_name} ${s.recipient_last_name}</div>
          </div>
          ${icon('chevronRight', 15, '#D1D5DB')}
        </div>
      `).join('')}
    ` : ''}
  `;

  if (prefill) setTimeout(doTrack, 250);
}

function quickTrack(number) {
  const input = document.getElementById('tracking-input');
  if (input) input.value = number;
  doTrack();
}

async function doTrack() {
  const input = document.getElementById('tracking-input');
  const btn = document.getElementById('track-btn');
  const q = input?.value?.trim().toUpperCase();
  if (!q) { Toast.show('Entrez un numéro de suivi', 'warning'); return; }

  if (btn) { btn.innerHTML = `<div class="spinner" style="width:18px;height:18px;border-width:2.5px"></div>`; btn.disabled = true; }

  await new Promise(r => setTimeout(r, 700));

  if (btn) { btn.innerHTML = `${icon('search', 16, 'white')} Suivre`; btn.disabled = false; }

  const found = DEMO_SHIPMENTS.find(s => s.tracking_number.toUpperCase() === q || s.shipment_code.toUpperCase() === q);
  const resultZone = document.getElementById('tracking-result-zone');
  if (!resultZone) return;

  if (found) {
    State.trackingResult = found;
    const badge = getStatusBadge(found.current_status);
    const progress = getProgressPercent(found);
    resultZone.innerHTML = `
      <div class="card" style="border-radius:18px;overflow:hidden;animation:slideUp 0.35s ease">
        <div style="background:linear-gradient(135deg,#FF6C00,#FF8533);padding:16px">
          <div style="font-size:11px;color:rgba(255,255,255,0.8);font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Numéro de suivi</div>
          <div style="font-size:16px;font-weight:800;font-family:monospace;color:#fff;margin-top:2px;letter-spacing:0.04em">${found.tracking_number}</div>
          <div style="margin-top:10px">
            <span class="badge" style="background:rgba(255,255,255,0.2);color:#fff;font-size:11px">${badge.label}</span>
          </div>
          <div class="progress-bar" style="margin-top:10px;background:rgba(255,255,255,0.25)">
            <div class="progress-fill" style="width:${progress}%;background:rgba(255,255,255,0.9)"></div>
          </div>
          <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:4px;text-align:right">${progress}% complété</div>
        </div>
        <div style="padding:14px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <div>
              <div style="font-size:11px;color:#6B7280;font-weight:600">DÉPART</div>
              <div style="font-size:13px;font-weight:700;color:#1A1A1A">${found.sender_commune}</div>
            </div>
            ${icon('arrowRight', 20, '#FF6C00')}
            <div style="text-align:right">
              <div style="font-size:11px;color:#6B7280;font-weight:600">ARRIVÉE</div>
              <div style="font-size:13px;font-weight:700;color:#1A1A1A">${found.recipient_commune}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" style="flex:1;font-size:13px;padding:11px" onclick="showShipmentDetail('${found.id}')">
              ${icon('list', 15)} Voir le détail
            </button>
            <button class="btn btn-outline btn-icon" title="Copier" onclick="copyTrackingNumber('${found.tracking_number}')">
              ${icon('copy', 16)}
            </button>
          </div>
        </div>
      </div>
    `;
  } else {
    resultZone.innerHTML = `
      <div class="card" style="padding:20px;text-align:center;border-color:#FEE2E2;animation:slideUp 0.3s ease">
        <div style="width:52px;height:52px;background:#FEF2F2;border-radius:16px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center">
          ${icon('xCircle', 28, '#DC2626')}
        </div>
        <div style="font-size:15px;font-weight:700;color:#DC2626">Introuvable</div>
        <div style="font-size:13px;color:#6B7280;margin-top:6px;line-height:1.5">Aucun colis avec le numéro <strong>${q}</strong>.<br/>Vérifiez le numéro et réessayez.</div>
      </div>
    `;
  }
}

function copyTrackingNumber(num) {
  navigator.clipboard?.writeText(num).then(() => Toast.show('Numéro copié !', 'success'));
}

/* ── TRACKING DETAIL ───────────────────────────────────────────── */
function renderTrackingDetail(shipment) {
  if (!shipment) { Router.navigate('shipments'); return; }
  const el = document.getElementById('screen-tracking-detail');
  if (!el) return;

  const badge = getStatusBadge(shipment.current_status);
  const trackingInfo = getTrackingInfo(shipment);
  const progress = trackingInfo.progress;
  const steps = trackingInfo.steps;
  const isDelivered = ['PICKED_UP_BY_CUSTOMER','DELIVERED','DELIVERED_TO_CUSTOMER'].includes(shipment.current_status);
  const isCancelled = ['CANCELLED','RETURN_TO_SENDER'].includes(shipment.current_status);

  el.innerHTML = `
    <div class="app-header">
      <button class="header-back" onclick="Router.back()">${icon('chevronLeft', 18)}</button>
      <div class="header-title">Colis ${shipment.shipment_code}</div>
      <button class="header-action" onclick="shareShipment('${shipment.tracking_number}')">
        ${icon('share2', 18)}
      </button>
    </div>

    <!-- Hero -->
    <div style="background:linear-gradient(135deg,${isCancelled ? '#DC2626,#B91C1C' : isDelivered ? '#16A34A,#15803D' : '#FF6C00,#FF8533'});padding:20px 16px 28px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
        <div>
          <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.75);text-transform:uppercase;letter-spacing:0.5px">Numéro de suivi</div>
          <div style="font-size:15px;font-weight:800;font-family:monospace;color:#fff;margin-top:2px;letter-spacing:0.04em">${shipment.tracking_number}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.65);margin-top:4px;font-family:monospace">Code: ${shipment.shipment_code}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:2px">Créé le ${formatDate(shipment.created_at)}</div>
        </div>
        <span class="badge" style="background:rgba(255,255,255,0.2);color:#fff;font-size:10px;margin-top:2px">${badge.label}</span>
      </div>
      <div class="progress-bar" style="background:rgba(255,255,255,0.25)">
        <div class="progress-fill" style="width:${progress}%;background:rgba(255,255,255,0.95)"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:5px">
        <span style="font-size:11px;color:rgba(255,255,255,0.7)">Avancement</span>
        <span style="font-size:11px;font-weight:700;color:#fff">${progress}%</span>
      </div>
    </div>

    <!-- Route card -->
    <div style="margin:-16px 16px 16px;background:#fff;border-radius:16px;padding:16px;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
      <div style="display:flex;align-items:center">
        <div style="flex:1">
          <div style="font-size:10px;color:#9CA3AF;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Expéditeur</div>
          <div style="font-size:14px;font-weight:700;color:#1A1A1A;margin-top:2px">${shipment.sender_first_name} ${shipment.sender_last_name}</div>
          <div style="font-size:12px;color:#6B7280">${shipment.sender_commune}</div>
        </div>
        <div style="padding:0 10px;flex-shrink:0">${icon('arrowRight', 22, '#FF6C00')}</div>
        <div style="flex:1;text-align:right">
          <div style="font-size:10px;color:#9CA3AF;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Destinataire</div>
          <div style="font-size:14px;font-weight:700;color:#1A1A1A;margin-top:2px">${shipment.recipient_first_name} ${shipment.recipient_last_name}</div>
          <div style="font-size:12px;color:#6B7280">${shipment.recipient_commune}</div>
        </div>
      </div>
    </div>

    <!-- Steps timeline -->
    <div style="padding:0 16px 8px">
      <div style="font-size:14px;font-weight:700;color:#1A1A1A;margin-bottom:14px">Étapes de livraison</div>
      <div class="timeline">
        ${steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return `
            <div class="timeline-item">
              <div class="timeline-left">
                <div class="timeline-dot ${step.status === 'done' ? 'done' : step.status === 'active' ? 'active' : ''}">
                  ${step.status === 'done' ? icon('checkCircle', 14, 'white') : icon(step.icon || 'package', 14, step.status === 'active' ? '#FF6C00' : '#D1D5DB')}
                </div>
                ${!isLast ? `<div class="timeline-line ${step.status === 'done' ? 'done' : ''}"></div>` : ''}
              </div>
              <div class="timeline-content">
                <div class="timeline-label ${step.status}">${step.label}</div>
                <div class="timeline-sublabel">${step.sublabel}</div>
                ${step.time ? `<div class="timeline-date">${step.time}</div>` : ''}
                ${step.status === 'active' ? `<span class="badge badge-orange" style="margin-top:6px;display:inline-flex;font-size:10px;gap:5px"><span style="width:6px;height:6px;border-radius:50%;background:#FF6C00;flex-shrink:0;margin-top:1px;animation:pulse-ring 1.4s ease-out infinite"></span>En cours</span>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Current step banner -->
      ${!isCancelled ? `
        <div style="margin-top:16px;background:#FFF3E8;border:1px solid #FFD4A8;border-radius:12px;padding:12px;display:flex;align-items:center;gap:10px">
          <div style="width:8px;height:8px;border-radius:50%;background:#FF6C00;flex-shrink:0;animation:pulse-ring 1.4s ease-out infinite"></div>
          <div>
            <div style="font-size:13px;font-weight:700;color:#FF6C00">Étape actuelle : ${trackingInfo.currentStepLabel}</div>
            <div style="font-size:11px;color:#B45309;margin-top:2px">${trackingInfo.currentStepSublabel}</div>
          </div>
        </div>
      ` : ''}
    </div>

    <div class="divider-soft"></div>

    <!-- Package details -->
    <div style="padding:16px">
      <div style="font-size:14px;font-weight:700;color:#1A1A1A;margin-bottom:12px">Détails du colis</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
        <div class="stat-card"><div style="font-size:11px;color:#6B7280;margin-bottom:4px">Format</div><div style="font-size:15px;font-weight:700">${shipment.package_type === 'petit' ? 'Petit' : shipment.package_type === 'moyen' ? 'Moyen' : 'Grand'}</div></div>
        <div class="stat-card"><div style="font-size:11px;color:#6B7280;margin-bottom:4px">Poids</div><div style="font-size:15px;font-weight:700">${shipment.weight} kg</div></div>
        <div class="stat-card" style="background:#FFF3E8;border-color:#FFD4A8"><div style="font-size:11px;color:#FF6C00;margin-bottom:4px">Montant</div><div style="font-size:15px;font-weight:800;color:#FF6C00">${shipment.price?.toLocaleString()} F</div></div>
        <div class="stat-card" style="background:${shipment.payment_status === 'paid' ? '#E6F6EC' : '#FEF8E7'};border-color:${shipment.payment_status === 'paid' ? '#86EFAC' : '#FDE68A'}">
          <div style="font-size:11px;color:${shipment.payment_status === 'paid' ? '#16A34A' : '#B45309'};margin-bottom:4px">Paiement</div>
          <div style="font-size:13px;font-weight:700;color:${shipment.payment_status === 'paid' ? '#16A34A' : '#B45309'}">${shipment.payment_status === 'paid' ? '✓ Payé' : '⏳ En attente'}</div>
        </div>
      </div>
    </div>

    <!-- Relay info -->
    ${shipment.destination_relay ? `
      <div class="divider-soft"></div>
      <div style="padding:16px">
        <div style="font-size:14px;font-weight:700;color:#1A1A1A;margin-bottom:12px">Relais de livraison</div>
        <div style="background:#FFF3E8;border:1.5px solid #FFD4A8;border-radius:16px;padding:14px">
          <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px">
            <div style="width:40px;height:40px;background:#FF6C00;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
              ${icon('store', 20, 'white')}
            </div>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:700;color:#1A1A1A">${shipment.destination_relay.name}</div>
              <div style="font-size:12px;color:#6B7280;margin-top:2px">${shipment.destination_relay.address}</div>
              <div style="font-size:12px;color:#6B7280">${shipment.destination_relay.commune}</div>
              ${shipment.destination_relay.hours ? `<div style="font-size:11px;color:#FF6C00;margin-top:4px;font-weight:600">${icon('clock', 11, '#FF6C00')} ${shipment.destination_relay.hours}</div>` : ''}
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <a href="tel:${shipment.destination_relay.phone}" class="btn btn-sm btn-secondary" style="flex:1;font-size:12px;text-decoration:none">
              ${icon('phone', 14, '#FF6C00')} Appeler
            </a>
            <button class="btn btn-sm btn-outline" style="flex:1;font-size:12px" onclick="Router.navigate('map')">
              ${icon('mapPin', 14)} Carte
            </button>
          </div>
        </div>
      </div>
    ` : ''}


    <!-- Actions -->
    <div style="padding:0 16px 28px;display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-primary btn-full" onclick="generateBordereau('${shipment.shipment_code}')">
        ${icon('printer', 18)} Générer le bordereau PDF
      </button>
      <button class="btn btn-outline btn-full" onclick="shareShipment('${shipment.tracking_number}')">
        ${icon('share2', 18)} Partager le suivi
      </button>
      ${!isDelivered && !isCancelled ? `
        <button class="btn btn-full" style="background:#FEF2F2;color:#DC2626;border:none;border-radius:14px;padding:13px;font-size:14px;font-weight:700" onclick="promptCancelShipment('${shipment.id}')">
          ${icon('xCircle', 18, '#DC2626')} Annuler la commande
        </button>
      ` : ''}
    </div>
  `;
}

function getTrackingSteps(shipment) {
  const status = shipment.current_status.toUpperCase();
  const steps = shipment.home_delivery ? [
    { id: 'created',   label: 'Commande créée',       sublabel: 'Paiement validé', icon: 'package',      statuses: ['READY_FOR_DROP_OFF','PAYMENT_CONFIRMED_AWAITING_DROP'] },
    { id: 'pickup',    label: 'Collecte',              sublabel: 'Récupération chez vous', icon: 'home', statuses: ['PICKUP_PENDING','RELAY_ORIGIN_RECEIVED','CARRIER_COLLECTED'] },
    { id: 'transit',   label: 'En transit',            sublabel: 'Acheminement en cours', icon: 'truck', statuses: ['IN_TRANSIT','RELAY_FINAL_RECEIVED'] },
    { id: 'delivered', label: 'Livré à domicile',      sublabel: 'Livraison terminée', icon: 'checkCircle', statuses: ['DELIVERED','DELIVERED_TO_CUSTOMER'] },
  ] : [
    { id: 'created',   label: 'Commande créée',        sublabel: 'En attente de dépôt', icon: 'package', statuses: ['READY_FOR_DROP_OFF','PAYMENT_CONFIRMED_AWAITING_DROP','PAYMENT_PENDING_AT_RELAY'] },
    { id: 'relayIn',   label: 'Déposé au relais',      sublabel: 'Prise en charge au départ', icon: 'store', statuses: ['RELAY_ORIGIN_RECEIVED','PAYMENT_RECEIVED_AT_RELAY'] },
    { id: 'transit',   label: 'En transit',            sublabel: 'En route vers la destination', icon: 'truck', statuses: ['CARRIER_COLLECTED','IN_TRANSIT'] },
    { id: 'relayOut',  label: 'Au relais de livraison',sublabel: 'Disponible au retrait', icon: 'store', statuses: ['RELAY_FINAL_RECEIVED','AVAILABLE_FOR_PICKUP'] },
    { id: 'done',      label: 'Retiré',                sublabel: 'Livraison complète ✓', icon: 'checkCircle', statuses: ['PICKED_UP_BY_CUSTOMER'] },
  ];

  const activeIdx = steps.findIndex(s => s.statuses.includes(status));
  return steps.map((step, i) => ({
    ...step,
    status: i < activeIdx ? 'done' : i === activeIdx ? 'active' : 'pending',
    time: shipment.events?.find(e => step.statuses.includes(e.status?.toUpperCase()))?.timestamp
      ? formatDateTime(shipment.events.find(e => step.statuses.includes(e.status?.toUpperCase())).timestamp)
      : null,
  }));
}

function shareShipment(trackingNumber) {
  const text = `Suivez mon colis ColisDirect — N°: ${trackingNumber}`;
  if (navigator.share) {
    navigator.share({ title: 'ColisDirect', text, url: window.location.href });
  } else {
    navigator.clipboard?.writeText(trackingNumber).then(() => Toast.show('Numéro de suivi copié !', 'success'));
  }
}

function generateBordereau(code) {
  // Simulate PDF generation
  const win = window.open('', '_blank');
  if (win) {
    const s = DEMO_SHIPMENTS.find(x => x.shipment_code === code);
    win.document.write(`
      <html><head><title>Bordereau ColisDirect — ${code}</title>
      <style>body{font-family:sans-serif;padding:32px;color:#1A1A1A}
      .orange{color:#FF6C00}.muted{color:#6B7280;font-size:13px}
      h1{font-size:24px;margin-bottom:4px}
      table{width:100%;border-collapse:collapse;margin-top:16px}
      td{padding:10px;border-bottom:1px solid #eee}
      td:first-child{font-weight:600;width:40%;color:#6B7280}
      .barcode{font-size:28px;font-family:monospace;letter-spacing:4px;background:#F6F7F9;padding:16px;border-radius:8px;text-align:center;margin-top:16px}
      </style></head><body>
      <div class="orange" style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px">ColisDirect</div>
      <h1>Bordereau d'expédition</h1>
      <div class="muted">Imprimez ce bordereau et collez-le sur votre colis</div>
      <div class="barcode">${code}</div>
      ${s ? `<table>
        <tr><td>Expéditeur</td><td>${s.sender_first_name} ${s.sender_last_name}</td></tr>
        <tr><td>Commune départ</td><td>${s.sender_commune}</td></tr>
        <tr><td>Destinataire</td><td>${s.recipient_first_name} ${s.recipient_last_name}</td></tr>
        <tr><td>Commune arrivée</td><td>${s.recipient_commune}</td></tr>
        <tr><td>Format</td><td>${s.package_type}</td></tr>
        <tr><td>Poids</td><td>${s.weight} kg</td></tr>
        <tr><td>Tarif</td><td>${s.price?.toLocaleString()} FCFA</td></tr>
        <tr><td>Date</td><td>${formatDate(s.created_at)}</td></tr>
      </table>` : ''}
      <p style="margin-top:24px;color:#9CA3AF;font-size:12px">Généré le ${new Date().toLocaleDateString('fr-FR')} — colisdirect.com</p>
      <script>window.print()</script>
      </body></html>
    `);
    win.document.close();
  } else {
    Toast.show('Bordereau généré !', 'success');
  }
}

function promptCancelShipment(id) {
  const s = DEMO_SHIPMENTS.find(x => x.id === id);
  if (!s) return;
  Sheet.open(`
    <div style="text-align:center;padding:8px 0 8px">
      <div style="width:56px;height:56px;background:#FEF2F2;border-radius:16px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center">
        ${icon('xCircle', 28, '#DC2626')}
      </div>
      <div style="font-size:17px;font-weight:700;color:#1A1A1A;margin-bottom:8px">Annuler la commande ?</div>
      <div style="font-size:13px;color:#6B7280;margin-bottom:6px;line-height:1.5">Vous allez annuler le colis <strong>${s.shipment_code}</strong> vers ${s.recipient_commune}.</div>
      <div class="notice-banner notice-orange" style="margin:12px 0;text-align:left">${icon('alertTriangle', 14)} Cette action est irréversible. Un remboursement sera traité sous 3-5 jours ouvrés.</div>
      <div style="display:flex;gap:10px;margin-top:8px">
        <button class="btn btn-outline btn-full" onclick="Sheet.close()">Garder</button>
        <button class="btn btn-full" style="background:#DC2626;color:#fff;border-radius:14px" onclick="confirmCancel('${id}')">Oui, annuler</button>
      </div>
    </div>
  `, 'Annulation');
}

function confirmCancel(id) {
  const s = DEMO_SHIPMENTS.find(x => x.id === id);
  if (s) {
    s.current_status = 'CANCELLED';
    s.events.unshift({ status: 'CANCELLED', timestamp: new Date().toISOString(), notes: 'Annulé par l\'expéditeur' });
  }
  Sheet.close();
  Toast.show('Commande annulée. Remboursement en cours.', 'success', 4000);
  Router.navigate('shipments');
}

/* ── PROFILE ───────────────────────────────────────────────────── */
function renderProfile() {
  const el = document.getElementById('screen-profile');
  if (!el) return;

  if (!State.user) {
    el.innerHTML = `
      <div class="app-header">
        <div style="font-size:17px;font-weight:700;color:#1A1A1A;flex:1">Mon profil</div>
      </div>
      <div class="empty-state" style="padding-top:60px">
        <div style="margin-bottom:16px">${LOGO_SMALL}</div>
        <div class="empty-title">Connectez-vous</div>
        <div class="empty-sub">Gérez vos envois, vos adresses et votre historique en un seul endroit.</div>
        <button class="btn btn-primary" style="margin-top:20px;padding:14px 32px" onclick="Router.navigate('login')">
          Se connecter
        </button>
        <button class="btn btn-ghost" onclick="Router.navigate('login')" style="margin-top:4px">
          Créer un compte
        </button>
      </div>

      <div class="section-label">Informations</div>
      <div class="card" style="margin:0 16px 12px">
        <div class="list-item" onclick="Router.navigate('about')">
          <div class="list-item-icon" style="background:#FFF3E8">${icon('info', 18, '#FF6C00')}</div>
          <div class="list-item-content"><div class="list-item-title">À propos de ColisDirect</div></div>
          ${icon('chevronRight', 16, '#D1D5DB')}
        </div>
        <div class="list-item" onclick="Router.navigate('pricing')">
          <div class="list-item-icon" style="background:#FEF8E7">${icon('receipt', 18, '#F5B400')}</div>
          <div class="list-item-content"><div class="list-item-title">Tarifs</div></div>
          ${icon('chevronRight', 16, '#D1D5DB')}
        </div>
        <div class="list-item" onclick="openSupport()">
          <div class="list-item-icon" style="background:#EEF4FF">${icon('helpCircle', 18, '#2F6BE0')}</div>
          <div class="list-item-content"><div class="list-item-title">Aide & Support</div></div>
          ${icon('chevronRight', 16, '#D1D5DB')}
        </div>
      </div>
    `;
    return;
  }

  const initials = ((State.user.first_name || '')[0] || '') + ((State.user.last_name || '')[0] || '');
  const allCount = DEMO_SHIPMENTS.length;
  const deliveredCount = DEMO_SHIPMENTS.filter(s => ['PICKED_UP_BY_CUSTOMER','DELIVERED','DELIVERED_TO_CUSTOMER'].includes(s.current_status)).length;

  el.innerHTML = `
    <div class="app-header">
      <div style="font-size:17px;font-weight:700;color:#1A1A1A;flex:1">Mon profil</div>
      <button class="header-action" onclick="Router.navigate('settings')">
        ${icon('settings', 18)}
      </button>
    </div>

    <!-- Hero -->
    <div class="profile-hero">
      <div class="avatar-circle">${initials.toUpperCase()}</div>
      <div style="flex:1;min-width:0">
        <div class="profile-name">${State.user.first_name} ${State.user.last_name}</div>
        <div class="profile-email">${icon('mail', 12, 'rgba(255,255,255,0.6)')} ${State.user.email || 'Email non renseigné'}</div>
        <div class="profile-phone">${icon('phone', 12, 'rgba(255,255,255,0.6)')} ${State.user.phone || 'Téléphone non renseigné'}</div>
      </div>
      <button onclick="showEditProfile()" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:11px;padding:8px;cursor:pointer;flex-shrink:0">
        ${icon('edit', 16, 'rgba(255,255,255,0.8)')}
      </button>
    </div>

    <!-- Stats -->
    <div class="stats-row" style="margin:16px">
      <div class="stat-card" onclick="Router.navigate('shipments')" style="cursor:pointer">
        <div class="stat-value">${allCount}</div>
        <div class="stat-label">Total envois</div>
      </div>
      <div class="stat-card" style="background:#E6F6EC;border-color:#86EFAC;cursor:pointer" onclick="setShipmentsTab('delivered');Router.navigate('shipments')">
        <div class="stat-value" style="color:#16A34A">${deliveredCount}</div>
        <div class="stat-label" style="color:#16A34A">Livrés avec succès</div>
      </div>
    </div>

    <div class="section-label">Mon compte</div>
    <div class="card" style="margin:0 16px 12px">
      <div class="list-item" onclick="showEditProfile()">
        <div class="list-item-icon" style="background:#FFF3E8">${icon('user', 18, '#FF6C00')}</div>
        <div class="list-item-content"><div class="list-item-title">Informations personnelles</div><div class="list-item-sub">Nom, email, téléphone</div></div>
        ${icon('chevronRight', 16, '#D1D5DB')}
      </div>
      <div class="list-item" onclick="Router.navigate('shipments')">
        <div class="list-item-icon" style="background:#EEF4FF">${icon('package', 18, '#2F6BE0')}</div>
        <div class="list-item-content"><div class="list-item-title">Mes colis</div><div class="list-item-sub">${allCount} envois au total</div></div>
        ${icon('chevronRight', 16, '#D1D5DB')}
      </div>
      <div class="list-item" onclick="showAddressBook()">
        <div class="list-item-icon" style="background:#E6F6EC">${icon('mapPin', 18, '#16A34A')}</div>
        <div class="list-item-content"><div class="list-item-title">Carnet d'adresses</div><div class="list-item-sub">Adresses sauvegardées</div></div>
        ${icon('chevronRight', 16, '#D1D5DB')}
      </div>
      <div class="list-item" onclick="showPaymentHistory()">
        <div class="list-item-icon" style="background:#FEF8E7">${icon('receipt', 18, '#F5B400')}</div>
        <div class="list-item-content"><div class="list-item-title">Historique paiements</div><div class="list-item-sub">Toutes vos transactions</div></div>
        ${icon('chevronRight', 16, '#D1D5DB')}
      </div>
      <div class="list-item" onclick="openSupport()">
        <div class="list-item-icon" style="background:#F0F4FF">${icon('message', 18, '#6366F1')}</div>
        <div class="list-item-content"><div class="list-item-title">Support client</div><div class="list-item-sub">Aide 24h/24</div></div>
        ${icon('chevronRight', 16, '#D1D5DB')}
      </div>
    </div>

    <div class="section-label">ColisDirect</div>
    <div class="card" style="margin:0 16px 12px">
      <div class="list-item" onclick="Router.navigate('about')">
        <div class="list-item-icon" style="background:#F6F7F9">${icon('info', 18, '#6B7280')}</div>
        <div class="list-item-content"><div class="list-item-title">À propos</div></div>
        ${icon('chevronRight', 16, '#D1D5DB')}
      </div>
      <div class="list-item" onclick="Router.navigate('pricing')">
        <div class="list-item-icon" style="background:#FFF3E8">${icon('receipt', 18, '#FF6C00')}</div>
        <div class="list-item-content"><div class="list-item-title">Tarifs</div></div>
        ${icon('chevronRight', 16, '#D1D5DB')}
      </div>
      <div class="list-item" onclick="Router.navigate('partner')">
        <div class="list-item-icon" style="background:#FFF3E8">${icon('users', 18, '#FF6C00')}</div>
        <div class="list-item-content"><div class="list-item-title">Devenir partenaire</div></div>
        ${icon('chevronRight', 16, '#D1D5DB')}
      </div>
      <div class="list-item" onclick="showTerms()">
        <div class="list-item-icon" style="background:#F6F7F9">${icon('helpCircle', 18, '#6B7280')}</div>
        <div class="list-item-content"><div class="list-item-title">CGU / Politique confidentialité</div></div>
        ${icon('chevronRight', 16, '#D1D5DB')}
      </div>
    </div>

    <div style="padding:8px 16px 32px">
      <button class="btn btn-full" style="background:#FEF2F2;color:#DC2626;border:none;border-radius:14px;padding:14px;font-size:14px;font-weight:700;gap:8px" onclick="handleLogout()">
        ${icon('logOut', 18, '#DC2626')} Se déconnecter
      </button>
    </div>
  `;
}

function showEditProfile() {
  if (!State.user) return;
  Sheet.open(`
    <div style="padding:4px 0 16px">
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="form-group">
          <label class="form-label">Prénom</label>
          <input class="form-input" id="edit-fname" value="${State.user.first_name || ''}" placeholder="Prénom" />
        </div>
        <div class="form-group">
          <label class="form-label">Nom</label>
          <input class="form-input" id="edit-lname" value="${State.user.last_name || ''}" placeholder="Nom" />
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" id="edit-email" type="email" value="${State.user.email || ''}" placeholder="Email" />
        </div>
        <div class="form-group">
          <label class="form-label">Téléphone</label>
          <input class="form-input" id="edit-phone" type="tel" value="${State.user.phone || ''}" placeholder="+225 07..." />
        </div>
        <button class="btn btn-primary btn-full" onclick="saveProfile()">Enregistrer</button>
        <button class="btn btn-ghost btn-full" onclick="Sheet.close()">Annuler</button>
      </div>
    </div>
  `, 'Modifier le profil');
}

function saveProfile() {
  const fname = document.getElementById('edit-fname')?.value?.trim();
  const lname = document.getElementById('edit-lname')?.value?.trim();
  const email = document.getElementById('edit-email')?.value?.trim();
  const phone = document.getElementById('edit-phone')?.value?.trim();
  if (!fname || !lname) { Toast.show('Prénom et nom obligatoires', 'warning'); return; }
  State.user = { ...State.user, first_name: fname, last_name: lname, email, phone };
  State.save();
  Sheet.close();
  Toast.show('Profil mis à jour !', 'success');
  renderProfile();
}

function showAddressBook() {
  Sheet.open(`
    <div style="padding:4px 0 16px">
      <div style="text-align:center;padding:24px 0">
        ${icon('mapPin', 40, '#D1D5DB')}
        <div style="font-size:15px;font-weight:600;color:#6B7280;margin-top:12px">Aucune adresse sauvegardée</div>
        <div style="font-size:13px;color:#9CA3AF;margin-top:4px">Vos adresses fréquentes apparaîtront ici</div>
      </div>
      <button class="btn btn-primary btn-full" onclick="Sheet.close();Router.navigate('create-shipment')">
        ${icon('plus', 16)} Créer un envoi
      </button>
    </div>
  `, 'Carnet d\'adresses');
}

function showPaymentHistory() {
  Sheet.open(`
    <div style="padding:4px 0 16px">
      ${DEMO_SHIPMENTS.filter(s => s.payment_status === 'paid').map(s => `
        <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #F6F7F9">
          <div style="width:38px;height:38px;background:#E6F6EC;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            ${icon('creditCard', 18, '#16A34A')}
          </div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700;color:#1A1A1A">Colis ${s.shipment_code}</div>
            <div style="font-size:11px;color:#6B7280">${s.payment_method === 'paystack' ? 'Mobile Money / Carte' : 'Paiement au relais'}</div>
            <div style="font-size:11px;color:#9CA3AF">${formatDate(s.created_at)}</div>
          </div>
          <div style="font-size:14px;font-weight:800;color:#16A34A">+${s.price?.toLocaleString()} F</div>
        </div>
      `).join('')}
    </div>
  `, 'Historique paiements');
}

function showTerms() {
  Sheet.open(`
    <div style="padding:4px 0 16px">
      <p style="font-size:13px;color:#6B7280;line-height:1.6;margin-bottom:12px">
        En utilisant ColisDirect, vous acceptez nos conditions générales d'utilisation et notre politique de confidentialité.
      </p>
      <p style="font-size:13px;color:#6B7280;line-height:1.6;margin-bottom:16px">
        Retrouvez l'intégralité de nos CGU sur <strong>colisdirect.com/cgu</strong>
      </p>
      <a href="https://colisdirect.com/cgu" target="_blank" class="btn btn-primary btn-full" style="text-decoration:none">
        ${icon('globe', 16)} Voir les CGU en ligne
      </a>
      <button class="btn btn-ghost btn-full" style="margin-top:8px" onclick="Sheet.close()">Fermer</button>
    </div>
  `, 'CGU / Confidentialité');
}

function handleLogout() {
  Sheet.open(`
    <div style="text-align:center;padding:8px 0 8px">
      <div style="width:56px;height:56px;background:#FEF2F2;border-radius:16px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center">
        ${icon('logOut', 28, '#DC2626')}
      </div>
      <div style="font-size:17px;font-weight:700;color:#1A1A1A;margin-bottom:8px">Se déconnecter ?</div>
      <div style="font-size:13px;color:#6B7280;margin-bottom:20px;line-height:1.5">Vous devrez vous reconnecter pour accéder à vos données.</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-outline btn-full" onclick="Sheet.close()">Annuler</button>
        <button class="btn btn-full" style="background:#DC2626;color:#fff;border-radius:14px" onclick="doLogout()">Déconnecter</button>
      </div>
    </div>
  `, 'Confirmation');
}

function doLogout() {
  State.user = null;
  localStorage.removeItem('cd_token');
  State.save();
  Sheet.close();
  Router.navigate('home');
  Toast.show('Vous êtes déconnecté(e)', 'success');
}

/* ── NOTIFICATIONS ─────────────────────────────────────────────── */
function renderNotifications() {
  const el = document.getElementById('screen-notifications');
  if (!el) return;

  if (!State.user) {
    el.innerHTML = `
      <div class="app-header">
        <button class="header-back" onclick="Router.back()">${icon('chevronLeft', 18)}</button>
        <div class="header-title">Notifications</div>
      </div>
      <div class="empty-state" style="padding-top:60px">
        <div style="margin-bottom:16px">${icon('bell', 36, '#FF6C00')}</div>
        <div class="empty-title">Connectez-vous</div>
        <div class="empty-sub">Connectez-vous pour voir vos alertes de livraison et vos offres exclusives.</div>
        <button class="btn btn-primary" style="margin-top:20px;padding:14px 32px" onclick="Router.navigate('login')">
          Se connecter
        </button>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="app-header">
      <button class="header-back" onclick="Router.back()">${icon('chevronLeft', 18)}</button>
      <div class="header-title">Notifications</div>
      ${State.unreadCount > 0 ? `
        <button onclick="markAllRead()" style="font-size:12px;font-weight:700;color:#FF6C00;background:none;border:none;cursor:pointer;padding:4px 8px">
          Tout lu
        </button>
      ` : '<div style="width:56px"></div>'}
    </div>

    ${State.unreadCount > 0 ? `
      <div style="padding:10px 16px 4px">
        <span class="badge badge-orange">${State.unreadCount} nouvelle${State.unreadCount > 1 ? 's' : ''}</span>
      </div>
    ` : ''}

    ${State.notifications.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">${icon('bell', 32, '#FF6C00')}</div>
        <div class="empty-title">Aucune notification</div>
        <div class="empty-sub">Les mises à jour de vos colis apparaîtront ici en temps réel.</div>
      </div>
    ` : State.notifications.map(n => `
      <div class="notif-item ${n.unread ? 'unread' : ''}" onclick="readNotif(${n.id})">
        <div class="notif-icon" style="background:${n.bg}">
          ${icon(n.icon, 20, n.color)}
        </div>
        <div class="notif-content">
          <div class="notif-title">${n.title}</div>
          <div class="notif-body">${n.body}</div>
          <div class="notif-time">${n.time}</div>
        </div>
        ${n.unread ? `<div style="width:8px;height:8px;border-radius:50%;background:#FF6C00;flex-shrink:0;margin-top:6px"></div>` : ''}
      </div>
    `).join('')}
  `;
}

function readNotif(id) {
  const n = State.notifications.find(x => x.id === id);
  if (n) { n.unread = false; State.save(); }
  renderNotifications();
}

function markAllRead() {
  State.notifications.forEach(n => n.unread = false);
  State.save();
  renderNotifications();
}

/* ── LOGIN ─────────────────────────────────────────────────────── */
let loginMode = 'email';
let isSignup = false;
let showPwd = false;

function renderLogin() {
  const el = document.getElementById('screen-login');
  if (!el) return;

  el.innerHTML = `
    <div style="background:linear-gradient(150deg,#0f0f0f 0%,#1a1a2e 100%);padding:52px 24px 36px;text-align:center">
      <div style="width:72px;height:72px;background:#FF6C00;border-radius:22px;margin:0 auto 18px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 28px rgba(255,108,0,0.45)">
        ${LOGO_SVG}
      </div>
      <div id="login-error" style="display:none;background:#FEF2F2;border-left:3px solid #DC2626;border-radius:10px;padding:12px;margin-bottom:14px;font-size:13px;color:#DC2626;align-items:center;gap:8px"></div>
      <div style="font-size:24px;font-weight:900;color:#fff;letter-spacing:-0.5px">${isSignup ? 'Créer un compte' : 'Bienvenue'}</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:6px">${isSignup ? 'Rejoignez le réseau ColisDirect' : 'Connectez-vous à votre espace'}</div>
    </div>

    <!-- Form -->
    <div style="padding:24px 20px 32px;background:#fff;flex:1">
      ${isSignup ? renderSignupFields() : renderSigninFields()}

      <!-- Toggle auth mode -->
      <div style="text-align:center;margin-top:20px">
        <span style="font-size:14px;color:#6B7280">${isSignup ? 'Déjà un compte ?' : 'Pas encore de compte ?'}</span>
        <button onclick="toggleAuthMode()" style="font-size:14px;font-weight:700;color:#FF6C00;background:none;border:none;cursor:pointer;margin-left:4px">
          ${isSignup ? 'Se connecter' : 'Créer un compte'}
        </button>
      </div>

      <!-- Back to home -->
      <div style="text-align:center;margin-top:10px">
        <button onclick="Router.navigate('home')" style="font-size:13px;color:#9CA3AF;background:none;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:4px">
          ${icon('chevronLeft', 14, '#9CA3AF')} Retour à l'accueil
        </button>
      </div>
    </div>
  `;
}

function renderSigninFields() {
  return `
    <!-- Tab toggle -->
    <div style="display:flex;background:#F6F7F9;border-radius:14px;padding:4px;margin-bottom:20px">
      <button id="tab-email" onclick="setLoginMode('email')" style="flex:1;padding:10px;border-radius:10px;border:none;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.15s;${loginMode==='email'?'background:#fff;color:#1A1A1A;box-shadow:0 1px 4px rgba(0,0,0,0.1)':'background:transparent;color:#6B7280'}">
        ${icon('mail', 14, loginMode==='email' ? '#FF6C00' : '#6B7280')} Email
      </button>
      <button id="tab-phone" onclick="setLoginMode('phone')" style="flex:1;padding:10px;border-radius:10px;border:none;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.15s;${loginMode==='phone'?'background:#fff;color:#1A1A1A;box-shadow:0 1px 4px rgba(0,0,0,0.1)':'background:transparent;color:#6B7280'}">
        ${icon('phone', 14, loginMode==='phone' ? '#FF6C00' : '#6B7280')} Téléphone
      </button>
    </div>

    <div id="login-error" style="display:none;background:#FEF2F2;border-left:3px solid #DC2626;border-radius:10px;padding:12px;margin-bottom:14px;font-size:13px;color:#DC2626;align-items:center;gap:8px"></div>

    <div style="display:flex;flex-direction:column;gap:14px">
      ${loginMode === 'email' ? `
        <div class="form-group">
          <label class="form-label">Adresse email</label>
          <input class="form-input" id="login-email" type="email" placeholder="votre@email.com" autocomplete="email" />
        </div>
      ` : `
        <div class="form-group">
          <label class="form-label">Numéro de téléphone</label>
          <div style="display:flex;gap:8px">
            <select class="form-select" style="width:96px;flex-shrink:0;padding:13px 8px 13px 10px;font-size:13px">
              <option value="+225">🇨🇮 +225</option>
              <option value="+33">🇫🇷 +33</option>
              <option value="+221">🇸🇳 +221</option>
              <option value="+229">🇧🇯 +229</option>
            </select>
            <input class="form-input" id="login-phone" type="tel" placeholder="07 00 00 00 00" autocomplete="tel" style="flex:1" />
          </div>
        </div>
      `}

      <div class="form-group">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <label class="form-label" style="margin:0">Mot de passe</label>
          <button onclick="showForgotPwd()" style="font-size:12px;color:#FF6C00;background:none;border:none;cursor:pointer;font-weight:600">Oublié ?</button>
        </div>
        <div style="position:relative">
          <input class="form-input" id="login-password" type="${showPwd ? 'text' : 'password'}" placeholder="••••••••" autocomplete="current-password" style="padding-right:48px" />
          <button onclick="togglePwd()" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:4px;line-height:1">
            ${icon(showPwd ? 'eyeOff' : 'eye', 18, '#6B7280')}
          </button>
        </div>
      </div>

      <button id="login-btn" class="btn btn-primary btn-full" onclick="submitLogin()">
        Se connecter
      </button>
    </div>

    <!-- Demo -->
    <div style="margin-top:20px;padding:14px;background:#F6F7F9;border-radius:14px">
      <div style="font-size:11px;font-weight:700;color:#6B7280;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">Accès démo</div>
      <button class="btn btn-outline btn-full btn-sm" onclick="demoLogin()">
        ${icon('zap', 14, '#FF6C00')} Connexion démo instantanée
      </button>
    </div>
  `;
}

function renderSignupFields() {
  return `
    <div id="login-error" style="display:none;background:#FEF2F2;border-left:3px solid #DC2626;border-radius:10px;padding:12px;margin-bottom:14px;font-size:13px;color:#DC2626"></div>

    <div style="display:flex;flex-direction:column;gap:14px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group">
          <label class="form-label">Prénom</label>
          <input class="form-input" id="signup-firstname" type="text" placeholder="Kader" autocomplete="given-name" />
        </div>
        <div class="form-group">
          <label class="form-label">Nom</label>
          <input class="form-input" id="signup-lastname" type="text" placeholder="Diallo" autocomplete="family-name" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Adresse email</label>
        <input class="form-input" id="signup-email" type="email" placeholder="votre@email.com" autocomplete="email" />
      </div>

      <div class="form-group">
        <label class="form-label">Téléphone</label>
        <div style="display:flex;gap:8px">
          <select class="form-select" style="width:96px;flex-shrink:0;padding:13px 8px 13px 10px;font-size:13px">
            <option value="+225">🇨🇮 +225</option>
            <option value="+33">🇫🇷 +33</option>
          </select>
          <input class="form-input" id="signup-phone" type="tel" placeholder="07 00 00 00 00" style="flex:1" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Mot de passe</label>
        <div style="position:relative">
          <input class="form-input" id="signup-password" type="${showPwd ? 'text' : 'password'}" placeholder="Min. 6 caractères" style="padding-right:48px" />
          <button onclick="togglePwd()" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:4px;line-height:1">
            ${icon(showPwd ? 'eyeOff' : 'eye', 18, '#6B7280')}
          </button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Confirmer le mot de passe</label>
        <input class="form-input" id="signup-confirm" type="${showPwd ? 'text' : 'password'}" placeholder="Même mot de passe" />
      </div>

      <button id="login-btn" class="btn btn-primary btn-full" onclick="submitSignup()">
        Créer mon compte
      </button>
    </div>
  `;
}

function setLoginMode(mode) { loginMode = mode; renderLogin(); }
function toggleAuthMode() { isSignup = !isSignup; showPwd = false; renderLogin(); }
function togglePwd() {
  showPwd = !showPwd;
  ['login-password','signup-password','signup-confirm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.type = showPwd ? 'text' : 'password';
  });
  // Update eye icon button
  renderLogin();
}

function showLoginError(msg) {
  const el = document.getElementById('login-error');
  if (el) { el.innerHTML = `${icon('xCircle', 14, '#DC2626')} ${msg}`; el.style.display = 'flex'; }
}

function showForgotPwd() {
  Sheet.open(`
    <div style="padding:8px 0 16px;text-align:center">
      <div style="font-size:16px;font-weight:700;color:#1A1A1A;margin-bottom:8px">Mot de passe oublié</div>
      <div style="font-size:13px;color:#6B7280;margin-bottom:16px;line-height:1.5">Entrez votre email et nous vous enverrons un lien de réinitialisation.</div>
      <div class="form-group" style="margin-bottom:14px;text-align:left">
        <label class="form-label">Email</label>
        <input class="form-input" id="forgot-email" type="email" placeholder="votre@email.com" />
      </div>
      <button class="btn btn-primary btn-full" onclick="sendResetLink()">Envoyer le lien</button>
      <button class="btn btn-ghost btn-full" style="margin-top:8px" onclick="Sheet.close()">Annuler</button>
    </div>
  `, 'Réinitialisation');
}

function sendResetLink() {
  const email = document.getElementById('forgot-email')?.value?.trim();
  if (!email) { Toast.show('Entrez votre adresse email', 'warning'); return; }
  Sheet.close();
  Toast.show('Lien envoyé à ' + email, 'success');
}

async function submitLogin() {
  const identifier = loginMode === 'email'
    ? document.getElementById('login-email')?.value?.trim()
    : document.getElementById('login-phone')?.value?.trim();
  const password = document.getElementById('login-password')?.value;
  if (!identifier || !password) { showLoginError('Remplissez tous les champs'); return; }

  const btn = document.getElementById('login-btn');
  if (btn) { btn.innerHTML = `<div class="spinner" style="width:20px;height:20px;border-width:2px;border-top-color:#fff;border-color:rgba(255,255,255,0.3)"></div>`; btn.disabled = true; }

  const { data, error } = await API.signIn(identifier, password, loginMode === 'phone');
  if (btn) { btn.innerHTML = 'Se connecter'; btn.disabled = false; }

  if (error) { showLoginError(error); return; }
  if (data) {
    localStorage.setItem('cd_token', data.token || data.access_token || '');
    State.user = data.user || data;
    State.save();
    Router.navigate('home');
    Toast.show(`Bienvenue, ${State.user.first_name} !`, 'success');
  }
}

async function submitSignup() {
  const firstName = document.getElementById('signup-firstname')?.value?.trim();
  const lastName = document.getElementById('signup-lastname')?.value?.trim();
  const email = document.getElementById('signup-email')?.value?.trim();
  const phone = document.getElementById('signup-phone')?.value?.trim();
  const password = document.getElementById('signup-password')?.value;
  const confirm = document.getElementById('signup-confirm')?.value;

  if (!firstName || !lastName || !email || !phone || !password) { showLoginError('Remplissez tous les champs obligatoires'); return; }
  if (password.length < 6) { showLoginError('Mot de passe trop court (min. 6 caractères)'); return; }
  if (password !== confirm) { showLoginError('Les mots de passe ne correspondent pas'); return; }

  const btn = document.getElementById('login-btn');
  if (btn) { btn.innerHTML = `<div class="spinner" style="width:20px;height:20px;border-width:2px;border-top-color:#fff;border-color:rgba(255,255,255,0.3)"></div>`; btn.disabled = true; }

  const { data, error } = await API.signUp({ first_name: firstName, last_name: lastName, email, phone: '+225' + phone.replace(/\s/g,''), password, role: 'client' });
  if (btn) { btn.innerHTML = 'Créer mon compte'; btn.disabled = false; }

  if (error) { showLoginError(error); return; }

  Toast.show('Compte créé avec succès ! Connectez-vous.', 'success', 4000);
  isSignup = false;
  renderLogin();
}

function demoLogin() {
  State.user = { id: 'demo-001', first_name: 'Kader', last_name: 'Diallo', email: 'kader.diallo@colisdirect.ci', phone: '+225 07 12 34 56 78', role: 'client' };
  localStorage.setItem('cd_token', 'demo-token-2026');
  State.save();
  Router.navigate('home');
  Toast.show('Bienvenue, Kader ! (Mode démo)', 'success');
}

/* ── CREATE SHIPMENT ───────────────────────────────────────────── */
const CI_COMMUNES = [
  'Abidjan Abobo', 'Abidjan Adjamé', 'Abidjan Anyama', 'Abidjan Attécoubé', 'Abidjan Bingerville', 
  'Abidjan Cocody', 'Abidjan Koumassi', 'Abidjan Marcory', 'Abidjan Plateau', 'Abidjan Port-Bouët', 
  'Abidjan Songon', 'Abidjan Treichville', 'Abidjan Yopougon', 'Yamoussoukro', 'Bouaké', 'San-Pédro', 
  'Daloa', 'Korhogo', 'Man', 'Divo', 'Gagnoa', 'Soubré', 'Boundiali', 'Ferkessédougou', 
  'Grand-Bassam', 'Aboisso', 'Adzopé', 'Agboville', 'Toumodi', 'Abengourou'
].sort();

const DEMO_RECIPIENT_ADDRESSES = [
  { id: 'addr-001', first_name: 'Aminata', last_name: 'Koné', email: 'aminata.kone@gmail.com', phone: '05 05 06 07 08', commune: 'Bouaké', quartier: 'Commerce', address: 'Maison Bleue, près de la CIE', repere: 'Face pharmacie principale' },
  { id: 'addr-002', first_name: 'Ibrahim', last_name: 'Traoré', email: 'ibrahim.traore@outlook.com', phone: '07 08 09 10 11', commune: 'Abidjan Cocody', quartier: 'Angré', address: 'Résidence les Palmiers, Appt 4B', repere: 'Derrière le supermarché' },
  { id: 'addr-003', first_name: 'Fatou', last_name: 'Coulibaly', email: 'fatou.couli@gmail.com', phone: '01 02 03 04 05', commune: 'San-Pédro', quartier: 'Bardot', address: 'Secteur 3, Rue des Pêcheurs', repere: 'Près de l\'école primaire' }
];

let createStep = 1;
const createData = {};

function renderCreateShipment() {
  const el = document.getElementById('screen-create-shipment');
  if (!el) return;

  const stepTitles = ['', 'Informations', 'Mode', 'Points relais', 'Récapitulatif'];

  el.innerHTML = `
    <div class="app-header">
      <button class="header-back" onclick="${createStep > 1 ? 'prevStep()' : 'Router.back()'}">
        ${icon('chevronLeft', 18)}
      </button>
      <div class="header-title">${stepTitles[createStep]}</div>
      <button class="header-action" onclick="Router.navigate('home')" title="Fermer">
        ${icon('closeX', 18)}
      </button>
    </div>

    <!-- Stepper -->
    <div class="stepper-labels" style="display:flex;justify-content:space-between;padding:12px 16px 8px;border-bottom:1px solid #E6E6E6;background:#fff">
      ${['Informations', 'Mode', 'Points relais', 'Récap'].map((lbl, idx) => {
        const s = idx + 1;
        const active = s === createStep;
        const done = s < createStep;
        return `
          <div style="display:flex;align-items:center;flex:1">
            <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">
              <div style="width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;
                background:${active || done ? '#FF6C00' : '#fff'};
                color:${active || done ? '#fff' : '#6B7280'};
                border:2px solid ${active || done ? '#FF6C00' : '#E6E6E6'};
                z-index:2">
                ${done ? '✓' : s}
              </div>
              <div style="font-size:10px;font-weight:${active ? '700' : '500'};color:${active ? '#FF6C00' : done ? '#1A1A1A' : '#9CA3AF'};margin-top:4px;white-space:nowrap">${lbl}</div>
            </div>
            ${idx < 3 ? `<div style="flex:1;height:2px;margin:0 8px 16px;background:${done ? '#FF6C00' : '#E6E6E6'}"></div>` : ''}
          </div>
        `;
      }).join('')}
    </div>

    <!-- Content -->
    <div id="cs-content" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:14px">
      ${createStep === 1 ? stepInformations() : createStep === 2 ? stepDeliveryMode() : createStep === 3 ? stepRelaySelection() : stepSummary()}
    </div>

    <!-- Footer CTA -->
    <div style="padding:12px 16px;background:#fff;border-top:1px solid #E6E6E6;flex-shrink:0">
      ${createStep < 4
        ? `<button class="btn btn-primary btn-full" onclick="nextStep()">Continuer ${icon('arrowRight', 18)}</button>`
        : `<button class="btn btn-primary btn-full" onclick="submitShipment()">${icon('checkCircle', 18)} Confirmer l'envoi</button>`
      }
    </div>
  `;
}

function saveStep1Inputs() {
  const getVal = (id) => document.getElementById(id)?.value?.trim() || '';
  const getSelectVal = (id) => document.getElementById(id)?.value || '';

  if (document.getElementById('s-fname')) {
    createData.sender_first_name = getVal('s-fname');
    createData.sender_last_name = getVal('s-lname');
    createData.sender_email = getVal('s-email');
    createData.sender_phone = getVal('s-phone');
    createData.sender_commune = getSelectVal('s-commune');
    createData.sender_quartier = getVal('s-quartier');
    createData.sender_address = getVal('s-address');
    createData.sender_repere = getVal('s-repere');
  }

  if (document.getElementById('r-fname')) {
    createData.recipient_first_name = getVal('r-fname');
    createData.recipient_last_name = getVal('r-lname');
    createData.recipient_email = getVal('r-email');
    createData.recipient_phone = getVal('r-phone');
    createData.recipient_commune = getSelectVal('r-commune');
    createData.recipient_quartier = getVal('r-quartier');
    createData.recipient_address = getVal('r-address');
    createData.recipient_repere = getVal('r-repere');
  }

  const weightVal = parseFloat(document.getElementById('c-weight')?.value);
  if (!isNaN(weightVal)) createData.weight = weightVal;
}

function saveStep2Inputs() {
  const descEl = document.getElementById('c-desc');
  if (descEl) {
    createData.description = descEl.value.trim();
  }
}

function calculatePrice(pickupMethod, homeDelivery) {
  const isIntra = createData.sender_commune === createData.recipient_commune;
  let basePrice = 0;
  
  if (createData.grid_type === 'courier') {
    basePrice = isIntra ? 600 : 1000;
  } else {
    const prices = {
      petit: isIntra ? 1000 : 1500,
      moyen: isIntra ? 1500 : 2000,
      grand: isIntra ? 2000 : 2500
    };
    basePrice = prices[createData.package_type || 'petit'];
  }
  
  const fragileFee = createData.is_fragile ? 500 : 0;
  const insuredFee = createData.is_insured ? 500 : 0;
  const pickupFee = pickupMethod === 'home_pickup' ? 500 : 0;
  const deliveryFee = homeDelivery ? 500 : 0;
  
  return basePrice + fragileFee + insuredFee + pickupFee + deliveryFee;
}

function stepInformations() {
  const isLogged = !!State.user;
  
  // Pre-fill sender data if logged in
  if (isLogged) {
    if (!createData.sender_first_name) createData.sender_first_name = State.user.first_name || '';
    if (!createData.sender_last_name) createData.sender_last_name = State.user.last_name || '';
    if (!createData.sender_email) createData.sender_email = State.user.email || '';
    if (!createData.sender_phone && State.user.phone) {
      createData.sender_phone = State.user.phone.replace('+225', '').trim();
    }
    if (!createData.sender_commune) createData.sender_commune = 'Abidjan Cocody';
    if (!createData.sender_quartier) createData.sender_quartier = 'Angré';
    if (!createData.sender_address) createData.sender_address = 'Rue des Jardins, Résidence Fleurs';
    if (!createData.sender_repere) createData.sender_repere = 'Près du supermarché';
  }

  // Package state
  const gridType = createData.grid_type || 'colis';
  const size = createData.package_type || 'petit';
  const weight = createData.weight || (gridType === 'courier' ? 0.5 : size === 'petit' ? 1 : size === 'moyen' ? 5 : 12);
  const isFragile = createData.is_fragile || false;
  const isInsured = createData.is_insured || false;

  // Sender block
  let senderBlock = '';
  if (isLogged) {
    senderBlock = `
      <div style="background:#F6F7F9;border-radius:16px;padding:16px">
        <div style="font-size:16px;font-weight:800;color:#1A1A1A;margin-bottom:14px;display:flex;align-items:center;gap:8px">
          ${icon('user', 18, '#FF6C00')} Expéditeur
        </div>
        <div style="background:#fff;border:1px solid #E6E6E6;border-radius:14px;padding:14px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px">
            <span style="font-size:11px;color:#6B7280">🔒 Informations issues de votre profil</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>
              <div style="font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">Nom</div>
              <div style="font-size:13px;font-weight:600;color:#1A1A1A">${createData.sender_last_name || '<span style="color:#9CA3AF;font-style:italic">Non renseigné</span>'}</div>
            </div>
            <div>
              <div style="font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">Prénom</div>
              <div style="font-size:13px;font-weight:600;color:#1A1A1A">${createData.sender_first_name || '<span style="color:#9CA3AF;font-style:italic">Non renseigné</span>'}</div>
            </div>
            <div>
              <div style="font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">Téléphone</div>
              <div style="font-size:13px;font-weight:600;color:#1A1A1A">${createData.sender_phone || '<span style="color:#9CA3AF;font-style:italic">Non renseigné</span>'}</div>
            </div>
            <div>
              <div style="font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">Email</div>
              <div style="font-size:13px;font-weight:600;color:#1A1A1A;overflow:hidden;text-overflow:ellipsis">${createData.sender_email || '<span style="color:#9CA3AF;font-style:italic">Non renseigné</span>'}</div>
            </div>
            <div>
              <div style="font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">Commune</div>
              <div style="font-size:13px;font-weight:600;color:#1A1A1A">${createData.sender_commune || '<span style="color:#FF6C00;font-weight:700;font-size:11px">⚠ Requis</span>'}</div>
            </div>
            <div>
              <div style="font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">Quartier</div>
              <div style="font-size:13px;font-weight:600;color:#1A1A1A">${createData.sender_quartier || '<span style="color:#FF6C00;font-weight:700;font-size:11px">⚠ Requis</span>'}</div>
            </div>
            <div style="grid-column:1/-1">
              <div style="font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;display:flex;align-items:center;gap:4px">${icon('home', 12, '#6B7280')} Adresse</div>
              <div style="font-size:13px;font-weight:600;color:#1A1A1A">${createData.sender_address || '<span style="color:#FF6C00;font-weight:700;font-size:11px">⚠ Requis</span>'}</div>
            </div>
          </div>
        </div>
        <input type="hidden" id="s-fname" value="${createData.sender_first_name || ''}" />
        <input type="hidden" id="s-lname" value="${createData.sender_last_name || ''}" />
        <input type="hidden" id="s-email" value="${createData.sender_email || ''}" />
        <input type="hidden" id="s-phone" value="${createData.sender_phone || ''}" />
        <input type="hidden" id="s-commune" value="${createData.sender_commune || ''}" />
        <input type="hidden" id="s-quartier" value="${createData.sender_quartier || ''}" />
        <input type="hidden" id="s-address" value="${createData.sender_address || ''}" />
        <input type="hidden" id="s-repere" value="${createData.sender_repere || ''}" />
      </div>`;
  } else {
    senderBlock = `
      <div style="background:#F6F7F9;border-radius:16px;padding:16px">
        <div style="font-size:16px;font-weight:800;color:#1A1A1A;margin-bottom:14px;display:flex;align-items:center;gap:8px">
          ${icon('user', 18, '#FF6C00')} Expéditeur
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="form-group"><label class="form-label">Nom *</label>
            <input class="form-input" id="s-lname" placeholder="Diallo" value="${createData.sender_last_name || ''}" /></div>
          <div class="form-group"><label class="form-label">Prénom *</label>
            <input class="form-input" id="s-fname" placeholder="Kader" value="${createData.sender_first_name || ''}" /></div>
          <div class="form-group" style="grid-column:1/-1"><label class="form-label">Email</label>
            <input class="form-input" id="s-email" placeholder="votre@email.com" value="${createData.sender_email || ''}" /></div>
          <div class="form-group" style="grid-column:1/-1"><label class="form-label">Téléphone *</label>
            <div style="display:flex;gap:8px">
              <select class="form-select" style="width:115px;flex-shrink:0;padding:13px 32px 13px 14px;font-size:14px;height:48px"><option>🇨🇮 +225</option></select>
              <input class="form-input" id="s-phone" type="tel" placeholder="07 00 00 00 00" value="${createData.sender_phone || ''}" style="flex:1;height:48px" />
            </div></div>
          <div class="form-group"><label class="form-label">Commune *</label>
            <select class="form-select" id="s-commune">
              <option value="">Choisir</option>
              ${CI_COMMUNES.map(c => `<option value="${c}" ${createData.sender_commune === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label">Quartier *</label>
            <input class="form-input" id="s-quartier" placeholder="Angré, Zone 4..." value="${createData.sender_quartier || ''}" /></div>
          <div class="form-group" style="grid-column:1/-1"><label class="form-label">Adresse précise *</label>
            <input class="form-input" id="s-address" placeholder="Rue, bâtiment, étage…" value="${createData.sender_address || ''}" /></div>
          <div class="form-group" style="grid-column:1/-1"><label class="form-label">Repère (optionnel)</label>
            <input class="form-input" id="s-repere" placeholder="Près de la mosquée, en face de l'école..." value="${createData.sender_repere || ''}" /></div>
        </div>
      </div>`;
  }

  return `
    ${senderBlock}

    <!-- Destinataire -->
    <div style="background:#F6F7F9;border-radius:16px;padding:16px">
      <div style="font-size:16px;font-weight:800;color:#1A1A1A;margin-bottom:14px;display:flex;align-items:center;width:100%;gap:8px">
        ${icon('user', 18, '#FF6C00')} Destinataire
        ${isLogged ? `
          <button type="button" onclick="openAddressBook()" style="margin-left:auto;display:flex;align-items:center;gap:6px;padding:6px 12px;background:#FF6C00;color:#fff;border:none;border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 2px 4px rgba(255,108,0,0.15)">
            ${icon('book', 12, '#fff')} Carnet
          </button>
        ` : ''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group"><label class="form-label">Nom *</label>
          <input class="form-input" id="r-lname" placeholder="Koné" value="${createData.recipient_last_name || ''}" /></div>
        <div class="form-group"><label class="form-label">Prénom *</label>
          <input class="form-input" id="r-fname" placeholder="Aminata" value="${createData.recipient_first_name || ''}" /></div>
        <div class="form-group" style="grid-column:1/-1"><label class="form-label">Email</label>
          <input class="form-input" id="r-email" placeholder="destinataire@email.com" value="${createData.recipient_email || ''}" /></div>
        <div class="form-group" style="grid-column:1/-1"><label class="form-label">Téléphone *</label>
          <div style="display:flex;gap:8px">
            <select class="form-select" style="width:115px;flex-shrink:0;padding:13px 32px 13px 14px;font-size:14px;height:48px"><option>🇨🇮 +225</option></select>
            <input class="form-input" id="r-phone" type="tel" placeholder="05 00 00 00 00" value="${createData.recipient_phone || ''}" style="flex:1;height:48px" />
          </div></div>
        <div class="form-group"><label class="form-label">Commune *</label>
          <select class="form-select" id="r-commune">
            <option value="">Choisir</option>
            ${CI_COMMUNES.map(c => `<option value="${c}" ${createData.recipient_commune === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select></div>
        <div class="form-group"><label class="form-label">Quartier *</label>
          <input class="form-input" id="r-quartier" placeholder="Niangon, Cocody Centre..." value="${createData.recipient_quartier || ''}" /></div>
        <div class="form-group" style="grid-column:1/-1"><label class="form-label">Adresse précise *</label>
          <input class="form-input" id="r-address" placeholder="Rue, bâtiment, étage…" value="${createData.recipient_address || ''}" /></div>
        <div class="form-group" style="grid-column:1/-1"><label class="form-label">Repère (optionnel)</label>
          <input class="form-input" id="r-repere" placeholder="À côté du marché, près de la pharmacie..." value="${createData.recipient_repere || ''}" /></div>
      </div>
    </div>

    <!-- Informations du colis -->
    <div style="background:#F6F7F9;border-radius:16px;padding:16px">
      <div style="font-size:16px;font-weight:800;color:#1A1A1A;margin-bottom:14px">Informations du colis</div>

      <!-- Type d'envoi -->
      <div style="margin-bottom:14px">
        <div style="font-size:13px;font-weight:700;color:#3A3A3A;margin-bottom:8px">Type d'envoi <span style="color:red">*</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          ${[
            { id: 'courier', emoji: '✉️', label: 'Courrier', desc: 'Documents, enveloppes' },
            { id: 'colis',   emoji: '📦', label: 'Colis',    desc: 'Objets, marchandises' },
          ].map(t => `
            <div onclick="updateGridType('${t.id}')" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14px 8px;border:2px solid ${gridType===t.id?'#FF6C00':'#E6E6E6'};background:${gridType===t.id?'#FFF3E8':'#fff'};border-radius:14px;cursor:pointer;transition:all .2s">
              <div style="font-size:28px;margin-bottom:4px">${t.emoji}</div>
              <div style="font-size:13px;font-weight:700;color:${gridType===t.id?'#FF6C00':'#3A3A3A'};margin-bottom:2px">${t.label}</div>
              <div style="font-size:10px;color:#6B7280;text-align:center">${t.desc}</div>
              ${gridType===t.id ? `<div style="margin-top:6px;width:22px;height:22px;background:#FF6C00;border-radius:50%;display:flex;align-items:center;justify-content:center">${icon('checkCircle', 14, '#fff')}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Taille + Poids -->
      <div style="display:grid;grid-template-columns:${gridType === 'colis' ? '1fr 1fr' : '1fr'};gap:10px;margin-bottom:14px">
        ${gridType === 'colis' ? `
          <div class="form-group"><label class="form-label">Taille du colis *</label>
            <select class="form-select" id="c-size" onchange="updatePackageSize(this.value)">
              <option value="petit" ${size==='petit'?'selected':''}>Petit (≤ 2 kg)</option>
              <option value="moyen" ${size==='moyen'?'selected':''}>Moyen (2–10 kg)</option>
              <option value="grand" ${size==='grand'?'selected':''}>Grand (> 10 kg)</option>
            </select></div>
        ` : ''}
        <div class="form-group"><label class="form-label">Poids (kg) *</label>
          <input class="form-input" id="c-weight" type="number" step="0.1" min="0.1" value="${weight}" onchange="createData.weight=parseFloat(this.value)" /></div>
      </div>

      <!-- Options (colis only) -->
      ${gridType === 'colis' ? `
        <div>
          <div style="font-size:13px;font-weight:700;color:#3A3A3A;margin-bottom:8px">Options supplémentaires</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            ${[
              { key: 'is_fragile', active: isFragile, emoji: '⚠️', label: 'Colis fragile', price: '+500 FCFA' },
              { key: 'is_insured', active: isInsured, emoji: '🛡️', label: 'Assurer', price: '+500 FCFA' },
            ].map(opt => `
              <div onclick="toggleOption('${opt.key}')" style="display:flex;flex-direction:column;align-items:center;padding:12px 8px;border:2px solid ${opt.active?'#FF6C00':'#E6E6E6'};background:${opt.active?'#FFF3E8':'#fff'};border-radius:14px;cursor:pointer;transition:all .2s">
                <div style="font-size:24px;margin-bottom:4px">${opt.emoji}</div>
                <div style="font-size:12px;font-weight:700;color:${opt.active?'#FF6C00':'#3A3A3A'};margin-bottom:2px">${opt.label}</div>
                <div style="font-size:10px;color:#6B7280">${opt.price}</div>
                ${opt.active ? `<div style="margin-top:4px;width:20px;height:20px;background:#FF6C00;border-radius:50%;display:flex;align-items:center;justify-content:center">${icon('closeX', 12, '#fff')}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function stepDeliveryMode() {
  const activePickup = createData.pickup_method || 'relay_deposit';
  const activeHomeDelivery = createData.home_delivery || false;
  const isIntra = createData.sender_commune === createData.recipient_commune;
  
  const modes = [
    {
      key: 'relay_to_relay',
      label: 'Relais ➔ Relais',
      emoji: '📦',
      pickup_method: 'relay_deposit',
      home_delivery: false,
      desc: 'Déposez et retirez votre colis en point relais partenaire.',
      delay: isIntra ? 'J+1' : 'J+1 à J+2',
      is_cheapest: true
    },
    {
      key: 'relay_to_home',
      label: 'Relais ➔ Domicile',
      emoji: '🏘️',
      pickup_method: 'relay_deposit',
      home_delivery: true,
      desc: 'Déposez votre colis en relais, livraison à domicile du destinataire.',
      delay: 'J+1'
    },
    {
      key: 'home_to_relay',
      label: 'Domicile ➔ Relais',
      emoji: '📦',
      pickup_method: 'home_pickup',
      home_delivery: false,
      desc: 'Ramassage à votre adresse, retrait en point relais partenaire.',
      delay: 'J+1'
    },
    {
      key: 'home_to_home',
      label: 'Domicile ➔ Domicile',
      emoji: '🏠',
      pickup_method: 'home_pickup',
      home_delivery: true,
      desc: 'Ramassage à votre adresse et livraison directe à domicile.',
      delay: isIntra ? 'Même jour' : 'J+1'
    }
  ];

  return `
    <div style="font-size:14px;font-weight:700;color:#FF6C00;margin-bottom:4px">Choisissez votre mode de livraison</div>
    <div style="font-size:12px;color:#6B7280;margin-bottom:14px;display:flex;align-items:center;gap:4px">
      ${createData.sender_commune || ''} ➔ ${createData.recipient_commune || ''} • 
      <span style="font-weight:700;color:#1A1A1A">
        ${createData.grid_type === 'courier' ? 'Courrier' : createData.package_type === 'petit' ? 'Petit colis' : createData.package_type === 'moyen' ? 'Colis moyen' : 'Grand colis'}
      </span>
    </div>

    ${!isIntra ? `
      <div style="padding:12px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:14px;font-size:11px;color:#B45309;display:flex;align-items:start;gap:8px;margin-bottom:14px;line-height:1.4">
        <span style="font-size:14px;margin-top:-2px">ℹ️</span>
        <div>
          <strong>Tarif inter-communes :</strong> Vous effectuez un envoi vers une autre commune. Les modes avec relais vous font économiser automatiquement sur vos frais d'envoi.
        </div>
      </div>
    ` : ''}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
      ${modes.map(m => {
        const isSelected = activePickup === m.pickup_method && activeHomeDelivery === m.home_delivery;
        const price = calculatePrice(m.pickup_method, m.home_delivery);
        return `
          <div class="delivery-mode-card ${isSelected ? 'selected' : ''}" onclick="selectDeliveryMode('${m.pickup_method}', ${m.home_delivery})"
            style="position:relative;display:flex;flex-direction:column;gap:6px;padding:14px;border:2px solid ${isSelected ? '#FF6C00' : '#E6E6E6'};background:${isSelected ? '#FFF3E8' : '#fff'};border-radius:16px;cursor:pointer;transition:all .2s;min-height:130px;box-shadow:${isSelected ? '0 4px 12px rgba(255,108,0,0.08)' : 'none'}">
            
            <!-- Badge Meilleur Prix -->
            ${m.is_cheapest ? `
              <div style="position:absolute;top:-9px;left:10px;background:#10B981;color:#fff;font-size:8px;font-weight:900;padding:2px 6px;border-radius:20px;display:flex;align-items:center;gap:3px;box-shadow:0 2px 4px rgba(16,185,129,0.15);letter-spacing:0.3px;z-index:2">
                ${icon('tag', 8, '#fff')} MEILLEUR PRIX
              </div>
            ` : ''}

            <!-- Top line: Emoji + Label, and checkCircle if selected -->
            <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
              <span style="font-size:12.5px;font-weight:800;color:#1A1A1A;display:flex;align-items:center;gap:5px">
                <span style="font-size:16px">${m.emoji}</span> ${m.label}
              </span>
              ${isSelected ? icon('checkCircle', 16, '#FF6C00') : ''}
            </div>

            <!-- Middle: Description -->
            <div style="font-size:10.5px;color:#6B7280;line-height:1.3;margin-top:2px;flex:1">
              ${m.desc}
            </div>

            <!-- Bottom line: Price + Delay -->
            <div style="display:flex;align-items:flex-end;justify-content:space-between;width:100%;margin-top:auto;padding-top:6px;border-top:1px solid ${isSelected ? '#FFD4A8' : '#F3F4F6'}">
              <div style="display:flex;align-items:center;gap:2px;color:#FF6C00;font-size:10px;font-weight:700">
                ${icon('clock', 11, '#FF6C00')} ${m.delay}
              </div>
              <div style="text-align:right">
                <span style="font-size:15px;font-weight:900;color:#1A1A1A">${price.toLocaleString('fr-FR')}</span>
                <span style="font-size:9px;color:#6B7280;font-weight:700">F</span>
              </div>
            </div>

          </div>
        `;
      }).join('')}
    </div>

    <!-- Description du contenu -->
    <div class="form-group" style="margin-top:8px">
      <label class="form-label">Description du contenu *</label>
      <textarea class="form-input" id="c-desc" rows="2" style="resize:none" placeholder="Ex: vêtements, documents, appareils…">${createData.description || ''}</textarea>
    </div>
  `;
}

function selectDeliveryMode(pickupMethod, homeDelivery) {
  saveStep2Inputs();
  createData.pickup_method = pickupMethod;
  createData.home_delivery = homeDelivery;
  const contentEl = document.getElementById('cs-content');
  if (contentEl) contentEl.innerHTML = stepDeliveryMode();
}

function updateGridType(type) {
  saveStep1Inputs();
  createData.grid_type = type;
  if (type === 'courier') {
    createData.package_type = 'petit';
    createData.weight = 0.5;
    createData.is_fragile = false;
    createData.is_insured = false;
  } else {
    createData.package_type = 'petit';
    createData.weight = 1;
  }
  const contentEl = document.getElementById('cs-content');
  if (contentEl) contentEl.innerHTML = stepInformations();
}

function updatePackageSize(size) {
  saveStep1Inputs();
  createData.package_type = size;
  createData.weight = size === 'petit' ? 1 : size === 'moyen' ? 5 : 12;
  const contentEl = document.getElementById('cs-content');
  if (contentEl) contentEl.innerHTML = stepInformations();
}

function toggleOption(optKey) {
  saveStep1Inputs();
  createData[optKey] = !createData[optKey];
  const contentEl = document.getElementById('cs-content');
  if (contentEl) contentEl.innerHTML = stepInformations();
}

function openAddressBook() {
  const content = `
    <div style="display:flex;flex-direction:column;gap:12px;padding:8px 0 16px">
      <div style="font-size:13px;color:#6B7280;margin-bottom:8px">Sélectionnez un destinataire enregistré pour pré-remplir le formulaire.</div>
      ${DEMO_RECIPIENT_ADDRESSES.map((addr) => `
        <div onclick="selectRecipientFromBook('${addr.id}')" style="background:#fff;border:1px solid #E6E6E6;border-radius:14px;padding:14px;cursor:pointer;transition:all .2s;display:flex;flex-direction:column;gap:4px" onmouseover="this.style.borderColor='#FF6C00';this.style.background='#FFF3E8'" onmouseout="this.style.borderColor='#E6E6E6';this.style.background='#fff'">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:14px;font-weight:800;color:#1A1A1A">${addr.first_name} ${addr.last_name}</span>
            <span class="badge badge-orange" style="font-size:9px;padding:2px 7px">${addr.commune}</span>
          </div>
          <div style="font-size:12px;color:#6B7280;display:flex;align-items:center;gap:4px">
            ${icon('phone', 11, '#6B7280')} +225 ${addr.phone}
          </div>
          <div style="font-size:12px;color:#6B7280;display:flex;align-items:center;gap:4px">
            ${icon('home', 11, '#6B7280')} ${addr.quartier}, ${addr.address}
          </div>
        </div>
      `).join('')}
      <button class="btn btn-ghost btn-full" style="margin-top:8px" onclick="Sheet.close()">Fermer</button>
    </div>
  `;
  Sheet.open(content, "Sélectionner un destinataire");
}

function selectRecipientFromBook(addrId) {
  const addr = DEMO_RECIPIENT_ADDRESSES.find(a => a.id === addrId);
  if (!addr) return;
  
  createData.recipient_first_name = addr.first_name;
  createData.recipient_last_name = addr.last_name;
  createData.recipient_email = addr.email;
  createData.recipient_phone = addr.phone;
  createData.recipient_commune = addr.commune;
  createData.recipient_quartier = addr.quartier;
  createData.recipient_address = addr.address;
  createData.recipient_repere = addr.repere;
  
  // Re-render Step 1 content to populate input fields
  const contentEl = document.getElementById('cs-content');
  if (contentEl) contentEl.innerHTML = stepInformations();
  
  Sheet.close();
  Toast.show(`✓ ${addr.first_name} ${addr.last_name} sélectionné !`, 'success');
}

function stepRelaySelection() {
  const showOrigin = createData.pickup_method === 'relay_deposit';
  const showDest = !createData.home_delivery;

  const senderCommune = createData.sender_commune || '';
  const recipientCommune = createData.recipient_commune || '';

  const matchedOrigin = DEMO_RELAY_POINTS.find(r => r.commune.toLowerCase().includes(senderCommune.toLowerCase())) || DEMO_RELAY_POINTS[0];
  const matchedDest = DEMO_RELAY_POINTS.find(r => r.commune.toLowerCase().includes(recipientCommune.toLowerCase())) || DEMO_RELAY_POINTS[4] || DEMO_RELAY_POINTS[0];

  if (showOrigin && !createData.origin_relay_id) {
    createData.origin_relay_id = matchedOrigin.id;
  }
  if (showDest && !createData.destination_relay_id) {
    createData.destination_relay_id = matchedDest.id;
  }

  const originRelay = DEMO_RELAY_POINTS.find(r => r.id === createData.origin_relay_id) || matchedOrigin;
  const destRelay = DEMO_RELAY_POINTS.find(r => r.id === createData.destination_relay_id) || matchedDest;

  return `
    <div style="font-size:14px;font-weight:700;color:#FF6C00;margin-bottom:8px">Sélection des points relais</div>

    ${showOrigin ? `
      <div style="background:#F6F7F9;border-radius:16px;padding:16px;margin-bottom:14px">
        <div style="font-size:15px;font-weight:800;color:#1A1A1A;margin-bottom:4px;display:flex;align-items:center;gap:6px">
          ${icon('store', 18, '#FF6C00')} Relais de départ
        </div>
        <div style="font-size:12px;color:#6B7280;margin-bottom:12px">Où souhaitez-vous déposer votre colis ?</div>
        
        <div class="form-group" style="margin-bottom:12px">
          <select class="form-input" id="c-origin-relay-select" onchange="createData.origin_relay_id=this.value;document.getElementById('cs-content').innerHTML=stepRelaySelection()" style="font-weight:700;color:#1A1A1A;border-color:#FF6C00">
            ${DEMO_RELAY_POINTS.map(r => `
              <option value="${r.id}" ${r.id === originRelay.id ? 'selected' : ''}>${r.name} (${r.commune})</option>
            `).join('')}
          </select>
        </div>

        <div style="background:#fff;border-radius:12px;padding:12px;border:1px solid #E6E6E6;margin-top:8px">
          <div style="font-size:13px;font-weight:700;color:#1A1A1A">${originRelay.name}</div>
          <div style="font-size:12px;color:#6B7280;margin-top:2px">${originRelay.address}</div>
          <div style="font-size:11px;color:#FF6C00;margin-top:4px;font-weight:600;display:flex;align-items:center;gap:4px">
            ${icon('clock', 12, '#FF6C00')} ${originRelay.hours}
          </div>
        </div>
      </div>
    ` : ''}

    ${showDest ? `
      <div style="background:#F6F7F9;border-radius:16px;padding:16px">
        <div style="font-size:15px;font-weight:800;color:#1A1A1A;margin-bottom:4px;display:flex;align-items:center;gap:6px">
          ${icon('store', 18, '#FF6C00')} Relais de livraison
        </div>
        <div style="font-size:12px;color:#6B7280;margin-bottom:12px">Où le destinataire retirera-t-il le colis ?</div>
        
        <div class="form-group" style="margin-bottom:12px">
          <select class="form-input" id="c-dest-relay-select" onchange="createData.destination_relay_id=this.value;document.getElementById('cs-content').innerHTML=stepRelaySelection()" style="font-weight:700;color:#1A1A1A;border-color:#FF6C00">
            ${DEMO_RELAY_POINTS.map(r => `
              <option value="${r.id}" ${r.id === destRelay.id ? 'selected' : ''}>${r.name} (${r.commune})</option>
            `).join('')}
          </select>
        </div>

        <div style="background:#fff;border-radius:12px;padding:12px;border:1px solid #E6E6E6;margin-top:8px">
          <div style="font-size:13px;font-weight:700;color:#1A1A1A">${destRelay.name}</div>
          <div style="font-size:12px;color:#6B7280;margin-top:2px">${destRelay.address}</div>
          <div style="font-size:11px;color:#FF6C00;margin-top:4px;font-weight:600;display:flex;align-items:center;gap:4px">
            ${icon('clock', 12, '#FF6C00')} ${destRelay.hours}
          </div>
        </div>
      </div>
    ` : ''}
  `;
}

function stepSummary() {
  const isIntra = createData.sender_commune === createData.recipient_commune;
  let basePrice = 0;
  let baseLabel = '';
  
  if (createData.grid_type === 'courier') {
    basePrice = isIntra ? 600 : 1000;
    baseLabel = 'Courrier (Base)';
  } else {
    const prices = {
      petit: isIntra ? 1000 : 1500,
      moyen: isIntra ? 1500 : 2000,
      grand: isIntra ? 2000 : 2500
    };
    basePrice = prices[createData.package_type || 'petit'];
    const sizeLabels = { petit: 'Petit (< 3kg)', moyen: 'Moyen (3–10kg)', grand: 'Grand (> 10kg)' };
    baseLabel = 'Colis ' + sizeLabels[createData.package_type || 'petit'];
  }
  
  const fragileFee = createData.is_fragile ? 500 : 0;
  const insuredFee = createData.is_insured ? 500 : 0;
  const pickupFee = createData.pickup_method === 'home_pickup' ? 500 : 0;
  const deliveryFee = createData.home_delivery ? 500 : 0;
  const total = calculatePrice(createData.pickup_method, createData.home_delivery);
  const payment = createData.payment_method || 'paystack';

  return `
    <div style="font-size:14px;font-weight:700;color:#FF6C00;margin-bottom:8px">Vérifiez votre commande</div>

    <!-- Route -->
    <div class="card" style="padding:16px;background:#FFF3E8;border-color:#FFD4A8">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="flex:1">
          <div style="font-size:10px;color:#FF6C00;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Expéditeur</div>
          <div style="font-size:14px;font-weight:700;color:#1A1A1A;margin-top:2px">${createData.sender_first_name} ${createData.sender_last_name}</div>
          <div style="font-size:12px;color:#6B7280">${createData.sender_commune}${createData.sender_quartier ? `, ${createData.sender_quartier}` : ''}</div>
          ${createData.sender_email ? `<div style="font-size:11px;color:#9CA3AF">${createData.sender_email}</div>` : ''}
        </div>
        <div style="padding:0 8px;flex-shrink:0">${icon('arrowRight', 20, '#FF6C00')}</div>
        <div style="flex:1;text-align:right">
          <div style="font-size:10px;color:#FF6C00;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Destinataire</div>
          <div style="font-size:14px;font-weight:700;color:#1A1A1A;margin-top:2px">${createData.recipient_first_name} ${createData.recipient_last_name}</div>
          <div style="font-size:12px;color:#6B7280">${createData.recipient_commune}${createData.recipient_quartier ? `, ${createData.recipient_quartier}` : ''}</div>
          ${createData.recipient_email ? `<div style="font-size:11px;color:#9CA3AF">${createData.recipient_email}</div>` : ''}
        </div>
      </div>
    </div>

    <!-- Details -->
    <div class="card" style="padding:0 14px">
      <div class="info-row"><span class="info-key">Type d'envoi</span><span class="info-val">${createData.grid_type === 'courier' ? 'Courrier' : 'Colis'}</span></div>
      ${createData.grid_type === 'colis' ? `<div class="info-row"><span class="info-key">Format</span><span class="info-val">${baseLabel}</span></div>` : ''}
      <div class="info-row"><span class="info-key">Poids</span><span class="info-val">${createData.weight || 1} kg</span></div>
      <div class="info-row"><span class="info-key">Collecte</span><span class="info-val">${createData.pickup_method === 'home_pickup' ? 'Ramassage à domicile' : 'Dépôt en relais'}</span></div>
      <div class="info-row"><span class="info-key">Livraison</span><span class="info-val">${createData.home_delivery ? 'À domicile' : 'Point relais'}</span></div>
      ${createData.is_fragile ? `<div class="info-row"><span class="info-key">Option</span><span class="info-val">Fragile (+500 F)</span></div>` : ''}
      ${createData.is_insured ? `<div class="info-row"><span class="info-key">Option</span><span class="info-val">Assuré (+500 F)</span></div>` : ''}
      ${createData.description ? `<div class="info-row"><span class="info-key">Contenu</span><span class="info-val">${createData.description}</span></div>` : ''}
    </div>

    <!-- Prix -->
    <div class="card" style="padding:0 14px">
      <div class="info-row"><span class="info-key">Tarif de base</span><span class="info-val">${basePrice.toLocaleString()} FCFA</span></div>
      ${fragileFee > 0 ? `<div class="info-row"><span class="info-key">Option fragile</span><span class="info-val">+${fragileFee.toLocaleString()} FCFA</span></div>` : ''}
      ${insuredFee > 0 ? `<div class="info-row"><span class="info-key">Option assurance</span><span class="info-val">+${insuredFee.toLocaleString()} FCFA</span></div>` : ''}
      ${pickupFee > 0 ? `<div class="info-row"><span class="info-key">Ramassage domicile</span><span class="info-val">+${pickupFee.toLocaleString()} FCFA</span></div>` : ''}
      ${deliveryFee > 0 ? `<div class="info-row"><span class="info-key">Livraison domicile</span><span class="info-val">+${deliveryFee.toLocaleString()} FCFA</span></div>` : ''}
      <div class="info-row" style="border:none;padding-bottom:14px">
        <span class="info-key" style="font-weight:800;font-size:14px;color:#1A1A1A">Total</span>
        <span class="info-val" style="font-size:18px;font-weight:900;color:#FF6C00">${total.toLocaleString()} FCFA</span>
      </div>
    </div>

    <!-- Paiement -->
    <div style="font-size:14px;font-weight:700;color:#1A1A1A;margin-top:4px;margin-bottom:10px">Mode de paiement</div>
    ${[
      { id: 'paystack',   label: 'Mobile Money / Carte', desc: 'Orange, MTN, Wave, Carte bancaire', emoji: '💳' },
      { id: 'relay_cash', label: 'Paiement au relais',    desc: 'Espèces lors du dépôt du colis',   emoji: '💵' },
    ].map(p => `
      <div class="payment-pill ${payment === p.id ? 'selected' : ''}" onclick="createData.payment_method='${p.id}';document.getElementById('cs-content').innerHTML=stepSummary()">
        <div class="payment-pill-icon">${p.emoji}</div>
        <div><div class="payment-pill-name">${p.label}</div><div class="payment-pill-desc">${p.desc}</div></div>
        ${payment === p.id ? `<div style="margin-left:auto">${icon('checkCircle', 18, '#FF6C00')}</div>` : ''}
      </div>
    `).join('')}

    <div class="notice-banner notice-blue" style="margin-top:4px">
      ${icon('info', 14)} En confirmant, vous acceptez les <strong>conditions générales de vente</strong> de ColisDirect.
    </div>
  `;
}

function nextStep() {
  if (createStep === 1) {
    // Collect sender data
    createData.sender_first_name = document.getElementById('s-fname')?.value?.trim();
    createData.sender_last_name = document.getElementById('s-lname')?.value?.trim();
    createData.sender_email = document.getElementById('s-email')?.value?.trim();
    createData.sender_phone = document.getElementById('s-phone')?.value?.trim();
    createData.sender_commune = document.getElementById('s-commune')?.value;
    createData.sender_quartier = document.getElementById('s-quartier')?.value?.trim();
    createData.sender_address = document.getElementById('s-address')?.value?.trim();
    createData.sender_repere = document.getElementById('s-repere')?.value?.trim();
    
    // Collect recipient data
    createData.recipient_first_name = document.getElementById('r-fname')?.value?.trim();
    createData.recipient_last_name = document.getElementById('r-lname')?.value?.trim();
    createData.recipient_email = document.getElementById('r-email')?.value?.trim();
    createData.recipient_phone = document.getElementById('r-phone')?.value?.trim();
    createData.recipient_commune = document.getElementById('r-commune')?.value;
    createData.recipient_quartier = document.getElementById('r-quartier')?.value?.trim();
    createData.recipient_address = document.getElementById('r-address')?.value?.trim();
    createData.recipient_repere = document.getElementById('r-repere')?.value?.trim();
    
    // Collect package data (also on Step 1 now)
    const weightVal = parseFloat(document.getElementById('c-weight')?.value);
    if (!isNaN(weightVal)) createData.weight = weightVal;
    if (!createData.grid_type) createData.grid_type = 'colis';
    if (!createData.package_type) createData.package_type = 'petit';
    
    // Validate required fields
    if (!createData.sender_first_name || !createData.sender_last_name || !createData.sender_phone || !createData.sender_commune || !createData.sender_quartier || !createData.sender_address ||
        !createData.recipient_first_name || !createData.recipient_last_name || !createData.recipient_phone || !createData.recipient_commune || !createData.recipient_quartier || !createData.recipient_address) {
      Toast.show('Remplissez tous les champs obligatoires (*)', 'warning'); return;
    }
  } else if (createStep === 2) {
    // Collect delivery mode data
    createData.description = document.getElementById('c-desc')?.value?.trim();
    if (!createData.pickup_method) createData.pickup_method = 'relay_deposit';
    if (createData.home_delivery === undefined) createData.home_delivery = false;
    if (createData.is_fragile === undefined) createData.is_fragile = false;
    if (createData.is_insured === undefined) createData.is_insured = false;
    if (!createData.payment_method) createData.payment_method = 'paystack';

    // If home pickup AND home delivery, skip relay selection step
    if (createData.pickup_method === 'home_pickup' && createData.home_delivery === true) {
      createStep = 4;
      renderCreateShipment();
      return;
    }
  } else if (createStep === 3) {
    const originSel = document.getElementById('c-origin-relay-select');
    const destSel = document.getElementById('c-dest-relay-select');
    if (originSel) createData.origin_relay_id = originSel.value;
    if (destSel) createData.destination_relay_id = destSel.value;
  }
  createStep++;
  renderCreateShipment();
}

function prevStep() {
  if (createStep === 4) {
    if (createData.pickup_method === 'home_pickup' && createData.home_delivery === true) {
      createStep = 2;
    } else {
      createStep = 3;
    }
  } else if (createStep === 3) {
    createStep = 2;
  } else if (createStep === 2) {
    createStep = 1;
  } else {
    Router.back();
    return;
  }
  renderCreateShipment();
}

async function submitShipment() {
  if (!State.user) {
    Toast.show('Connectez-vous pour envoyer un colis', 'warning');
    Router.navigate('login'); return;
  }
  const btn = document.querySelector('#screen-create-shipment .btn-primary:last-child');
  if (btn) { btn.innerHTML = `<div class="spinner" style="width:20px;height:20px;border-width:2px;border-top-color:#fff;border-color:rgba(255,255,255,0.3)"></div> Création en cours…`; btn.disabled = true; }

  await new Promise(r => setTimeout(r, 1400));

  const finalPrice = calculatePrice(createData.pickup_method, createData.home_delivery);

  const code = Math.floor(1000 + Math.random() * 9000) + ['AB','CD','EF','GH'][Math.floor(Math.random()*4)];
  const trackingNum = 'CD' + Date.now().toString().slice(-10) + 'CI';
  const newS = {
    id: String(Date.now()),
    tracking_number: trackingNum,
    shipment_code: code,
    ...JSON.parse(JSON.stringify(createData)),
    current_status: 'READY_FOR_DROP_OFF',
    payment_status: createData.payment_method === 'relay_cash' ? 'pending' : 'paid',
    price: finalPrice,
    weight: createData.grid_type === 'courier' ? (createData.weight || 0.5) : (createData.weight || 5),
    created_at: new Date().toISOString(),
    events: [{ status: 'READY_FOR_DROP_OFF', timestamp: new Date().toISOString(), notes: 'Commande créée et paiement validé' }],
  };
  if (createData.pickup_method === 'relay_deposit') {
    newS.origin_relay = DEMO_RELAY_POINTS.find(r => r.id === createData.origin_relay_id) || DEMO_RELAY_POINTS[0];
  }
  if (!createData.home_delivery) {
    newS.destination_relay = DEMO_RELAY_POINTS.find(r => r.id === createData.destination_relay_id) || DEMO_RELAY_POINTS[4] || DEMO_RELAY_POINTS[0];
  }
  DEMO_SHIPMENTS.unshift(newS);

  // Notification
  State.notifications.unshift({
    id: Date.now(), type: 'created', title: 'Nouveau colis créé',
    body: `Votre colis ${code} vers ${createData.recipient_commune} a bien été créé. Déposez-le dès que possible.`,
    time: 'À l\'instant', unread: true, icon: 'packageCheck', color: '#FF6C00', bg: '#FFF3E8',
  });
  State.save();

  // Reset
  createStep = 1;
  Object.keys(createData).forEach(k => delete createData[k]);

  Router.navigate('tracking-detail', { shipment: newS });
  Toast.show(`✓ Colis ${code} créé ! Déposez-le dans un relais.`, 'success', 5000);
}

/* ── MAP (RELAY POINTS) ────────────────────────────────────────── */
let relaySearchQ = '';

function renderMap() {
  const el = document.getElementById('screen-map');
  if (!el) return;

  const filtered = relaySearchQ
    ? DEMO_RELAY_POINTS.filter(r => r.name.toLowerCase().includes(relaySearchQ.toLowerCase()) || r.commune.toLowerCase().includes(relaySearchQ.toLowerCase()))
    : DEMO_RELAY_POINTS;

  el.innerHTML = `
    <div class="app-header">
      <button class="header-back" onclick="Router.back()">${icon('chevronLeft', 18)}</button>
      <div class="header-title">Points relais</div>
      <button class="header-action" onclick="locateMe()" title="Ma position">
        ${icon('navigation', 18)}
      </button>
    </div>

    <!-- Map canvas -->
    <div style="height:220px;position:relative;overflow:hidden;background:linear-gradient(135deg,#dbeafe 0%,#bfdbfe 100%)">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0">
        <defs>
          <pattern id="mapgrid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(59,130,246,0.12)" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mapgrid)" />
        <!-- Streets -->
        <line x1="0" y1="110" x2="430" y2="110" stroke="rgba(255,255,255,0.9)" stroke-width="4"/>
        <line x1="215" y1="0" x2="215" y2="220" stroke="rgba(255,255,255,0.9)" stroke-width="4"/>
        <line x1="0" y1="60" x2="430" y2="60" stroke="rgba(255,255,255,0.6)" stroke-width="2.5"/>
        <line x1="0" y1="165" x2="430" y2="165" stroke="rgba(255,255,255,0.6)" stroke-width="2.5"/>
        <line x1="120" y1="0" x2="120" y2="220" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
        <line x1="310" y1="0" x2="310" y2="220" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
        <!-- Relay pins -->
        ${[{x:215,y:110,main:true},{x:120,y:60,main:false},{x:310,y:75,main:false},{x:80,y:160,main:false},{x:350,y:150,main:false},{x:185,y:35,main:false}].map((p,i) => `
          <g onclick="showRelayDetail('${i+1}')">
            <circle cx="${p.x}" cy="${p.y}" r="${p.main?18:13}" fill="#FF6C00" opacity="${p.main?1:0.85}" style="cursor:pointer"/>
            <circle cx="${p.x}" cy="${p.y}" r="${p.main?22:16}" fill="#FF6C00" opacity="0.2"/>
            <text x="${p.x}" y="${p.y+5}" text-anchor="middle" font-size="${p.main?12:9}" fill="white" font-weight="700">📦</text>
          </g>
        `).join('')}
      </svg>
      <!-- Counter badge -->
      <div style="position:absolute;bottom:10px;right:10px;background:#fff;border-radius:10px;padding:6px 12px;font-size:12px;font-weight:700;color:#1A1A1A;box-shadow:0 2px 10px rgba(0,0,0,0.15);display:flex;align-items:center;gap:6px">
        ${icon('mapPin', 13, '#FF6C00')} ${DEMO_RELAY_POINTS.length} relais
      </div>
    </div>

    <!-- Search -->
    <div class="search-bar">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input class="search-input" value="${relaySearchQ}" placeholder="Rechercher un relais, commune…" oninput="filterRelays(this.value)" />
    </div>

    <!-- List -->
    <div id="relay-list">
      ${filtered.length === 0 ? `<div class="empty-state"><div class="empty-title" style="font-size:14px;color:#6B7280">Aucun relais trouvé</div></div>`
        : filtered.map(r => `
          <div class="relay-card" onclick="showRelayDetail('${r.id}')">
            <div style="display:flex;align-items:center;gap:4px;flex-direction:column;margin-top:4px">
              <div class="relay-dot" style="background:${r.status === 'open' ? '#16A34A' : '#DC2626'}"></div>
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;font-weight:700;color:#1A1A1A">${r.name}</div>
              <div style="font-size:12px;color:#6B7280;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.address}</div>
              <div style="display:flex;align-items:center;gap:8px;margin-top:5px">
                <span class="badge ${r.status === 'open' ? 'badge-green' : 'badge-red'}" style="font-size:9px;padding:2px 7px">${r.status === 'open' ? 'Ouvert' : 'Fermé'}</span>
                <span style="font-size:11px;color:#6B7280">${r.hours}</span>
              </div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:12px;font-weight:700;color:#FF6C00">${r.distance}</div>
              <div style="font-size:10px;color:#9CA3AF;margin-top:2px">${r.packages_count} colis</div>
            </div>
            ${icon('chevronRight', 16, '#D1D5DB')}
          </div>
        `).join('')}
    </div>
  `;
}

function filterRelays(q) {
  relaySearchQ = q;
  const lq = q.toLowerCase();
  const filtered = q
    ? DEMO_RELAY_POINTS.filter(r => r.name.toLowerCase().includes(lq) || r.commune.toLowerCase().includes(lq))
    : DEMO_RELAY_POINTS;
  const container = document.getElementById('relay-list');
  if (!container) return;
  container.innerHTML = filtered.length === 0
    ? `<div class="empty-state"><div class="empty-title" style="font-size:14px;color:#6B7280">Aucun relais pour "${q}"</div></div>`
    : filtered.map(r => `
      <div class="relay-card" onclick="showRelayDetail('${r.id}')">
        <div class="relay-dot" style="background:${r.status === 'open' ? '#16A34A' : '#DC2626'};margin-top:4px"></div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;color:#1A1A1A">${r.name}</div>
          <div style="font-size:12px;color:#6B7280">${r.address}</div>
          <div style="margin-top:4px"><span class="badge ${r.status === 'open' ? 'badge-green' : 'badge-red'}" style="font-size:9px">${r.status === 'open' ? 'Ouvert' : 'Fermé'}</span></div>
        </div>
        <div style="text-align:right"><div style="font-size:12px;font-weight:700;color:#FF6C00">${r.distance}</div></div>
        ${icon('chevronRight', 16, '#D1D5DB')}
      </div>
    `).join('');
}

function locateMe() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      () => Toast.show('Localisation activée ! Relais les plus proches affichés.', 'success'),
      () => Toast.show('Autorisation de localisation refusée.', 'warning')
    );
  } else {
    Toast.show('Géolocalisation non disponible sur cet appareil.', 'warning');
  }
}

function showRelayDetail(id) {
  const relay = DEMO_RELAY_POINTS.find(r => r.id === id);
  if (!relay) return;
  Sheet.open(`
    <div style="padding:4px 0 16px">
      <div style="display:flex;align-items:center;gap:12px;padding:14px;background:#FFF3E8;border-radius:16px;margin-bottom:16px">
        <div style="width:48px;height:48px;background:#FF6C00;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          ${icon('store', 22, 'white')}
        </div>
        <div style="flex:1">
          <div style="font-size:15px;font-weight:800;color:#1A1A1A">${relay.name}</div>
          <div style="font-size:12px;color:#6B7280;margin-top:2px">${relay.address}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:6px">
            <span class="badge ${relay.status === 'open' ? 'badge-green' : 'badge-red'}" style="font-size:10px">${relay.status === 'open' ? 'Ouvert maintenant' : 'Fermé'}</span>
          </div>
        </div>
      </div>

      <div class="card" style="padding:0 14px;margin-bottom:16px">
        <div class="info-row"><span class="info-key">Horaires</span><span class="info-val">${relay.hours}</span></div>
        <div class="info-row"><span class="info-key">Téléphone</span><a href="tel:${relay.phone}" style="font-size:13px;font-weight:600;color:#FF6C00">${relay.phone}</a></div>
        <div class="info-row"><span class="info-key">Distance</span><span class="info-val">${relay.distance}</span></div>
        <div class="info-row" style="border:none"><span class="info-key">Colis en attente</span><span class="info-val">${relay.packages_count}</span></div>
      </div>

      <div style="display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;gap:8px">
          <a href="tel:${relay.phone}" class="btn btn-secondary btn-full" style="text-decoration:none">
            ${icon('phone', 16, '#FF6C00')} Appeler
          </a>
          <button class="btn btn-outline btn-full" onclick="Sheet.close();Toast.show('Navigation en cours…','default')">
            ${icon('navigation', 16)} Itinéraire
          </button>
        </div>
        <button class="btn btn-primary btn-full" onclick="Sheet.close();Router.navigate('create-shipment')">
          ${icon('package', 16)} Envoyer un colis ici
        </button>
        <button class="btn btn-ghost btn-full" onclick="Sheet.close()">Fermer</button>
      </div>
    </div>
  `, relay.name);
}

/* ── PRICING ───────────────────────────────────────────────────── */
let pricingTab = 'relay';

function renderPricing() {
  const el = document.getElementById('screen-pricing');
  if (!el) return;

  const tarifs = [
    { icon: '📦', name: 'Petit colis',  weight: '< 3 kg',    relay: 600,     home: 1100 },
    { icon: '🗃️', name: 'Colis moyen', weight: '3 – 10 kg',  relay: 1500,    home: 2000 },
    { icon: '📫', name: 'Grand colis',  weight: '10 – 30 kg', relay: 2500,    home: 3500 },
    { icon: '🏗️', name: 'Hors norme',  weight: '> 30 kg',    relay: 'Devis', home: 'Devis' },
  ];

  el.innerHTML = `
    <div class="app-header">
      <button class="header-back" onclick="Router.back()">${icon('chevronLeft', 18)}</button>
      <div class="header-title">Tarifs</div>
    </div>

    <!-- Hero -->
    <div style="background:linear-gradient(135deg,#0f0f0f,#1a1a2e);padding:24px 16px">
      <div style="font-size:11px;font-weight:700;color:#FF6C00;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Tarifs simples et transparents</div>
      <div style="font-size:26px;font-weight:900;color:#fff">À partir de <span style="color:#FF6C00">600 FCFA</span></div>
      <p style="font-size:13px;color:rgba(255,255,255,0.65);margin-top:8px;line-height:1.5">Expéditions partout en Côte d'Ivoire. Pas de frais cachés.</p>
    </div>

    <!-- Tab -->
    <div style="padding:14px 16px 8px">
      <div style="display:flex;background:#F6F7F9;border-radius:14px;padding:4px">
        <button id="pt-relay" onclick="setPricingTab('relay')" style="flex:1;padding:10px;border-radius:10px;border:none;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.15s;${pricingTab==='relay'?'background:#fff;color:#1A1A1A;box-shadow:0 1px 4px rgba(0,0,0,0.1)':'background:transparent;color:#6B7280'}">
          ${icon('store', 14, pricingTab==='relay'?'#FF6C00':'#6B7280')} Point relais
        </button>
        <button id="pt-home" onclick="setPricingTab('home')" style="flex:1;padding:10px;border-radius:10px;border:none;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.15s;${pricingTab==='home'?'background:#fff;color:#1A1A1A;box-shadow:0 1px 4px rgba(0,0,0,0.1)':'background:transparent;color:#6B7280'}">
          ${icon('home', 14, pricingTab==='home'?'#FF6C00':'#6B7280')} À domicile
        </button>
      </div>
    </div>

    <!-- Tarifs table -->
    <div class="card" style="margin:0 16px;border-radius:20px;overflow:hidden">
      <div style="padding:12px 16px;background:#F6F7F9;border-bottom:1px solid #E6E6E6;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div style="font-size:10px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px">Format</div>
        <div style="font-size:10px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px">Poids</div>
        <div style="font-size:10px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px">Prix</div>
      </div>
      ${tarifs.map((t, i) => {
        const price = pricingTab === 'relay' ? t.relay : t.home;
        return `
          <div style="padding:14px 16px;${i < tarifs.length - 1 ? 'border-bottom:1px solid #F6F7F9' : ''}">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;align-items:center">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:20px">${t.icon}</span>
                <span style="font-size:13px;font-weight:700;color:#1A1A1A">${t.name}</span>
              </div>
              <div style="font-size:12px;color:#6B7280">${t.weight}</div>
              <div style="font-size:15px;font-weight:800;color:${typeof price === 'number' ? '#FF6C00' : '#6B7280'}">
                ${typeof price === 'number' ? price.toLocaleString() + ' F' : price}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- Options -->
    <div style="padding:16px">
      <div style="font-size:14px;font-weight:700;color:#1A1A1A;margin-bottom:12px">Options additionnelles</div>
      <div class="card" style="padding:0 14px">
        ${[
          { label: 'Impression bordereau', price: 100, icon: 'printer' },
          { label: 'Emballage renforcé', price: 300, icon: 'box' },
          { label: 'Assurance colis', price: 500, icon: 'shield' },
          { label: 'SMS de confirmation', price: 50, icon: 'message' },
        ].map((o, i, arr) => `
          <div class="info-row" ${i === arr.length-1 ? 'style="border:none"' : ''}>
            <span class="info-key" style="display:flex;align-items:center;gap:6px">${icon(o.icon, 14, '#6B7280')} ${o.label}</span>
            <span class="info-val" style="color:#FF6C00">+${o.price} FCFA</span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- FAQ rapide -->
    <div style="padding:0 16px 16px">
      <div style="font-size:14px;font-weight:700;color:#1A1A1A;margin-bottom:12px">Questions fréquentes</div>
      ${[
        { q: 'Quels sont les délais de livraison ?', r: 'Relais : J+1 en moyenne. Domicile : le jour même en zone urbaine.' },
        { q: 'Que faire si mon colis est perdu ?', r: 'Contactez notre support 24h/24. Chaque colis est suivi en temps réel.' },
        { q: 'Peut-on envoyer des objets fragiles ?', r: 'Oui, avec l\'option emballage renforcé recommandée.' },
      ].map((item, i) => `
        <div style="padding:14px;border-radius:14px;background:#fff;border:1px solid #E6E6E6;margin-bottom:8px;cursor:pointer" onclick="toggleFaq(this)">
          <div style="font-size:13px;font-weight:700;color:#1A1A1A;display:flex;align-items:center;justify-content:space-between">
            ${item.q} <span style="color:#FF6C00;font-size:18px;flex-shrink:0;margin-left:8px">+</span>
          </div>
          <div style="font-size:13px;color:#6B7280;margin-top:0;max-height:0;overflow:hidden;transition:all 0.3s">${item.r}</div>
        </div>
      `).join('')}
    </div>

    <!-- CTA -->
    <div style="padding:0 16px 28px">
      <button class="btn btn-primary btn-full" onclick="Router.navigate('create-shipment')">
        ${icon('package', 18)} Envoyer un colis maintenant
      </button>
    </div>
  `;
}

function setPricingTab(tab) {
  pricingTab = tab;
  renderPricing();
}

function toggleFaq(el) {
  const answer = el.querySelector('div:last-child');
  const plus = el.querySelector('span');
  if (answer.style.maxHeight === '0px' || !answer.style.maxHeight) {
    answer.style.maxHeight = '200px';
    answer.style.marginTop = '8px';
    plus.textContent = '−';
  } else {
    answer.style.maxHeight = '0px';
    answer.style.marginTop = '0';
    plus.textContent = '+';
  }
}

/* ── ABOUT ─────────────────────────────────────────────────────── */
function renderAbout() {
  const el = document.getElementById('screen-about');
  if (!el) return;

  el.innerHTML = `
    <div class="app-header">
      <button class="header-back" onclick="Router.back()">${icon('chevronLeft', 18)}</button>
      <div class="header-title">À propos</div>
    </div>

    <!-- Hero -->
    <div style="background:linear-gradient(135deg,#FF6C00,#FF8533);padding:40px 16px 48px;text-align:center;position:relative;overflow:hidden">
      <div style="position:absolute;top:-40px;right:-40px;width:160px;height:160px;background:rgba(255,255,255,0.08);border-radius:50%"></div>
      <div style="width:80px;height:80px;background:rgba(255,255,255,0.2);border-radius:24px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.3)">
        ${LOGO_SPLASH}
      </div>
      <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-1px">COLISDIRECT</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:6px">La livraison simplifiée en Côte d'Ivoire</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:4px">Version 2.0.0</div>
    </div>

    <!-- Stats -->
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:16px">
      ${[
        { val: '+500', label: 'Points relais', icon: 'mapPin', bg: '#FFF3E8', color: '#FF6C00' },
        { val: '+1 000', label: 'Livreurs agréés', icon: 'truck', bg: '#EEF4FF', color: '#2F6BE0' },
        { val: '+50 000', label: 'Colis livrés', icon: 'package', bg: '#E6F6EC', color: '#16A34A' },
        { val: '24h/24', label: 'Support client', icon: 'helpCircle', bg: '#FEF8E7', color: '#F5B400' },
      ].map(s => `
        <div class="stat-card" style="background:${s.bg};border:none">
          <div style="width:36px;height:36px;background:rgba(255,255,255,0.8);border-radius:11px;display:flex;align-items:center;justify-content:center;margin-bottom:8px">
            ${icon(s.icon, 18, s.color)}
          </div>
          <div style="font-size:20px;font-weight:800;color:${s.color}">${s.val}</div>
          <div style="font-size:12px;color:#6B7280;margin-top:2px">${s.label}</div>
        </div>
      `).join('')}
    </div>

    <!-- Mission -->
    <div style="padding:0 16px 16px">
      <div class="card" style="padding:16px">
        <div style="font-size:15px;font-weight:700;color:#1A1A1A;margin-bottom:8px">Notre mission</div>
        <p style="font-size:13px;color:#6B7280;line-height:1.7">
          COLISDIRECT connecte particuliers, commerçants, points relais et livreurs agréés dans toute la Côte d'Ivoire.
          Notre objectif : rendre l'envoi de colis simple, rapide, traçable et accessible à tous.
        </p>
      </div>
    </div>

    <!-- Valeurs -->
    <div style="padding:0 16px 16px">
      <div style="font-size:14px;font-weight:700;color:#1A1A1A;margin-bottom:12px">Nos valeurs</div>
      ${[
        { icon: 'shield',   title: 'Sécurité',   desc: 'Chaque colis est suivi et assuré.',           color: '#2F6BE0', bg: '#EEF4FF' },
        { icon: 'zap',      title: 'Rapidité',    desc: 'Livraisons express J+0 ou J+1.',             color: '#F5B400', bg: '#FEF8E7' },
        { icon: 'users',    title: 'Proximité',   desc: 'Plus de 500 relais dans tout le pays.',       color: '#16A34A', bg: '#E6F6EC' },
        { icon: 'wallet',   title: 'Accessibilité','desc': 'Tarifs adaptés à tous les budgets.',       color: '#FF6C00', bg: '#FFF3E8' },
      ].map(v => `
        <div style="display:flex;gap:12px;padding:13px 0;border-bottom:1px solid #F6F7F9">
          <div style="width:40px;height:40px;border-radius:12px;background:${v.bg};display:flex;align-items:center;justify-content:center;flex-shrink:0">
            ${icon(v.icon, 18, v.color)}
          </div>
          <div>
            <div style="font-size:14px;font-weight:700;color:#1A1A1A">${v.title}</div>
            <div style="font-size:12px;color:#6B7280;margin-top:2px;line-height:1.5">${v.desc}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Contact -->
    <div style="padding:0 16px 24px">
      <div style="font-size:14px;font-weight:700;color:#1A1A1A;margin-bottom:12px">Contactez-nous</div>
      <div class="card" style="padding:0 14px">
        <div class="list-item" style="border:none;padding:14px 0">
          <div class="list-item-icon" style="background:#FFF3E8">${icon('mail', 18, '#FF6C00')}</div>
          <div class="list-item-content">
            <div class="list-item-title">Email</div>
            <a href="mailto:contact@colisdirect.ci" style="font-size:12px;color:#FF6C00">contact@colisdirect.ci</a>
          </div>
        </div>
        <div class="list-item" style="border:none;padding:14px 0;border-top:1px solid #F6F7F9">
          <div class="list-item-icon" style="background:#EEF4FF">${icon('globe', 18, '#2F6BE0')}</div>
          <div class="list-item-content">
            <div class="list-item-title">Site web</div>
            <a href="https://colisdirect.com" target="_blank" style="font-size:12px;color:#2F6BE0">colisdirect.com</a>
          </div>
        </div>
        <div class="list-item" style="border:none;padding:14px 0;border-top:1px solid #F6F7F9">
          <div class="list-item-icon" style="background:#E6F6EC">${icon('phone', 18, '#16A34A')}</div>
          <div class="list-item-content">
            <div class="list-item-title">Téléphone</div>
            <a href="tel:+22507000000" style="font-size:12px;color:#16A34A">+225 07 00 00 00</a>
          </div>
        </div>
      </div>
    </div>

    <div style="text-align:center;padding:0 16px 32px;font-size:12px;color:#9CA3AF;line-height:1.7">
      Made with ❤️ à Abidjan, Côte d'Ivoire<br/>
      © 2026 COLISDIRECT. Tous droits réservés.
    </div>
  `;
}

/* ── SETTINGS ──────────────────────────────────────────────────── */
function renderSettings() {
  if (window.logDebug) window.logDebug("renderSettings: starts...");
  const el = document.getElementById('screen-settings');
  if (!el) {
    if (window.logDebug) window.logDebug("renderSettings ERROR: #screen-settings element not found");
    return;
  }

  try {
    if (window.logDebug) window.logDebug("renderSettings: generating and injecting HTML...");
    el.innerHTML = `
      <div class="app-header">
        <button class="header-back" onclick="Router.back()">${icon('chevronLeft', 18)}</button>
        <div class="header-title">Paramètres</div>
      </div>

      <div class="section-label">Notifications</div>
      <div class="card" style="margin:0 16px 12px">
        ${[
          { id: 'notif-colis', label: 'Mises à jour colis', sub: 'Statut et alertes de livraison', on: true },
          { id: 'notif-promo', label: 'Offres promotionnelles', sub: 'Réductions et codes promo', on: false },
          { id: 'notif-news',  label: 'Actualités ColisDirect', sub: 'Nouveaux services et fonctionnalités', on: true },
        ].map(item => `
          <div class="list-item">
            <div class="list-item-content">
              <div class="list-item-title">${item.label}</div>
              <div class="list-item-sub">${item.sub}</div>
            </div>
            <button id="${item.id}" class="switch ${item.on ? 'on' : ''}" onclick="this.classList.toggle('on')">
              <div class="switch-thumb"></div>
            </button>
          </div>
        `).join('')}
      </div>

      <div class="section-label">Apparence</div>
      <div class="card" style="margin:0 16px 12px">
        <div class="list-item" onclick="Toast.show('Thème sombre bientôt disponible', 'default')">
          <div class="list-item-icon" style="background:#F6F7F9">${icon('settings', 18, '#6B7280')}</div>
          <div class="list-item-content"><div class="list-item-title">Thème</div><div class="list-item-sub">Clair (par défaut)</div></div>
          <span class="badge badge-gray">Clair</span>
        </div>
        <div class="list-item" onclick="Toast.show('Langue française sélectionnée', 'default')">
          <div class="list-item-icon" style="background:#F6F7F9">${icon('globe', 18, '#6B7280')}</div>
          <div class="list-item-content"><div class="list-item-title">Langue</div><div class="list-item-sub">Français</div></div>
          <span class="badge badge-gray">FR</span>
        </div>
      </div>

      <div class="section-label">Sécurité</div>
      <div class="card" style="margin:0 16px 12px">
        <div class="list-item" onclick="showChangePwd()">
          <div class="list-item-icon" style="background:#FFF3E8">${icon('lock', 18, '#FF6C00')}</div>
          <div class="list-item-content"><div class="list-item-title">Changer le mot de passe</div></div>
          ${icon('chevronRight', 16, '#D1D5DB')}
        </div>
        <div class="list-item" onclick="Toast.show('Identification biométrique activée', 'success')">
          <div class="list-item-icon" style="background:#EEF4FF">${icon('shield', 18, '#2F6BE0')}</div>
          <div class="list-item-content"><div class="list-item-title">Authentification biométrique</div><div class="list-item-sub">Face ID / Empreinte</div></div>
          <button class="switch" onclick="this.classList.toggle('on');event.stopPropagation()"><div class="switch-thumb"></div></button>
        </div>
      </div>

      <div class="section-label">Données & Confidentialité</div>
      <div class="card" style="margin:0 16px 12px">
        <div class="list-item" onclick="clearCache()">
          <div class="list-item-icon" style="background:#FEF8E7">${icon('download', 18, '#F5B400')}</div>
          <div class="list-item-content"><div class="list-item-title">Vider le cache</div><div class="list-item-sub">Libérer de l'espace</div></div>
          ${icon('chevronRight', 16, '#D1D5DB')}
        </div>
        <div class="list-item" onclick="deleteAccount()">
          <div class="list-item-icon" style="background:#FEF2F2">${icon('xCircle', 18, '#DC2626')}</div>
          <div class="list-item-content"><div class="list-item-title" style="color:#DC2626">Supprimer mon compte</div></div>
          ${icon('chevronRight', 16, '#D1D5DB')}
        </div>
      </div>

      <div style="padding:16px 16px 32px;text-align:center;font-size:12px;color:#9CA3AF;line-height:1.7">
        Version 2.0.0 (build 2026.05.29)<br/>
        <button onclick="showTerms()" style="color:#FF6C00;font-weight:600;background:none;border:none;cursor:pointer;font-size:12px">CGU</button> · 
        <button onclick="showTerms()" style="color:#FF6C00;font-weight:600;background:none;border:none;cursor:pointer;font-size:12px">Confidentialité</button> · 
        <button onclick="Router.navigate('about')" style="color:#FF6C00;font-weight:600;background:none;border:none;cursor:pointer;font-size:12px">À propos</button>
      </div>
    `;
    if (window.logDebug) window.logDebug("renderSettings: HTML successfully generated and injected.");
  } catch (error) {
    el.innerHTML = `
      <div style="padding: 24px; color: #DC2626; background: #fff; height: 100%; overflow-y: auto;">
        <h3 style="font-size: 18px; font-weight: 800; margin-bottom: 12px;">Erreur de rendu (Paramètres)</h3>
        <p style="font-size: 14px; line-height: 1.5; color: #374151; margin-bottom: 16px;">
          Une exception a été levée pendant la génération du contenu de cette page.
        </p>
        <pre style="font-family: monospace; font-size: 12px; background: #FEF2F2; padding: 16px; border-radius: 12px; border: 1px solid #FEE2E2; overflow-x: auto; white-space: pre-wrap;">${error.stack || error.message || error}</pre>
      </div>
    `;
    console.error("Settings render error:", error);
  }
}

function showChangePwd() {
  Sheet.open(`
    <div style="padding:4px 0 16px">
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="form-group">
          <label class="form-label">Mot de passe actuel</label>
          <input class="form-input" id="old-pwd" type="password" placeholder="••••••••" />
        </div>
        <div class="form-group">
          <label class="form-label">Nouveau mot de passe</label>
          <input class="form-input" id="new-pwd" type="password" placeholder="Min. 6 caractères" />
        </div>
        <div class="form-group">
          <label class="form-label">Confirmer</label>
          <input class="form-input" id="confirm-pwd" type="password" placeholder="Même mot de passe" />
        </div>
        <button class="btn btn-primary btn-full" onclick="doChangePwd()">Changer le mot de passe</button>
        <button class="btn btn-ghost btn-full" onclick="Sheet.close()">Annuler</button>
      </div>
    </div>
  `, 'Mot de passe');
}

function doChangePwd() {
  const np = document.getElementById('new-pwd')?.value;
  const cp = document.getElementById('confirm-pwd')?.value;
  if (!np || np.length < 6) { Toast.show('Mot de passe trop court', 'warning'); return; }
  if (np !== cp) { Toast.show('Les mots de passe ne correspondent pas', 'error'); return; }
  Sheet.close();
  Toast.show('Mot de passe mis à jour !', 'success');
}

function clearCache() {
  Sheet.open(`
    <div style="text-align:center;padding:8px 0 12px">
      <div style="font-size:16px;font-weight:700;color:#1A1A1A;margin-bottom:8px">Vider le cache ?</div>
      <div style="font-size:13px;color:#6B7280;margin-bottom:20px">Cela supprimera les données temporaires. Vos colis et compte resteront intacts.</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-outline btn-full" onclick="Sheet.close()">Annuler</button>
        <button class="btn btn-primary btn-full" onclick="doClearCache()">Vider</button>
      </div>
    </div>
  `, 'Cache');
}

function doClearCache() {
  Sheet.close();
  Toast.show('Cache vidé (42 Mo libérés)', 'success');
}

function deleteAccount() {
  Sheet.open(`
    <div style="text-align:center;padding:8px 0 12px">
      <div style="width:56px;height:56px;background:#FEF2F2;border-radius:16px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center">
        ${icon('xCircle', 28, '#DC2626')}
      </div>
      <div style="font-size:16px;font-weight:700;color:#DC2626;margin-bottom:8px">Supprimer le compte ?</div>
      <div style="font-size:13px;color:#6B7280;margin-bottom:20px;line-height:1.5">Cette action est <strong>irréversible</strong>. Toutes vos données seront supprimées définitivement.</div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-outline btn-full" onclick="Sheet.close()">Annuler</button>
        <button class="btn btn-full" style="background:#DC2626;color:#fff;border-radius:14px" onclick="doDeleteAccount()">Supprimer</button>
      </div>
    </div>
  `, 'Suppression');
}

function doDeleteAccount() {
  doLogout();
  Sheet.close();
  Toast.show('Compte supprimé', 'success');
}

/* ── PARTNER ───────────────────────────────────────────────────── */
function renderPartner(options = {}) {
  const el = document.getElementById('screen-partner');
  if (!el) return;

  el.innerHTML = `
    <div class="app-header">
      <button class="header-back" onclick="Router.back()">${icon('chevronLeft', 18)}</button>
      <div class="header-title">Devenir partenaire</div>
    </div>

    <div style="background:linear-gradient(135deg,#FF6C00,#FF8533);padding:32px 16px 40px;text-align:center;position:relative;overflow:hidden">
      <div style="position:absolute;top:-50px;right:-50px;width:200px;height:200px;background:rgba(255,255,255,0.07);border-radius:50%"></div>
      <div style="font-size:24px;font-weight:900;color:#fff;margin-bottom:8px">Rejoignez ColisDirect</div>
      <p style="font-size:14px;color:rgba(255,255,255,0.85);line-height:1.5">Développez votre activité avec notre réseau de +50 000 envois par mois.</p>
    </div>

    <!-- Options -->
    <div style="padding:16px;display:flex;flex-direction:column;gap:12px;margin-top:-20px">
      <!-- Livreur -->
      <div class="card" style="padding:20px;border-radius:20px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
          <div style="width:52px;height:52px;background:linear-gradient(135deg,#FF6C00,#FF8533);border-radius:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            ${icon('bike', 26, 'white')}
          </div>
          <div>
            <div style="font-size:17px;font-weight:800;color:#1A1A1A">Devenir livreur</div>
            <div style="font-size:13px;color:#6B7280">Livreur agréé ColisDirect</div>
          </div>
        </div>
        ${['Travaillez à votre rythme, quand vous voulez', 'Gagnez jusqu\'à 150 000 FCFA/mois', 'Formation et équipement fournis', 'Application de gestion dédiée'].map(a => `
          <div style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;color:#3A3A3A">
            ${icon('checkCircle', 14, '#16A34A')} ${a}
          </div>
        `).join('')}
        <button class="btn btn-primary btn-full" style="margin-top:16px" onclick="showPartnerForm('livreur')">
          Postuler comme livreur ${icon('arrowRight', 16)}
        </button>
      </div>

      <!-- Point relais -->
      <div class="card" style="padding:20px;border-radius:20px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
          <div style="width:52px;height:52px;background:linear-gradient(135deg,#2F6BE0,#4F8DF7);border-radius:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            ${icon('store', 26, 'white')}
          </div>
          <div>
            <div style="font-size:17px;font-weight:800;color:#1A1A1A">Ouvrir un relais</div>
            <div style="font-size:13px;color:#6B7280">Point relais partenaire</div>
          </div>
        </div>
        ${['Revenus complémentaires garantis', 'Sans investissement matériel', 'Formation et support inclus', 'Intégration à notre réseau de +500 relais'].map(a => `
          <div style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;color:#3A3A3A">
            ${icon('checkCircle', 14, '#16A34A')} ${a}
          </div>
        `).join('')}
        <button class="btn btn-full" style="margin-top:16px;background:#2F6BE0;color:#fff;border-radius:14px;padding:13px;font-weight:700;font-size:14px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px" onclick="showPartnerForm('relais')">
          Devenir point relais ${icon('arrowRight', 16, 'white')}
        </button>
      </div>
    </div>
  `;

  // If specific partner type was requested, open that form immediately
  if (options && options.partnerType) {
    setTimeout(() => {
      showPartnerForm(options.partnerType);
    }, 150);
  }
}

function showPartnerForm(type) {
  Sheet.open(`
    <div style="padding:4px 0 16px">
      <div style="font-size:14px;color:#6B7280;margin-bottom:16px;line-height:1.5">Remplissez ce formulaire et notre équipe vous contactera sous 48h.</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div class="form-group">
          <label class="form-label">Nom complet</label>
          <input class="form-input" id="partner-name" placeholder="Votre nom" value="${State.user ? State.user.first_name + ' ' + State.user.last_name : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Téléphone</label>
          <input class="form-input" id="partner-phone" type="tel" placeholder="+225 07..." value="${State.user?.phone || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Commune</label>
          <input class="form-input" id="partner-commune" placeholder="Ex: Abidjan Cocody" />
        </div>
        ${type === 'relais' ? `
          <div class="form-group">
            <label class="form-label">Nom du commerce</label>
            <input class="form-input" id="partner-shop" placeholder="Ex: Boutique Aminata" />
          </div>
        ` : `
          <div class="form-group">
            <label class="form-label">Vous avez un véhicule ?</label>
            <select class="form-select">
              <option>Moto</option>
              <option>Voiture</option>
              <option>Vélo</option>
              <option>À pied</option>
            </select>
          </div>
        `}
        <button class="btn btn-primary btn-full" onclick="submitPartner('${type}')">
          Envoyer ma candidature
        </button>
        <button class="btn btn-ghost btn-full" onclick="Sheet.close()">Annuler</button>
      </div>
    </div>
  `, type === 'livreur' ? 'Candidature livreur' : 'Candidature point relais');
}

function submitPartner(type) {
  const name = document.getElementById('partner-name')?.value?.trim();
  const phone = document.getElementById('partner-phone')?.value?.trim();
  if (!name || !phone) { Toast.show('Remplissez les champs obligatoires', 'warning'); return; }
  Sheet.close();
  Toast.show(`Candidature ${type === 'livreur' ? 'livreur' : 'relais'} envoyée ! Nous vous contactons sous 48h.`, 'success', 5000);
}

/* ── CANCEL SHIPMENT ───────────────────────────────────────────── */
function renderCancelShipment(shipment) {
  // Handled via sheet modal
  if (shipment) promptCancelShipment(shipment.id);
}

/* ═══════════════════════════════════════════════════════════════════
   BUILD & INIT
═══════════════════════════════════════════════════════════════════ */
function buildApp() {
  const root = document.getElementById('app');
  root.innerHTML = `
    <!-- Splash -->
    <div id="splash" class="splash-screen">
      <div class="splash-logo">${LOGO_SPLASH}</div>
      <div class="splash-text">COLISDIRECT</div>
      <div class="splash-sub">La livraison simplifiée</div>
      <div style="margin-top:32px">
        <div class="spinner" style="width:30px;height:30px;border-top-color:rgba(255,255,255,0.9);border-color:rgba(255,255,255,0.2)"></div>
      </div>
    </div>

    <!-- Screens -->
    <div id="screen-home"             class="screen"></div>
    <div id="screen-shipments"        class="screen"></div>
    <div id="screen-tracking"         class="screen"></div>
    <div id="screen-tracking-detail"  class="screen"></div>
    <div id="screen-profile"          class="screen"></div>
    <div id="screen-notifications"    class="screen"></div>
    <div id="screen-login"            class="screen fullscreen" style="background:#fff"></div>
    <div id="screen-create-shipment"  class="screen fullscreen" style="background:#F6F7F9"></div>
    <div id="screen-map"              class="screen"></div>
    <div id="screen-pricing"          class="screen"></div>
    <div id="screen-about"            class="screen"></div>
    <div id="screen-settings"         class="screen"></div>
    <div id="screen-partner"          class="screen"></div>

    <!-- Bottom Nav -->
    <nav class="bottom-nav" id="bottom-nav">
      <div class="nav-item" data-screen="home" onclick="Router.navigate('home')">
        <div class="nav-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <span class="nav-label">Accueil</span>
      </div>
      <div class="nav-item" data-screen="shipments" onclick="Router.navigate('shipments')">
        <div class="nav-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
        </div>
        <span class="nav-label">Mes colis</span>
      </div>
      <div class="nav-item" data-screen="tracking" onclick="Router.navigate('tracking')">
        <div class="nav-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </div>
        <span class="nav-label">Suivre</span>
      </div>
      <div class="nav-item" data-screen="map" onclick="Router.navigate('map')">
        <div class="nav-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <span class="nav-label">Relais</span>
      </div>
      <div class="nav-item" data-screen="profile" onclick="Router.navigate('profile')">
        <div class="nav-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <span class="nav-label">Profil</span>
      </div>
    </nav>

    <!-- FAB -->
    <button class="fab-send" id="fab-send" onclick="Router.navigate('create-shipment')" title="Envoyer un colis">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
    </button>

    <!-- Sheet -->
    <div class="sheet-backdrop" id="sheet-backdrop" onclick="Sheet.close()"></div>
    <div class="bottom-sheet" id="bottom-sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-header"><div class="sheet-title"></div></div>
      <div class="sheet-body"></div>
    </div>

    <!-- Toast -->
    <div class="toast" id="toast"></div>
  `;
}

function init() {
  State.load();
  buildApp();

  // Dismiss splash
  setTimeout(() => {
    const splash = document.getElementById('splash');
    if (splash) {
      splash.classList.add('hidden');
      setTimeout(() => splash.remove(), 500);
    }
    Router.navigate('home');
  }, 1800);
}

document.addEventListener('DOMContentLoaded', init);
