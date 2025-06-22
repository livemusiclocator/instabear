#!/bin/bash
# Script to set up cron jobs for Instagram posting on the Pi
# New schedule:
# - Wednesday: 8:45 AM
# - Thursday: 10:30 AM
# - Friday: 5:00 PM (17:00)
# - Saturday: 12:00 PM (noon)
# - Sunday: 12:00 PM (noon)

# Constants
PI_DIR="instabear_pi"
AUTOMATION_SCRIPT="pi-automation.js"
LOG_FILE="cron.log"
SCRIPT_PATH=$(dirname "$0")

echo "=== Setting up new Instagram posting schedule ==="
echo "This script will update the cron job on the Pi with the new schedule."

# Function to create the cron job entry
create_cron_entry() {
  # Create a temporary file for the new crontab
  TEMP_CRON=$(mktemp)
  
  # Export current crontab to the temporary file
  crontab -l > "$TEMP_CRON" 2>/dev/null || echo "# Instagram posting schedule" > "$TEMP_CRON"
  
  # Remove any existing automation jobs
  grep -v "pi-automation.js" "$TEMP_CRON" > "${TEMP_CRON}.new"
  mv "${TEMP_CRON}.new" "$TEMP_CRON"
  
  # Add comments for clarity
  echo "" >> "$TEMP_CRON"
  echo "# Instagram posting schedule - updated $(date)" >> "$TEMP_CRON"
  echo "# Schedule:" >> "$TEMP_CRON"
  echo "# - Wednesday: 8:45 AM" >> "$TEMP_CRON"
  echo "# - Thursday: 10:30 AM" >> "$TEMP_CRON"
  echo "# - Friday: 5:00 PM" >> "$TEMP_CRON"
  echo "# - Saturday: 12:00 PM (noon)" >> "$TEMP_CRON"
  echo "# - Sunday: 12:00 PM (noon)" >> "$TEMP_CRON"
  
  # Add the new cron entries - using day of week (0=Sunday, 3=Wednesday, etc.)
  # Format: minute hour * * day_of_week command
  echo "# Wednesday at 8:45 AM" >> "$TEMP_CRON"
  echo "45 8 * * 3 cd ~/${PI_DIR} && /usr/bin/node ${AUTOMATION_SCRIPT} >> ~/${PI_DIR}/${LOG_FILE} 2>&1" >> "$TEMP_CRON"
  
  echo "# Thursday at 10:30 AM" >> "$TEMP_CRON"
  echo "30 10 * * 4 cd ~/${PI_DIR} && /usr/bin/node ${AUTOMATION_SCRIPT} >> ~/${PI_DIR}/${LOG_FILE} 2>&1" >> "$TEMP_CRON"
  
  echo "# Friday at 5:00 PM" >> "$TEMP_CRON"
  echo "0 17 * * 5 cd ~/${PI_DIR} && /usr/bin/node ${AUTOMATION_SCRIPT} >> ~/${PI_DIR}/${LOG_FILE} 2>&1" >> "$TEMP_CRON"
  
  echo "# Saturday at 12:00 PM" >> "$TEMP_CRON"
  echo "0 12 * * 6 cd ~/${PI_DIR} && /usr/bin/node ${AUTOMATION_SCRIPT} >> ~/${PI_DIR}/${LOG_FILE} 2>&1" >> "$TEMP_CRON"
  
  echo "# Sunday at 12:00 PM" >> "$TEMP_CRON"
  echo "0 12 * * 0 cd ~/${PI_DIR} && /usr/bin/node ${AUTOMATION_SCRIPT} >> ~/${PI_DIR}/${LOG_FILE} 2>&1" >> "$TEMP_CRON"
  
  # Install the new crontab
  crontab "$TEMP_CRON"
  
  # Remove the temporary file
  rm "$TEMP_CRON"
}

# Function to display the current crontab for verification
display_crontab() {
  echo ""
  echo "=== Current Crontab ==="
  crontab -l
  echo "======================="
}

# Function to generate instructions for manual setup
generate_manual_instructions() {
  echo ""
  echo "=== Manual Setup Instructions ==="
  echo "If you prefer to set up the cron job manually, follow these steps:"
  echo ""
  echo "1. SSH into your Pi:"
  echo "   ssh insta@192.168.0.152"
  echo ""
  echo "2. Edit the crontab:"
  echo "   crontab -e"
  echo ""
  echo "3. Remove any existing lines containing 'pi-automation.js'"
  echo ""
  echo "4. Add these lines:"
  echo "   # Instagram posting schedule - updated $(date)"
  echo "   # Wednesday at 8:45 AM"
  echo "   45 8 * * 3 cd ~/${PI_DIR} && /usr/bin/node ${AUTOMATION_SCRIPT} >> ~/${PI_DIR}/${LOG_FILE} 2>&1"
  echo "   # Thursday at 10:30 AM"
  echo "   30 10 * * 4 cd ~/${PI_DIR} && /usr/bin/node ${AUTOMATION_SCRIPT} >> ~/${PI_DIR}/${LOG_FILE} 2>&1"
  echo "   # Friday at 5:00 PM"
  echo "   0 17 * * 5 cd ~/${PI_DIR} && /usr/bin/node ${AUTOMATION_SCRIPT} >> ~/${PI_DIR}/${LOG_FILE} 2>&1"
  echo "   # Saturday at 12:00 PM"
  echo "   0 12 * * 6 cd ~/${PI_DIR} && /usr/bin/node ${AUTOMATION_SCRIPT} >> ~/${PI_DIR}/${LOG_FILE} 2>&1"
  echo "   # Sunday at 12:00 PM"
  echo "   0 12 * * 0 cd ~/${PI_DIR} && /usr/bin/node ${AUTOMATION_SCRIPT} >> ~/${PI_DIR}/${LOG_FILE} 2>&1"
  echo ""
  echo "5. Save and exit the editor"
  echo "================================"
}

# Main execution flow
echo "Setting up new cron schedule..."

# Check if running on the Pi or locally
if [ -d "/home/insta/${PI_DIR}" ]; then
  # Running on the Pi
  echo "Detected Pi environment, updating crontab..."
  create_cron_entry
  display_crontab
  echo "Cron schedule updated successfully!"
else
  # Not running on the Pi
  echo "Not running on the Pi. Generating manual instructions..."
  generate_manual_instructions
fi

echo ""
echo "Done! The Instagram posting is now scheduled for:"
echo "- Wednesday: 8:45 AM"
echo "- Thursday: 10:30 AM"
echo "- Friday: 5:00 PM"
echo "- Saturday: 12:00 PM (noon)"
echo "- Sunday: 12:00 PM (noon)"
