
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Feature Flag Lifecycle</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #f1f5f9;
            text-align: center;
            padding: 60px 20px;
          }
          .card {
            background: white;
            max-width: 600px;
            margin: auto;
            padding: 35px;
            border-radius: 12px;
          }
          h1 { color: #1e293b; }
          p { color: #64748b; }
          a {
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            text-decoration: none;
            margin-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Welcome to Feature Flag Management</h1>
          <p>Your Node.js application is running successfully.</p>
          <p>Features will be managed using Unleash.</p>
          <a href="/dashboard">View Dashboard</a>
        </div>
      </body>
    </html>
  `);
});

app.get("/dashboard", (req, res) => {
  res.send("<h1>Dashboard</h1><p>Feature flag integration is coming soon.</p>");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
