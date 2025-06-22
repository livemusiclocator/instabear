# Local Testing Instructions for Instagram Automation

This guide explains how to test the Instagram automation script locally before deploying to the Raspberry Pi.

## Prerequisites

- Node.js installed on your local machine (v16+ recommended)
- npm (comes with Node.js)

## Testing Options

There are two ways to run the automation locally:

### Option 1: Using the Node.js Runner (Recommended)

1. Make sure you're in the project directory:
   ```bash
   cd /Users/nicholasthorpe/Documents/Personal/hacks/MANGROVES_2023/insta
   ```

2. Run the Node.js test script:
   ```bash
   node pi-automation/run-local-test-node.js
   ```

   This will:
   - Create a sample .env file if needed
   - Run the automation in local test mode
   - Save logs to pi-automation/local-test.log
   - Save screenshots to the pi-automation directory

### Option 2: Using the Shell Script

1. Make the script executable:
   ```bash
   chmod +x pi-automation/run-local-test.sh
   ```

2. Run the script:
   ```bash
   ./pi-automation/run-local-test.sh
   ```

## Configuration

For both options, a `.env` file will be created in the pi-automation directory if it doesn't exist. For proper testing, you should edit this file with:

```
SLACK_WEBHOOK_URL=your_actual_slack_webhook_url
GITHUB_TOKEN=your_actual_github_token
```

## What's Different in Local Mode?

When running in local test mode:
- The browser is launched using your local Chromium/Chrome instead of the Pi's browser
- Screenshots are saved to the local pi-automation directory
- GitHub API operations are still performed, so be cautious if you're using a real GitHub token

## Troubleshooting

- **Missing dependencies**: If you encounter errors about missing dependencies, run:
  ```bash
  npm install puppeteer dotenv @octokit/rest node-fetch
  ```

- **Browser launch errors**: If the browser fails to launch, try running with:
  ```bash
  NODE_OPTIONS="--no-sandbox" node pi-automation/run-local-test-node.js
  ```

- **View logs**: Check the log file for detailed information:
  ```bash
  cat pi-automation/local-test.log
  ```

## Next Steps

After successful local testing, deploy the changes to the Raspberry Pi using the instructions in `DEPLOYMENT-INSTRUCTIONS.md`.