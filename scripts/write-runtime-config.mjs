// Writes dist/<app>/browser/config.json from environment variables after a build.
// Usage: node scripts/write-runtime-config.mjs user-app
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const app = process.argv[2];
if (!app) {
  console.error('Usage: node scripts/write-runtime-config.mjs <app>');
  process.exit(1);
}

const backendOrigin = (process.env.BACKEND_ORIGIN ?? '').trim().replace(/\/+$/, '');
if (backendOrigin && !/^https?:\/\/[^/]+$/.test(backendOrigin)) {
  console.error(`BACKEND_ORIGIN must be an origin like https://api.example.com, got "${backendOrigin}"`);
  process.exit(1);
}

const dir = join('dist', app, 'browser');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'config.json'), JSON.stringify({ backendOrigin }, null, 2) + '\n');
console.log(`Wrote ${join(dir, 'config.json')} (backendOrigin="${backendOrigin}")`);
