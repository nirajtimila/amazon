const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9246;
const BASE_URL = 'http://localhost:3000';
const ARTIFACT_DIR = 'C:\\Users\\NT\\.gemini\\antigravity\\brain\\dcb98c80-7143-40b1-bd3f-61cf81d8ed28';

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-vis2-'));
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tempDir}`,
    '--disable-extensions',
    '--no-default-browser-check',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,1200'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  let msgId = 1;
  const callbacks = new Map();

  const vRes = await fetch(`http://127.0.0.1:${PORT}/json/version`);
  const vData = await vRes.json();
  const ws = new WebSocket(vData.webSocketDebuggerUrl);

  await new Promise(r => ws.onopen = r);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && callbacks.has(data.id)) {
      callbacks.get(data.id)(data.result);
      callbacks.delete(data.id);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      callbacks.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const targetRes = await send('Target.createTarget', { url: BASE_URL });
  const pageTargetId = targetRes.targetId;
  const attachRes = await send('Target.attachToTarget', { targetId: pageTargetId, flatten: true });
  const sessionId = attachRes.sessionId;

  function sendPage(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      callbacks.set(id, resolve);
      ws.send(JSON.stringify({ id, sessionId, method, params }));
    });
  }

  await sendPage('Page.enable');
  await sendPage('Runtime.enable');

  async function evaluate(expression) {
    const res = await sendPage('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res && res.result ? res.result.value : null;
  }

  async function captureScreenshot(filePath) {
    const res = await sendPage('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
    console.log(`Saved screenshot: ${filePath}`);
  }

  await new Promise(r => setTimeout(r, 2500));

  // Scroll down to cards grid
  await evaluate(`(() => {
    const grid = document.getElementById('dealsGrid');
    if (grid) grid.scrollIntoView({ behavior: 'instant', block: 'start' });
  })()`);
  await new Promise(r => setTimeout(r, 600));
  await captureScreenshot(path.join(ARTIFACT_DIR, 'au_deals_strict_isolation_preview.png'));

  // Sniped tab view
  await evaluate(`(() => {
    const tab = document.getElementById('tabSnipedDeals');
    if (tab) tab.click();
    const grid = document.getElementById('dealsGrid');
    if (grid) grid.scrollIntoView({ behavior: 'instant', block: 'start' });
  })()`);
  await new Promise(r => setTimeout(r, 800));
  await captureScreenshot(path.join(ARTIFACT_DIR, 'au_sniped_deals_preview.png'));

  chromeProc.kill('SIGINT');
  console.log('Visual verification complete!');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error in visual capture:', err);
  process.exit(1);
});
