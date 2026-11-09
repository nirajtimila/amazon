const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { WebSocket } = require('undici');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9248;
const ARTIFACT_DIR = 'C:\\Users\\NT\\.gemini\\antigravity\\brain\\dcb98c80-7143-40b1-bd3f-61cf81d8ed28';

async function capture() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-ss-'));
  const proc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tempDir}`,
    '--disable-extensions',
    '--disable-component-extensions-with-background-pages',
    '--no-default-browser-check',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,1100'
  ]);

  await new Promise(r => setTimeout(r, 2000));
  let ws;
  try {
    const listRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    const tabs = await listRes.json();
    const pageTab = tabs.find(t => t.type === 'page') || tabs[0];
    ws = new WebSocket(pageTab.webSocketDebuggerUrl);

    let msgId = 1;
    const callbacks = new Map();
    function send(method, params = {}) {
      return new Promise((res) => {
        const id = msgId++;
        callbacks.set(id, res);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onmessage = (e) => {
      const d = JSON.parse(e.data);
      if (d.id && callbacks.has(d.id)) {
        const resolve = callbacks.get(d.id);
        callbacks.delete(d.id);
        resolve(d.result);
      }
    };

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    await send('Page.enable');
    await send('Runtime.enable');

    console.log('Navigating to http://localhost:3000...');
    await send('Page.navigate', { url: 'http://localhost:3000' });
    await new Promise(r => setTimeout(r, 3000));

    // 1. Capture Steals of the Day scrolled to grid
    console.log('Capturing Steals of the Day...');
    await send('Runtime.evaluate', { expression: `
      document.getElementById('tabSteals')?.click();
      document.getElementById('dealsGrid')?.scrollIntoView({ behavior: 'instant', block: 'start' });
      window.scrollBy(0, -140);
    ` });
    await new Promise(r => setTimeout(r, 1200));
    const ss1 = await send('Page.captureScreenshot', { format: 'png' });
    if (ss1 && ss1.data) {
      fs.writeFileSync(path.join(ARTIFACT_DIR, 'steals_of_the_day_preview.png'), Buffer.from(ss1.data, 'base64'));
      console.log('Saved steals_of_the_day_preview.png');
    }

    // 2. Capture OzBargain Hot Deals scrolled to grid
    console.log('Capturing OzBargain Hot Deals...');
    await send('Runtime.evaluate', { expression: `
      document.getElementById('tabOzBargain')?.click();
      document.getElementById('dealsGrid')?.scrollIntoView({ behavior: 'instant', block: 'start' });
      window.scrollBy(0, -140);
    ` });
    await new Promise(r => setTimeout(r, 1200));
    const ss2 = await send('Page.captureScreenshot', { format: 'png' });
    if (ss2 && ss2.data) {
      fs.writeFileSync(path.join(ARTIFACT_DIR, 'ozbargain_hot_deals_preview.png'), Buffer.from(ss2.data, 'base64'));
      console.log('Saved ozbargain_hot_deals_preview.png');
    }

    console.log('Screenshots complete!');
  } finally {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    proc.kill('SIGTERM');
  }
}

capture().catch(e => console.error('Capture error:', e));
