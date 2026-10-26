import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve('projects');
const API_URL = process.env.API_URL || 'http://localhost:5000/api/translations/sync-catalog';
const API_SECRET = process.env.DEPLOY_SECRET || ''; 

const foundKeys = new Map();

const HTML_PIPE_REGEX = /['"]([a-zA-Z0-9_.-]+)['"]\s*\|\s*t(?::\s*(?:'([^']*)'|"([^"]*)"))?/g;
const TS_METHOD_REGEX = /translate\(\s*['"]([a-zA-Z0-9_.-]+)['"]\s*,\s*(?:'([^']*)'|"([^"]*)")\s*\)/g;

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.html') || entry.name.endsWith('.ts'))) {
      scanFile(fullPath);
    }
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  let match;
  while ((match = HTML_PIPE_REGEX.exec(content)) !== null) {
    const key = match[1];
    const defaultValue = match[2] || match[3] || key;
    if (!foundKeys.has(key)) {
      foundKeys.set(key, defaultValue);
    }
  }

  while ((match = TS_METHOD_REGEX.exec(content)) !== null) {
    const key = match[1];
    const defaultValue = match[2] || match[3] || key;
    if (!foundKeys.has(key)) {
      foundKeys.set(key, defaultValue);
    }
  }
}

console.log('🔍 [i18n-sync] Skanowanie szablonów HTML i plików TS...');
scanDirectory(SRC_DIR);

const payload = Array.from(foundKeys.entries()).map(([key, defaultValue]) => ({
  key,
  defaultValue
}));

console.log(`📦 [i18n-sync] Znaleziono ${payload.length} aktywnych kluczy w kodzie.`);

async function sendToBackend() {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (API_SECRET) {
      headers['X-Deploy-Secret'] = API_SECRET;
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        keys: payload,
        pruneStale: true 
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Status ${response.status}: ${errText}`);
    }

    const result = await response.json();
    console.log(`✅ [i18n-sync] Sukces! Dodano: ${result.added}, Zaktualizowano: ${result.updated}, Usunięto starych: ${result.pruned}.`);
  } catch (error) {
    console.warn(`⚠️ [i18n-sync] Nie udało się wysłać kluczy do backendu (${error.message}).`);
    if (process.env.CI) {
      process.exit(1);
    }
  }
}

await sendToBackend();