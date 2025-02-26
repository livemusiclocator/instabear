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

        // Upload screenshots to Slack
        await uploadScreenshotsToSlack(slackWebhookUrl);

    } catch (slackError) {
        log(`Failed to send Slack notification: ${slackError.message}`, true);
    }
}

// Function to upload screenshots to Slack
async function uploadScreenshotsToSlack(webhookUrl) {
    try {
        const screenshotPaths = [
            'page-loaded.png',
            'after-post-click.png',
            'after-waiting.png'
        ];
        
        for (const screenshot of screenshotPaths) {
            try {
                // Check if file exists
                readFileSync(screenshot);
                
                // Create a message with image URL (using GitHub Pages URL)
                const message = {
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: `*Screenshot:* ${screenshot}`
                            }
                        },
                        {
                            type: "image",
                            title: {
                                type: "plain_text",
                                text: screenshot
                            },
                            image_url: `${GITHUB_PAGES_URL}screenshots/${screenshot}`,
                            alt_text: screenshot
                        }
                    ]
                };
                
                // Send the message to Slack
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(message)
                });
                
                if (!response.ok) {
                    throw new Error(`Slack API responded with status: ${response.status}`);
                }
                
                log(`Sent screenshot ${screenshot} to Slack`);
            } catch (err) {
                log(`Could not send screenshot ${screenshot} to Slack: ${err.message}`, true);
            }
        }
    } catch (error) {
        log(`Failed to upload screenshots to Slack: ${error.message}`, true);
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
        await page.waitForSelector('#generate-images-btn', { timeout: 60000 });
        
        // Click generate button
        log('Clicking generate button');
        await page.click('#generate-images-btn');
        
        // Wait for generation to complete and post button to appear
        log('Waiting for post button to appear');
        await page.waitForSelector('#post-instagram-btn', { timeout: 60000 });
        
        // Click post button
        log('Clicking post button');
        await page.click('#post-instagram-btn');
        
        // Take a screenshot after clicking post button
        await page.screenshot({ path: 'after-post-click.png' });
        log('Took screenshot after clicking post button');
        
        // Wait for posting to complete - increased to 2 minutes
        log('Waiting for posting to complete (2 minutes)...');
        await page.waitForTimeout(120000);
        
        // Take a final screenshot after waiting
        await page.screenshot({ path: 'after-waiting.png' });
        log('Took final screenshot after waiting');

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
        success = true;
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
