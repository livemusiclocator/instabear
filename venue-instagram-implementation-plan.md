# Instagram Venue Handle Implementation Plan

## Project Overview

We've implemented the Instagram venue handle integration to @ mention venues in carousel captions. This document outlines what has been completed, what remains to be done, and provides a clear roadmap for finalizing the implementation.

## Completed Tasks

1. **Caption Generation Code**
   - Modified `src/instagramgallery.jsx` to check for venue Instagram handles
   - Updated caption format to include handles: `🎤 {gig.name} @ {gig.venue.name} ({venueHandle}) - {gig.start_time}`
   - Added the mapping file import: `import venueHandles from '../venueInstagramHandles.json'`

2. **Venue Handle Mapping Structure**
   - Created `venueInstagramHandles.json` at the project root with sample mappings
   - Established a format where venue IDs are keys and Instagram handles are values

3. **Mapping Tools & Documentation**
   - Created tools in the `instagram-tools` directory for managing venue-handle mappings
   - Added documentation for using these tools and maintaining the mappings

## Remaining Tasks

1. **Generate Complete Venue Handle Mapping**
   - Convert the CSV venue data to the required JSON format
   - Implement the conversion script from `instagram-tools/convert-venue-csv-to-json.md`

2. **Fix Instagram Token Issue**
   - Manually generate a new Instagram access token
   - Update the GitHub repository secret with the new token

3. **Testing & Verification**
   - Test the Instagram posting with the new token
   - Verify that venue handles appear correctly in captions

## Implementation Steps

### Step 1: Create the Conversion Script

1. Create a new file `instagram-tools/convert-venue-csv-to-json.js` using the code from `instagram-tools/convert-venue-csv-to-json.md`
2. Install required dependencies:
   ```bash
   cd instagram-tools
   npm install csv-parser
   ```
3. Run the script to generate the JSON mapping:
   ```bash
   node convert-venue-csv-to-json.js
   ```
4. This will create/update `venueInstagramHandles.json` in the project root

### Step 2: Fix Instagram Token

1. Visit the [Meta Developer Portal](https://developers.facebook.com/)
2. Navigate to your app (App ID: 1739631596969313)
3. Use Graph API Explorer to generate a new user access token with required permissions
4. Exchange for a long-lived token
5. Update the token in GitHub repository secrets:
   - Go to your GitHub repository → Settings → Secrets → Actions
   - Update the `VITE_INSTAGRAM_ACCESS_TOKEN` secret with the new token

### Step 3: Manual Token Refresh (Alternative Method)

If you prefer to use the existing token refresh utility:

1. Manually update the `.env` file with a valid short-term token
2. Run the refresh script:
   ```bash
   node refreshToken.js
   ```
3. Enter your Facebook App Secret when prompted
4. The script will exchange the token and update your `.env` file

### Step 4: Verify GitHub Workflow

1. Check the `.github/workflows/refresh_token.yml` configuration
2. Ensure all required secrets are properly set:
   - `FB_APP_SECRET`
   - `VITE_INSTAGRAM_ACCESS_TOKEN`
   - `REPO_ACCESS_TOKEN`
3. Manually trigger the workflow from GitHub Actions tab if needed

### Step 5: Test the Implementation

1. Run the application locally:
   ```bash
   npm run dev
   ```
2. Generate carousel images
3. Verify that venue Instagram handles appear in the captions
4. Test posting to Instagram once the token is fixed

## Long-term Maintenance

1. **Keep the Venue Mapping Current**
   - Regularly update the venue-handle mappings as new venues are added
   - Use the provided tools to manage the mapping file

2. **Monitor Token Refresh**
   - Set a calendar reminder to check token status every 45-50 days
   - Verify that the automated refresh workflow runs successfully
   - Prepare for manual intervention if the workflow fails

3. **Handle API Changes**
   - Meta occasionally changes their API requirements
   - Monitor for any changes that might affect token refresh or posting

## Technical Reference

### Venue Handle JSON Format
```json
{
  "venue-id-1": "@venue_handle_1",
  "venue-id-2": "@venue_handle_2"
}
```

### Caption Generation Logic
```javascript
// Check if we have an Instagram handle for this venue
const venueHandle = venueHandles[gig.venue.id] || '';

// Format the caption line with handle if available
if (venueHandle) {
  return `🎤 ${gig.name} @ ${gig.venue.name} (${venueHandle}) - ${gig.start_time}`;
} else {
  return `🎤 ${gig.name} @ ${gig.venue.name} - ${gig.start_time}`;
}
```

### GitHub Workflow Schedule
```yaml
# Run on the 1st of every odd-numbered month
schedule:
  - cron: '0 0 1 1,3,5,7,9,11 *'
```

## Additional Resources

- [Meta Developer Documentation](https://developers.facebook.com/docs/)
- [Instagram Graph API Reference](https://developers.facebook.com/docs/instagram-api)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)