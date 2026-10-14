#!/usr/bin/env node

/**
 * Feature Flag Lifecycle Automation Script
 * Supports the 5 core stages of feature flag lifecycle using Unleash Admin API:
 * 1. create    - Create a new feature toggle in Unleash
 * 2. enable    - Enable the flag in the target environment
 * 3. rollout   - Configure a gradual/percentage rollout strategy
 * 4. disable   - Disable the flag in the target environment
 * 5. archive   - Archive/retire a feature toggle (requires explicit confirmation)
 * 6. list/get  - Query flags and inspect current status
 */

const fs = require('fs');
const path = require('path');

// Helper to load .env file manually if dotenv is not installed
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

// Configuration
let rawUrl = process.env.UNLEASH_ADMIN_URL || process.env.UNLEASH_URL || process.env.UNLEASH_API_URL || 'http://localhost:4242/api';
if (rawUrl.includes('//unleash:')) {
  rawUrl = rawUrl.replace('//unleash:', '//localhost:');
}
const UNLEASH_URL = rawUrl.replace(/\/+$/, '').replace(/\/api$/, '') + '/api';

const ADMIN_TOKEN = process.env.UNLEASH_ADMIN_TOKEN;
const DEFAULT_PROJECT = process.env.UNLEASH_PROJECT || 'default';
const DEFAULT_ENV = process.env.UNLEASH_ENVIRONMENT || 'development';

if (!ADMIN_TOKEN) {
  console.error('[ERROR] Missing UNLEASH_ADMIN_TOKEN environment variable.');
  console.error('Please configure UNLEASH_ADMIN_TOKEN in your environment or .env file.');
  process.exit(1);
}

const headers = {
  'Authorization': ADMIN_TOKEN,
  'Content-Type': 'application/json',
};

async function apiRequest(endpoint, method = 'GET', body = null) {
  const url = `${UNLEASH_URL}${endpoint}`;
  const options = {
    method,
    headers,
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (response.status === 204) {
    return { success: true };
  }

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    data = { raw: text };
  }

  if (!response.ok) {
    const errorMsg = data.message || data.error || (data.details ? JSON.stringify(data.details) : `HTTP ${response.status}`);
    throw new Error(`API error [${method} ${endpoint}]: ${errorMsg}`);
  }

  return data;
}

// 1. List flags
async function listFlags(project = DEFAULT_PROJECT) {
  const res = await apiRequest(`/admin/projects/${project}/features`);
  console.log(`\n=== Feature Flags in Project '${project}' ===`);
  const features = res.features || [];
  if (features.length === 0) {
    console.log('No feature flags found.');
    return;
  }
  for (const f of features) {
    const envStatuses = (f.environments || []).map(e => `${e.name}:${e.enabled ? 'ON' : 'OFF'}`).join(', ');
    console.log(`- ${f.name} [Type: ${f.type}] (Environments: ${envStatuses})`);
  }
}

// 2. Get flag details
async function getFlag(name, project = DEFAULT_PROJECT) {
  const f = await apiRequest(`/admin/projects/${project}/features/${name}`);
  console.log(`\n=== Feature: ${f.name} ===`);
  console.log(`Type:        ${f.type}`);
  console.log(`Description: ${f.description || 'N/A'}`);
  console.log(`Project:     ${f.project}`);
  console.log(`Environments:`);
  for (const env of f.environments || []) {
    console.log(`  * ${env.name}: ${env.enabled ? 'ENABLED' : 'DISABLED'}`);
    for (const s of env.strategies || []) {
      console.log(`    - Strategy: ${s.name} | Parameters: ${JSON.stringify(s.parameters)}`);
    }
  }
}

// 3. Create flag
async function createFlag(name, description = '', type = 'release', project = DEFAULT_PROJECT) {
  if (!name) throw new Error('Flag name is required.');
  console.log(`Creating flag '${name}' (type: ${type}) in project '${project}'...`);
  const payload = {
    name,
    type,
    description: description || `Feature flag for ${name}`,
    impressionData: false,
  };
  await apiRequest(`/admin/projects/${project}/features`, 'POST', payload);
  console.log(`[SUCCESS] Feature flag '${name}' created successfully.`);
}

// 4. Enable flag
async function enableFlag(name, env = DEFAULT_ENV, project = DEFAULT_PROJECT) {
  console.log(`Enabling flag '${name}' in environment '${env}'...`);
  await apiRequest(`/admin/projects/${project}/features/${name}/environments/${env}/on`, 'POST');
  console.log(`[SUCCESS] Feature flag '${name}' is now ENABLED in '${env}'.`);
}

// 5. Disable flag
async function disableFlag(name, env = DEFAULT_ENV, project = DEFAULT_PROJECT) {
  console.log(`Disabling flag '${name}' in environment '${env}'...`);
  await apiRequest(`/admin/projects/${project}/features/${name}/environments/${env}/off`, 'POST');
  console.log(`[SUCCESS] Feature flag '${name}' is now DISABLED in '${env}'.`);
}

