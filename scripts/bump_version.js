#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const indexPath = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');
const versionPattern = /v(\d+)\.(\d+)\.(\d+)/;
const match = html.match(versionPattern);

if (!match) {
  console.error('Version badge not found in index.html');
  process.exit(1);
}

const major = Number(match[1]);
const minor = Number(match[2]);
const patch = Number(match[3]) + 1;
const nextVersion = `v${major}.${minor}.${patch}`;
const nextHtml = html.replace(versionPattern, nextVersion);

if (nextHtml !== html) {
  fs.writeFileSync(indexPath, nextHtml, 'utf8');
}

process.stdout.write(nextVersion);
