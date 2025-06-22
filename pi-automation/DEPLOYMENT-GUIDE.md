# Raspberry Pi Instagram Automation - Deployment Guide

This guide provides instructions for deploying the updated Instagram automation code to your Raspberry Pi. 

## What's Been Fixed

The following issues have been addressed:

1. **CSS Selector Issues**
   - Fixed invalid jQuery-style selectors that were causing failures
   - Replaced with standard DOM traversal methods

2. **Slack Notification Improvements**
   - Made Slack notifications non-blocking to prevent process hanging
   - Added robust error handling for unreliable internet connections
   - Process now completes even if Slack notifications fail

3. **Timeout Improvements**
   - Increased page load timeout: 60s → 120s
   - Increased waiting periods: 45s → 90s
   - Increased final wait: 120s → 180s

4. **Local Testing Support**
   - Added special handling for local test mode to be more forgiving
   - In local mode, success is counted if ANY carousel posts successfully

## Deployment Options

### Option 1: Automated Deployment (Recommended)

Run the comprehensive deployment script:

```bash
./pi-automation/deploy-all-changes.sh 192.168.0.152 insta
```

This script will:
1. Deploy the updated `pi-automation.js` code
2. Deploy and run the cron schedule updater
3. Verify the deployment

### Option 2: Manual Deployment (If internet is unreliable)

If the automated deployment fails due to connectivity issues, follow these steps:

1. **Copy the updated files to a USB drive**
   - `pi-automation.js`
   - `update-cron-schedule.sh`

2. **Transfer files to the Pi**
   - Plug the USB drive into the Pi
   - Copy files to the `~/instabear_pi` directory

3. **Update permissions**
   ```bash
   chmod +x ~/instabear_pi/update-cron-schedule.sh
   ```

4. **Update the cron schedule**
   ```bash
   cd ~/instabear_pi
   ./update-cron-schedule.sh localhost insta
   ```

## The New Posting Schedule

The cron schedule has been updated with the following posting times:

- **Wednesday**: 8:45 AM
- **Thursday**: 10:30 AM
- **Friday**: 5:00 PM
- **Saturday & Sunday**: 12:00 PM

## Verifying Deployment

To verify the deployment was successful:

1. **Check file permissions**
   ```bash
   ls -la ~/instabear_pi/pi-automation.js
   ```

2. **Check cron schedule**
   ```bash
   crontab -l
   ```

3. **Run a manual test**
   ```bash
   cd ~/instabear_pi
   node pi-automation.js
   ```

4. **Check logs for errors**
   ```bash
   tail -50 ~/instabear_pi/automation.log
   ```

## Troubleshooting

### If Slack notifications still fail:

1. **Check the .env file**
   - Ensure `SLACK_WEBHOOK_URL` is correctly set in `~/instabear_pi/.env`
   - The deployment script attempts to verify this

2. **Test Slack webhook manually**
   ```bash
   curl -X POST -H 'Content-type: application/json' --data '{"text":"Test from Pi"}' YOUR_SLACK_WEBHOOK_URL
   ```

3. **Remember**: Even if Slack notifications fail, the Instagram posting should still succeed with the updated code

### If Instagram posting fails:

1. **Check logs**
   ```bash
   tail -100 ~/instabear_pi/automation.log
   ```

2. **Verify internet connectivity**
   ```bash
   ping -c 3 instagram.com
   ```

3. **Check authentication**
   - Ensure the Instagram access token is still valid