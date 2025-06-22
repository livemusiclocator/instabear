#!/bin/bash
# Manual script to update cron on the Pi
# Usage: ./manual-cron-update.sh [pi_ip_address] [username]

PI_IP=${1:-"192.168.0.152"}
USERNAME=${2:-"insta"}

# Create the crontab content
cat > /tmp/new-crontab << EOF
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

echo "Manually updating cron schedule on $PI_IP..."
scp /tmp/new-crontab $USERNAME@$PI_IP:/tmp/new-crontab
ssh $USERNAME@$PI_IP "crontab /tmp/new-crontab && rm /tmp/new-crontab"

# Verify the cron update
echo "Verifying cron schedule..."
ssh $USERNAME@$PI_IP "crontab -l"

# Clean up
rm /tmp/new-crontab

echo "Done!"