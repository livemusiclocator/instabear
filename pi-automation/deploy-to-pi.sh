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
    
    # Install mail utilities if not already installed
    if ! command -v sendmail &> /dev/null; then
        echo "Installing mail utilities..."
        sudo apt update
        sudo apt install -y sendmail mailutils
    fi
    
    # Navigate to project directory and set up
    cd $PI_PATH
    
    # Create .env file with necessary variables if it doesn't exist
    if [ ! -f .env ]; then
        echo "Creating .env file with required variables..."
        cat > .env << ENVFILE
SLACK_WEBHOOK_URL=your_slack_webhook_url_here
GITHUB_TOKEN=your_github_token_here
ENVFILE
        echo ".env file created. Please update with actual values."
    fi
    
    # Install project dependencies
    npm install
    
    # Make the automation script executable
    chmod +x pi-automation.js
    
    echo "Setup complete! You can now set up the cron job by running: crontab -e"
    echo "Suggested cron entry:"
    echo "45 7 * * 3-6,0 cd $PI_PATH && /usr/bin/node $PI_PATH/pi-automation.js >> $PI_PATH/cron.log 2>&1"
EOF

echo "Deployment complete!"

# Function to run automation and retrieve screenshots
run_and_get_screenshots() {
    echo "Running automation on Pi..."
    ssh $PI_USER@$PI_HOST "cd $PI_PATH && npm start"
    
    echo "Retrieving screenshots and logs..."
    mkdir -p ./screenshots
    scp $PI_USER@$PI_HOST:$PI_PATH/page-loaded.png ./screenshots/
    scp $PI_USER@$PI_HOST:$PI_PATH/after-post-click.png ./screenshots/
    scp $PI_USER@$PI_HOST:$PI_PATH/automation.log ./screenshots/
    
    echo "Screenshots and logs saved to ./screenshots/"
    echo "You can view them by opening the files in the screenshots directory"
}

# Add a new script to retrieve just the screenshots and logs
get_screenshots() {
    echo "Retrieving screenshots and logs..."
    mkdir -p ./screenshots
    scp $PI_USER@$PI_HOST:$PI_PATH/page-loaded.png ./screenshots/
    scp $PI_USER@$PI_HOST:$PI_PATH/after-post-click.png ./screenshots/
    scp $PI_USER@$PI_HOST:$PI_PATH/automation.log ./screenshots/
    
    echo "Screenshots and logs saved to ./screenshots/"
    echo "You can view them by opening the files in the screenshots directory"
}

# If script is called with "run" argument, run automation and get screenshots
if [ "$1" = "run" ]; then
    run_and_get_screenshots
fi

# If script is called with "screenshots" argument, just get screenshots
if [ "$1" = "screenshots" ]; then
    get_screenshots
fi
