# Venue Instagram Handles Implementation

This document describes the implementation of Instagram handle integration for venues in the Live Music Locator Instagram Gallery Generator.

## Overview

The application generates Instagram carousel posts for live music gigs in Melbourne. Each post contains multiple slides, with each slide showing a set of gigs at different venues. To enhance engagement and visibility, we now include venue Instagram handles in the caption.

## Implementation Details

### Venue Handle Mapping

- Venue handles are stored in `venueInstagramHandles.json` at the project root
- Each entry maps a venue ID to its Instagram handle (e.g., `"41864adc-ba59-4cd2-a060-beb6e0f377e2": "@cornerhotel"`)
- **Only exact venue ID matches** are used - no fallback or fuzzy matching

### Caption Generation Process

1. Each slide in the carousel generates its own caption with venue handles for the gigs on that slide
2. When posting to Instagram, we extract all unique venue handles from all captions
3. Due to Instagram's mention limit, we select a maximum of 19 venue handles using a fair, randomized approach
4. The handles are added to the title slide caption with the text: "Shoutout to a random selection of today's venues (often there are too many to @ here):"

### Fair Venue Selection Algorithm

To ensure fairness when selecting which venues to mention (when there are more than 19), we use a two-step randomized approach:

1. **Step 1: Slide-based Representation**
   - The algorithm first shuffles the order of slides to prevent any positional bias
   - It then attempts to include at least one randomly selected venue from each slide
   - This ensures all geographical areas and time slots have a chance to be represented

2. **Step 2: Random Remaining Selection**
   - Any remaining slots (up to the 19 maximum) are filled with randomly selected venues
   - The remaining venues are shuffled to ensure randomness
   - This provides equal opportunity for all venues to be mentioned

This randomized approach means:
- Different venues will be featured across different posts
- No bias toward particular positions or slides
- Fair representation across all areas and time slots
- Every venue has a chance to be mentioned over time

### Limitations and Considerations

1. **Instagram Mention Limit**: Instagram restricts the number of accounts that can be tagged in a single post. With potentially 60+ venues across all slides, not all venues can be mentioned in a single post, which is why we've implemented the fair selection algorithm.

2. **Single Caption**: Instagram carousel posts can only have one caption for the entire carousel, not individual captions per slide. Our solution combines venue handles from all slides into the main caption.

3. **Photo Tagging**: Unlike tagging people in photos, the Instagram Graph API does not provide a straightforward way to tag business accounts in carousel photos. Implementing this would require:
   - Access to Instagram User IDs (numeric) for each venue, not just handles
   - Additional API permissions and features not currently available
   - Possible manual tagging after posting

## Future Improvements

1. **User ID Collection**: Potentially collect Instagram User IDs for venues to enable photo tagging in the future
2. **Caption Rotation**: Currently, we use randomization to provide fairness. This could be further enhanced with a formal rotation system that tracks which venues have been mentioned across previous posts
3. **Auto-Prioritization**: Add optional weighting factors (e.g., venue size, support for independent venues) if prioritization is desired

## Testing

The `testVenueHandles.js` script can be used to test the venue ID matching functionality and verify that the Instagram handles are correctly associated with venues.