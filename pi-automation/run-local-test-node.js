// Direct Node.js runner for pi-automation.js local testing
// Run with: node run-local-test-node.js

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import process from 'process';

// Get directory path
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dirname, 'local-test.log');

// Clear log file if it exists
if (fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, '');
}

console.log('===================================================');
console.log('  Running Local Test of Instagram Automation');
console.log('===================================================');
console.log('\nLogs will be saved to:', LOG_FILE);

// Create a simple .env file if it doesn't exist
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('\nCreating sample .env file...');
  const envContent = `# Sample .env file for local testing
# Replace with your actual values for proper testing
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
GITHUB_TOKEN=your_github_token
`;
  fs.writeFileSync(envPath, envContent);
  console.log('Created .env file. Please edit with actual credentials if needed.');
}

// Setup environment for the child process
const env = {
  ...process.env,
  LOCAL_TEST: 'true',
  NODE_OPTIONS: '--experimental-modules'
};

// Run the automation script with LOCAL_TEST set to true
const scriptPath = path.join(__dirname, 'pi-automation.js');
console.log('\nLaunching automation script in local test mode...\n');

const child = spawn('node', [scriptPath], {
  env,
  stdio: 'inherit', // Pass I/O to parent process
  cwd: __dirname
});

// Handle process events
child.on('error', (error) => {
  console.error('\nError starting process:', error);
});

child.on('exit', (code, signal) => {
  if (code === 0) {
    console.log('\n===================================================');
    console.log('  Local test completed successfully');
    console.log('===================================================');
  } else {
    console.error('\n===================================================');
    console.error(`  Test failed with code ${code} (signal: ${signal})`);
    console.error('===================================================');
  }
  
  console.log('\nScreenshots can be found in:', __dirname);
  console.log('Log file:', LOG_FILE);
});

console.log('Process started. Screenshots will be saved to:', __dirname);
console.log('Press Ctrl+C to terminate if it gets stuck.');