// Events Vertical JavaScript
// Handles all calculations, event card functionality, and map integration

document.addEventListener('DOMContentLoaded', function() {
  // Debug flag - set to true to see debugging messages in console
  window.EVENTS_DEBUG = true;
  
  function log(...args) {
    if (window.EVENTS_DEBUG) console.log('[Events System]', ...args);
  }
  
  log('Initializing events system...');
  
  // Make sure we don't have duplicate initialization
  if (window.eventsSystemInitialized) {
    log('Events system already initialized, skipping');
    return;
  }
  
  // Initialize event cards and features
  initEventCards();
  
  // Calculate distances for all events
  calculateAllEventDistances();
  
  // Mark as initialized to prevent duplicates
  window.eventsSystemInitialized = true;
  
  log('Events system initialized successfully');
});

// Event type to color mapping - exported to window for Map Component to use
window.EVENT_TYPE_COLORS = {
  // Music genres
  'Music': '#1DB954', // Spotify green
  'Rock': '#E2474B', // Rock red
  'Pop': '#FF69B4', // Pop pink
  'Hip-Hop/Rap': '#9370DB', // Hip-hop purple
  'Country': '#CD853F', // Country brown
  'Electronic': '#00FFFF', // Electronic cyan
  'R&B': '#8A2BE2', // R&B violet
  'Jazz': '#4682B4', // Jazz blue
  'Classical': '#DAA520', // Classical gold
  'Folk': '#8B4513', // Folk brown
  'Blues': '#0000CD', // Blues dark blue
  
  // Sports
  'Sports': '#FF5722', // Sports orange
  'Football': '#00A859', // Football green
  'Basketball': '#F58025', // Basketball orange
  'Baseball': '#D22630', // Baseball red
  'Soccer': '#055C9D', // Soccer blue
  'Hockey': '#000000', // Hockey black
  
  // Arts & Theatre
  'Arts & Theatre': '#9C27B0', // Arts purple
  'Theatre': '#673AB7', // Theatre deep purple
  'Comedy': '#FFEB3B', // Comedy yellow
  'Dance': '#E91E63', // Dance pink
  
  // Miscellaneous
  'Family': '#4CAF50', // Family green
  'Film': '#607D8B', // Film blue-grey
  'Miscellaneous': '#795548', // Misc brown
  
  // Default
  'Default': '#607D8B' // Default blue-grey
};

// Map for storing event data globally (for other components to access)
window.eventData = window.eventData || {};

// Initialize event cards
function initEventCards() {
  // Get all event cards
  const eventCards = document.querySelectorAll('[data-event-card]');
  
  console.log(`Found ${eventCards.length} event cards to initialize`);
  
  // Add event listeners for navigation instead of map highlight
  eventCards.forEach(card => {
    // Store event ID in the card for easier reference
    const eventItem = card.closest('[data-event-item]');
    if (eventItem && eventItem.hasAttribute('data-event-id')) {
      card.dataset.eventId = eventItem.getAttribute('data-event-id');
    }
    
    // Change click handler to navigate to /event/:id
    card.addEventListener('click', function(e) {
      // Don't trigger if clicking on a link inside the card
      if (e.target.closest('a')) {
        e.stopPropagation();
        return;
      }

      const eventId = this.dataset.eventId;
      if (eventId) {
        window.location.href = `/event/${eventId}`;
      }
    });
  });
}


// Calculate all distances at once - using promises for async handling
function calculateAllEventDistances() {
  // First check if geolocation is available
  if (!navigator.geolocation) {
    // Update all distance elements to show unavailable
    document.querySelectorAll('[data-distance]').forEach(el => {
      el.textContent = 'Location unavailable';
    });
    return;
  }
  
  // Create a promise for getting user location
  const getUserPosition = () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 5000,
        maximumAge: 60000
      });
    });
  };
  
  // Use the promise to handle the async operation
  getUserPosition()
    .then(position => {
      const userLat = position.coords.latitude;
      const userLon = position.coords.longitude;
      
      // For each event card, calculate and display distance
      document.querySelectorAll('[data-event-card]').forEach(card => {
        updateEventDistance(card, userLat, userLon);
      });
    })
    .catch(error => {
      console.log('Geolocation error:', error);
      document.querySelectorAll('[data-distance]').forEach(el => {
        el.textContent = 'Location unavailable';
      });
    });
}

