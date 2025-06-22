#!/bin/bash

# Deploy updated pi-automation.js to Raspberry Pi
# Usage: ./deploy-to-pi.sh [PI_IP_ADDRESS]

# Default PI IP if not provided
PI_IP=${1:-"192.168.0.152"}
PI_USER=${2:-"insta"}
PI_DIR=${3:-"instabear_pi"}

echo "Deploying pi-automation.js to ${PI_USER}@${PI_IP}:~/${PI_DIR}/"

# Copy the file
scp pi-automation.js "${PI_USER}@${PI_IP}:~/${PI_DIR}/"

# Check if copy was successful
if [ $? -eq 0 ]; then
  echo "✅ Deployment successful!"
  echo "You may want to restart the automation or reboot the Pi:"
  echo "ssh ${PI_USER}@${PI_IP} 'sudo reboot'"
else
  echo "❌ Deployment failed. Check SSH connection and try again."
fi
