// Node >=22, Chrome and ffmpeg; no npm browser dependency required.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createReadStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), 'celestine-demo-'));
const fps = 12;
const frames = 120;
const width = 800;
const height = 500;
let chrome;
let socket;
let chromeErrors = '';
const server = createServer(async (request, response) => {
  try {
    const path = resolve(
      root,
      `.${decodeURIComponent(new URL(request.url, 'http://localhost').pathname)}`,
    );
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) {
      response.writeHead(403).end();
      return;
    }
    const info = await stat(path);
    if (!info.isFile()) throw new Error('Not a file');
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
    response.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream' });
    createReadStream(path).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
});
async function command(program, args) {
  const child = spawn(program, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let errors = '';
  child.stderr.on('data', (data) => {
    errors += data;
  });
  const [code] = await once(child, 'close');
  if (code !== 0) throw new Error(`${program} exited ${code}: ${errors}`);
}
try {
  await stat(join(root, 'dist/index.js'));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  chrome = spawn(
    process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
    [
      '--headless',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--remote-debugging-port=0',
      `--user-data-dir=${join(temporary, 'profile')}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  chrome.stderr.on('data', (data) => {
    chromeErrors += data;
  });
  chrome.on('error', (error) => {
    chromeErrors += error.message;
  });
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      port = Number(
        (await readFile(join(temporary, 'profile/DevToolsActivePort'), 'utf8')).split('\n')[0],
      );
      break;
    } catch {
      if (chrome.exitCode !== null) break;
      await new Promise((done) => setTimeout(done, 100));
    }
  }
  if (!port) throw new Error(`Chrome did not expose CDP: ${chromeErrors}`);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await once(socket, 'open');
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    const callback = pending.get(message.id);
    if (callback) {
      pending.delete(message.id);
      if (message.error) callback.reject(new Error(JSON.stringify(message.error)));
      else callback.resolve(message.result);
    }
  });
  function cdp(method, params = {}) {
    return new Promise((resolveCall, reject) => {
      const call = ++id;
      const timeout = setTimeout(() => {
        pending.delete(call);
        reject(new Error(`CDP timeout: ${method}`));
      }, 20000);
      pending.set(call, {
        resolve: (result) => {
          clearTimeout(timeout);
          resolveCall(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
      socket.send(JSON.stringify({ id: call, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await cdp('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp('Page.navigate', {
    url: `http://127.0.0.1:${server.address().port}/examples/browser-natal-chart.html?src=local&play=1&capture=1`,
  });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    ready = await evaluate('Boolean(window.demoReady)');
    if (ready) break;
    await new Promise((done) => setTimeout(done, 100));
  }
  if (!ready)
    throw new Error(`Demo failed to initialize: ${await evaluate('document.body.innerText')}`);
  await evaluate('document.fonts.ready.then(() => true)');
  for (let frame = 0; frame < frames; frame++) {
    await evaluate(`window.demoFrame(${frame})`);
    const error = await evaluate('window.demoError');
    if (error) throw new Error(error);
    const result = await cdp('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    await writeFile(
      join(temporary, `${String(frame).padStart(3, '0')}.png`),
      Buffer.from(result.data, 'base64'),
    );
  }
  await mkdir(join(root, 'assets'), { recursive: true });
  const output = join(root, 'assets/demo.gif');
  const input = [
    '-y',
    '-v',
    'error',
    '-threads',
    '1',
    '-framerate',
    String(fps),
    '-i',
    join(temporary, '%03d.png'),
  ];
  for (const colors of [96, 64, 32]) {
    await command('/usr/bin/ffmpeg', [
      ...input,
      '-vf',
      `palettegen=max_colors=${colors}:stats_mode=diff`,
      '-frames:v',
      '1',
      '-threads',
      '1',
      join(temporary, 'palette.png'),
    ]);
    await command('/usr/bin/ffmpeg', [
      ...input,
      '-i',
      join(temporary, 'palette.png'),
      '-lavfi',
      'paletteuse=dither=none:diff_mode=rectangle',
      '-loop',
      '0',
      '-threads',
      '1',
      output,
    ]);
    if ((await stat(output)).size <= 2000000) break;
  }
  const bytes = (await stat(output)).size;
  if (bytes > 2000000) throw new Error(`GIF exceeds 2 MB: ${bytes} bytes`);
  console.log(
    `assets/demo.gif: ${bytes} bytes; ${frames / fps} s; ${fps} fps; ${width}×${height}; ${frames} deterministic daily frames`,
  );
} finally {
  socket?.close();
  if (chrome && chrome.exitCode === null) {
    chrome.kill();
    await once(chrome, 'close');
  }
  server.close();
  await rm(temporary, { recursive: true, force: true });
}
