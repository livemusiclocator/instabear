#!/bin/bash

# This script sets up a cron job to run the automation script in a few minutes for testing

# Get current time
CURRENT_MINUTE=$(date +%M)
CURRENT_HOUR=$(date +%H)

# Calculate a time 5 minutes from now
TEST_MINUTE=$(( (CURRENT_MINUTE + 5) % 60 ))
TEST_HOUR=$CURRENT_HOUR
if [ $TEST_MINUTE -lt $CURRENT_MINUTE ]; then
    TEST_HOUR=$(( (CURRENT_HOUR + 1) % 24 ))
fi

# Define the cron job
CRON_JOB="$TEST_MINUTE $TEST_HOUR * * * cd /home/insta/instabear_pi && /usr/bin/node /home/insta/instabear_pi/pi-automation.js >> /home/insta/instabear_pi/cron.log 2>&1"

echo "Setting up test cron job to run at $TEST_HOUR:$TEST_MINUTE..."

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

echo "Test cron job set up successfully to run at $TEST_HOUR:$TEST_MINUTE."
echo "Current crontab:"
crontab -l

echo "After testing, run setup-cron.sh to restore the regular schedule."
