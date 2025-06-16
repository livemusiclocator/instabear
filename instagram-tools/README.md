# Instagram Venue Handle Tools

This directory contains tools for fetching Instagram accounts your business account follows and mapping them to venue IDs in the Live Music Locator database.

## Purpose

These tools help you:
1. Fetch all Instagram accounts your business account follows
2. Export them to a CSV file for manual mapping
3. Convert the mapped CSV back to a JSON file for use in the application

## Prerequisites

- Node.js (v14 or higher)
- Instagram Business Account with venues followed
- Instagram Graph API access token with permissions to read followed accounts

## Installation

1. Install dependencies:

```bash
npm install
```

2. The tools are configured to use the existing `.env` file in the project root directory, which already contains the required Instagram credentials:
   - `VITE_INSTAGRAM_ACCESS_TOKEN`
   - `VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID`

## Usage

### Step 1: Fetch Instagram Accounts

Run the fetch script to get all accounts your business account follows:

```bash
npm run fetch
```

This will create a file called `venue-instagram-mapping.csv` with columns for Instagram handles and empty columns for venue IDs.

### Step 2: Manual Mapping

1. Fetch the list of venues from the LML API to help with mapping:

```bash
curl https://api.lml.live/venues > venues.json
```

2. Open the `venue-instagram-mapping.csv` file in a spreadsheet application
3. For each Instagram account that matches a venue:
   - Find the venue ID in `venues.json`
   - Fill in the "LML Venue ID" column with the venue ID
   - Fill in the "Venue Name" column with the venue name for reference

### Step 3: Convert to JSON

Once you've completed the manual mapping, convert the CSV to JSON:

```bash
npm run convert
```

This will create a `venueInstagramHandles.json` file in the project root directory with venue IDs mapped to Instagram handles.

## File Descriptions

- `package.json`: Node.js package configuration
- `fetch-instagram-follows.js`: Script to fetch Instagram follows and export to CSV
- `csv-to-json.js`: Script to convert the CSV file to JSON
- `.env.example`: Example environment variables (rename to .env and fill in)

## Notes

- The fetch script will retrieve up to 200 accounts by default
- Only accounts with both LML Venue ID and Instagram Handle filled in will be included in the JSON
- The JSON file is automatically saved to the project root directory for use by the application