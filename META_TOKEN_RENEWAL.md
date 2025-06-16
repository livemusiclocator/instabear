# Manual Instagram Access Token Renewal

Since the current Instagram token has expired and the automatic refresh is encountering issues, follow these steps to manually obtain a new long-lived access token.

## Step 1: Access the Meta Developer Portal

1. Go to https://developers.facebook.com/
2. Log in with the Facebook account associated with your Instagram business account
3. Navigate to "My Apps" and select your app (App ID: 1739631596969313)

## Step 2: Generate a User Access Token

1. In your app dashboard, go to "Tools" → "Graph API Explorer"
2. Make sure your app is selected in the dropdown menu
3. Under "User or Page," select your account
4. In the "Permissions" section, add these permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `instagram_manage_comments`
   - `instagram_manage_insights`
   - `pages_read_engagement`
   - `pages_show_list`
5. Click "Generate Access Token" and approve the permissions

## Step 3: Exchange for a Long-Lived Token

1. Go to "Tools" → "Access Token Debugger"
2. Paste the short-lived token you just generated
3. Click "Debug"
4. Click "Extend Access Token" at the bottom of the page
5. Copy the new long-lived token (valid for ~60 days)

## Step 4: Update Your .env File

1. Replace the expired token in your `.env` file:
   ```
   VITE_INSTAGRAM_ACCESS_TOKEN=your_new_long_lived_token
   ```

## Step 5: Verify Token

1. Run your application and test posting to Instagram
2. The error about expired sessions should be resolved

## Optional: Set a Calendar Reminder

Set a reminder to refresh your token about 50 days from now, before it expires again.

## Important Notes

- Long-lived tokens typically last for 60 days
- The token contains sensitive access credentials - never share it publicly
- If you're frequently encountering token issues, consider implementing a more robust token refresh solution using a server-side component