// Update distance for a single card
function updateEventDistance(card, userLat, userLon) {
  const distanceElement = card.querySelector('[data-distance]');
  if (!distanceElement) return;
  
  // Try to find venue coordinates
  const venueCoordinates = card.querySelector('.venue-coordinates');
  let venueLat, venueLon;
  
  if (venueCoordinates) {
    // Try to get coordinates from data attributes first
    if (venueCoordinates.hasAttribute('data-lat') && venueCoordinates.hasAttribute('data-lon')) {
      venueLat = parseFloat(venueCoordinates.getAttribute('data-lat'));
      venueLon = parseFloat(venueCoordinates.getAttribute('data-lon'));
    } else {
      // Try to extract from text content
      const text = venueCoordinates.textContent;
      const match = text.match(/Lat: ([\d.-]+), Lng: ([\d.-]+)/);
      if (match && match.length >= 3) {
        venueLat = parseFloat(match[1]);
        venueLon = parseFloat(match[2]);
      }
    }
  }
  
  // If we couldn't find venue coordinates in the card, try to get from event data
  if (isNaN(venueLat) || isNaN(venueLon)) {
    // Use event item to get event ID
    const eventItem = card.closest('[data-event-item]');
    const eventId = card.dataset.eventId || (eventItem ? eventItem.getAttribute('data-event-id') : null);
    
    // Try to get coordinates from global data store
    if (eventId && window.eventData && window.eventData[eventId]) {
      // Try different paths to find coordinates based on API format
      const eventData = window.eventData[eventId];
      
      if (eventData._embedded && eventData._embedded.venues && eventData._embedded.venues[0]) {
        const venue = eventData._embedded.venues[0];
        if (venue.location) {
          venueLat = parseFloat(venue.location.latitude);
          venueLon = parseFloat(venue.location.longitude);
        }
      }
    }
  }
  
  // Check if coordinates are valid
  if (isNaN(venueLat) || isNaN(venueLon)) {
    distanceElement.textContent = 'No location';
    return;
  }
  
  // Calculate and display distance
  const distance = getDistanceFromLatLonInKm(userLat, userLon, venueLat, venueLon);
  formatDistance(distanceElement, distance);
}

// Format distance for display
function formatDistance(element, distance) {
  if (distance < 1) {
    element.textContent = `${Math.round(distance * 1000)}m away`;
  } else if (distance < 10) {
    element.textContent = `${distance.toFixed(1)}km away`;
  } else {
    element.textContent = `${Math.round(distance)}km away`;
  }
}

// Haversine formula to calculate distance between two points on Earth
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Handle when a location is selected from the custom select
document.addEventListener('locationSelected', function(e) {
  const { lat, lon, name, radius } = e.detail;
  
  if (!lat || !lon) {
    return;
  }
  
  // Fetch events for this location with the radius in kilometers
  fetchEventsForLocation(lat, lon, radius || 40);
});

// Handle refresh button click from the custom select
document.addEventListener('refreshEvents', function(e) {
  const { lat, lon, radius } = e.detail;
  
  if (!lat || !lon) {
    return;
  }
  
  // Fetch events for current location with the radius in kilometers
  fetchEventsForLocation(lat, lon, radius || 40);
});

