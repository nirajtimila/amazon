const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9244;
const BASE_URL = 'http://localhost:3000';
const artifactDir = 'C:\\Users\\NT\\.gemini\\antigravity\\brain\\dcb98c80-7143-40b1-bd3f-61cf81d8ed28';

async function run() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-shot-'));
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tempDir}`,
    '--disable-extensions',
    '--disable-component-extensions-with-background-pages',
    '--no-default-browser-check',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,1080'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  let ws;
  let msgId = 1;
  const callbacks = new Map();

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      callbacks.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res.result ? res.result.value : undefined;
  }

  try {
    const listRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    const tabs = await listRes.json();
    const pageTab = tabs.find(t => t.type === 'page') || tabs[0];
    const wsUrl = pageTab.webSocketDebuggerUrl;

    ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && callbacks.has(data.id)) {
        const resolve = callbacks.get(data.id);
        callbacks.delete(data.id);
        resolve(data.result);
      }
    };

    await send('Page.enable');
    await send('Page.navigate', { url: BASE_URL });
    await new Promise(r => setTimeout(r, 2500));

    // 1. Switch to Sniped tab
    await evaluate(`(() => {
      const tab = document.getElementById('tabSnipedDeals');
      if (tab) tab.click();
      document.getElementById('dealsGrid')?.scrollIntoView({ behavior: 'instant', block: 'start' });
    })()`);
    await new Promise(r => setTimeout(r, 1200));

    // Screenshot 1: All Snipers View with Filter Pills
    const shot1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactDir, 'sniper_all_targets_preview.png'), Buffer.from(shot1.data, 'base64'));
    console.log('Saved sniper_all_targets_preview.png');

    // 2. Filter by PS
    await evaluate(`(() => {
      const psPill = Array.from(document.querySelectorAll('.sniper-target-pill')).find(p => p.textContent.includes('PS'));
      if (psPill) psPill.click();
      document.getElementById('dealsGrid')?.scrollIntoView({ behavior: 'instant', block: 'start' });
    })()`);
    await new Promise(r => setTimeout(r, 800));

    // Screenshot 2: PS Filtered View
    const shot2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactDir, 'sniper_ps_filtered_preview.png'), Buffer.from(shot2.data, 'base64'));
    console.log('Saved sniper_ps_filtered_preview.png');

    // 3. Filter by Glasses
    await evaluate(`(() => {
      const glPill = Array.from(document.querySelectorAll('.sniper-target-pill')).find(p => p.textContent.includes('Glasses'));
      if (glPill) glPill.click();
      document.getElementById('dealsGrid')?.scrollIntoView({ behavior: 'instant', block: 'start' });
    })()`);
    await new Promise(r => setTimeout(r, 800));

    // Screenshot 3: Glasses Filtered View
    const shot3 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactDir, 'sniper_glasses_filtered_preview.png'), Buffer.from(shot3.data, 'base64'));
    console.log('Saved sniper_glasses_filtered_preview.png');

    // 4. Open Watchlist Modal
    await evaluate(`(() => {
      window.scrollTo(0, 0);
      const btn = document.getElementById('watchlistModalBtn');
      if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 800));

    // Screenshot 4: Watchlist Modal with Match Buttons
    const shot4 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactDir, 'sniper_watchlist_modal_preview.png'), Buffer.from(shot4.data, 'base64'));
    console.log('Saved sniper_watchlist_modal_preview.png');

    ws.close();
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    try {
      chromeProc.kill('SIGKILL');
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

run();
