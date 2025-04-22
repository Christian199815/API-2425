document.addEventListener('DOMContentLoaded', function() {
  // Initialize scrolling list
  initEventCardsInScrollingList();
  
  // Calculate distances for all events
  calculateAllEventDistances();
});

function initEventCardsInScrollingList() {
  // Get all event cards in the scrolling list
  const eventCards = document.querySelectorAll('.events-scrolling-list [data-event-card]');
  
  // Add click event listeners to cards for map interaction and expansion
  eventCards.forEach(card => {
    card.addEventListener('click', function(e) {
      // Don't toggle if clicking on the event link
      if (e.target.closest('.event-link')) {
        e.stopPropagation();
        return;
      }
      
      // Get the event item container (parent of the card)
      const eventItem = this.closest('[data-event-item]');
      const eventId = eventItem?.getAttribute('data-event-id');
      const eventIndex = eventItem?.getAttribute('data-event-index');
      
      // Handle map highlighting (using existing map functionality if available)
      if (typeof highlightOnMap === 'function' && eventId) {
        highlightOnMap(eventId);
      } else if (typeof selectEventOnMap === 'function' && eventIndex) {
        selectEventOnMap(parseInt(eventIndex, 10));
      } else if (window.mapInterface && eventId) {
        // Alternative approach if specific functions aren't available
        window.mapInterface.focusEventById(eventId);
      }
      
      // Toggle expanded state
      toggleCardExpansion(this);
    });
  });
}

// Handle card expansion
function toggleCardExpansion(card) {
  // If card is currently expanded, just collapse it
  if (card.classList.contains('expanded')) {
    card.classList.remove('expanded');
    return;
  }
  
  // Otherwise, collapse any expanded cards first
  const expandedCards = document.querySelectorAll('.events-scrolling-list .event-card.expanded');
  expandedCards.forEach(expandedCard => {
    if (expandedCard !== card) {
      expandedCard.classList.remove('expanded');
    }
  });
  
  // Then expand this card
  card.classList.add('expanded');
  
  // Scroll the card into view if needed (with a small delay to allow for animation)
  setTimeout(() => {
    scrollCardIntoVisibleArea(card);
  }, 100);
}

// Ensure the expanded card is fully visible
function scrollCardIntoVisibleArea(element) {
  const rect = element.getBoundingClientRect();
  const containerRect = document.querySelector('.events-scrolling-list').getBoundingClientRect();
  
  const isPartiallyAbove = rect.top < containerRect.top;
  const isPartiallyBelow = rect.bottom > containerRect.bottom;
  
  if (isPartiallyAbove) {
    // Scroll element to top of container
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (isPartiallyBelow) {
    // If it's only the expanded part that's below, consider scrolling to show as much as possible
    if (rect.top < containerRect.bottom) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
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
      document.querySelectorAll('.event-card').forEach(card => {
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
  
  // If we can't find venue coordinates in the card
  if (!venueCoordinates || !venueCoordinates.hasAttribute('data-lat') || !venueCoordinates.hasAttribute('data-lon')) {
    // Use event item to get event ID
    const eventItem = card.closest('[data-event-item]');
    const eventId = eventItem?.getAttribute('data-event-id');
    
    // Try to get coordinates from a data attribute or global data store
    if (eventId && window.eventData && window.eventData[eventId] && 
        window.eventData[eventId].venue && 
        window.eventData[eventId].venue.location) {
      // Get coordinates from data store
      const venueLat = parseFloat(window.eventData[eventId].venue.location.latitude);
      const venueLon = parseFloat(window.eventData[eventId].venue.location.longitude);
      
      if (!isNaN(venueLat) && !isNaN(venueLon)) {
        const distance = getDistanceFromLatLonInKm(userLat, userLon, venueLat, venueLon);
        formatDistance(distanceElement, distance);
      } else {
        distanceElement.textContent = '—';
      }
    } else {
      distanceElement.textContent = '—';
    }
    return;
  }
  
  const venueLat = parseFloat(venueCoordinates.getAttribute('data-lat'));
  const venueLon = parseFloat(venueCoordinates.getAttribute('data-lon'));
  
  // Check if coordinates are valid
  if (isNaN(venueLat) || isNaN(venueLon)) {
    distanceElement.textContent = '—';
    return;
  }
  
  // Calculate and display distance
  const distance = getDistanceFromLatLonInKm(userLat, userLon, venueLat, venueLon);
  formatDistance(distanceElement, distance);
}

// Format distance for display
function formatDistance(element, distance) {
  if (distance < 1) {
    element.textContent = `${Math.round(distance * 1000)}m`;
  } else if (distance < 10) {
    element.textContent = `${distance.toFixed(1)}km`;
  } else {
    element.textContent = `${Math.round(distance)}km`;
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
document.addEventListener('DOMContentLoaded', function() {
  // Initialize scrolling list
  initScrollingList();
});

function initScrollingList() {
  // Get all event cards in the scrolling list
  const eventCards = document.querySelectorAll('.events-scrolling-list [data-event-card]');
  
  // When a card in the scrolling list is expanded, collapse others
  eventCards.forEach(card => {
    card.addEventListener('click', function(e) {
      // Don't toggle if clicking on the event link
      if (e.target.closest('.event-link')) {
        e.stopPropagation();
        return;
      }
      
      // Get the event item container (parent of the card)
      const eventItem = this.closest('[data-event-item]');
      const eventId = eventItem?.getAttribute('data-event-id');
      const eventIndex = eventItem?.getAttribute('data-event-index');
      
      // Handle map highlighting (using existing map functionality if available)
      if (typeof highlightOnMap === 'function' && eventId) {
        highlightOnMap(eventId);
      } else if (typeof selectEventOnMap === 'function' && eventIndex) {
        selectEventOnMap(parseInt(eventIndex, 10));
      } else if (window.mapInterface && eventId) {
        // Alternative approach if specific functions aren't available
        window.mapInterface.focusEventById(eventId);
      }
      
      // If card is currently collapsed, collapse any expanded cards first
      if (!this.classList.contains('expanded')) {
        const expandedCards = document.querySelectorAll('.events-scrolling-list .event-card.expanded');
        expandedCards.forEach(expandedCard => {
          if (expandedCard !== this) {
            expandedCard.classList.remove('expanded');
          }
        });
      }
      
      // Toggle expanded class
      this.classList.toggle('expanded');
      
      // Scroll expanded card into view if needed
      if (this.classList.contains('expanded')) {
        setTimeout(() => {
          ensureVisibility(this);
        }, 100);
      }
    });
  });
}

// Ensure the expanded card is fully visible
function ensureVisibility(element) {
  const rect = element.getBoundingClientRect();
  const isPartiallyAbove = rect.top < 0;
  const isPartiallyBelow = rect.bottom > window.innerHeight;
  
  if (isPartiallyAbove) {
    window.scrollBy({
      top: rect.top - 20,
      behavior: 'smooth'
    });
  } else if (isPartiallyBelow) {
    window.scrollBy({
      top: rect.bottom - window.innerHeight + 20,
      behavior: 'smooth'
    });
  }
}