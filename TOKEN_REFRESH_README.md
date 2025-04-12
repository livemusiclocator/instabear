# Instagram Long-Term Token Refresh Guide

This guide explains how to refresh your Instagram long-term access token using the included script.

## About Instagram Tokens

Instagram Graph API tokens expire after approximately 60 days. To ensure your application keeps working, you should refresh your token approximately every 50 days.

## Prerequisites

- Node.js installed on your system
- Your Facebook App ID (already configured in .env)
- Your Facebook App Secret (you'll need to enter this when running the script)
- An existing valid Instagram long-term token (in your .env file)

## How to Refresh Your Token

1. **Run the token refresh script**:

   ```bash
   npm run refresh-token
   ```

   Or directly:

   ```bash
   node refreshToken.js
   ```

2. **Enter your Facebook App Secret** when prompted.

3. **The script will automatically**:
   - Read your current token from the .env file
   - Exchange it for a new long-term token (valid for 60 days)
   - Update your .env file with the new token
   - Display information about the new token

## Scheduling Regular Token Refreshes

Since tokens expire after 60 days, you should refresh them at least every 50 days. You can:

1. Set a calendar reminder to run this script manually every 50 days
2. Use cron on your Raspberry Pi to automate this process (future enhancement)

## Troubleshooting

If you encounter errors:

1. **Token Invalid or Expired**: If your current token is already invalid, you'll need to generate a new one manually through Facebook Graph API Explorer, then replace it in your .env file.

2. **App Secret Incorrect**: Double-check your Facebook App Secret.

3. **API Permission Issues**: Ensure your Facebook App has the necessary permissions for Instagram:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`

4. **Business Account ID Mismatch**: Verify that your VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID in .env is correct.

## Security Notes

- Your App Secret is sensitive information and should never be stored in the repository
- The script requires you to enter it each time to maintain security
- Long-term tokens should be treated as securely as passwords
