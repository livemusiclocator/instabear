# Pi Automation Updates

This document outlines the changes made to fix issues with the Instagram posting automation on the Raspberry Pi.

## Issues Identified

1. **Timeout Errors**: The automation was failing with "waiting for selector failed" errors due to timeouts
2. **Slack Notification Failures**: Notifications were not being sent reliably
3. **Scheduling Changes**: The schedule needed to be updated with new posting times

## Changes Made

### 1. Increased Timeouts in pi-automation.js

All timeouts have been increased to account for the additional processing time needed for venue Instagram handles:

- Page load timeout: Increased from 60s to 120s (2 minutes)
- Selector wait timeouts: Increased from 60s to 120s (2 minutes)
- Wait periods after button clicks: Increased from 45s to 90s (1.5 minutes)
- Final wait timeout: Increased from 120s to 180s (3 minutes)

### 2. Improved Slack Notifications

- Added retry logic (3 attempts) for Slack notifications
- Added a 30-second timeout for fetch operations
- Added backup storage of failed notifications to a local file
- Improved error handling and logging

### 3. Environment Variable Checking

- Added validation of required environment variables (SLACK_WEBHOOK_URL, GITHUB_TOKEN)
- Added logging of missing environment variables to a status file
- This helps diagnose why Slack notifications might be failing

### 4. Deployment Scripts

Two scripts have been created to help with deployment:

- `deploy-changes.sh`: Deploys the updated pi-automation.js to the Pi with retry logic
- `setup-cron.sh`: Updates the cron schedule on the Pi with the new posting times

### 5. New Cron Schedule

Updated the posting schedule as requested:

- Wednesday: 8:45 AM
- Thursday: 10:30 AM
- Friday: 5:00 PM
- Saturday: 12:00 PM (noon)
- Sunday: 12:00 PM (noon)

## Deployment Instructions

### Option 1: Using the Deployment Scripts

1. Make the scripts executable:
   ```bash
   chmod +x pi-automation/deploy-changes.sh
   chmod +x pi-automation/setup-cron.sh
   ```

2. Deploy the updated pi-automation.js:
   ```bash
   ./pi-automation/deploy-changes.sh 192.168.0.152 insta
   ```

3. Update the cron schedule:
   ```bash
   ssh insta@192.168.0.152 'bash -s' < pi-automation/setup-cron.sh
   ```

### Option 2: Manual Deployment

If the scripts don't work due to connectivity issues:

1. Copy the pi-automation.js file to the Pi:
   ```bash
   scp pi-automation/pi-automation.js insta@192.168.0.152:~/instabear_pi/
   ```

2. SSH into the Pi and update the cron schedule:
   ```bash
   ssh insta@192.168.0.152
   crontab -e
   ```

3. Replace any existing cron entries with:
   ```
   # Instagram posting schedule
   # Wednesday at 8:45 AM
   45 8 * * 3 cd ~/instabear_pi && /usr/bin/node pi-automation.js >> ~/instabear_pi/cron.log 2>&1
   # Thursday at 10:30 AM
   30 10 * * 4 cd ~/instabear_pi && /usr/bin/node pi-automation.js >> ~/instabear_pi/cron.log 2>&1
   # Friday at 5:00 PM
   0 17 * * 5 cd ~/instabear_pi && /usr/bin/node pi-automation.js >> ~/instabear_pi/cron.log 2>&1
   # Saturday at 12:00 PM
   0 12 * * 6 cd ~/instabear_pi && /usr/bin/node pi-automation.js >> ~/instabear_pi/cron.log 2>&1
   # Sunday at 12:00 PM
   0 12 * * 0 cd ~/instabear_pi && /usr/bin/node pi-automation.js >> ~/instabear_pi/cron.log 2>&1
   ```

### Option 3: GitHub Repository Deployment

If the Pi has git installed and is configured with the GitHub repository:

1. SSH into the Pi:
   ```bash
   ssh insta@192.168.0.152
   ```

2. Navigate to the repository and pull the latest changes:
   ```bash
   cd ~/instabear_pi
   git pull
   ```

3. Update the cron schedule using the setup-cron.sh script:
   ```bash
   ./pi-automation/setup-cron.sh
   ```

## Verifying the Setup

After deployment, you can verify the setup by:

1. Checking the cron schedule:
   ```bash
   ssh insta@192.168.0.152 'crontab -l'
   ```

2. Checking the .env file for Slack configuration:
   ```bash
   ssh insta@192.168.0.152 'cat ~/instabear_pi/.env'
   ```
   
   Ensure it contains:
   ```
   SLACK_WEBHOOK_URL=your_slack_webhook_url
   GITHUB_TOKEN=your_github_token
   ```

3. Manually running the automation to test:
   ```bash
   ssh insta@192.168.0.152 'cd ~/instabear_pi && node pi-automation.js'
   ```

## Troubleshooting

If you encounter issues:

1. Check the automation log:
   ```bash
   ssh insta@192.168.0.152 'tail -50 ~/instabear_pi/automation.log'
   ```

2. Check for failed Slack notifications:
   ```bash
   ssh insta@192.168.0.152 'cat ~/instabear_pi/failed-slack-notifications.json'
   ```

3. Check the environment status:
   ```bash
   ssh insta@192.168.0.152 'cat ~/instabear_pi/env-status.json'
   ```

4. Check the cron log:
   ```bash
   ssh insta@192.168.0.152 'tail -50 ~/instabear_pi/cron.log'
   ```

5. Ensure the Pi has internet connectivity:
   ```bash
   ssh insta@192.168.0.152 'ping -c 4 google.com'
   ```

## Summary of Changes

These updates should address the issues with the Pi automation by:

1. Giving the application more time to process the venue Instagram handles
2. Making Slack notifications more reliable with retry logic
3. Implementing the new posting schedule
4. Providing better error handling and diagnostics

If problems persist, examine the logs to identify specific issues and consider further adjustments to timeouts or the venue Instagram handle implementation.