// 6. Rollout flag (gradual flexible rollout)
async function rolloutFlag(name, percentage, env = DEFAULT_ENV, project = DEFAULT_PROJECT) {
  const pct = parseInt(percentage, 10);
  if (isNaN(pct) || pct < 0 || pct > 100) {
    throw new Error('Rollout percentage must be a number between 0 and 100.');
  }

  console.log(`Configuring gradual rollout for '${name}' at ${pct}% in '${env}'...`);
  
  // First ensure flag is on in environment
  await apiRequest(`/admin/projects/${project}/features/${name}/environments/${env}/on`, 'POST');

  // Fetch current strategies to update or create flexibleRollout
  const feat = await apiRequest(`/admin/projects/${project}/features/${name}`);
  const envObj = (feat.environments || []).find(e => e.name === env);
  const existingStrategy = envObj ? (envObj.strategies || []).find(s => s.name === 'flexibleRollout') : null;

  const strategyPayload = {
    name: 'flexibleRollout',
    title: `${pct}% Gradual Rollout`,
    parameters: {
      groupId: name,
      rollout: String(pct),
      stickiness: 'default',
    },
    constraints: [],
  };

  if (existingStrategy) {
    await apiRequest(`/admin/projects/${project}/features/${name}/environments/${env}/strategies/${existingStrategy.id}`, 'PUT', strategyPayload);
    console.log(`[SUCCESS] Updated existing gradual rollout strategy to ${pct}%.`);
  } else {
    await apiRequest(`/admin/projects/${project}/features/${name}/environments/${env}/strategies`, 'POST', strategyPayload);
    console.log(`[SUCCESS] Created gradual rollout strategy with ${pct}%.`);
  }
}

// 7. Archive / Retire flag
async function archiveFlag(name, confirmed, project = DEFAULT_PROJECT) {
  if (!confirmed) {
    console.error(`[BLOCKED] Archiving flag '${name}' is a destructive action.`);
    console.error(`To proceed, specify --confirm flag:`);
    console.error(`  node scripts/manage-flags.js archive ${name} --confirm`);
    process.exit(1);
  }

  console.log(`Archiving/Retiring feature flag '${name}' from project '${project}'...`);
  await apiRequest(`/admin/projects/${project}/features/${name}`, 'DELETE');
  console.log(`[SUCCESS] Feature flag '${name}' has been archived.`);
}

// CLI Command router
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help') {
    console.log(`
Unleash Feature Flag Lifecycle CLI
Usage:
  node scripts/manage-flags.js <command> [arguments]

Commands:
  list                              List all feature flags in project
  get <flagName>                    Get detailed configuration of a flag
  create <flagName> [desc] [type]   Create a new feature flag
  enable <flagName> [environment]   Enable a flag in an environment
  disable <flagName> [environment]  Disable a flag in an environment
  rollout <flagName> <percentage>   Set gradual rollout (0-100%) in environment
  archive <flagName> --confirm      Archive/retire a flag permanently

Examples:
  node scripts/manage-flags.js list
  node scripts/manage-flags.js get new-dashboard
  node scripts/manage-flags.js enable new-dashboard development
  node scripts/manage-flags.js disable new-dashboard development
  node scripts/manage-flags.js rollout new-dashboard 50 development
  node scripts/manage-flags.js archive old-feature --confirm
`);
    return;
  }

  try {
    switch (command) {
      case 'list':
        await listFlags();
        break;
      case 'get':
        if (!args[1]) throw new Error('Missing flag name: node scripts/manage-flags.js get <flagName>');
        await getFlag(args[1]);
        break;
      case 'create':
        if (!args[1]) throw new Error('Missing flag name: node scripts/manage-flags.js create <flagName>');
        await createFlag(args[1], args[2], args[3]);
        break;
      case 'enable':
        if (!args[1]) throw new Error('Missing flag name: node scripts/manage-flags.js enable <flagName>');
        await enableFlag(args[1], args[2] || DEFAULT_ENV);
        break;
      case 'disable':
        if (!args[1]) throw new Error('Missing flag name: node scripts/manage-flags.js disable <flagName>');
        await disableFlag(args[1], args[2] || DEFAULT_ENV);
        break;
      case 'rollout':
        if (!args[1] || args[2] === undefined) {
          throw new Error('Usage: node scripts/manage-flags.js rollout <flagName> <percentage> [environment]');
        }
        await rolloutFlag(args[1], args[2], args[3] || DEFAULT_ENV);
        break;
      case 'archive':
        if (!args[1]) throw new Error('Missing flag name: node scripts/manage-flags.js archive <flagName> --confirm');
        const isConfirmed = args.includes('--confirm');
        await archiveFlag(args[1], isConfirmed);
        break;
      default:
        console.error(`Unknown command: '${command}'. Run with --help for usage.`);
        process.exit(1);
    }
  } catch (err) {
    console.error(`\n[FAILURE] ${err.message}`);
    process.exit(1);
  }
}

main();
