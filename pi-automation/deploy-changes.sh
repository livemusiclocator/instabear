#!/bin/bash
# Robust deployment script for pi-automation.js
# Handles poor connectivity and provides fallback options
# Usage: ./deploy-changes.sh [PI_IP_ADDRESS] [USERNAME]

# Default values
PI_IP=${1:-"192.168.0.152"}
PI_USER=${2:-"insta"}
PI_DIR="instabear_pi"
MAX_RETRIES=5
RETRY_DELAY=10
SCRIPT_PATH=$(dirname "$0")
SOURCE_FILE="${SCRIPT_PATH}/pi-automation.js"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Instagram Pi Automation Deployment ===${NC}"
echo "Target: ${PI_USER}@${PI_IP}:~/${PI_DIR}"
echo "Source: ${SOURCE_FILE}"
echo

# Function to test SSH connection
test_connection() {
  echo -e "${BLUE}Testing SSH connection...${NC}"
  ssh -o ConnectTimeout=5 "${PI_USER}@${PI_IP}" "echo Connection successful" > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ SSH connection successful${NC}"
    return 0
  else
    echo -e "${RED}✗ SSH connection failed${NC}"
    return 1
  fi
}

# Function to deploy via SCP with retry logic
deploy_scp() {
  echo -e "${BLUE}Deploying via SCP...${NC}"
  local retries=0
  local success=false

  while [ $retries -lt $MAX_RETRIES ] && [ "$success" = false ]; do
    scp -o ConnectTimeout=10 "${SOURCE_FILE}" "${PI_USER}@${PI_IP}:~/${PI_DIR}/"
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✓ File transferred successfully via SCP${NC}"
      success=true
    else
      retries=$((retries + 1))
      if [ $retries -lt $MAX_RETRIES ]; then
        echo -e "${YELLOW}⚠ SCP failed, retrying in ${RETRY_DELAY} seconds (attempt $retries/$MAX_RETRIES)${NC}"
        sleep $RETRY_DELAY
      else
        echo -e "${RED}✗ SCP failed after $MAX_RETRIES attempts${NC}"
      fi
    fi
  done

  return $([ "$success" = true ] && echo 0 || echo 1)
}

# Function to generate manual instructions
show_manual_instructions() {
  echo -e "${YELLOW}=== Manual Deployment Instructions ===${NC}"
  echo "If automated deployment fails, you can manually copy the file:"
  echo
  echo "1. From your local machine, use SCP:"
  echo "   scp ${SOURCE_FILE} ${PI_USER}@${PI_IP}:~/${PI_DIR}/"
  echo
  echo "2. Or connect to the Pi and download from GitHub:"
  echo "   ssh ${PI_USER}@${PI_IP}"
  echo "   cd ~/${PI_DIR}"
  echo "   wget -O pi-automation.js https://raw.githubusercontent.com/livemusiclocator/instabear/main/pi-automation/pi-automation.js"
  echo
  echo "3. After deployment, you may need to restart the automation:"
  echo "   ssh ${PI_USER}@${PI_IP}"
  echo "   cd ~/${PI_DIR}"
  echo "   node pi-automation.js"
  echo
}

# Function to check .env file for Slack webhook
check_env_file() {
  echo -e "${BLUE}Checking for .env file on Pi...${NC}"
  ssh -o ConnectTimeout=5 "${PI_USER}@${PI_IP}" "test -f ~/${PI_DIR}/.env" > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"
    
    # Check if SLACK_WEBHOOK_URL is set
    ssh -o ConnectTimeout=5 "${PI_USER}@${PI_IP}" "grep -q 'SLACK_WEBHOOK_URL' ~/${PI_DIR}/.env" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✓ SLACK_WEBHOOK_URL appears to be configured${NC}"
    else
      echo -e "${RED}✗ SLACK_WEBHOOK_URL not found in .env file${NC}"
      echo "This could be why Slack notifications are failing."
      echo "You may need to add: SLACK_WEBHOOK_URL=your_slack_webhook_url"
    fi
  else
    echo -e "${RED}✗ .env file not found${NC}"
    echo "This could be why Slack notifications are failing."
    echo "Create a .env file with: SLACK_WEBHOOK_URL=your_slack_webhook_url"
  fi
}

# Main deployment flow
echo -e "${BLUE}Starting deployment process...${NC}"

# Step 1: Test connection
if test_connection; then
  # Step 2: Try deployment via SCP
  if deploy_scp; then
    echo -e "${GREEN}=== Deployment Successful ===${NC}"
    
    # Step 3: Check .env file for Slack configuration
    check_env_file
    
    echo
    echo -e "${GREEN}The pi-automation.js file has been updated with:${NC}"
    echo "- Increased timeouts for all operations"
    echo "- Improved Slack notification with retry logic"
    echo "- Better error handling for unreliable connections"
    echo
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. You may want to restart the automation service"
    echo "2. Check the logs for any errors: tail -50 ~/${PI_DIR}/automation.log"
  else
    echo -e "${RED}=== Automated Deployment Failed ===${NC}"
    show_manual_instructions
  fi
else
  echo -e "${RED}=== Cannot Connect to Pi ===${NC}"
  echo "Please ensure the Pi is powered on and connected to the network."
  show_manual_instructions
fi
