import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const host = '0.0.0.0';
const port = Number(process.env.PORT || 5173);
const routes = new Map([
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/drawing-chat', 'drawing-chat/index.html'],
  ['/drawing-chat/', 'drawing-chat/index.html'],
  ['/drawing-chat/index.html', 'drawing-chat/index.html'],
]);

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let pathname;
  try {
    pathname = new URL(request.url, 'http://localhost').pathname;
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }
  const file = routes.get(pathname);
  if (!file) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }
  try {
    const content = await readFile(join(root, file));
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': content.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Unable to read index.html');
    console.error(error);
  }
});

server.listen(port, host, () => {
  console.log(`Drawing Chat preview running at http://localhost:${port}`);
  console.log('GitHub Codespaces: Open the forwarded port 5173 in the Ports tab.');
});
