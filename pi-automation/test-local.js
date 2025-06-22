// Local test script for pi-automation.js
// This allows testing the automation script locally before deploying to the Pi

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';
import fs from 'fs';
import process from 'process';

// Setup local paths
const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_FILE = join(__dirname, 'local-test.log');

// Ensure dependencies are installed
console.log('Checking dependencies...');
try {
  // Make sure we have all required packages
  const dependencies = [
    'puppeteer',
    'dotenv',
    '@octokit/rest',
    'node-fetch'
  ];
  
  // Use a different approach to check for dependencies with ES modules
  for (const dep of dependencies) {
    try {
      // Try to dynamically import to check if the package exists
      await import(dep).catch(() => {
        console.log(`Installing missing dependency: ${dep}`);
        execSync(`npm install ${dep}`, { stdio: 'inherit' });
      });
    } catch {
      console.log(`Installing missing dependency: ${dep}`);
      execSync(`npm install ${dep}`, { stdio: 'inherit' });
    }
  }
  console.log('All dependencies are installed.');
} catch (error) {
  console.error('Error checking/installing dependencies:', error);
  process.exit(1);
}

// Create a local .env file if it doesn't exist
const envPath = join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('Creating sample .env file for local testing...');
  const sampleEnv = `# This is a sample .env file for local testing
# Replace with actual values for proper testing
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
GITHUB_TOKEN=your_github_token_here
`;
  fs.writeFileSync(envPath, sampleEnv);
  console.log(`Created ${envPath} - please edit with your actual values before proceeding.`);
  process.exit(0);
}

// Log function
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, logMessage);
  if (isError) {
    console.error(logMessage);
  } else {
    console.log(logMessage);
  }
}

console.log(`Starting local test - logs will be saved to ${LOG_FILE}`);
log('Starting local test of pi-automation.js');

// Clear previous screenshots
log('Cleaning up previous test screenshots...');
const screenshotFiles = [
  'page-loaded.png',
  'stkilda-generate-click.png',
  'stkilda-post-click.png',
  'fitzroy-generate-click.png',
  'fitzroy-post-click.png',
  'after-waiting.png'
];

for (const file of screenshotFiles) {
  const filePath = join(__dirname, file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    log(`Deleted ${file}`);
  }
}

// Run the automation script
log('Running pi-automation.js...');
console.log('\n=====================================================');
console.log('STARTING PI AUTOMATION SCRIPT - LOCAL TEST');
console.log('=====================================================\n');

try {
  // Import and execute the automation script dynamically
  import('./pi-automation.js')
    .then(() => {
      log('Script imported successfully');
    })
    .catch(error => {
      log(`Error importing script: ${error.message}`, true);
      console.error('Full error:', error);
    });
} catch (error) {
  log(`Error executing automation: ${error.message}`, true);
  console.error('Full error:', error);
}

// Note: The script will continue running as pi-automation.js executes asynchronously
console.log('\nTest started. Check the console output and screenshots for results.');
console.log(`Logs are being saved to: ${LOG_FILE}`);