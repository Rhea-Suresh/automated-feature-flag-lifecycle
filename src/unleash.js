const { initialize, isEnabled, destroy } = require('unleash-client');

const UNLEASH_URL = process.env.UNLEASH_API_URL || 'http://unleash:4242/api';
const UNLEASH_API_TOKEN = process.env.UNLEASH_API_TOKEN;
const UNLEASH_APP_NAME = process.env.UNLEASH_APP_NAME || 'feature-flag-app';
const REFRESH_INTERVAL = parseInt(process.env.UNLEASH_REFRESH_INTERVAL || '2000', 10);

let unleashInstance = null;
let isReady = false;

function initUnleash() {
  if (!UNLEASH_API_TOKEN) {
    console.warn('[WARN] UNLEASH_API_TOKEN is not set. Feature flags will default to fallback (disabled).');
    return null;
  }

  try {
    unleashInstance = initialize({
      url: UNLEASH_URL,
      appName: UNLEASH_APP_NAME,
      refreshInterval: REFRESH_INTERVAL,
      metricsInterval: 5000,
      customHeaders: {
        Authorization: UNLEASH_API_TOKEN,
      },
    });

    unleashInstance.on('ready', () => {
      isReady = true;
      console.log(`[INFO] Unleash SDK ready and connected to ${UNLEASH_URL}`);
    });

    unleashInstance.on('synchronized', () => {
      console.log('[INFO] Unleash flags synchronized with server.');
    });

    unleashInstance.on('error', (err) => {
      console.error(`[ERROR] Unleash SDK error: ${err.message}`);
    });

    unleashInstance.on('warn', (warn) => {
      console.warn(`[WARN] Unleash SDK warning: ${warn}`);
    });

    return unleashInstance;
  } catch (err) {
    console.error(`[ERROR] Failed to initialize Unleash: ${err.message}`);
    return null;
  }
}

/**
 * Check if a feature flag is enabled
 * @param {string} flagName
 * @param {object} context (optional)
 * @param {boolean} fallback default to false
 */
function checkFlag(flagName, context = {}, fallback = false) {
  if (!unleashInstance) {
    return fallback;
  }
  try {
    return isEnabled(flagName, context, fallback);
  } catch (err) {
    console.error(`[ERROR] Error checking flag ${flagName}: ${err.message}`);
    return fallback;
  }
}

/**
 * Clean shutdown handler for container SIGTERM
 */
function closeUnleash() {
  if (unleashInstance) {
    try {
      destroy();
      console.log('[INFO] Unleash SDK destroyed cleanly.');
    } catch (err) {
      console.error(`[ERROR] Error destroying Unleash client: ${err.message}`);
    }
  }
}

module.exports = {
  initUnleash,
  checkFlag,
  closeUnleash,
  isReady: () => isReady,
};
