# Instagram Token Refresh Automation

This project includes an automated GitHub Action workflow that refreshes your Instagram API token every 60 days to prevent expiration. This document explains how to set it up.

## How It Works

1. A GitHub Action is scheduled to run on the 1st day of every odd-numbered month
2. The action uses your Facebook App credentials to refresh the token
3. It updates the GitHub repository secret automatically
4. It triggers a redeployment of your website with the new token

## Required Setup

To make the automatic token refresh work, you need to add the following secrets to your GitHub repository:

### 1. Add FB_APP_SECRET

This is your Facebook App Secret, which is needed to refresh the token.

1. Go to your GitHub repository (livemusiclocator/instabear)
2. Click on "Settings" tab
3. In the left sidebar, click on "Secrets and variables" → "Actions"
4. Click "New repository secret"
5. Name: `FB_APP_SECRET`
6. Value: `c2ecc0afdc4944d6af68575524ed6545` (your Facebook App Secret)
7. Click "Add secret"

Note: Your Facebook App ID is hardcoded in the workflow, so you don't need to add it as a secret.

### 2. Add REPO_ACCESS_TOKEN

This is a GitHub Personal Access Token with permission to update repository secrets and trigger workflows.

1. Go to your GitHub account settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token" → "Generate new token (classic)"
3. Note: `Instagram Token Refresh`
4. Select these permissions:
   - `repo` (Full control of private repositories)
   - `workflow` (Update GitHub Action workflows)
5. Click "Generate token"
6. **IMPORTANT**: Copy the generated token immediately
7. Go back to your repository settings → Secrets → Actions
8. Click "New repository secret"
9. Name: `REPO_ACCESS_TOKEN`
10. Value: Paste the token you copied
11. Click "Add secret"

## Testing the Workflow

After setting up the secrets, you can manually trigger the token refresh:

1. Go to your GitHub repository
2. Click the "Actions" tab
3. In the left sidebar, click "Refresh Instagram Token"
4. Click "Run workflow" button
5. Select the main branch
6. Click "Run workflow"

The action will run, refresh your token, update the secret, and trigger a redeployment.

## Troubleshooting

If the automatic token refresh fails, you might see a failed workflow in your Actions tab. Common issues include:

1. **Expired Token**: If your token has already expired, you'll need to generate a new token manually using the Facebook Graph API Explorer.

2. **Invalid App Secret**: Double-check your FB_APP_SECRET value.

3. **Insufficient Permissions**: Ensure your REPO_ACCESS_TOKEN has the necessary permissions.

## Manual Token Refresh

If needed, you can still refresh your token manually using the `refreshToken.js` script:

```bash
node refreshToken.js
```

Then update the GitHub secret and trigger a redeployment.
