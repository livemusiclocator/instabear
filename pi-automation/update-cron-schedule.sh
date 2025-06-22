#!/bin/bash
# Script to update the cron schedule for Instagram posting
# Usage: ./update-cron-schedule.sh [pi_ip_address] [username]

if [ "$#" -lt 2 ]; then
  echo "Usage: ./update-cron-schedule.sh [pi_ip_address] [username]"
  echo "Example: ./update-cron-schedule.sh 192.168.0.152 insta"
  exit 1
fi

PI_IP=$1
USERNAME=$2

# Create a temporary crontab file
TEMP_CRONTAB=$(mktemp)

# Define the new schedule
cat > $TEMP_CRONTAB << EOF
# Instagram posting schedule
# Updated on $(date "+%Y-%m-%d")
#
# Wednesday: 8:45 AM
45 8 * * 3 cd /home/$USERNAME/instabear_pi && /usr/bin/node pi-automation.js >> /home/$USERNAME/instabear_pi/cron.log 2>&1
#
# Thursday: 10:30 AM
30 10 * * 4 cd /home/$USERNAME/instabear_pi && /usr/bin/node pi-automation.js >> /home/$USERNAME/instabear_pi/cron.log 2>&1
#
# Friday: 5:00 PM
0 17 * * 5 cd /home/$USERNAME/instabear_pi && /usr/bin/node pi-automation.js >> /home/$USERNAME/instabear_pi/cron.log 2>&1
#
# Saturday: 12:00 PM
0 12 * * 6 cd /home/$USERNAME/instabear_pi && /usr/bin/node pi-automation.js >> /home/$USERNAME/instabear_pi/cron.log 2>&1
#
# Sunday: 12:00 PM
0 12 * * 0 cd /home/$USERNAME/instabear_pi && /usr/bin/node pi-automation.js >> /home/$USERNAME/instabear_pi/cron.log 2>&1
EOF

# SSH into the Pi and update the crontab
echo "Updating cron schedule on $PI_IP..."
scp $TEMP_CRONTAB $USERNAME@$PI_IP:/tmp/new-crontab
ssh $USERNAME@$PI_IP "crontab /tmp/new-crontab && rm /tmp/new-crontab"

# Clean up
rm $TEMP_CRONTAB

echo "Cron schedule updated successfully!"
echo "New posting schedule:"
echo "- Wednesday: 8:45 AM"
echo "- Thursday: 10:30 AM"
echo "- Friday: 5:00 PM"
echo "- Saturday & Sunday: 12:00 PM"