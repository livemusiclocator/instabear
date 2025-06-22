# How to Run the Deployment Scripts

This guide provides step-by-step instructions for running the deployment scripts to update your Raspberry Pi automation.

## Prerequisites

- Your local computer (Mac/Linux) with terminal access
- SSH access to the Raspberry Pi (IP: 192.168.0.152, username: insta)
- Both devices on the same network

## Running the Scripts

### Method 1: Running from Your Local Machine

1. **Open Terminal** on your local machine

2. **Navigate to the project directory**:
   ```bash
   cd /Users/nicholasthorpe/Documents/Personal/hacks/MANGROVES_2023/insta
   ```

3. **Make the scripts executable**:
   ```bash
   chmod +x pi-automation/deploy-changes.sh
   chmod +x pi-automation/setup-cron.sh
   ```

4. **Deploy the updated pi-automation.js file to the Pi**:
   ```bash
   ./pi-automation/deploy-changes.sh 192.168.0.152 insta
   ```
   This script will:
   - Try to connect to the Pi
   - Copy the updated pi-automation.js file to the Pi
   - Verify the transfer was successful
   - Check for Slack webhook configuration

5. **Update the cron schedule on the Pi**:
   ```bash
   ssh insta@192.168.0.152 'bash -s' < pi-automation/setup-cron.sh
   ```
   This will update the cron jobs on the Pi with the new posting schedule.

### Method 2: Alternative Deployment (If Method 1 Fails)

If you have connectivity issues or the scripts don't work:

1. **Copy the pi-automation.js file directly**:
   ```bash
   scp pi-automation/pi-automation.js insta@192.168.0.152:~/instabear_pi/
   ```

2. **SSH into the Pi**:
   ```bash
   ssh insta@192.168.0.152
   ```

3. **Update the cron schedule manually**:
   ```bash
   # While logged into the Pi
   crontab -e
   ```

4. **Replace the existing schedule with**:
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

## Verifying the Setup

After running the deployment scripts, verify the setup:

1. **Check if the updated file was transferred**:
   ```bash
   ssh insta@192.168.0.152 'ls -la ~/instabear_pi/pi-automation.js'
   ```

2. **Verify the cron schedule**:
   ```bash
   ssh insta@192.168.0.152 'crontab -l'
   ```

3. **Check the Slack webhook configuration**:
   ```bash
   ssh insta@192.168.0.152 'grep SLACK_WEBHOOK_URL ~/instabear_pi/.env'
   ```

## Troubleshooting

If you encounter issues:

1. **SSH Connection Problems**:
   - Ensure the Pi is powered on and connected to the network
   - Try ping to check connectivity: `ping 192.168.0.152`
   - Check if SSH service is running on the Pi

2. **Script Permission Issues**:
   - Ensure the scripts are executable: `chmod +x pi-automation/*.sh`

3. **File Transfer Failures**:
   - Try using `scp` with verbose flag: `scp -v pi-automation/pi-automation.js insta@192.168.0.152:~/instabear_pi/`

4. **Cron Not Working**:
   - Check cron logs: `ssh insta@192.168.0.152 'cat /var/log/syslog | grep CRON'`
   - Check if node is installed: `ssh insta@192.168.0.152 'which node'`