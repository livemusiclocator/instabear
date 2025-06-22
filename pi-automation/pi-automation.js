import puppeteer from 'puppeteer';
import { appendFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Octokit } from '@octokit/rest';
import process from 'process';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables from .env file
dotenv.config();

// Check if running in local test mode
const IS_LOCAL_TEST = process.env.LOCAL_TEST === 'true';

// Log local test mode if active
if (IS_LOCAL_TEST) {
    console.log('Running in LOCAL TEST MODE');
}

// Check for required environment variables
const REQUIRED_ENV_VARS = {
    'SLACK_WEBHOOK_URL': 'Slack webhook URL for notifications',
    'GITHUB_TOKEN': 'GitHub token for repo operations'
};

// Log any missing environment variables
const missingVars = [];
for (const [varName, description] of Object.entries(REQUIRED_ENV_VARS)) {
    if (!process.env[varName] || process.env[varName] === `your_${varName.toLowerCase()}_here`) {
        missingVars.push(`${varName}: ${description}`);
    }
}

// Configuration
const __dirname = dirname(fileURLToPath(import.meta.url));
const GITHUB_PAGES_URL = 'https://lml.live/instabear/';
const LOG_FILE = join(__dirname, 'automation.log');
const ENV_STATUS_FILE = join(__dirname, 'env-status.json');

// Log environment status
if (missingVars.length > 0) {
    const envStatus = {
        timestamp: new Date().toISOString(),
        missing: missingVars,
        warning: 'Some environment variables are missing or using default values'
    };
    try {
        appendFileSync(ENV_STATUS_FILE, JSON.stringify(envStatus) + '\n');
    } catch {
        // Continue even if writing status file fails
    }
}

// Helper function to log messages with timestamps
function log(message, isError = false) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    appendFileSync(LOG_FILE, logMessage);
    if (isError) {
        console.error(logMessage);
    } else {
        console.log(logMessage);
    }
}

// Function to send Slack notifications with retry mechanism
async function sendSlackNotification(success, error = null, retryCount = 3) {
    try {
        // Skip Slack notifications in local test mode unless specifically configured
        if (IS_LOCAL_TEST && (!process.env.SLACK_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL === 'your_slack_webhook_url_here')) {
            log('Running in local test mode with no Slack webhook configured - skipping notification');
            return;
        }
        
        // Check if Slack webhook URL is configured
        const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
        if (!slackWebhookUrl || slackWebhookUrl === 'your_slack_webhook_url_here') {
            log('Slack webhook URL not configured, skipping notification');
            return;
        }

        // Validate webhook URL format
        if (!slackWebhookUrl.startsWith('https://hooks.slack.com/')) {
            log(`Invalid Slack webhook URL format: ${slackWebhookUrl.substring(0, 15)}... - should start with https://hooks.slack.com/`, true);
            return;
        }

        log('Sending Slack notification...');

        // Prepare status text and color
        const status = success ? 'Success' : 'Failed';
        const color = success ? '#36a64f' : '#ff0000';
        const timestamp = new Date().toLocaleString('en-AU', {
            timeZone: 'Australia/Melbourne',
            dateStyle: 'full',
            timeStyle: 'long'
        });
        
        // Get recent logs (last 15 lines)
        let logExcerpt = '';
        try {
            const fullLog = readFileSync(LOG_FILE, 'utf8');
            const logLines = fullLog.split('\n');
            logExcerpt = logLines.slice(-15).join('\n');
        } catch (err) {
            logExcerpt = 'Could not read log file';
            log(`Error reading log file: ${err.message}`, true);
        }

        // Prepare message payload
        const message = {
            text: `Instagram Posting ${status}`,
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: `Instagram Posting: ${status}`,
                        emoji: true
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*Time:* ${timestamp}\n*Status:* ${status}\n*Recipient:* gigs@lml.live`
                    }
                }
            ],
            attachments: [
                {
                    color: color,
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: "*Recent Logs:*\n```" + logExcerpt + "```"
                            }
                        }
                    ]
                }
            ]
        };

        // Add error details if there was an error
        if (error) {
            message.blocks.push({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Error:*\n\`\`\`${error.message}\`\`\``
                }
            });
        }

        // Send the message to Slack with timeout
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            const response = await fetch(slackWebhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(message),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const responseText = await response.text().catch(() => 'No response text');
                throw new Error(`Slack API responded with status: ${response.status} - ${responseText}`);
            }
            
            log('Slack notification sent successfully');
        } catch (fetchError) {
            // Retry logic for network errors
            if (retryCount > 0) {
                const delayMs = 5000; // 5 second delay between retries
                log(`Slack notification failed, retrying in 5 seconds... (${retryCount} attempts left)`, true);
                await new Promise(resolve => setTimeout(resolve, delayMs));
                return sendSlackNotification(success, error, retryCount - 1);
            } else {
                const errorMessage = `Failed to send Slack notification after retries: ${fetchError.message}`;
                log(errorMessage, true);
                // Continue execution instead of throwing (don't let Slack failures kill the automation)
            }
        }
    } catch (slackError) {
        log(`Failed to send Slack notification: ${slackError.message}`, true);
        // Save notification to a local file as backup
        try {
            const backupFile = join(__dirname, 'failed-slack-notifications.json');
            const timestamp = new Date().toISOString();
            const backupData = {
                timestamp,
                success,
                error: error ? error.message : null
            };
            appendFileSync(backupFile, JSON.stringify(backupData) + '\n');
            log('Saved failed notification to backup file');
        } catch (backupError) {
            log(`Failed to save notification backup: ${backupError.message}`, true);
        }
    }
}

