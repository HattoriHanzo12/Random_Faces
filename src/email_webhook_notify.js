#!/usr/bin/env node
const fs = require('fs');

function readEnv(name, fallback = '') {
  return String(process.env[name] ?? fallback).trim();
}

function loadJsonIfExists(filePath) {
  if (!filePath) return null;
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to parse JSON at ${filePath}: ${error.message}`);
  }
}

function loadTextIfExists(filePath) {
  if (!filePath) return '';
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function buildSubject({ stats, repoName }) {
  if (!stats) {
    return `[${repoName}] Mint Watch Digest`;
  }

  const eligible = Number(stats.eligibleCount || 0);
  const rejected = Number(stats.rejectedCount || 0);
  const detected = Number(stats.detectedCount || 0);

  if (eligible > 0) {
    return `[${repoName}] Mint Watch: ${eligible} eligible mint proposal${eligible === 1 ? '' : 's'}`;
  }
  if (detected > 0 || rejected > 0) {
    return `[${repoName}] Mint Watch: ${detected} detection${detected === 1 ? '' : 's'} (${rejected} rejected)`;
  }
  return `[${repoName}] Mint Watch Digest (no new detections)`;
}

function toPlainText({ digestMarkdown, issueUrl, prUrl, runUrl }) {
  const parts = [];
  parts.push('Random Faces Mint Watch Digest');
  parts.push('');
  if (runUrl) parts.push(`Workflow run: ${runUrl}`);
  if (issueUrl) parts.push(`GitHub inbox issue: ${issueUrl}`);
  if (prUrl) parts.push(`Draft PR: ${prUrl}`);
  if (runUrl || issueUrl || prUrl) parts.push('');
  parts.push(String(digestMarkdown || '').trim());
  return `${parts.join('\n').trim()}\n`;
}

async function postWebhook({ url, bearerToken, payload }) {
  const headers = {
    'Content-Type': 'application/json'
  };
  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const bodyText = await response.text().catch(() => '');
  if (!response.ok) {
    throw new Error(`Email webhook HTTP ${response.status}: ${bodyText.slice(0, 500)}`);
  }

  return bodyText;
}

async function main() {
  const webhookUrl = readEnv('MINT_WATCH_EMAIL_WEBHOOK_URL');
  const webhookBearer = readEnv('MINT_WATCH_EMAIL_WEBHOOK_BEARER');
  const to = readEnv('MINT_WATCH_EMAIL_TO', 'tutifrooti@proton.me');
  const resultPath = readEnv('MINT_WATCH_RESULT_PATH');
  const digestPath = readEnv('MINT_WATCH_DIGEST_PATH');
  const issueUrl = readEnv('MINT_WATCH_ISSUE_URL');
  const prUrl = readEnv('MINT_WATCH_PR_URL');
  const runUrl = readEnv('MINT_WATCH_RUN_URL');
  const repoName = readEnv('GITHUB_REPOSITORY', 'Random_Faces');

  if (!webhookUrl) {
    console.log('MINT_WATCH_EMAIL_WEBHOOK_URL not set; skipping email webhook notification.');
    return;
  }

  if (!digestPath) {
    throw new Error('MINT_WATCH_DIGEST_PATH is required');
  }

  const result = loadJsonIfExists(resultPath) || {};
  const digestMarkdown = loadTextIfExists(digestPath);
  if (!digestMarkdown.trim()) {
    throw new Error(`Digest markdown is empty or missing at ${digestPath}`);
  }

  const payload = {
    event: 'mint_watch_digest',
    to,
    subject: buildSubject({ stats: result.stats, repoName }),
    text: toPlainText({ digestMarkdown, issueUrl, prUrl, runUrl }),
    markdown: digestMarkdown,
    metadata: {
      repository: repoName,
      scannedAt: result.scannedAt || '',
      logicInscriptionId: result.logicInscriptionId || '',
      issueUrl: issueUrl || '',
      prUrl: prUrl || '',
      runUrl: runUrl || '',
      stats: result.stats || {}
    }
  };

  await postWebhook({ url: webhookUrl, bearerToken: webhookBearer, payload });
  console.log(`Sent mint-watch email webhook notification to ${to}.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
