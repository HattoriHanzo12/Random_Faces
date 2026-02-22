#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { validateManifest, manifestPath, configPath, loadJson } = require('./validate_manifest');

const HIRO_BASE = 'https://api.hiro.so/ordinals/v1';
const ORD_CONTENT_BASE = 'https://ordinals.com/content';
const MEMPOOL_TIP_HEIGHT_URL = 'https://mempool.space/api/blocks/tip/height';
const ISSUE_MARKER = '<!-- mint-watch-digest -->';

const DEFAULTS = {
  lookbackHours: Number.parseInt(process.env.MINT_WATCH_LOOKBACK_HOURS || '72', 10),
  maxPages: Number.parseInt(process.env.MINT_WATCH_MAX_PAGES || '10', 10),
  confirmations: Number.parseInt(process.env.MINT_WATCH_CONFIRMATIONS || '1', 10),
  pageSize: Number.parseInt(process.env.MINT_WATCH_PAGE_SIZE || '60', 10),
  outDir: process.env.MINT_WATCH_OUT_DIR || path.join(process.cwd(), '.mint-watch')
};

function isFinitePositiveInt(value, fallback) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function normalizeOptions(input) {
  return {
    lookbackHours: isFinitePositiveInt(Number(input.lookbackHours), 72),
    maxPages: isFinitePositiveInt(Number(input.maxPages), 10),
    confirmations: Math.max(0, Math.floor(Number.isFinite(Number(input.confirmations)) ? Number(input.confirmations) : 1)),
    pageSize: Math.min(60, Math.max(1, Math.floor(Number.isFinite(Number(input.pageSize)) ? Number(input.pageSize) : 60))),
    outDir: String(input.outDir || DEFAULTS.outDir)
  };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    if (key === 'help') {
      args.help = true;
      continue;
    }
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }
    args[key] = value;
    i += 1;
  }
  return args;
}

function usage() {
  console.log(`Usage:\nnode src/mint_watch.js [--lookback-hours 72] [--max-pages 10] [--confirmations 1] [--out-dir .mint-watch]`);
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.writeFileSync(filePath, String(value));
}

function fileSha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function safeLower(value) {
  return String(value || '').trim().toLowerCase();
}

function isHtmlMime(value) {
  const v = safeLower(value);
  return v === 'text/html' || v.startsWith('text/html;');
}

function toIsoFromMs(ms) {
  if (!Number.isFinite(ms)) return '';
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

function parseSeedFromMintHtml(html) {
  const seedLiteralMatch = String(html || '').match(/const\s+seed\s*=\s*("(?:\\.|[^"\\])*")\s*;/);
  if (!seedLiteralMatch) {
    return { seed: null, error: 'seed_not_found' };
  }

  try {
    const seed = JSON.parse(seedLiteralMatch[1]);
    if (typeof seed !== 'string') {
      return { seed: null, error: 'seed_not_string' };
    }
    return { seed, error: null };
  } catch {
    return { seed: null, error: 'seed_parse_error' };
  }
}

function parseLogicIdFromMintHtml(html) {
  const match = String(html || '').match(/import\s*\{\s*renderFromSeed\s*\}\s*from\s*["']\/content\/([a-f0-9]{64}i\d+)["']/i);
  return match ? match[1] : null;
}

async function fetchWithTimeout(url, { timeoutMs = 15000, headers = {} } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RandomFacesMintWatcher/1.0 (+https://github.com/HattoriHanzo12/Random_Faces)',
        ...headers
      },
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url, opts = {}) {
  const response = await fetchWithTimeout(url, opts);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} for ${url}${body ? `: ${body.slice(0, 300)}` : ''}`);
  }
  return response.json();
}

async function fetchText(url, opts = {}) {
  const response = await fetchWithTimeout(url, opts);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} for ${url}${body ? `: ${body.slice(0, 300)}` : ''}`);
  }
  return response.text();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryAsync(fn, { attempts = 3, baseDelayMs = 500 } = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts) {
        break;
      }
      await sleep(baseDelayMs * attempt);
    }
  }
  throw lastError || new Error('retryAsync failed');
}

