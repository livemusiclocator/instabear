# Pi Automation for Instagram Posting

This script automates the process of generating and posting Instagram content using a Raspberry Pi.

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

2. Add a cron job (example for running daily at 9 AM):
```
0 9 * * * cd /home/insta/instabear_pi && /usr/bin/node pi-automation.js >> /home/insta/instabear_pi/cron.log 2>&1
```

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

## Maintenance

- Regularly check log files and clear if needed
- Monitor disk space usage
- Keep system packages updated
- Consider setting up log rotation

## Recovery

If the automation fails:
1. Check the logs for errors
2. Manually run the script to verify functionality
3. The GitHub Pages interface remains accessible for manual posting if needed