// Get initial events data from DOM
window.getInitialEventsData = function() {
  const events = [];
  const eventCards = document.querySelectorAll('[data-event-card]');
  
  console.log(`Extracting data from ${eventCards.length} event cards`);
  
  eventCards.forEach(card => {
    const eventItem = card.closest('[data-event-item]');
    const eventId = card.dataset.eventId || (eventItem ? eventItem.getAttribute('data-event-id') : null);
    if (!eventId) return;
    
    // Get venue coordinates
    const coordinatesEl = card.querySelector('.venue-coordinates');
    let venueLat, venueLon;
    
    if (coordinatesEl) {
      venueLat = parseFloat(coordinatesEl.getAttribute('data-lat'));
      venueLon = parseFloat(coordinatesEl.getAttribute('data-lon'));
      
      // Alternative parsing from text content if attributes aren't available
      if (isNaN(venueLat) || isNaN(venueLon)) {
        const text = coordinatesEl.textContent;
        const match = text.match(/Lat: ([\d.-]+), Lng: ([\d.-]+)/);
        if (match && match.length >= 3) {
          venueLat = parseFloat(match[1]);
          venueLon = parseFloat(match[2]);
        }
      }
    }
    
    // Get event name
    const eventName = card.querySelector('.event-title')?.textContent || 'Event';
    
    // Get venue name
    const venueEl = card.querySelector('.event-venue');
    const venueName = venueEl ? venueEl.textContent.trim() : 'Venue';
    
    // Skip if no valid coordinates
    if (isNaN(venueLat) || isNaN(venueLon)) {
      console.log(`Event ${eventId} (${eventName}) has no valid coordinates`);
      return;
    }
    
    console.log(`Event ${eventId} (${eventName}) at ${venueLat}, ${venueLon}`);
    
    // Create event object
    events.push({
      id: eventId,
      name: eventName,
      _embedded: {
        venues: [{
          name: venueName,
          location: {
            latitude: venueLat,
            longitude: venueLon
          }
        }]
      }
    });
  });
  
  return events;
};

// Highlight an event card when its marker is clicked
window.highlightEventCard = function(eventId) {
  // Find the card with this event ID
  const selectedCard = document.querySelector(`[data-event-card][data-event-id="${eventId}"]`);
  
  if (selectedCard) {
    // Scroll the card into view
    selectedCard.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
    
    // Add a temporary highlight effect
    selectedCard.classList.add('highlight-pulse');
    
    // Remove the highlight effect after animation
    setTimeout(() => {
      selectedCard.classList.remove('highlight-pulse');
    }, 1500);
  }
};