async function getTipHeight() {
  try {
    const text = await fetchText(MEMPOOL_TIP_HEIGHT_URL, { timeoutMs: 10000 });
    const height = Number.parseInt(String(text).trim(), 10);
    return Number.isFinite(height) ? height : null;
  } catch {
    return null;
  }
}

async function listHiroRecursiveHtml({ offset, limit }) {
  const baseParams = {
    recursive: 'true',
    order_by: 'number',
    order: 'desc',
    limit: String(limit),
    offset: String(offset)
  };

  const attempts = [
    { ...baseParams, mime_type: 'text/html' },
    baseParams
  ];

  let lastError = null;
  for (const query of attempts) {
    const params = new URLSearchParams(query);
    const url = `${HIRO_BASE}/inscriptions?${params.toString()}`;
    try {
      const payload = await retryAsync(
        () => fetchJson(url, { timeoutMs: 45000 }),
        { attempts: 2, baseDelayMs: 750 }
      );
      const results = Array.isArray(payload.results) ? payload.results : [];
      return { results, total: Number(payload.total || 0), url };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Hiro list query failed');
}

async function fetchMintHtml(inscriptionId) {
  const ordUrl = `${ORD_CONTENT_BASE}/${inscriptionId}`;
  try {
    const html = await fetchText(ordUrl, { timeoutMs: 15000 });
    return { html, source: 'ordinals', error: null };
  } catch (error) {
    const hiroUrl = `${HIRO_BASE}/inscriptions/${inscriptionId}/content`;
    try {
      const html = await fetchText(hiroUrl, { timeoutMs: 15000 });
      return { html, source: 'hiro', error: null };
    } catch (fallbackError) {
      return {
        html: null,
        source: null,
        error: `ordinals: ${error.message}; hiro: ${fallbackError.message}`
      };
    }
  }
}

function normalizeHiroRow(row) {
  const id = String(row.id || '').trim();
  const recursionRefs = Array.isArray(row.recursion_refs)
    ? row.recursion_refs.map((value) => String(value || '').trim()).filter(Boolean)
    : [];

  const ts = Number(row.genesis_timestamp);
  const genesisTimestampMs = Number.isFinite(ts) ? ts : null;
  const mintedAt = toIsoFromMs(genesisTimestampMs);
  const number = Number.isFinite(Number(row.number)) ? Number(row.number) : null;
  const blockHeight = Number.isFinite(Number(row.genesis_block_height)) ? Number(row.genesis_block_height) : null;

  return {
    inscriptionId: id,
    inscriptionNumber: number,
    recursive: row.recursive === true,
    recursionRefs,
    address: String(row.address || '').trim(),
    genesisTimestampMs,
    mintedAt,
    genesisBlockHeight: blockHeight,
    mimeType: String(row.mime_type || row.content_type || '').trim(),
    explorerUrl: id ? `https://ordinals.com/inscription/${id}` : ''
  };
}

function hasRequiredConfirmations(candidate, tipHeight, confirmationsNeeded, nowMs) {
  if (confirmationsNeeded <= 0) {
    return { confirmed: true, method: 'none' };
  }

  if (Number.isFinite(candidate.genesisBlockHeight) && Number.isFinite(tipHeight)) {
    const delta = tipHeight - candidate.genesisBlockHeight;
    return {
      confirmed: delta >= confirmationsNeeded,
      method: 'block_height',
      detail: { tipHeight, genesisBlockHeight: candidate.genesisBlockHeight, delta }
    };
  }

  if (Number.isFinite(candidate.genesisTimestampMs)) {
    const ageMs = nowMs - candidate.genesisTimestampMs;
    const requiredAgeMs = Math.max(1, confirmationsNeeded) * 10 * 60 * 1000;
    return {
      confirmed: ageMs >= requiredAgeMs,
      method: 'age_fallback',
      detail: { ageMs, requiredAgeMs }
    };
  }

  return { confirmed: false, method: 'unavailable' };
}

function nextSlugAndTitle(index1Based) {
  const n = String(index1Based).padStart(3, '0');
  return {
    slug: `classic-face-${n}`,
    title: `Classic Face ${n}`
  };
}

function buildIssueDigest({ run, prUrl }) {
  const lines = [];
  const stableSource = {
    logicInscriptionId: run.logicInscriptionId,
    eligible: run.eligible.map((c) => ({ id: c.inscriptionId, seed: c.seed, wallet: c.address, mintedAt: c.mintedAt, proposal: c.proposedEntry })),
    rejected: run.rejected.map((c) => ({ id: c.inscriptionId, status: c.status, reason: c.reason, wallet: c.address || '', mintedAt: c.mintedAt || '' })),
    detectedCount: run.detectedCount,
    ignoredExistingCount: run.ignoredExistingCount,
    errors: [...run.errors]
  };
  const stableHash = fileSha256(JSON.stringify(stableSource));

  lines.push(ISSUE_MARKER);
  lines.push(`<!-- mint-watch-stable-hash:${stableHash} -->`);
  lines.push('## Mint Watch Digest');
  lines.push('');
  lines.push(`Last scan: ${run.scannedAt}`);
  lines.push(`Logic inscription: \`${run.logicInscriptionId}\``);
  lines.push('');
  lines.push(`- Confirmed candidate detections (not already in manifest): ${run.detectedCount}`);
  lines.push(`- Eligible proposals: ${run.eligible.length}`);
  lines.push(`- Rejected detections: ${run.rejected.length}`);
  lines.push(`- Ignored (already in manifest): ${run.ignoredExistingCount}`);
  if (prUrl) {
    lines.push(`- Draft PR: ${prUrl}`);
  }
  lines.push('');

  if (run.eligible.length > 0) {
    lines.push('### Eligible Proposals');
    lines.push('');
    run.eligible.forEach((c) => {
      lines.push(`- [${c.inscriptionId}](${c.explorerUrl}) -> \`${c.proposedEntry.slug}\` (${c.proposedEntry.title}), seed \`${c.seed}\`, wallet \`${c.address}\`, minted ${c.mintedAt}`);
    });
    lines.push('');
  }

  if (run.rejected.length > 0) {
    lines.push('### Rejected / Non-Eligible');
    lines.push('');
    run.rejected.forEach((c) => {
      const reason = c.reason ? ` (${c.reason})` : '';
      lines.push(`- [${c.inscriptionId}](${c.explorerUrl}) -> \`${c.status}\`${reason}${c.address ? `, wallet \`${c.address}\`` : ''}${c.mintedAt ? `, minted ${c.mintedAt}` : ''}`);
    });
    lines.push('');
  }

  if (run.errors.length > 0) {
    lines.push('### Watcher Errors');
    lines.push('');
    run.errors.forEach((error) => lines.push(`- ${error}`));
    lines.push('');
  }

  return {
    body: `${lines.join('\n').trimEnd()}\n`,
    stableHash
  };
}

function buildPrBody({ run }) {
  const lines = [];
  lines.push('## Mint Watch Inbox (Draft)');
  lines.push('');
  lines.push('Automated proposal generated from detected recursive HTML inscriptions referencing the current Random Faces renderer logic inscription.');
  lines.push('');
  lines.push(`- Scan time: ${run.scannedAt}`);
  lines.push(`- Logic inscription: \`${run.logicInscriptionId}\``);
  lines.push(`- Eligible proposals in this draft: ${run.eligible.length}`);
  lines.push(`- Rejected detections observed: ${run.rejected.length}`);
  lines.push('');

  if (run.eligible.length > 0) {
    lines.push('### Proposed Manifest Additions');
    lines.push('');
    run.eligible.forEach((c) => {
      lines.push(`- \`${c.proposedEntry.slug}\` / ${c.proposedEntry.title}`);
      lines.push(`  - inscription: ${c.inscriptionId}`);
      lines.push(`  - seed: ${c.seed}`);
      lines.push(`  - wallet: ${c.address}`);
      lines.push(`  - mintedAt: ${c.mintedAt}`);
      lines.push(`  - ordinals: ${c.explorerUrl}`);
    });
    lines.push('');
  }

  if (run.rejected.length > 0) {
    lines.push('### Rejected / Non-Eligible Detections (for review visibility)');
    lines.push('');
    run.rejected.forEach((c) => {
      lines.push(`- \`${c.status}\`: ${c.inscriptionId}${c.reason ? ` (${c.reason})` : ''}`);
    });
    lines.push('');
  }

  lines.push('### Reviewer Checklist');
  lines.push('');
  lines.push('- Confirm each proposed inscription renders correctly on ordinals.com and matches expected Random Faces style.');
  lines.push('- Confirm one-mint-per-wallet and first-come ordering still make sense for any edge cases.');
  lines.push('- Merge only when ready to publish these entries to the official gallery (merge updates `main` and deploys Pages).');
  lines.push('');
  lines.push('This PR is draft-only and should not be auto-merged.');

  return `${lines.join('\n').trimEnd()}\n`;
}

function buildSummary({ run, proposalChanged }) {
  const lines = [];
  lines.push('# Mint Watch Run');
  lines.push('');
  lines.push(`- Scan time: ${run.scannedAt}`);
  lines.push(`- Logic inscription: \`${run.logicInscriptionId}\``);
  lines.push(`- Lookback hours: ${run.options.lookbackHours}`);
  lines.push(`- Max pages: ${run.options.maxPages}`);
  lines.push(`- Confirmations required: ${run.options.confirmations}`);
  lines.push(`- Hiro pages fetched: ${run.scanStats.pagesFetched}`);
  lines.push(`- Hiro rows scanned: ${run.scanStats.rowsScanned}`);
  lines.push(`- Candidates matched logic inscription: ${run.scanStats.logicMatched}`);
  lines.push(`- Confirmed candidate detections (not already in manifest): ${run.detectedCount}`);
  lines.push(`- Eligible proposals: ${run.eligible.length}`);
  lines.push(`- Rejected detections: ${run.rejected.length}`);
  lines.push(`- Ignored already in manifest: ${run.ignoredExistingCount}`);
  lines.push(`- Proposal manifest changed: ${proposalChanged ? 'yes' : 'no'}`);
  if (Number.isFinite(run.tipHeight)) {
    lines.push(`- Tip height used: ${run.tipHeight}`);
  } else {
    lines.push('- Tip height used: unavailable (age fallback may apply)');
  }
  if (run.errors.length > 0) {
    lines.push('');
    lines.push('## Errors');
    lines.push('');
    run.errors.forEach((error) => lines.push(`- ${error}`));
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

function extractStableHashFromDigest(body) {
  const match = String(body || '').match(/<!--\s*mint-watch-stable-hash:([a-f0-9]{64})\s*-->/i);
  return match ? match[1] : '';
}

function setStepOutputs(outputs) {
  if (!process.env.GITHUB_OUTPUT) return;
  const lines = [];
  for (const [key, value] of Object.entries(outputs)) {
    if (value === undefined || value === null) continue;
    lines.push(`${key}=${String(value)}`);
  }
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
}

function sortCandidatesForClassification(items) {
  return [...items].sort((a, b) => {
    const tA = Number.isFinite(a.genesisTimestampMs) ? a.genesisTimestampMs : Number.MAX_SAFE_INTEGER;
    const tB = Number.isFinite(b.genesisTimestampMs) ? b.genesisTimestampMs : Number.MAX_SAFE_INTEGER;
    if (tA !== tB) return tA - tB;
    const nA = Number.isFinite(a.inscriptionNumber) ? a.inscriptionNumber : Number.MAX_SAFE_INTEGER;
    const nB = Number.isFinite(b.inscriptionNumber) ? b.inscriptionNumber : Number.MAX_SAFE_INTEGER;
    if (nA !== nB) return nA - nB;
    return a.inscriptionId.localeCompare(b.inscriptionId);
  });
}

async function main() {
  let cliArgs = {};
  try {
    cliArgs = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    usage();
    process.exit(1);
  }
  if (cliArgs.help) {
    usage();
    return;
  }

  const options = normalizeOptions({
    ...DEFAULTS,
    ...cliArgs,
    lookbackHours: cliArgs['lookback-hours'] || DEFAULTS.lookbackHours,
    maxPages: cliArgs['max-pages'] || DEFAULTS.maxPages,
    confirmations: cliArgs.confirmations || DEFAULTS.confirmations,
    pageSize: cliArgs['page-size'] || DEFAULTS.pageSize,
    outDir: cliArgs['out-dir'] || DEFAULTS.outDir
  });

  mkdirp(options.outDir);

  const now = new Date();
  const nowMs = now.getTime();
  const cutoffMs = nowMs - options.lookbackHours * 60 * 60 * 1000;

  let manifest;
  let config;
  try {
    manifest = loadJson(manifestPath);
    config = loadJson(configPath);
  } catch (error) {
    console.error(`Failed to load manifest/config: ${error.message}`);
    process.exit(1);
  }

  const logicInscriptionId = String(config.logicInscriptionId || '').trim();
  if (!logicInscriptionId) {
    console.error('logicInscriptionId is empty in data/inscription_config.json');
    process.exit(1);
  }

  const manifestValidation = validateManifest(manifest, config);
  if (manifestValidation.errors.length > 0) {
    console.error('Manifest/config validation failed before mint watch scan:');
    manifestValidation.errors.forEach((e) => console.error(`- ${e}`));
    process.exit(1);
  }

  const existingInscriptions = new Set();
  const existingWallets = new Set();
  const existingSlugs = new Set();
  for (const item of manifest) {
    if (item && typeof item === 'object') {
      if (item.inscriptionId) existingInscriptions.add(safeLower(item.inscriptionId));
      if (item.minterAddress) existingWallets.add(safeLower(item.minterAddress));
      if (item.slug) existingSlugs.add(safeLower(item.slug));
    }
  }

  const run = {
    scannedAt: now.toISOString(),
    logicInscriptionId,
    options,
    tipHeight: null,
    scanStats: {
      pagesFetched: 0,
      rowsScanned: 0,
      logicMatched: 0
    },
    candidates: [],
    eligible: [],
    rejected: [],
    ignoredExistingCount: 0,
    detectedCount: 0,
    errors: []
  };

  run.tipHeight = await getTipHeight();

  const seenCandidateIds = new Set();
  let stopBecauseOld = false;

  for (let pageIndex = 0; pageIndex < options.maxPages && !stopBecauseOld; pageIndex += 1) {
    const offset = pageIndex * options.pageSize;
    let page;
    try {
      page = await listHiroRecursiveHtml({ offset, limit: options.pageSize });
    } catch (error) {
      run.errors.push(`Hiro list query failed at offset ${offset}: ${error.message}`);
      break;
    }

    run.scanStats.pagesFetched += 1;
    const rows = Array.isArray(page.results) ? page.results : [];
    if (rows.length === 0) {
      break;
    }

    let pageOldestMs = Number.POSITIVE_INFINITY;

    for (const rawRow of rows) {
      run.scanStats.rowsScanned += 1;
      const row = normalizeHiroRow(rawRow);
      if (!row.inscriptionId) continue;

      if (Number.isFinite(row.genesisTimestampMs)) {
        pageOldestMs = Math.min(pageOldestMs, row.genesisTimestampMs);
      }

      if (!row.recursive) continue;
      if (!isHtmlMime(row.mimeType)) continue;

      const refMatch = row.recursionRefs.some((ref) => safeLower(ref) === safeLower(logicInscriptionId));
      if (!refMatch) continue;
      run.scanStats.logicMatched += 1;

      const key = safeLower(row.inscriptionId);
      if (seenCandidateIds.has(key)) continue;
      seenCandidateIds.add(key);

      if (existingInscriptions.has(key)) {
        run.ignoredExistingCount += 1;
        continue;
      }

      if (Number.isFinite(row.genesisTimestampMs) && row.genesisTimestampMs < cutoffMs) {
        // Candidate is outside lookback; skip but allow page-level cutoff to stop future pages.
        continue;
      }

      const confirm = hasRequiredConfirmations(row, run.tipHeight, options.confirmations, nowMs);
      if (!confirm.confirmed) {
        continue;
      }

      run.candidates.push({
        ...row,
        confirmation: confirm
      });
    }

    if (Number.isFinite(pageOldestMs) && pageOldestMs < cutoffMs) {
      stopBecauseOld = true;
    }
  }

  const sortedCandidates = sortCandidatesForClassification(run.candidates);
  run.detectedCount = sortedCandidates.length;

  const proposedEntries = [];
  const simulatedWallets = new Set(existingWallets);
  const simulatedInscriptions = new Set(existingInscriptions);
  const simulatedSlugs = new Set(existingSlugs);
  let simulatedCount = manifest.length;
  const maxSupply = Number.isFinite(Number(config.maxOfficialSupply)) ? Math.max(1, Math.floor(Number(config.maxOfficialSupply))) : 100;

  for (const candidate of sortedCandidates) {
    const contentResult = await fetchMintHtml(candidate.inscriptionId);
    if (!contentResult.html) {
      run.rejected.push({
        ...candidate,
        status: 'rejected_parse_failed',
        reason: `content_fetch_failed: ${contentResult.error}`
      });
      continue;
    }

    const parsedLogicId = parseLogicIdFromMintHtml(contentResult.html);
    if (!parsedLogicId) {
      run.rejected.push({
        ...candidate,
        status: 'rejected_logic_mismatch',
        reason: 'logic_import_not_found',
        contentSource: contentResult.source
      });
      continue;
    }

    if (safeLower(parsedLogicId) !== safeLower(logicInscriptionId)) {
      run.rejected.push({
        ...candidate,
        status: 'rejected_logic_mismatch',
        reason: `content_import_ref=${parsedLogicId}`,
        contentSource: contentResult.source
      });
      continue;
    }

    const seedParse = parseSeedFromMintHtml(contentResult.html);
    if (!seedParse.seed) {
      run.rejected.push({
        ...candidate,
        status: 'rejected_parse_failed',
        reason: seedParse.error,
        contentSource: contentResult.source
      });
      continue;
    }

    candidate.seed = seedParse.seed;
    candidate.parsedLogicInscriptionId = parsedLogicId;
    candidate.contentSource = contentResult.source;

    const inscriptionKey = safeLower(candidate.inscriptionId);
    const walletKey = safeLower(candidate.address);

    if (simulatedInscriptions.has(inscriptionKey)) {
      run.rejected.push({ ...candidate, status: 'rejected_duplicate_inscription', reason: 'already in official manifest or proposal set' });
      continue;
    }

    if (!candidate.address) {
      run.rejected.push({ ...candidate, status: 'rejected_manifest_validation', reason: 'missing address from indexer metadata' });
      continue;
    }

    if (simulatedWallets.has(walletKey)) {
      run.rejected.push({ ...candidate, status: 'rejected_duplicate_wallet', reason: 'wallet already used in official manifest or proposal set' });
      continue;
    }

    if (simulatedCount >= maxSupply) {
      run.rejected.push({ ...candidate, status: 'rejected_supply_full', reason: `maxOfficialSupply=${maxSupply}` });
      continue;
    }

    const ordinalIndex = simulatedCount + 1;
    const { slug, title } = nextSlugAndTitle(ordinalIndex);
    if (simulatedSlugs.has(safeLower(slug))) {
      run.rejected.push({ ...candidate, status: 'rejected_manifest_validation', reason: `generated slug collision: ${slug}` });
      continue;
    }

    const mintedAt = candidate.mintedAt || toIsoFromMs(candidate.genesisTimestampMs) || new Date(nowMs).toISOString();
    const entry = {
      slug,
      title,
      seed: candidate.seed,
      inscriptionId: candidate.inscriptionId,
      explorerUrl: candidate.explorerUrl,
      minterAddress: candidate.address,
      mintedAt
    };

    const hypothetical = [...manifest, ...proposedEntries, entry];
    const validation = validateManifest(hypothetical, config);
    if (validation.errors.length > 0) {
      run.rejected.push({
        ...candidate,
        status: 'rejected_manifest_validation',
        reason: validation.errors[validation.errors.length - 1]
      });
      continue;
    }

    simulatedCount += 1;
    simulatedInscriptions.add(inscriptionKey);
    simulatedWallets.add(walletKey);
    simulatedSlugs.add(safeLower(slug));

    const enriched = { ...candidate, mintedAt, proposedEntry: entry };
    proposedEntries.push(entry);
    run.eligible.push(enriched);
  }

  const proposedManifest = [...manifest, ...proposedEntries];
  const currentManifestString = `${JSON.stringify(manifest, null, 2)}\n`;
  const proposedManifestString = `${JSON.stringify(proposedManifest, null, 2)}\n`;
  const proposalChanged = currentManifestString !== proposedManifestString;

  const prTitle = `chore: mint watch inbox (${run.eligible.length} proposal${run.eligible.length === 1 ? '' : 's'})`;
  const prBody = buildPrBody({ run });
  const issueDigest = buildIssueDigest({ run, prUrl: null });
  const summary = buildSummary({ run, proposalChanged });

  const result = {
    scannedAt: run.scannedAt,
    logicInscriptionId,
    options,
    maxSupply,
    tipHeight: run.tipHeight,
    proposalChanged,
    prTitle,
    stats: {
      ...run.scanStats,
      detectedCount: run.detectedCount,
      eligibleCount: run.eligible.length,
      rejectedCount: run.rejected.length,
      ignoredExistingCount: run.ignoredExistingCount
    },
    eligible: run.eligible,
    rejected: run.rejected,
    errors: run.errors
  };

  const paths = {
    result: path.join(options.outDir, 'result.json'),
    proposedManifest: path.join(options.outDir, 'proposed_minted_faces.json'),
    issueDigest: path.join(options.outDir, 'issue_digest.md'),
    prBody: path.join(options.outDir, 'pr_body.md'),
    summary: path.join(options.outDir, 'summary.md')
  };

  writeJson(paths.result, result);
  writeText(paths.proposedManifest, proposedManifestString);
  writeText(paths.issueDigest, issueDigest.body);
  writeText(paths.prBody, prBody);
  writeText(paths.summary, summary);

  setStepOutputs({
    proposal_changed: proposalChanged,
    pr_title: prTitle,
    eligible_count: run.eligible.length,
    rejected_count: run.rejected.length,
    detected_count: run.detectedCount,
    ignored_existing_count: run.ignoredExistingCount,
    stable_hash: issueDigest.stableHash,
    result_path: paths.result,
    proposed_manifest_path: paths.proposedManifest,
    issue_digest_path: paths.issueDigest,
    pr_body_path: paths.prBody,
    summary_path: paths.summary
  });

  console.log(summary.trimEnd());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
