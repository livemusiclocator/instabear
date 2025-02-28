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

// Configuration
const __dirname = dirname(fileURLToPath(import.meta.url));
const GITHUB_PAGES_URL = 'https://lml.live/instabear/';
const LOG_FILE = join(__dirname, 'automation.log');

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

// Function to send Slack notifications
async function sendSlackNotification(success, error = null) {
    try {
        // Check if Slack webhook URL is configured
        const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
        if (!slackWebhookUrl || slackWebhookUrl === 'your_slack_webhook_url_here') {
            log('Slack webhook URL not configured, skipping notification');
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

        // Send the message to Slack
        const response = await fetch(slackWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(message)
        });

        if (!response.ok) {
            throw new Error(`Slack API responded with status: ${response.status}`);
        }

        log('Slack notification sent successfully');
    } catch (slackError) {
        log(`Failed to send Slack notification: ${slackError.message}`, true);
    }
}

async function automate() {
    let browser = null;
    let success = false;
    let errorDetails = null;
    
    try {
        log('Starting automation process');

        // Launch browser
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: '/usr/bin/chromium-browser', // Raspberry Pi Chromium path
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            protocolTimeout: 180000  // 3 minutes instead of default 30 seconds
        });

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
            timeout: 60000 // 60 seconds timeout for page load
        });
        
        // Take a screenshot for debugging
        await page.screenshot({ path: 'page-loaded.png' });
        log('Took screenshot of loaded page');

        // Wait for any necessary elements and perform actions
        log('Waiting for page to be ready');
        
        // Process St Kilda carousel
        log('Processing St Kilda carousel...');
        await page.waitForSelector('#generate-images-btn-stkilda', { timeout: 60000 });
        
        // Click generate button for St Kilda
        log('Clicking generate button for St Kilda');
        await page.click('#generate-images-btn-stkilda');
        
        // Take a screenshot after clicking generate button for St Kilda
        await page.screenshot({ path: 'stkilda-generate-click.png' });
        log('Took screenshot after clicking generate button for St Kilda');
        
        // Wait for 45 seconds
        log('Waiting 45 seconds after St Kilda generate click...');
        await page.waitForTimeout(45000);
        
        // Wait for post button to appear for St Kilda
        log('Waiting for post button to appear for St Kilda');
        await page.waitForSelector('#post-instagram-btn-stkilda', { timeout: 60000 });
        
        // Click post button for St Kilda
        log('Clicking post button for St Kilda');
        await page.click('#post-instagram-btn-stkilda');
        
        // Take a screenshot after clicking post button for St Kilda
        await page.screenshot({ path: 'stkilda-post-click.png' });
        log('Took screenshot after clicking post button for St Kilda');
        
        // Wait for 45 seconds
        log('Waiting 45 seconds after St Kilda post click...');
        await page.waitForTimeout(45000);
        
        // Process Fitzroy carousel
        log('Processing Fitzroy carousel...');
        await page.waitForSelector('#generate-images-btn-fitzroy', { timeout: 60000 });
        
        // Click generate button for Fitzroy
        log('Clicking generate button for Fitzroy');
        await page.click('#generate-images-btn-fitzroy');
        
        // Take a screenshot after clicking generate button for Fitzroy
        await page.screenshot({ path: 'fitzroy-generate-click.png' });
        log('Took screenshot after clicking generate button for Fitzroy');
        
        // Wait for 45 seconds
        log('Waiting 45 seconds after Fitzroy generate click...');
        await page.waitForTimeout(45000);
        
        // Wait for post button to appear for Fitzroy
        log('Waiting for post button to appear for Fitzroy');
        await page.waitForSelector('#post-instagram-btn-fitzroy', { timeout: 60000 });
        
        // Click post button for Fitzroy
        log('Clicking post button for Fitzroy');
        await page.click('#post-instagram-btn-fitzroy');
        
        // Take a screenshot after clicking post button for Fitzroy
        await page.screenshot({ path: 'fitzroy-post-click.png' });
        log('Took screenshot after clicking post button for Fitzroy');
        
        // Wait for posting to complete - increased to 2 minutes
        log('Waiting for posting to complete (2 minutes)...');
        await page.waitForTimeout(120000);
        
        // Take a final screenshot after waiting
        await page.screenshot({ path: 'after-waiting.png' });
        log('Took final screenshot after waiting');

        // Check for success messages for both carousels
        log('Checking for success messages...');
        
        // Look for success message for St Kilda carousel
        const stKildaSuccess = await page.evaluate(() => {
            const stKildaSection = document.querySelector('div:has(h2:contains("St Kilda Gigs"))');
            if (!stKildaSection) return false;
            
            const statusDiv = stKildaSection.querySelector('div.text-sm.text-gray-600');
            return statusDiv && statusDiv.textContent.includes('Successfully posted to Instagram');
        });
        
        // Look for success message for Fitzroy carousel
        const fitzroySuccess = await page.evaluate(() => {
            const fitzroySection = document.querySelector('div:has(h2:contains("Fitzroy"))');
            if (!fitzroySection) return false;
            
            const statusDiv = fitzroySection.querySelector('div.text-sm.text-gray-600');
            return statusDiv && statusDiv.textContent.includes('Successfully posted to Instagram');
        });
        
        if (stKildaSuccess && fitzroySuccess) {
            log('Both carousels were successfully posted to Instagram');
            success = true;
        } else {
            if (!stKildaSuccess) log('St Kilda carousel posting failed or status not found', true);
            if (!fitzroySuccess) log('Fitzroy carousel posting failed or status not found', true);
            throw new Error('Instagram posting was not fully successful');
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
        
        // Send notification with status
        await sendSlackNotification(success, errorDetails);
    }
}

// Run the automation
automate().catch(error => {
    log(`Fatal error: ${error.message}`, true);
    globalThis.process.exit(1);
});
