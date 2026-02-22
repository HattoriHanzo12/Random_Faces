#!/usr/bin/env node
const fs = require('fs');

const LINEAR_API_URL = 'https://api.linear.app/graphql';
const MARKER = '<!-- mint-watch-digest -->';

function readEnv(name, fallback = '') {
  return String(process.env[name] ?? fallback).trim();
}

function extractStableHash(body) {
  const match = String(body || '').match(/<!--\s*mint-watch-stable-hash:([a-f0-9]{64})\s*-->/i);
  return match ? match[1] : '';
}

async function linearGraphql(token, query, variables = {}) {
  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token
    },
    body: JSON.stringify({ query, variables })
  });

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Linear returned non-JSON response (HTTP ${response.status}): ${text.slice(0, 500)}`);
  }

  if (!response.ok) {
    throw new Error(`Linear HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 500)}`);
  }

  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    throw new Error(`Linear GraphQL error: ${payload.errors.map((e) => e.message).join('; ')}`);
  }

  return payload.data || {};
}

async function findIssueByIdentifier(token, identifier) {
  const query = `
    query IssueByIdentifier($identifier: String!) {
      issues(filter: { identifier: { eq: $identifier } }, first: 1) {
        nodes {
          id
          identifier
          title
          comments(first: 100) {
            nodes {
              id
              body
            }
          }
        }
      }
    }
  `;

  const data = await linearGraphql(token, query, { identifier });
  const node = data?.issues?.nodes?.[0] || null;
  return node;
}

async function createComment(token, issueId, body) {
  const mutation = `
    mutation CreateComment($issueId: String!, $body: String!) {
      commentCreate(input: { issueId: $issueId, body: $body }) {
        success
        comment {
          id
        }
      }
    }
  `;
  const data = await linearGraphql(token, mutation, { issueId, body });
  return data?.commentCreate?.comment?.id || null;
}

async function updateComment(token, commentId, body) {
  const attemptQueries = [
    {
      query: `
        mutation UpdateComment($id: String!, $body: String!) {
          commentUpdate(id: $id, input: { body: $body }) {
            success
            comment { id }
          }
        }
      `,
      variables: { id: commentId, body }
    },
    {
      query: `
        mutation UpdateCommentAlt($id: String!, $body: String!) {
          commentUpdate(input: { id: $id, body: $body }) {
            success
            comment { id }
          }
        }
      `,
      variables: { id: commentId, body }
    }
  ];

  let lastError = null;
  for (const attempt of attemptQueries) {
    try {
      const data = await linearGraphql(token, attempt.query, attempt.variables);
      const id = data?.commentUpdate?.comment?.id || data?.commentUpdate?.id || null;
      return id || commentId;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Linear comment update failed');
}

function maybeInjectPrUrl(body, prUrl) {
  if (!prUrl) return body;
  if (body.includes('Draft PR:')) return body;
  const lines = body.split('\n');
  const insertAfter = lines.findIndex((line) => line.startsWith('- Ignored (already in manifest):'));
  if (insertAfter >= 0) {
    lines.splice(insertAfter + 1, 0, `- Draft PR: ${prUrl}`);
    return `${lines.join('\n').replace(/\s+$/, '')}\n`;
  }
  return `${body.replace(/\s+$/, '')}\n\n- Draft PR: ${prUrl}\n`;
}

async function main() {
  const token = readEnv('LINEAR_API_KEY');
  const issueIdentifier = readEnv('LINEAR_NOTIFY_ISSUE_ID', 'CLA-30');
  const digestPath = readEnv('MINT_WATCH_DIGEST_PATH');
  const prUrl = readEnv('MINT_WATCH_PR_URL');

  if (!token) {
    console.log('LINEAR_API_KEY not set; skipping Linear digest update.');
    return;
  }
  if (!digestPath) {
    throw new Error('MINT_WATCH_DIGEST_PATH is required');
  }

  const rawBody = fs.readFileSync(digestPath, 'utf8');
  const body = maybeInjectPrUrl(rawBody, prUrl);
  const stableHash = extractStableHash(body);

  const issue = await findIssueByIdentifier(token, issueIdentifier);
  if (!issue) {
    throw new Error(`Linear issue not found for identifier ${issueIdentifier}`);
  }

  const comments = Array.isArray(issue.comments?.nodes) ? issue.comments.nodes : [];
  const existing = comments.find((comment) => String(comment.body || '').includes(MARKER));

  if (existing) {
    const existingHash = extractStableHash(existing.body || '');
    if (existingHash && stableHash && existingHash === stableHash) {
      console.log(`Linear digest unchanged for ${issueIdentifier}; no update needed.`);
      return;
    }
    await updateComment(token, existing.id, body);
    console.log(`Updated Linear digest comment on ${issueIdentifier}.`);
    return;
  }

  await createComment(token, issue.id, body);
  console.log(`Created Linear digest comment on ${issueIdentifier}.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
