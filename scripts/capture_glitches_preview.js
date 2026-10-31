const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ARTIFACT_DIR = 'C:\\Users\\NT\\.gemini\\antigravity\\brain\\dcb98c80-7143-40b1-bd3f-61cf81d8ed28';
const CHROME_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function capture() {
  const cdpPort = 9224;
  const userDataDir = path.join(__dirname, '..', '.tmp_capture_glitches_full');
  
  const browserProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1440,1100'
  ], { detached: false, stdio: 'ignore' });

  await sleep(2000);

  let ws = null;
  try {
    const listRes = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
    const tabs = await listRes.json();
    const pageTab = tabs.find(t => t.type === 'page') || tabs[0];
    const wsUrl = pageTab.webSocketDebuggerUrl;

    ws = new WebSocket(wsUrl);
    let msgId = 1;
    const pending = new Map();

    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    await send('Page.navigate', { url: 'http://localhost:3000' });
    await sleep(2500);

    // 1. Capture Header with 14-day Fresh Guarantee Telemetry
    const heroShot = await send('Page.captureScreenshot', { format: 'png' });
    const heroBuf = Buffer.from(heroShot.data, 'base64');
    const heroPath = path.join(ARTIFACT_DIR, 'retention_telemetry_preview.png');
    fs.writeFileSync(heroPath, heroBuf);
    console.log(`Saved hero & retention telemetry preview to: ${heroPath}`);

    // 2. Click Price Glitches navigation tab
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = document.querySelector('[data-nav="glitches"]');
          if (btn) btn.click();
        })()
      `,
      returnByValue: true
    });

    await sleep(2000);

    // Scroll to deals grid
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const banner = document.querySelector('.glitch-context-banner') || document.getElementById('dealsGrid');
          if (banner) banner.scrollIntoView({ behavior: 'instant', block: 'start' });
        })()
      `,
      returnByValue: true
    });

    await sleep(1000);

    const glitchShot = await send('Page.captureScreenshot', { format: 'png' });
    const glitchBuf = Buffer.from(glitchShot.data, 'base64');
    const glitchPath = path.join(ARTIFACT_DIR, 'verified_price_errors_preview.png');
    fs.writeFileSync(glitchPath, glitchBuf);
    console.log(`Saved verified price errors preview to: ${glitchPath}`);

  } catch (err) {
    console.error('Capture error:', err);
  } finally {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    browserProc.kill();
  }
}

capture();
