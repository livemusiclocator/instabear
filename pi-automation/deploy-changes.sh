#!/bin/bash

# This script commits changes to GitHub and deploys them to the Raspberry Pi

# Configuration
PI_HOST="192.168.0.140"
PI_USER="insta"  # Raspberry Pi username
PI_PATH="/home/$PI_USER/instabear_pi"
GITHUB_REPO="livemusiclocator/instabear"

# Function to display usage information
usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  --commit-only    Only commit changes to GitHub"
    echo "  --deploy-only    Only deploy changes to Raspberry Pi"
    echo "  --help           Display this help message"
    echo ""
    echo "If no options are provided, both commit and deploy actions will be performed."
}

# Parse command line arguments
COMMIT=true
DEPLOY=true

while [[ $# -gt 0 ]]; do
    case "$1" in
        --commit-only)
            COMMIT=true
            DEPLOY=false
            shift
            ;;
        --deploy-only)
            COMMIT=false
            DEPLOY=true
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Commit changes to GitHub
if [ "$COMMIT" = true ]; then
    echo "Committing changes to GitHub..."
    
    # Check if there are any changes to commit
    if git -C .. status --porcelain | grep -q "pi-automation/"; then
        # Add changes in pi-automation directory
        git -C .. add pi-automation/
        
        # Commit changes
        git -C .. commit -m "Update Instagram automation with Slack notifications"
        
        # Push changes to GitHub
        git -C .. push origin main
        
        echo "Changes committed and pushed to GitHub."
    else
        echo "No changes to commit in pi-automation directory."
    fi
fi

# Deploy changes to Raspberry Pi
if [ "$DEPLOY" = true ]; then
    echo "Deploying changes to Raspberry Pi..."
    
    # Run the deploy-to-pi.sh script
    ./deploy-to-pi.sh
    
    # Set up the cron job
    echo "Setting up cron job on Raspberry Pi..."
    ssh $PI_USER@$PI_HOST "cd $PI_PATH && ./setup-cron.sh"
    
    echo "Deployment complete!"
fi

echo "All done!"