// Fetch events from the API and create cards using templates
async function fetchEventsForLocation(lat, lon, radius = 40) {
  const eventsList = document.getElementById('events-list');
  const loadingElement = document.getElementById('loading') || document.querySelector('.events-loading');
  const eventCountElement = document.getElementById('event-count');
  
  if (!eventsList) {
    console.log('No events list container found with ID "events-list"');
    // Try to find by class as fallback
    const listByClass = document.querySelector('.events-scrolling-list');
    if (listByClass) {
      console.log('Found events list by class instead');
    } else {
      console.error('Could not find events list container by ID or class');
      return;
    }
  }
  
  try {
    // Show loading indicator
    if (loadingElement) {
      loadingElement.classList.remove('hidden');
    }
    
    // Clear current events
    if (eventsList) eventsList.innerHTML = '';
    
    console.log(`Fetching events for location ${lat}, ${lon} with radius ${radius}km`);
    
    // Fetch events from API
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude: lat,
        longitude: lon,
        radius: radius, 
        unit: 'km' // Explicitly specify kilometers
      })
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with status code ${response.status}`);
    }
    
    const data = await response.json();
    console.log('API response:', data);
    
    // Check if we have the expected data structure
    if (!data.events) {
      console.error('Unexpected API response format:', data);
      throw new Error('Unexpected API response format');
    }
    
    console.log(`Received ${data.events.length} events from API`);
    
    // Update event count
    if (eventCountElement) {
      eventCountElement.textContent = data.events.length;
    }
    
    // Store events in global store
    window.eventData = window.eventData || {};
    data.events.forEach(event => {
      window.eventData[event.id] = event;
    });
    
    // Display events
    if (data.events.length === 0) {
      if (eventsList) {
        eventsList.innerHTML = '<div class="no-events"><p>No events found for today in this area.</p></div>';
      }
      
      // Even with no events, notify the map to clear markers
      const eventsDataEvent = new CustomEvent('eventsDataLoaded', {
        detail: { events: [] }
      });
      document.dispatchEvent(eventsDataEvent);
      
    } else {
      // IMPORTANT: This is the key part that ensures the map gets updated
      // Dispatch event to notify map component about new events data
      const eventsDataEvent = new CustomEvent('eventsDataLoaded', {
        detail: data
      });
      document.dispatchEvent(eventsDataEvent);
      console.log("Dispatched eventsDataLoaded event with", data.events.length, "events");
      
      if (eventsList) {
        // Use the template to render event cards
        data.events.forEach((event, index) => {
          // Create container for the event
          const eventItem = document.createElement('div');
          eventItem.classList.add('event-item');
          eventItem.setAttribute('data-event-item', '');
          eventItem.setAttribute('data-event-id', event.id);
          eventItem.setAttribute('data-event-index', index);
          
          // Create card using server-side rendering if available
          if (window.renderEventCard && typeof window.renderEventCard === 'function') {
            // Use the server-side render function if available
            eventItem.innerHTML = window.renderEventCard(event);
          } else {
            // Create simplified event card as defined in your template
            eventItem.innerHTML = createSimplifiedEventCard(event);
          }
          
          // Add to list
          eventsList.appendChild(eventItem);
        });
        
        // Add click event listeners to the newly created cards
        initEventCards();
        
        // Calculate distances for new cards
        calculateAllEventDistances();
      }
    }
  } catch (error) {
    console.error('Error fetching events:', error);
    if (eventsList) {
      eventsList.innerHTML = '<div class="error-message"><p>Error loading events. Please try again later.</p></div>';
    }
  } finally {
    // Hide loading indicator
    if (loadingElement) {
      loadingElement.classList.add('hidden');
    }
  }
}

// Test function to trigger a location update manually
function testEventUpdate(lat, lon, radius = 40) {
  console.log('Manually testing event update functionality');
  fetchEventsForLocation(lat, lon, radius);
}

// Add this function to window for easy testing
window.testEventUpdate = testEventUpdate;

// Create a simplified event card based on your template structure
function createSimplifiedEventCard(event) {
  // Set default image
  let imageHtml = `<div class="event-image-placeholder">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21"></polyline>
    </svg>
  </div>`;
  
  // Check if event has images
  if (event.images && event.images.length > 0) {
    // Find a suitable image
    const image = event.images.find(img => img.width > 500) || event.images[0];
    if (image) {
      imageHtml = `<img src="${image.url}" alt="${event.name}" loading="lazy" class="event-image">`;
    }
  }
  
  // Get venue information and coordinates
  let venueLat = '';
  let venueLon = '';
  
  if (event._embedded && event._embedded.venues && event._embedded.venues[0]) {
    const venue = event._embedded.venues[0];
    if (venue.location) {
      venueLat = venue.location.latitude;
      venueLon = venue.location.longitude;
    }
  }
  
  // Create the card HTML based on your simplified template
  return `
    <div class="event-card" data-event-card data-event-id="${event.id}">
      <div class="event-image-container">
        ${imageHtml}
      </div>
      
      <div class="event-content">
        <h3 class="event-title">${event.name}</h3>
        <div class="event-distance">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span data-distance>Calculating...</span>
        </div>
        <span class="venue-coordinates" data-lat="${venueLat}" data-lon="${venueLon}"></span>
      </div>
    </div>
  `;
}

function setupDirectLocationChangeHandler() {
  // Listen for the custom locationSelected event
  document.addEventListener('locationSelected', function(e) {
    if (!e.detail) return;
    
    const { lat, lon, name, radius } = e.detail;
    
    if (!lat || !lon) {
      return;
    }
    
    console.log("Location selected event received:", e.detail);
    
    // Fetch events for this location with the radius in kilometers
    fetchEventsForLocation(lat, lon, radius || 40);
    
    // IMPORTANT: Directly update map if available
    // This provides a fallback in case the events system is slow
    if (window.updateMap && typeof window.updateMap === 'function') {
      window.updateMap(lat, lon, name);
      console.log("Directly called window.updateMap with new coordinates");
    }
  });
}

// Initialize the direct location change handler
// Call this function in your initialization code
setupDirectLocationChangeHandler();

// Add necessary styles for highlight effect
(function addMarkerStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .highlight-pulse {
      animation: highlightPulse 1.5s ease-out;
    }
    
    @keyframes highlightPulse {
      0% { box-shadow: 0 0 0 0 rgba(29, 185, 84, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(29, 185, 84, 0); }
      100% { box-shadow: 0 0 0 0 rgba(29, 185, 84, 0); }
    }
  `;
  document.head.appendChild(style);
})();