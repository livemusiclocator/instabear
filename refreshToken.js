#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import readline from 'readline';
import process from 'process';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '.env');

// Function to read the app secret from user input
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// Function to get user input
async function getInput(prompt) {
  const rl = createInterface();
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Function to refresh the Instagram token
async function refreshToken(appId, appSecret, currentToken) {
  try {
    console.log('Refreshing Instagram token...');
    
    const url = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${currentToken}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok || data.error) {
      throw new Error(data.error?.message || `API request failed with status ${response.status}`);
    }
    
    if (!data.access_token) {
      throw new Error('No access token returned from API');
    }
    
    console.log('Successfully obtained new long-term token.');
    return data.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error.message);
    throw error;
  }
}

// Function to update the .env file with the new token
async function updateEnvFile(envPath, newToken) {
  try {
    console.log('Updating .env file...');
    
    // Read the current .env file
    const envContent = await fs.readFile(envPath, 'utf8');
    
    // Replace the token value in the content
    const updatedContent = envContent.replace(
      /VITE_INSTAGRAM_ACCESS_TOKEN=.*/,
      `VITE_INSTAGRAM_ACCESS_TOKEN=${newToken}`
    );
    
    // Write the updated content back to the .env file
    await fs.writeFile(envPath, updatedContent, 'utf8');
    
    console.log('Successfully updated .env file with new token.');
  } catch (error) {
    console.error('Error updating .env file:', error.message);
    throw error;
  }
}

// Main function
async function main() {
  try {
    console.log('Instagram Token Refresh Utility');
    console.log('==============================\n');
    
    // Load environment variables
    dotenv.config({ path: envPath });
    
  // Extract the app ID and current token from environment
  const appId = process.env.VITE_APP_ID || '1739631596969313'; // Use the app ID you provided
  const currentToken = process.env.VITE_INSTAGRAM_ACCESS_TOKEN;
  
  if (!currentToken) {
    throw new Error('No current Instagram token found in .env file');
  }
  
  // Only show token fragment for security
  console.log(`Current token: ${currentToken.substring(0, 10)}...${currentToken.substring(currentToken.length - 10)}`);
    
    // Get the app secret from user input (for security reasons)
    const appSecret = await getInput('Enter your Facebook App Secret: ');
    
    if (!appSecret) {
      throw new Error('App Secret is required');
    }
    
    // Refresh the token
    const newToken = await refreshToken(appId, appSecret, currentToken);
    
    // Update the .env file
    await updateEnvFile(envPath, newToken);
    
    console.log('\nToken refresh completed successfully!');
    console.log(`New token: ${newToken.substring(0, 10)}...${newToken.substring(newToken.length - 10)}`);
    console.log(`Expiration: approximately 60 days from now`);
    
  } catch (error) {
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

// Run the main function
main();
