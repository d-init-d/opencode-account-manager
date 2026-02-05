#!/usr/bin/env node
// Minimal reproduction test
const React = require('react');
const { render, Text, Box } = require('ink');

// Import components to test
const { Dashboard } = require('./dist/tui/Dashboard');

// Just try to render
console.log("Testing render...");

try {
  const { unmount } = render(React.createElement(Dashboard, {}), {
    exitOnCtrlC: false,
  });
  
  // Unmount after a short delay
  setTimeout(() => {
    unmount();
    console.log("Render successful!");
    process.exit(0);
  }, 500);
} catch (error) {
  console.error("Render failed:", error.message);
  process.exit(1);
}
