#!/usr/bin/env node
// Test with simulated accounts that match user's data
const React = require('react');
const { render, Text, Box } = require('ink');

// Mock the accounts reading to return test data
const originalReadFile = require('fs').readFileSync;
require('fs').readFileSync = function(path, encoding) {
  if (path.includes('antigravity-accounts.json')) {
    return JSON.stringify({
      version: 3,
      accounts: [
        {
          email: "test1@gmail.com",
          refreshToken: "token1",
          projectId: "project-1",
          managedProjectId: null,
          addedAt: Date.now(),
          lastUsed: Date.now(),
          rateLimitResetTimes: {
            claude: Date.now() + 3600000
          }
        },
        {
          email: "test2@gmail.com", 
          refreshToken: "token2",
          projectId: null,
          managedProjectId: null,
          addedAt: Date.now(),
          lastUsed: Date.now(),
          rateLimitResetTimes: {}
        }
      ]
    });
  }
  return originalReadFile.apply(this, arguments);
};

// Now test render
const { Dashboard } = require('./dist/tui/Dashboard');

console.log("Testing render with simulated accounts...");

try {
  const { unmount } = render(React.createElement(Dashboard, {}), {
    exitOnCtrlC: false,
  });
  
  setTimeout(() => {
    unmount();
    console.log("Render successful with accounts!");
    process.exit(0);
  }, 500);
} catch (error) {
  console.error("Render failed:", error.message);
  console.error(error.stack);
  process.exit(1);
}
