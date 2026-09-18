import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
const outDir = path.join(__dirname, '..', 'static');
const outFile = path.join(outDir, 'changelog.html');

const source = fs.readFileSync(changelogPath, 'utf8');
const html = marked.parse(source);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, html, 'utf8');
