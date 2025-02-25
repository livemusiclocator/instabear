#!/bin/bash

# Configuration
PI_HOST="192.168.0.140"
PI_USER="insta"  # Raspberry Pi username
PI_PATH="/home/$PI_USER/instabear_pi"

# Create directory on Pi
ssh $PI_USER@$PI_HOST "mkdir -p $PI_PATH"

# Copy files to Pi
rsync -av --progress ./ $PI_USER@$PI_HOST:$PI_PATH/ --exclude node_modules --exclude automation.log --exclude cron.log

# SSH into Pi and set up the project
ssh $PI_USER@$PI_HOST << EOF
    # Install system dependencies if not already installed
    if ! command -v node &> /dev/null; then
        echo "Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt install -y nodejs
    fi
    
    if ! command -v chromium-browser &> /dev/null; then
        echo "Installing Chromium..."
        sudo apt install -y chromium-browser chromium-codecs-ffmpeg
    fi
    
    # Navigate to project directory and set up
    cd $PI_PATH
    
    # Install project dependencies
    npm install
    
    # Make the automation script executable
    chmod +x pi-automation.js
    
    echo "Setup complete! You can now set up the cron job by running: crontab -e"
    echo "Suggested cron entry:"
    echo "0 9 * * * cd $PI_PATH && /usr/bin/node $PI_PATH/pi-automation.js >> $PI_PATH/cron.log 2>&1"
EOF

echo "Deployment complete!"
