// Test script to demonstrate the fair venue selection algorithm
// This script doesn't need to import the actual venue handles file
// It just demonstrates the selection algorithm with mock data

// Simulate captions from multiple slides
function simulateVenueSelection() {
  console.log('===== VENUE SELECTION ALGORITHM TEST =====');
  
  // Simulate handles from multiple slides
  const mockCaptions = [
    "Title slide caption", // Caption 0 (title slide)
    "Slide 1 with @cornerhotel @theevelynhotel @thegembarau", // Caption 1
    "Slide 2 with @theworkersclub @puntersclubfitzroy @theoldbar", // Caption 2
    "Slide 3 with @northcotesc @rainbowhotel @thefoxhotel", // Caption 3
    "Slide 4 with @crookedtales @bendigo @lushbar", // Caption 4
    "Slide 5 with @venue1 @venue2 @venue3 @venue4", // Caption 5
    "Slide 6 with @venue5 @venue6 @venue7 @venue8", // Caption 6
    "Slide 7 with @venue9 @venue10 @venue11 @venue12", // Caption 7
    "Slide 8 with @venue13 @venue14 @venue15 @venue16", // Caption 8 
    "Slide 9 with @venue17 @venue18 @venue19 @venue20" // Caption 9
  ];
  
  // Extract all handles
  const allHandles = [];
  for (let i = 1; i < mockCaptions.length; i++) {
    const slideMatches = mockCaptions[i].match(/@[a-zA-Z0-9_.]+/g) || [];
    slideMatches.forEach(handle => {
      if (!allHandles.includes(handle)) {
        allHandles.push(handle);
      }
    });
  }
  
  console.log(`Found ${allHandles.length} unique venue handles across all slides`);
  console.log('All handles:', allHandles);
  
  // Run the fair selection algorithm
  const MAX_VENUE_MENTIONS = 19;
  let mentionedVenues = [];
  
  if (allHandles.length <= MAX_VENUE_MENTIONS) {
    mentionedVenues = allHandles;
  } else {
    // Create a mapping of venues by slide/caption
    const venuesBySlide = {};
    for (let i = 1; i < mockCaptions.length; i++) {
      const slideMatches = mockCaptions[i].match(/@[a-zA-Z0-9_.]+/g) || [];
      venuesBySlide[i] = slideMatches.filter(match => !mentionedVenues.includes(match));
    }
    
    // Step 1: Ensure at least one venue from each slide (if possible)
    const slideIndices = Object.keys(venuesBySlide);
    // Shuffle the slide order for randomness
    slideIndices.sort(() => Math.random() - 0.5);
    
    console.log('Randomly ordered slides:', slideIndices);
    
    slideIndices.forEach(slideIndex => {
      if (mentionedVenues.length < MAX_VENUE_MENTIONS && venuesBySlide[slideIndex].length > 0) {
        // Randomly select one venue from this slide
        const randomIndex = Math.floor(Math.random() * venuesBySlide[slideIndex].length);
        const venueToAdd = venuesBySlide[slideIndex][randomIndex];
        
        if (!mentionedVenues.includes(venueToAdd)) {
          mentionedVenues.push(venueToAdd);
          console.log(`Selected ${venueToAdd} from slide ${slideIndex}`);
        }
      }
    });
    
    // Step 2: Fill remaining slots with randomly selected venues
    if (mentionedVenues.length < MAX_VENUE_MENTIONS) {
      // Create a flat list of remaining handles that haven't been added yet
      const remainingHandles = allHandles.filter(handle => !mentionedVenues.includes(handle));
      
      // Shuffle the remaining handles for randomness
      remainingHandles.sort(() => Math.random() - 0.5);
      
      console.log(`Adding ${Math.min(MAX_VENUE_MENTIONS - mentionedVenues.length, remainingHandles.length)} more venues randomly`);
      
      // Add as many as possible until we hit the limit
      while (mentionedVenues.length < MAX_VENUE_MENTIONS && remainingHandles.length > 0) {
        const venueToAdd = remainingHandles.shift();
        mentionedVenues.push(venueToAdd);
        console.log(`Added ${venueToAdd} from remaining pool`);
      }
    }
  }
  
  console.log('\nFinal selected venues:', mentionedVenues);
  console.log(`Selected ${mentionedVenues.length} out of ${allHandles.length} total venues`);
  
  // Format the caption
  const caption = "Live Music Locator is a not-for-profit service designed to make it possible to discover every gig playing at every venue across every genre at any one time.\n\n" +
                  "Shoutout to a random selection of today's venues (often there are too many to @ here): " + 
                  mentionedVenues.join(' ');
  
  console.log('\nFinal Instagram caption:');
  console.log('----------------------');
  console.log(caption);
  console.log('----------------------');
}

// Run the test
simulateVenueSelection();