async function automate() {
    let browser = null;
    let success = false;
    let errorDetails = null;
    
    try {
        log('Starting automation process');

        // Launch browser - different configuration for local test vs Pi
        if (IS_LOCAL_TEST) {
            log('Launching browser in local test mode');
            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                protocolTimeout: 180000  // 3 minutes instead of default 30 seconds
            });
        } else {
            // Pi-specific configuration
            browser = await puppeteer.launch({
                headless: 'new',
                executablePath: '/usr/bin/chromium-browser', // Raspberry Pi Chromium path
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                protocolTimeout: 180000  // 3 minutes instead of default 30 seconds
            });
        }

        const page = await browser.newPage();
        
        // Listen for console events and log them
        page.on('console', msg => {
            log(`Browser console [${msg.type()}]: ${msg.text()}`);
        });
        
        // Set viewport
        await page.setViewport({ width: 1280, height: 800 });

        // Navigate to the GitHub Pages URL with cache-busting parameter
        const timestamp = new Date().getTime();
        log('Navigating to GitHub Pages');
        await page.goto(`${GITHUB_PAGES_URL}?nocache=${timestamp}`, {
            waitUntil: 'networkidle0',
            timeout: 120000 // 120 seconds (2 minutes) timeout for page load
        });
        
        // Take a screenshot for debugging
        const screenshotPath = IS_LOCAL_TEST ? './page-loaded.png' : 'page-loaded.png';
        await page.screenshot({ path: screenshotPath });
        log(`Took screenshot of loaded page: ${screenshotPath}`);

        // Wait for any necessary elements and perform actions
        log('Waiting for page to be ready');
        
        // Process St Kilda carousel
        log('Processing St Kilda carousel...');
        await page.waitForSelector('#generate-images-btn-stkilda', { timeout: 120000 });
        
        // Click generate button for St Kilda
        log('Clicking generate button for St Kilda');
        await page.click('#generate-images-btn-stkilda');
        
        // Take a screenshot after clicking generate button for St Kilda
        const stKildaScreenshot = IS_LOCAL_TEST ? './stkilda-generate-click.png' : 'stkilda-generate-click.png';
        await page.screenshot({ path: stKildaScreenshot });
        log(`Took screenshot after clicking generate button for St Kilda: ${stKildaScreenshot}`);
        
        // Wait for 90 seconds (increased from 45 seconds)
        log('Waiting 90 seconds after St Kilda generate click...');
        await page.waitForTimeout(90000);
        
        // Wait for post button to appear for St Kilda
        log('Waiting for post button to appear for St Kilda');
        await page.waitForSelector('#post-instagram-btn-stkilda', { timeout: 120000 });
        
        // Click post button for St Kilda
        log('Clicking post button for St Kilda');
        await page.click('#post-instagram-btn-stkilda');
        
        // Take a screenshot after clicking post button for St Kilda
        const stKildaPostScreenshot = IS_LOCAL_TEST ? './stkilda-post-click.png' : 'stkilda-post-click.png';
        await page.screenshot({ path: stKildaPostScreenshot });
        log(`Took screenshot after clicking post button for St Kilda: ${stKildaPostScreenshot}`);
        
        // Wait for 90 seconds (increased from 45 seconds)
        log('Waiting 90 seconds after St Kilda post click...');
        await page.waitForTimeout(90000);
        
        // Process Fitzroy carousel
        log('Processing Fitzroy carousel...');
        await page.waitForSelector('#generate-images-btn-fitzroy', { timeout: 120000 });
        
        // Click generate button for Fitzroy
        log('Clicking generate button for Fitzroy');
        await page.click('#generate-images-btn-fitzroy');
        
        // Take a screenshot after clicking generate button for Fitzroy
        const fitzroyScreenshot = IS_LOCAL_TEST ? './fitzroy-generate-click.png' : 'fitzroy-generate-click.png';
        await page.screenshot({ path: fitzroyScreenshot });
        log(`Took screenshot after clicking generate button for Fitzroy: ${fitzroyScreenshot}`);
        
        // Wait for 90 seconds (increased from 45 seconds)
        log('Waiting 90 seconds after Fitzroy generate click...');
        await page.waitForTimeout(90000);
        
        // Wait for post button to appear for Fitzroy
        log('Waiting for post button to appear for Fitzroy');
        await page.waitForSelector('#post-instagram-btn-fitzroy', { timeout: 120000 });
        
        // Click post button for Fitzroy
        log('Clicking post button for Fitzroy');
        await page.click('#post-instagram-btn-fitzroy');
        
        // Take a screenshot after clicking post button for Fitzroy
        const fitzroyPostScreenshot = IS_LOCAL_TEST ? './fitzroy-post-click.png' : 'fitzroy-post-click.png';
        await page.screenshot({ path: fitzroyPostScreenshot });
        log(`Took screenshot after clicking post button for Fitzroy: ${fitzroyPostScreenshot}`);
        
        // Wait for posting to complete - increased to 10 minutes
        log('Waiting for posting to complete (10 minutes)...');
        await page.waitForTimeout(600000);
        
        // Take a final screenshot after waiting
        const finalScreenshot = IS_LOCAL_TEST ? './after-waiting.png' : 'after-waiting.png';
        await page.screenshot({ path: finalScreenshot });
        log(`Took final screenshot after waiting: ${finalScreenshot}`);

        // Check for success messages for both carousels
        log('Checking for success messages...');
        
        // Look for success message for St Kilda carousel using standard DOM methods
        const stKildaSuccess = await page.evaluate(() => {
            // Find all h2 elements on the page
            const headings = Array.from(document.querySelectorAll('h2'));
            
            // Find the one containing "St Kilda Gigs"
            const stKildaHeading = headings.find(h => h.textContent.includes('St Kilda Gigs'));
            if (!stKildaHeading) return false;
            
            // Get parent div (container)
            let stKildaSection = stKildaHeading.parentElement;
            // Sometimes need to go up another level to find the right container
            while (stKildaSection && !stKildaSection.classList.contains('mb-16')) {
                stKildaSection = stKildaSection.parentElement;
            }
            
            if (!stKildaSection) return false;
            
            // Find status div
            const statusDiv = stKildaSection.querySelector('div.text-sm.text-gray-600');
            return statusDiv && statusDiv.textContent.includes('Successfully posted to Instagram');
        });
        
        // Look for success message for Fitzroy carousel using standard DOM methods
        const fitzroySuccess = await page.evaluate(() => {
            // Find all h2 elements on the page
            const headings = Array.from(document.querySelectorAll('h2'));
            
            // Find the one containing "Fitzroy"
            const fitzroyHeading = headings.find(h => h.textContent.includes('Fitzroy'));
            if (!fitzroyHeading) return false;
            
            // Get parent div (container)
            let fitzroySection = fitzroyHeading.parentElement;
            // Sometimes need to go up another level to find the right container
            while (fitzroySection && !fitzroySection.classList.contains('mb-16')) {
                fitzroySection = fitzroySection.parentElement;
            }
            
            if (!fitzroySection) return false;
            
            // Find status div
            const statusDiv = fitzroySection.querySelector('div.text-sm.text-gray-600');
            return statusDiv && statusDiv.textContent.includes('Successfully posted to Instagram');
        });
        
        // In local test mode, be more forgiving about success
        if (IS_LOCAL_TEST) {
            // For local testing, count as success if any carousel posted successfully
            if (stKildaSuccess || fitzroySuccess) {
                if (stKildaSuccess && fitzroySuccess) {
                    log('Both carousels were successfully posted to Instagram');
                } else if (stKildaSuccess) {
                    log('St Kilda carousel posted successfully, but Fitzroy failed or status not found', true);
                } else {
                    log('Fitzroy carousel posted successfully, but St Kilda failed or status not found', true);
                }
                success = true;
            } else {
                if (!stKildaSuccess) log('St Kilda carousel posting failed or status not found', true);
                if (!fitzroySuccess) log('Fitzroy carousel posting failed or status not found', true);
                throw new Error('Instagram posting was not successful - no carousels posted');
            }
        } else {
            // In production mode on the Pi, require both to succeed
            if (stKildaSuccess && fitzroySuccess) {
                log('Both carousels were successfully posted to Instagram');
                success = true;
            } else {
                if (!stKildaSuccess) log('St Kilda carousel posting failed or status not found', true);
                if (!fitzroySuccess) log('Fitzroy carousel posting failed or status not found', true);
                throw new Error('Instagram posting was not fully successful');
            }
        }

        // Clean up temp-images directory in GitHub repo
        log('Cleaning up temp-images directory...');
        try {
            // We'll use the GitHub API directly from Node.js context
            if (process.env.GITHUB_TOKEN) {
                const octokit = new Octokit({
                    auth: process.env.GITHUB_TOKEN
                });
                
                // Get all files in temp-images directory
                const { data } = await octokit.rest.repos.getContent({
                    owner: 'livemusiclocator',
                    repo: 'instabear',
                    path: 'temp-images',
                    ref: 'main'
                });
                
                // Delete all files except README.md
                for (const file of data) {
                    if (file.name !== 'README.md' && file.name.startsWith('gigs_')) {
                        await octokit.rest.repos.deleteFile({
                            owner: 'livemusiclocator',
                            repo: 'instabear',
                            path: `temp-images/${file.name}`,
                            message: 'Clean up temp images after successful posting',
                            sha: file.sha,
                            branch: 'main'
                        });
                        log(`Deleted ${file.name}`);
                    }
                }
                log('Temp-images directory cleaned up successfully');
            } else {
                log('Warning: GITHUB_TOKEN not set, skipping temp-images cleanup');
            }
        } catch (cleanupError) {
            log(`Warning: Failed to clean up temp-images directory: ${cleanupError.message}`, true);
            // Continue execution even if cleanup fails
        }

        log('Automation completed successfully');
    } catch (error) {
        log(`Error during automation: ${error.message}`, true);
        errorDetails = error;
        throw error;
    } finally {
        if (browser) {
            await browser.close();
            log('Browser closed');
        }
        
        // Only send notification if there was no success message within 10 minutes
        if (!success) {
            // Send notification with failure status (don't await in case of network issues)
            sendSlackNotification(success, errorDetails).catch(notifyError => {
                log(`Error in Slack notification: ${notifyError.message}`, true);
            });
        } else {
            log('Instagram posting successful, no Slack notification needed');
        }
    }
}

// Run the automation
automate().catch(error => {
    log(`Fatal error: ${error.message}`, true);
    globalThis.process.exit(1);
});
