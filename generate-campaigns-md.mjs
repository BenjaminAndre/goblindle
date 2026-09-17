#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourcePath = path.join(__dirname, 'web', 'static', 'campaigns.json');
const outputPath = path.join(__dirname, 'CAMPAIGNS.md');

const campaigns = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

const preferredOrder = ['campaign', 'gm', 'game', 'year', 'pj_max', 'duration', 'deaths', 'image'];
const fieldOrder = Array.from(
  new Set([...preferredOrder, ...campaigns.flatMap((campaign) => Object.keys(campaign))]),
);

const escapeMarkdown = (value) =>
  String(value)
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>');

const formatField = (field) => {
  if (!field || field.value === undefined || field.value === null) {
    return '';
  }

  const value = escapeMarkdown(field.value);
  const notes = Array.isArray(field.notes)
    ? field.notes.filter((note) => note !== undefined && note !== null && String(note).trim() !== '')
    : [];

  return notes.length ? `${value} (${notes.map((note) => escapeMarkdown(note)).join('; ')})` : value;
};

const headerLabels = fieldOrder.map((field) =>
  field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\bPj\b/, 'PJ')
    .replace(/\bPj Max\b/, 'PJ Max'),
);

const lines = [
  '# Campaigns',
  '',
  `Generated from \`web/static/campaigns.json\` with ${campaigns.length} entries.`,
  '',
  `| ${headerLabels.join(' | ')} |`,
  `| ${headerLabels.map(() => '---').join(' | ')} |`,
  ...campaigns.map((entry) =>
    `| ${fieldOrder.map((field) => formatField(entry[field])).join(' | ')} |`,
  ),
];

fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`Wrote ${campaigns.length} campaigns to ${path.relative(__dirname, outputPath)}`);
