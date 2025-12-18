import fs from 'node:fs';
import path from 'node:path';

function fail(msg) {
  console.error(`\n[环境校验] ${msg}\n`);
  process.exit(1);
}

function parsePnpmMajor(packageManagerField) {
  // e.g. "pnpm@9" or "pnpm@9.15.9"
  if (!packageManagerField || typeof packageManagerField !== 'string') return null;
  const m = packageManagerField.match(/^pnpm@(\d+)(?:\.\d+\.\d+)?(?:\+.*)?$/);
  return m?.[1] ? Number(m[1]) : null;
}

function getRepoRoot() {
  return process.cwd();
}

const root = getRepoRoot();
const pkgJsonPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

// 1) Enforce Node 18
const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor !== 18) {
  fail(
    `Node.js 版本必须为 18.x（当前：${process.versions.node}）。\n` +
      `- 如果你使用 nvm：nvm install 18 && nvm use\n` +
      `- 或者安装 Node 18 后再重试。\n`
  );
}

// 2) Enforce pnpm
const expectedPnpmMajor = parsePnpmMajor(pkg.packageManager) ?? 9;
const expectedPnpmHint =
  typeof pkg.packageManager === 'string' && pkg.packageManager.startsWith('pnpm@')
    ? pkg.packageManager
    : `pnpm@${expectedPnpmMajor}`;
const ua = process.env.npm_config_user_agent || '';
const lifecycle = process.env.npm_lifecycle_event || '';
const isInstallLifecycle = lifecycle === 'preinstall' || lifecycle === 'install' || lifecycle === 'postinstall';

// Example ua: "pnpm/9.15.9 npm/? node/v18.20.5 darwin arm64"
const pnpmMatch = ua.match(/\bpnpm\/(\d+\.\d+\.\d+)\b/);
const isPnpm = /\bpnpm\//.test(ua);

// 直接 `node scripts/check-env.mjs` 时，npm/pnpm 环境变量可能为空；这种情况只校验 Node 版本即可
if (!ua && !isInstallLifecycle) {
  process.exit(0);
}

if (!isPnpm) {
  fail(
    `包管理器必须使用 pnpm（当前 user agent：${ua || '(空)'}）。\n` +
      `建议使用 Corepack 统一 pnpm 版本：\n` +
      `  corepack enable\n` +
      `  corepack prepare ${expectedPnpmHint} --activate\n` +
      `然后执行：pnpm install\n`
  );
}

// 只限制 pnpm 大版本（例如 9.x）
const actual = pnpmMatch?.[1];
if (!actual) {
  fail(
    `无法从 user agent 解析 pnpm 版本（user agent：${ua || '(空)'}）。\n` +
      `请确保使用 pnpm 执行安装，并建议用 Corepack：\n` +
      `  corepack enable\n` +
      `  corepack prepare ${expectedPnpmHint} --activate\n`
  );
}

const actualMajor = Number(actual.split('.')[0]);
if (actualMajor !== expectedPnpmMajor) {
  fail(
    `pnpm 大版本必须为 ${expectedPnpmMajor}.x（当前：${actual}）。\n` +
      `修复方式（推荐）：\n` +
      `  corepack enable\n` +
      `  corepack prepare ${expectedPnpmHint} --activate\n`
  );
}

