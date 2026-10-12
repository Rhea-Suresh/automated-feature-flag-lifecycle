const express = require('express');
const { initUnleash, checkFlag, closeUnleash, isReady } = require('./unleash');

const app = express();
const PORT = process.env.PORT || 3000;
const FLAG_NAME = 'new-dashboard';

// Initialize Unleash Client SDK
initUnleash();

// Home Route
app.get('/', (req, res) => {
  const isDashboardEnabled = checkFlag(FLAG_NAME);

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Feature Flag Lifecycle Demo</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #0f172a;
            color: #f8fafc;
            text-align: center;
            padding: 60px 20px;
            margin: 0;
          }
          .container {
            max-width: 640px;
            margin: auto;
            background: #1e293b;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
            border: 1px solid #334155;
          }
          h1 { margin-top: 0; color: #38bdf8; font-size: 28px; }
          p { color: #94a3b8; line-height: 1.6; }
          .badge {
            display: inline-block;
            padding: 6px 14px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 20px;
          }
          .badge.enabled { background: #065f46; color: #34d399; border: 1px solid #059669; }
          .badge.disabled { background: #7f1d1d; color: #f87171; border: 1px solid #b91c1c; }
          .btn {
            display: inline-block;
            padding: 14px 28px;
            border-radius: 10px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s ease;
            margin-top: 20px;
          }
          .btn.active {
            background: #2563eb;
            color: white;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
          }
          .btn.active:hover { background: #1d4ed8; }
          .btn.disabled {
            background: #334155;
            color: #64748b;
            cursor: not-allowed;
            pointer-events: none;
          }
          .info-box {
            margin-top: 30px;
            padding: 15px;
            background: #0f172a;
            border-radius: 8px;
            font-size: 13px;
            color: #64748b;
            text-align: left;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Automated Feature Flag Lifecycle</h1>
          <p>Continuous Delivery with Docker, Unleash, and Express</p>
          
          <div class="badge ${isDashboardEnabled ? 'enabled' : 'disabled'}">
            Feature Flag [${FLAG_NAME}]: ${isDashboardEnabled ? 'ENABLED (ON)' : 'DISABLED (OFF)'}
          </div>

          <div>
            ${
              isDashboardEnabled
                ? `<a href="/dashboard" class="btn active">🚀 Launch New Dashboard</a>`
                : `<a href="#" class="btn disabled">🔒 Dashboard Disabled by Unleash</a>`
            }
          </div>

          <div class="info-box">
            <strong>Runtime State:</strong><br>
            • Environment: <code>${process.env.NODE_ENV || 'production'}</code><br>
            • Unleash Server: <code>${process.env.UNLEASH_API_URL || 'http://unleash:4242/api'}</code><br>
            • SDK Status: <code>${isReady() ? 'Synchronized' : 'Connecting...'}</code>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Dashboard Route (controlled by feature flag)
app.get('/dashboard', (req, res) => {
  const isDashboardEnabled = checkFlag(FLAG_NAME);

  if (!isDashboardEnabled) {
    return res.status(403).send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>403 - Dashboard Disabled</title>
          <style>
            body {
              font-family: sans-serif;
              background: #0f172a;
              color: #f8fafc;
              text-align: center;
              padding: 80px 20px;
            }
            .card {
              max-width: 500px;
              margin: auto;
              background: #1e293b;
              padding: 40px;
              border-radius: 16px;
              border: 1px solid #b91c1c;
            }
            h1 { color: #f87171; }
            p { color: #94a3b8; }
            a { color: #38bdf8; text-decoration: none; display: inline-block; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>⛔ Feature Not Available</h1>
            <p>The <strong>${FLAG_NAME}</strong> feature flag is currently disabled in this environment.</p>
            <p>Enable it via the Unleash UI or CLI to access this page.</p>
            <a href="/">← Return to Home</a>
          </div>
        </body>
      </html>
    `);
  }

  // When flag is enabled: Return the New Dashboard
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Dashboard - Released Feature</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #0b1120;
            color: #f8fafc;
            margin: 0;
            padding: 40px 20px;
          }
          .dashboard-wrapper {
            max-width: 850px;
            margin: auto;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #1e293b;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          h1 { color: #38bdf8; margin: 0; }
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          .stat-card {
            background: #1e293b;
            padding: 24px;
            border-radius: 12px;
            border: 1px solid #334155;
          }
          .stat-title { font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
          .stat-val { font-size: 32px; font-weight: bold; color: #f8fafc; margin-top: 8px; }
          .stat-sub { font-size: 12px; color: #34d399; margin-top: 4px; }
          .content-card {
            background: #1e293b;
            padding: 30px;
            border-radius: 12px;
            border: 1px solid #334155;
          }
          .pill {
            background: #065f46;
            color: #34d399;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
          }
          a.home-link { color: #38bdf8; text-decoration: none; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="dashboard-wrapper">
          <div class="header">
            <div>
              <h1>🚀 Production Analytics Dashboard</h1>
              <p style="color: #94a3b8; margin: 5px 0 0 0;">Feature flag <code>${FLAG_NAME}</code> is active</p>
            </div>
            <div>
              <span class="pill">RELEASED LIVE</span>
              <a href="/" class="home-link" style="margin-left: 15px;">← Home</a>
            </div>
          </div>

          <div class="grid">
            <div class="stat-card">
              <div class="stat-title">Active Deployments</div>
              <div class="stat-val">v1.2.4</div>
              <div class="stat-sub">Automated CI/CD</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">Unleash Strategy</div>
              <div class="stat-val">Flexible</div>
              <div class="stat-sub">Dynamic Rollout</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">Flag Status</div>
              <div class="stat-val">100%</div>
              <div class="stat-sub">Enabled in Dev</div>
            </div>
          </div>

          <div class="content-card">
            <h3 style="margin-top: 0; color: #e2e8f0;">Feature Flag Lifecycle Milestone Achieved</h3>
            <p style="color: #94a3b8; line-height: 1.6;">
              This dashboard is dynamically rendered because Unleash returned <code>true</code> for the 
              <code>${FLAG_NAME}</code> toggle. No application images were rebuilt to enable this feature!
            </p>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    unleash: {
      ready: isReady(),
      flag: checkFlag(FLAG_NAME),
    },
  });
});

// Safe API endpoint for feature states
app.get('/api/features', (req, res) => {
  res.json({
    [FLAG_NAME]: checkFlag(FLAG_NAME),
  });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`[INFO] Server running at http://localhost:${PORT}`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('[INFO] SIGTERM signal received. Closing HTTP server and Unleash SDK...');
  server.close(() => {
    closeUnleash();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[INFO] SIGINT signal received. Closing HTTP server and Unleash SDK...');
  server.close(() => {
    closeUnleash();
    process.exit(0);
  });
});
