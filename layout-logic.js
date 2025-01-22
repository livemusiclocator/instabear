// Helper function to convert text to title case
function toTitleCase(str) {
    return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  }
  
  // Helper function to extract suburb from address
  function getSuburb(address) {
    const match = address.match(/(?:,\s*)?([A-Za-z\s]+)(?:\s+\d{4})?$/);
    return match ? match[1].trim() : '';
  }
  
  // Helper function to format the price
  function formatPrice(gig) {
    if (gig.information_tags?.includes('free')) return 'Free';
    if (gig.prices && gig.prices.length > 0) return `${gig.prices[0].amount}`;
    return '';
  }
  
  // Create a hidden container for measuring gig heights
  const createMeasurementContainer = () => {
    const container = document.createElement('div');
    container.style.cssText = 'position: absolute; top: -9999px; width: 540px;';
    document.body.appendChild(container);
    return container;
  };
  
  // Measure the height of a gig panel
  const measureGigHeight = (gig, container) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = `
      <div class="bg-black bg-opacity-40 rounded-lg p-1.5 mb-0.25">
        <div class="flex justify-between items-start">
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-2 mb-0.5">
              <h3 class="text-white text-xl font-semibold leading-tight">
                ${toTitleCase(gig.name)}
              </h3>
              ${gig.genre_tags && gig.genre_tags.length > 0 ? `
                <span class="text-gray-400 text-sm font-light truncate">
                  ${gig.genre_tags.slice(0, 2).join(' · ')}
                </span>
              ` : ''}
            </div>
            <div class="flex items-center">
              <span class="text-lg truncate">${toTitleCase(gig.venue.name)}</span>
              <span class="text-gray-500 mx-1">•</span>
              <span class="text-gray-400 text-base">${getSuburb(gig.venue.address)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
    container.appendChild(tempDiv);
    const height = tempDiv.firstElementChild.offsetHeight;
    container.removeChild(tempDiv);
    return height + 1; // Add 1px for mb-0.25
  };
  
  // Build slides based on actual measurements
  const buildSlides = (gigs) => {
    const slides = [];
    let currentSlide = [];
    let currentHeight = 0;
  
    const measurementContainer = createMeasurementContainer();
  
    gigs.forEach(gig => {
      const gigHeight = measureGigHeight(gig, measurementContainer);
  
      // Handle gigs that are too tall
      if (gigHeight > CONTAINER_HEIGHT) {
        console.warn(`Gig "${gig.name}" is too tall (${gigHeight}px) and will be truncated.`);
      }
  
      if (currentHeight + gigHeight > CONTAINER_HEIGHT) {
        slides.push(currentSlide);
        currentSlide = [gig];
        currentHeight = gigHeight;
      } else {
        currentSlide.push(gig);
        currentHeight += gigHeight;
      }
    });
  
    if (currentSlide.length > 0) slides.push(currentSlide);
  
    document.body.removeChild(measurementContainer);
    return slides;
  };