#!/bin/bash
# Comprehensive deployment script for all pi-automation changes
# Handles deploying code updates and setting the new cron schedule
# Usage: ./deploy-all-changes.sh [PI_IP_ADDRESS] [USERNAME]

# Default values
PI_IP=${1:-"192.168.0.152"}
PI_USER=${2:-"insta"}
SCRIPT_DIR=$(dirname "$0")

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Instagram Pi Automation - Full Deployment ===${NC}"
echo "Target: ${PI_USER}@${PI_IP}"
echo

# Step 1: Deploy code changes using the existing deploy-changes.sh script
echo -e "${BLUE}Step 1: Deploying code changes...${NC}"
"${SCRIPT_DIR}/deploy-changes.sh" "${PI_IP}" "${PI_USER}"
CODE_DEPLOY_STATUS=$?

if [ $CODE_DEPLOY_STATUS -ne 0 ]; then
  echo -e "${RED}⚠ Code deployment encountered issues. Check above logs for details.${NC}"
  echo -e "${YELLOW}Continuing with cron schedule update anyway...${NC}"
fi

# Step 2: Deploy the cron schedule update script
echo -e "\n${BLUE}Step 2: Deploying cron schedule update script...${NC}"
scp -o ConnectTimeout=10 "${SCRIPT_DIR}/update-cron-schedule.sh" "${PI_USER}@${PI_IP}:~/instabear_pi/"
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Cron update script transferred successfully${NC}"
  
  # Make the script executable
  ssh -o ConnectTimeout=5 "${PI_USER}@${PI_IP}" "chmod +x ~/instabear_pi/update-cron-schedule.sh"
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Made cron update script executable${NC}"
  else
    echo -e "${RED}✗ Failed to make cron update script executable${NC}"
  fi
else
  echo -e "${RED}✗ Failed to transfer cron update script${NC}"
  echo -e "${YELLOW}You'll need to update the cron schedule manually${NC}"
fi

# Step 3: Update the cron schedule
echo -e "\n${BLUE}Step 3: Updating cron schedule...${NC}"
ssh -o ConnectTimeout=10 "${PI_USER}@${PI_IP}" "cd ~/instabear_pi && ./update-cron-schedule.sh localhost ${PI_USER}"
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Cron schedule updated successfully${NC}"
else
  echo -e "${RED}✗ Failed to update cron schedule${NC}"
  echo -e "${YELLOW}You'll need to update the cron schedule manually${NC}"
fi

# Step 4: Verify deployment
echo -e "\n${BLUE}Step 4: Verifying deployment...${NC}"
ssh -o ConnectTimeout=5 "${PI_USER}@${PI_IP}" "ls -la ~/instabear_pi/pi-automation.js ~/instabear_pi/update-cron-schedule.sh && crontab -l"
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Verification successful${NC}"
else
  echo -e "${RED}✗ Verification failed${NC}"
fi

echo -e "\n${BLUE}=== Deployment Summary ===${NC}"
if [ $CODE_DEPLOY_STATUS -eq 0 ]; then
  echo -e "${GREEN}✓ Code changes deployed successfully${NC}"
else
  echo -e "${RED}✗ Code deployment had issues${NC}"
fi

echo -e "\n${BLUE}Next steps:${NC}"
echo "1. To test the automation manually, run:"
echo "   ssh ${PI_USER}@${PI_IP}"
echo "   cd ~/instabear_pi"
echo "   node pi-automation.js"
echo
echo "2. To check the logs:"
echo "   ssh ${PI_USER}@${PI_IP}"
echo "   cd ~/instabear_pi"
echo "   tail -50 automation.log"
echo
echo "3. The new posting schedule is now:"
echo "   - Wednesday: 8:45 AM"
echo "   - Thursday: 10:30 AM"
echo "   - Friday: 5:00 PM"
echo "   - Saturday & Sunday: 12:00 PM"