# Live Music Locator - Instagram Gallery Generator

This application generates Instagram carousel posts for live music gigs in Melbourne, organized by location (St Kilda and Fitzroy/Collingwood/Richmond areas).

## Features

- Fetches gig data from the Live Music Locator API
- Filters gigs by location based on postcodes
- Generates Instagram-ready carousel images
- Uploads images to GitHub for hosting
- Posts carousels directly to Instagram

## Recent Fixes

### Postcode Handling (March 13, 2025)

Fixed an issue where venues without postcodes in their address strings were being filtered out, even when they had postcodes in a dedicated field. The application now:

1. First checks if a venue has a dedicated `postcode` field
2. Only falls back to extracting postcodes from address strings if necessary

This fix increased the number of Fitzroy/Collingwood/Richmond gigs from 4 to 15, ensuring all venues are properly categorized.

## Development

This project is built with React + Vite.

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```
