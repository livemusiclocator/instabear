#!/bin/bash

# This script sets up a cron job to run the automation script at 7:45am Wednesday through Sunday (excluding Monday and Tuesday)

# Define the cron job
CRON_JOB="45 7 * * 3-6,0 cd /home/insta/instabear_pi && /usr/bin/node /home/insta/instabear_pi/pi-automation.js >> /home/insta/instabear_pi/cron.log 2>&1"

# Check if the cron job already exists
if crontab -l 2>/dev/null | grep -q "pi-automation.js"; then
    echo "Cron job already exists. Updating..."
    # Remove existing cron job
    crontab -l 2>/dev/null | grep -v "pi-automation.js" | crontab -
else
    echo "Setting up new cron job..."
fi

# Add the new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "Cron job set up successfully to run at 7:45am Wednesday through Sunday (excluding Monday and Tuesday)."
echo "Current crontab:"
crontab -l
