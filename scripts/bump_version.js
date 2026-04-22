#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const indexPath = path.resolve(__dirname, '..', 'index.html');
const packagePath = path.resolve(__dirname, '..', 'package.json');
const lockPath = path.resolve(__dirname, '..', 'package-lock.json');
const versionPattern = /(\d+)\.(\d+)\.(\d+)/;
const htmlVersionPattern = /v(\d+)\.(\d+)\.(\d+)/;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function normalizeVersion(input) {
  if (!input) return null;
  const clean = String(input).trim().replace(/^v/i, '');
  if (!versionPattern.test(clean)) return null;
  return clean;
}

function bumpPatch(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

function syncAll(version) {
  const packageJson = readJson(packagePath);
  const packageLock = readJson(lockPath);
  const html = fs.readFileSync(indexPath, 'utf8');
  const htmlMatch = html.match(htmlVersionPattern);

  if (!htmlMatch) {
    console.error('Version badge not found in index.html');
    process.exit(1);
  }

  packageJson.version = version;
  packageLock.version = version;
  if (packageLock.packages && packageLock.packages['']) {
    packageLock.packages[''].version = version;
  }

  const nextHtml = html.replace(htmlVersionPattern, `v${version}`);

  writeJson(packagePath, packageJson);
  writeJson(lockPath, packageLock);
  fs.writeFileSync(indexPath, nextHtml, 'utf8');
}

const packageJson = readJson(packagePath);
const explicitVersion = normalizeVersion(process.argv[2]);
const syncMode = process.argv.includes('--sync');
const currentVersion = normalizeVersion(packageJson.version);

if (!currentVersion) {
  console.error('package.json version not found or invalid');
  process.exit(1);
}

const targetVersion = explicitVersion || (syncMode ? currentVersion : bumpPatch(currentVersion));
syncAll(targetVersion);
process.stdout.write(`v${targetVersion}`);
