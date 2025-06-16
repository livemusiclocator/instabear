# Instagram Venue Handle Integration and Token Management

## Current Status

We have successfully implemented code changes to add Instagram handles to venue mentions in carousel captions:

1. Modified the `generateCaption` function in `src/instagramgallery.jsx` to include Instagram handles when available
2. Created a `venueInstagramHandles.json` file to map venue IDs to Instagram handles
3. Set up tooling to help manage these mappings

However, we're facing two issues:

1. We need to convert the comprehensive venue-handle mapping CSV to the JSON format used by the application
2. The Instagram token has expired, preventing posting to Instagram

## Venue Handle Integration

### CSV to JSON Conversion

The `instagram-tools/lml-socmedia-track.csv` file contains comprehensive venue information including Instagram handles and LML Venue IDs. We need to convert this to the required JSON format for `venueInstagramHandles.json`.

Here's how we'll do it:

1. Create a specialized CSV-to-JSON conversion script for this specific CSV format
2. Extract only the `LML Venue ID` and `Insta @ handle` columns
3. Create a mapping where the venue ID is the key and the Instagram handle (with @ prefix) is the value
4. Write this to `venueInstagramHandles.json`

Example output format:
```json
{
  "d4aeb9fa-a50a-4fb3-b7cd-b312ede051a1": "@theoldbar",
  "bdcfc167-cf3e-41fb-a829-7951e465b361": "@baxterslive",
  "2407f3c0-6f4b-4f08-9e15-cb06127dd799": "@bendigohotel"
}
```

## Instagram Token Management

### How Tokens Are Currently Managed

1. The Instagram access token is stored as a GitHub repository secret (`VITE_INSTAGRAM_ACCESS_TOKEN`)
2. There's an automated workflow (`.github/workflows/refresh_token.yml`) that:
   - Runs on the 1st of every odd-numbered month
   - Can also be manually triggered
   - Refreshes the token using the Meta Graph API
   - Updates the repository secret with the new token
   - Triggers a deployment

### Current Token Issue

The token has expired with the error message:
> "The session has been invalidated because the user changed their password or Facebook has changed the session for security reasons."

This suggests one of two issues:
1. The Facebook account password was changed, invalidating all tokens
2. Meta invalidated the token for security reasons

In either case, the automated token refresh can't work because it requires a valid token to exchange.

### Solutions

1. **Immediate solution**: Manually generate a new token through the Meta Developer Portal
   - Follow instructions in `META_TOKEN_RENEWAL.md`
   - Update the GitHub repository secret

2. **Long-term solution**: Fix the automated workflow
   - Check if the workflow is running as scheduled
   - Ensure all required secrets are properly configured
   - Consider adding monitoring/notifications for token refresh failures

## Implementation Plan

1. **Convert CSV to JSON**: 
   - Create a custom script that processes the `lml-socmedia-track.csv` file
   - Generate a properly formatted `venueInstagramHandles.json`

2. **Fix the token issue**:
   - Manually generate a new token using the Meta Developer Portal
   - Update the GitHub repository secret
   - Test posting with the new token
   - Verify the automated refresh workflow is properly configured

3. **Monitor and maintain**:
   - Set up a calendar reminder to check token status before expiration
   - Keep the venue-handle mapping up to date as new venues are added