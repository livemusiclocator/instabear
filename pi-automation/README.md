# Pi Automation for Instagram Posting

This script automates the process of generating and posting Instagram content using a Raspberry Pi.

## System Architecture

### Raspberry Pi's Role
- Acts as the automation server that runs on a schedule (7:45 AM daily)
- Executes a headless browser to interact with the web interface
- Handles the entire posting workflow automatically without human intervention
- Takes screenshots during the process for verification
- Sends Slack notifications with local Melbourne timestamps
- Cleans up temporary files after successful posting
- Provides logging and error handling

### GitHub's Role
- Hosts the web application via GitHub Pages
- Stores the source code for both the web app and automation scripts
- Serves as temporary storage for the carousel images
- Provides version control and change tracking
- Enables the @octokit/rest API to programmatically manage repository content
- Allows the Pi to clean up temp-images after successful posting

### Overall Workflow
1. The Pi's cron job triggers at 7:45 AM Melbourne time
2. The Pi launches a headless browser and navigates to the GitHub Pages URL
3. The browser generates carousel images and uploads them to GitHub
4. The browser posts the images to Instagram via the Meta Graph API
5. The Pi cleans up temporary images from the GitHub repository
6. The Pi sends a Slack notification with the results and local timestamp

## Prerequisites

1. Raspberry Pi running Raspberry Pi OS (Debian-based)
2. Node.js and npm installed
3. Chromium browser

## Installation

### 1. System Dependencies

```bash
# Update system packages
sudo apt update
sudo apt upgrade -y

# Install Node.js if not already installed
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Chromium browser and dependencies
sudo apt install -y chromium-browser chromium-codecs-ffmpeg

# Verify installations
node --version
npm --version
chromium-browser --version
```

### 2. Project Setup

```bash
# Clone the repository (if using git) or copy the files to the Pi
# Navigate to the instabear_pi directory
cd instabear_pi

# Install dependencies
npm install
```

## Configuration

The script is configured to:
- Use headless Chromium browser
- Log all actions to automation.log
- Access the GitHub Pages URL for posting
- Send notifications via Slack after posting attempts

### Environment Variables

Create a `.env` file in the project directory with the following variables:

```
SLACK_WEBHOOK_URL=your_slack_webhook_url_here
GITHUB_TOKEN=your_github_token_here
```

These variables are used for:
- `SLACK_WEBHOOK_URL`: Sending notifications to Slack after posting attempts
- `GITHUB_TOKEN`: Cleaning up temp-images in the GitHub repository

### Dependencies

The script relies on the following key dependencies:
- puppeteer: For browser automation
- @octokit/rest: For GitHub repository management
- node-fetch: For making HTTP requests
- dotenv: For loading environment variables

## Running the Script

Manual run:
```bash
npm start
```

### Setting up Cron Job

1. Open crontab editor:
```bash
crontab -e
```

2. Add a cron job (runs daily at 7:45 AM):
```
45 7 * * * cd /home/insta/instabear_pi && /usr/bin/node pi-automation.js >> /home/insta/instabear_pi/cron.log 2>&1
```

## Notifications

The system sends Slack notifications after each posting attempt:

### Slack Notifications

- Notifications are sent to the configured Slack webhook URL
- Successful posts: Green-colored notification with success status
- Failed posts: Red-colored notification with failure status and error details
- All notifications include:
  - Recent log entries (last 15 lines)
  - Local Melbourne timestamp in human-readable format
  - Status information
  - Screenshots of the automation process
  - Recipient information (gigs@lml.live)

### Troubleshooting Slack Notifications

If notifications are not being received:
1. Check the SLACK_WEBHOOK_URL in the .env file
2. Verify internet connectivity on the Raspberry Pi
3. Check the automation.log for any Slack-related error messages

## Logging

- All automation actions are logged to `automation.log`
- Cron execution is logged to `cron.log`
- Check these logs for troubleshooting

## Troubleshooting

1. If the script fails to start:
   - Check Node.js and npm are installed correctly
   - Verify all dependencies are installed
   - Check file permissions

2. If browser automation fails:
   - Verify Chromium is installed
   - Check the GitHub Pages URL is accessible
   - Review automation.log for specific errors

3. Common issues:
   - Memory issues: Consider adding swap space
   - Permission issues: Ensure proper file ownership
   - Network issues: Check internet connectivity
   - Missing dependencies: Ensure @octokit/rest is installed

## Maintenance

- Regularly check log files and clear if needed
- Monitor disk space usage
- Keep system packages updated
- Consider setting up log rotation
- Update Slack webhook URL if needed

## Recovery

If the automation fails:
1. Check the logs for errors
2. Manually run the script to verify functionality
3. The GitHub Pages interface remains accessible for manual posting if needed
