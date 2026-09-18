import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
const outDir = path.join(__dirname, '..', 'src', 'lib', 'generated');
const outFile = path.join(outDir, 'changelog.js');

const source = fs.readFileSync(changelogPath, 'utf8');
const html = markdownToHtml(source);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  outFile,
  `export const CHANGELOG_HTML = ${JSON.stringify(html)};\n`,
  'utf8',
);

function markdownToHtml(markdown) {
  const lines = String(markdown ?? '').split(/\r?\n/);
  const html = [];
  let inList = false;

  const escapeHtml = (value) =>
    value.replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));

  function flushList() {
    if (!inList) return;
    html.push('</ul>');
    inList = false;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }

    if (/^#{1,6}\s+/.test(line)) {
      flushList();
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      const level = match[1].length;
      const content = match[2].trim();
      html.push(`<h${level}>${escapeHtml(content)}</h${level}>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${escapeHtml(line.replace(/^[-*]\s+/, ''))}</li>`);
      continue;
    }

    if (/^>\s+/.test(line)) {
      flushList();
      html.push(`<blockquote>${escapeHtml(line.replace(/^>\s+/, ''))}</blockquote>`);
      continue;
    }

    if (/^\[.*\]\(.*\)$/.test(line)) {
      flushList();
      const match = line.match(/^\[(.*)\]\((.*)\)$/);
      const text = match[1];
      const href = match[2].replace(/"/g, '&quot;');
      html.push(`<p><a href="${href}">${escapeHtml(text)}</a></p>`);
      continue;
    }

    flushList();
    html.push(`<p>${escapeHtml(line)}</p>`);
  }

  flushList();
  return html.join('');
}
