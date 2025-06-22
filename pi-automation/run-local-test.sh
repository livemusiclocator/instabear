#!/bin/bash
# Script to run the pi-automation.js locally for testing
# This will test the Instagram posting automation without deploying to the Pi

# Set up environment
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_EXEC=$(which node)

echo "======================================================"
echo "   Running Instagram Automation Local Test"
echo "======================================================"
echo

# Check Node.js installation
if [ -z "$NODE_EXEC" ]; then
    echo "Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if test-local.js exists
if [ ! -f "$SCRIPT_DIR/test-local.js" ]; then
    echo "Error: test-local.js not found in $SCRIPT_DIR"
    exit 1
fi

# Check for .env file or create a sample one
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo "Creating sample .env file..."
    cat > "$SCRIPT_DIR/.env" << EOL
# Sample .env file for local testing
# Replace these with your actual credentials
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
GITHUB_TOKEN=your_github_token_here
EOL
    echo "Created sample .env file at $SCRIPT_DIR/.env"
    echo "Please edit this file with your actual credentials before proceeding."
    echo
    echo "Press Enter to continue or Ctrl+C to exit..."
    read
fi

# Check if puppeteer and other dependencies are installed
echo "Checking dependencies..."
npm list puppeteer dotenv @octokit/rest node-fetch --prefix "$SCRIPT_DIR/.." > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Installing missing dependencies..."
    npm install puppeteer dotenv @octokit/rest node-fetch --prefix "$SCRIPT_DIR/.."
fi

# Create a local patch for the pi-automation.js
echo "Creating temporary local configuration..."
TEMP_CONFIG=$(mktemp)
cat > "$TEMP_CONFIG" << EOL
// Local test environment configuration
export const LOCAL_TEST = true;
export const BROWSER_PATH = null; // Let Puppeteer find the browser
export const SCREENSHOT_DIR = "${SCRIPT_DIR}";
export const LOG_FILE_PATH = "${SCRIPT_DIR}/local-test.log";
EOL

# Run the test script
echo "Starting local test..."
echo "Logs will be saved to $SCRIPT_DIR/local-test.log"
NODE_OPTIONS="--experimental-modules" "$NODE_EXEC" "$SCRIPT_DIR/test-local.js"

# Clean up
rm "$TEMP_CONFIG"

echo
echo "======================================================"
echo "   Test Complete"
echo "======================================================"
echo "Check the log file and screenshots in: $SCRIPT_DIR"
echo "Use 'cat $SCRIPT_DIR/local-test.log' to view the log"