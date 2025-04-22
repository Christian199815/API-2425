// Events Overview JavaScript
// This script handles fetching and displaying events from Ticketmaster API
// based on selected location coordinates

(function() {
  // Debug flag - set to true to see debugging messages in console
  const DEBUG = true;
  
  function log(...args) {
    if (DEBUG) console.log('[Events Overview]', ...args);
  }
  
  // DOM elements
  let loadingElement;
  let eventsList;
  let eventCountElement;
  
  // Store event markers
  let eventMarkers = [];
  
  // Fix Leaflet's default icon paths
  function fixLeafletIcons() {
    // Only fix if L (Leaflet) exists
    if (typeof L !== 'undefined' && L.Icon && L.Icon.Default) {
      log('Fixing Leaflet default icon paths');
      
      // Reset the paths with explicit CDN URLs
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      
      log('Leaflet default icon paths fixed');
    }
  }
  
  // Initialize when the DOM is ready
  function init() {
    log('Initializing Events Overview');
    
    // Fix Leaflet icons first
    fixLeafletIcons();
    
    // Get DOM elements
    loadingElement = document.getElementById('loading');
    eventsList = document.getElementById('events-list');
    eventCountElement = document.getElementById('event-count');
    
    // Listen for the locationSelected event from the custom select component
    document.addEventListener('locationSelected', handleLocationSelected);
    
    // Listen for the refreshEvents event 
    document.addEventListener('refreshEvents', handleRefreshEvents);
    
    // Add click events to any initial event cards (server-rendered)
    addEventCardListeners();
    
    // Add initial events to map if we have them server-rendered
    const initialEvents = getInitialEvents();
    if (initialEvents.length > 0) {
      log('Found server-rendered events:', initialEvents.length);
      const mapContainer = document.querySelector('.leaflet-map-container');
      if (mapContainer) {
        const lat = mapContainer.dataset.lat;
        const lon = mapContainer.dataset.lon;
        if (lat && lon) {
          // Allow time for map to initialize
          setTimeout(() => {
            addEventsToMap(initialEvents, lat, lon);
          }, 1000);
        }
      }
    }
    
    log('Events Overview initialized');
  }
  
  // Get events data from server-rendered cards
  function getInitialEvents() {
    const events = [];
    const eventCards = document.querySelectorAll('.event-card');
    
    eventCards.forEach(card => {
      const eventId = card.dataset.eventId;
      if (!eventId) return;
      
      // Get venue coordinates
      const coordinatesEl = card.querySelector('.venue-coordinates');
      let venueLat, venueLon;
      
      if (coordinatesEl) {
        const text = coordinatesEl.textContent;
        const match = text.match(/Lat: ([\d.-]+), Lng: ([\d.-]+)/);
        if (match && match.length >= 3) {
          venueLat = parseFloat(match[1]);
          venueLon = parseFloat(match[2]);
        }
      }
      
      // Get event name
      const eventName = card.querySelector('.event-name')?.textContent || 'Event';
      
      // Get venue name
      const venueEl = card.querySelector('.venue-info strong');
      const venueName = venueEl ? venueEl.textContent : 'Venue';
      
      // Get artist name
      const artistEl = card.querySelector('.artist-name');
      const artistName = artistEl ? artistEl.textContent : '';
      
      // Get ticket status
      const ticketEl = card.querySelector('.ticket-status');
      const ticketsAvailable = ticketEl ? ticketEl.classList.contains('available') : false;
      
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
        },
        attractions: artistName ? [{ name: artistName }] : [],
        dates: {
          status: {
            code: ticketsAvailable ? 'onsale' : 'offsale'
          }
        }
      });
    });
    
    return events;
  }
  
  // Handle when a location is selected from the custom select
  function handleLocationSelected(e) {
    const { lat, lon, name, radius } = e.detail;
    log('Location selected:', { lat, lon, name, radius });
    
    if (!lat || !lon) {
      log('Invalid coordinates in event:', e.detail);
      return;
    }
    
    // First update the map if it exists
    updateMap(lat, lon, name);
    
    // Then fetch events for this location with the radius in kilometers
    fetchEventsForLocation(lat, lon, radius || 40);
  }
  
  // Handle refresh button click from the custom select
  function handleRefreshEvents(e) {
    log('Refresh events event received:', e.detail);
    
    const { lat, lon, name, radius } = e.detail;
    
    if (!lat || !lon) {
      log('Invalid coordinates in refresh event:', e.detail);
      return;
    }
    
    log('Using coordinates from event:', { lat, lon, radius });
    
    // Fetch events for current location with the radius in kilometers
    fetchEventsForLocation(lat, lon, radius || 40);
  }
  
  // Fetch events from the Ticketmaster API
  async function fetchEventsForLocation(lat, lon, radius = 40) {
    log('Fetching events for location:', { lat, lon, radius: radius + ' km' });
    
    if (!eventsList) {
      log('No events list element found');
      return;
    }
    
    try {
      // Show loading indicator
      if (loadingElement) loadingElement.classList.remove('hidden');
      
      // Clear current events
      eventsList.innerHTML = '';
      
      // Clear existing event markers
      clearEventMarkers();
      
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
      log('API returned events:', data.events.length);
      
      // Update event count
      if (eventCountElement) {
        eventCountElement.textContent = data.events.length;
      }
      
      // Display events
      if (data.events.length === 0) {
        eventsList.innerHTML = '<div class="no-events"><p>No events found for today in this area.</p></div>';
      } else {
        // Add events to the map
        addEventsToMap(data.events, lat, lon);
        
        // Create event cards client-side
        data.events.forEach(event => {
          const card = createEventCard(event);
          eventsList.appendChild(card);
        });
        
        // Add click event listeners to the newly created cards
        addEventCardListeners();
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      eventsList.innerHTML = '<div class="error-message"><p>Error loading events. Please try again later.</p></div>';
    } finally {
      // Hide loading indicator
      if (loadingElement) loadingElement.classList.add('hidden');
    }
  }
  
  // Add event venues as markers to the map
  function addEventsToMap(events, centerLat, centerLon) {
    log('Adding events to map:', events.length);
    
    // Get the map container
    const mapContainer = document.querySelector('.leaflet-map-container');
    if (!mapContainer) {
      log('No map container found for adding markers');
      return;
    }
    
    // Get the map instance
    const map = mapContainer.leafletMap || mapContainer.mapInstance;
    if (!map) {
      log('No map instance found on container');
      
      // Try to wait for the map to be initialized
      setTimeout(() => {
        const updatedMap = mapContainer.leafletMap || mapContainer.mapInstance;
        if (updatedMap) {
          log('Map found after delay, adding markers now');
          addEventsToMap(events, centerLat, centerLon);
        }
      }, 1000);
      
      return;
    }
    
    // Clear any existing event markers
    clearEventMarkers();
    
    // Create custom marker for center
    const centerIcon = L.divIcon({
      className: 'center-marker',
      html: '<div class="center-marker-inner"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    
    // Add a marker for the search center location
    const centerMarker = L.marker([centerLat, centerLon], {
      icon: centerIcon
    }).addTo(map);
    
    centerMarker.bindPopup('Search Location').openPopup();
    eventMarkers.push(centerMarker);
    
    // Create custom marker for events
    const eventIcon = L.divIcon({
      className: 'event-marker',
      html: '<div class="event-marker-inner"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    
    // Count valid markers created
    let validMarkers = 0;
    
    // Add markers for each event venue
    events.forEach(event => {
      // Check if the event has venue coordinates
      if (event._embedded && 
          event._embedded.venues && 
          event._embedded.venues.length > 0 && 
          event._embedded.venues[0].location) {
        
        const venue = event._embedded.venues[0];
        if (venue.location.latitude && venue.location.longitude) {
          const venueLat = parseFloat(venue.location.latitude);
          const venueLon = parseFloat(venue.location.longitude);
          
          // Skip if coordinates are invalid
          if (isNaN(venueLat) || isNaN(venueLon)) {
            log(`Invalid coordinates for venue "${venue.name}": ${venue.location.latitude}, ${venue.location.longitude}`);
            return;
          }
          
          // Create marker
          try {
            const marker = L.marker([venueLat, venueLon], {
              icon: eventIcon
            }).addTo(map);
            
            validMarkers++;
            
            // Create popup content
            let popupContent = `
              <div class="event-popup">
                <h4>${event.name}</h4>
                <p><strong>${venue.name}</strong></p>
            `;
            
            // Add artist name if available
            if (event.attractions && event.attractions.length > 0) {
              popupContent += `<p>${event.attractions.map(a => a.name).join(', ')}</p>`;
            }
            
            // Add ticket status if available
            if (event.dates && event.dates.status) {
              const isAvailable = event.dates.status.code === 'onsale';
              popupContent += `
                <p class="ticket-status-popup ${isAvailable ? 'available' : 'unavailable'}">
                  ${isAvailable ? 'Tickets Available' : 'Tickets Unavailable'}
                </p>
              `;
            }
            
            popupContent += `
              <a href="/event/${event.id}" class="view-event-btn" data-event-id="${event.id}">View Details</a>
            </div>`;
            
            // Bind popup to marker
            marker.bindPopup(popupContent);
            
            // Store reference to marker
            marker.eventId = event.id;
            eventMarkers.push(marker);
            
            // Add popup open event listener to highlight corresponding card
            marker.on('click', function() {
              highlightEventCard(event.id);
            });
          } catch (error) {
            console.error(`Error creating marker for event "${event.name}":`, error);
          }
        }
      }
    });
    
    log(`Created ${validMarkers} event markers`);
    
    // Adjust map bounds to show all markers if there are any besides the center marker
    if (eventMarkers.length > 1) {
      try {
        const bounds = L.featureGroup(eventMarkers).getBounds();
        map.fitBounds(bounds, { 
          padding: [50, 50],
          maxZoom: 13 // Don't zoom in too far
        });
      } catch (error) {
        console.error('Error adjusting map bounds:', error);
        // Fallback to just center on the search location
        map.setView([centerLat, centerLon], 10);
      }
    }
  }
  
  // Clear all event markers from the map
  function clearEventMarkers() {
    log('Clearing event markers:', eventMarkers.length);
    
    // Get the map container
    const mapContainer = document.querySelector('.leaflet-map-container');
    if (!mapContainer) return;
    
    // Get the map instance
    const map = mapContainer.leafletMap || mapContainer.mapInstance;
    if (!map) return;
    
    // Remove each marker from the map
    eventMarkers.forEach(marker => {
      if (marker) {
        try {
          map.removeLayer(marker);
        } catch (error) {
          console.error('Error removing marker:', error);
        }
      }
    });
    
    // Clear the array
    eventMarkers = [];
  }
  
  // Highlight an event card when its marker is clicked
  function highlightEventCard(eventId) {
    log('Highlighting card for event:', eventId);
    
    // Remove highlight from all cards first
    const allCards = document.querySelectorAll('.event-card');
    allCards.forEach(card => {
      card.classList.remove('highlighted');
    });
    
    // Add highlight to the selected card
    const selectedCard = document.querySelector(`.event-card[data-event-id="${eventId}"]`);
    if (selectedCard) {
      selectedCard.classList.add('highlighted');
      
      // Scroll the card into view
      selectedCard.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }
  
  // Add click event listeners to event cards
  function addEventCardListeners() {
    const eventCards = document.querySelectorAll('.event-card');
    
    eventCards.forEach(card => {
      card.addEventListener('click', function() {
        const eventId = this.dataset.eventId;
        if (!eventId) return;
        
        // Find and open the corresponding marker popup
        const marker = eventMarkers.find(m => m.eventId === eventId);
        if (marker) {
          marker.openPopup();
          
          // Get map and center on the marker
          const mapContainer = document.querySelector('.leaflet-map-container');
          if (mapContainer) {
            const map = mapContainer.leafletMap || mapContainer.mapInstance;
            if (map) {
              map.setView(marker.getLatLng(), 14);
            }
          }
        }
        
        // Highlight the clicked card
        highlightEventCard(eventId);
      });
    });
    
    // Add click handlers for "View Details" buttons in popups
    document.addEventListener('click', function(e) {
      if (e.target && e.target.classList.contains('view-event-btn')) {
        const eventId = e.target.dataset.eventId;
        if (eventId) {
          highlightEventCard(eventId);
        }
      }
    });
  }
  
  // Create an event card element
  function createEventCard(event) {
    const card = document.createElement('div');
    card.classList.add('event-card');
    card.dataset.eventId = event.id;
    
    // Set default image
    let imageHtml = '<div class="event-image-placeholder">No Image</div>';
    
    // Check if event has images
    if (event.images && event.images.length > 0) {
      // Find a suitable image (prefer 16:9 ratio)
      const suitableImage = event.images.find(img => img.ratio === '16_9' && img.width > 500) || event.images[0];
      if (suitableImage) {
        imageHtml = `<img class="event-image" src="${suitableImage.url}" alt="${event.name}">`;
      }
    }
    
    // Get artist name
    let artistName = 'Various Artists';
    if (event.attractions && event.attractions.length > 0) {
      artistName = event.attractions.map(a => a.name).join(', ');
    }
    
    // Get genre and subgenre
    let genreHtml = '';
    let subgenreHtml = '';
    
    if (event.classifications && event.classifications.length > 0) {
      const classification = event.classifications[0];
      if (classification.genre && classification.genre.name && classification.genre.name !== 'Undefined') {
        genreHtml = `<span class="genre-tag">${classification.genre.name}</span>`;
      }
      if (classification.subGenre && classification.subGenre.name && classification.subGenre.name !== 'Undefined') {
        subgenreHtml = `<span class="subgenre-tag">${classification.subGenre.name}</span>`;
      }
    }
    
    // Get venue information
    let venueHtml = '<p>Venue information unavailable</p>';
    
    if (event._embedded && event._embedded.venues && event._embedded.venues.length > 0) {
      const venue = event._embedded.venues[0];
      let venueInfoHtml = `<strong>${venue.name || 'Venue'}</strong><br>`;
      
      if (venue.address && venue.address.line1) {
        venueInfoHtml += `${venue.address.line1}<br>`;
      }
      
      if (venue.city && venue.city.name) {
        venueInfoHtml += `${venue.city.name}<br>`;
      }
      
      if (venue.location && venue.location.latitude && venue.location.longitude) {
        venueInfoHtml += `<span class="venue-coordinates">Lat: ${venue.location.latitude}, Lng: ${venue.location.longitude}</span>`;
      }
      
      venueHtml = venueInfoHtml;
    }
    
    // Get ticket information
    let ticketsAvailable = false;
    let priceRange = 'Price information unavailable';
    
    if (event.dates && event.dates.status && event.dates.status.code === 'onsale') {
      ticketsAvailable = true;
    }
    
    if (event.priceRanges && event.priceRanges.length > 0) {
      const range = event.priceRanges[0];
      const currency = range.currency || 'USD';
      priceRange = `${range.min || 'N/A'} - ${range.max || 'N/A'} ${currency}`;
    }
    
    // Create HTML for card
    card.innerHTML = `
      ${imageHtml}
      <div class="event-details">
        <h3 class="event-name">${event.name}</h3>
        <p class="artist-name">${artistName}</p>
        
        <div class="event-info">
          ${genreHtml}
          ${subgenreHtml}
        </div>
        
        <div class="venue-info">
          ${venueHtml}
        </div>
        
        <div class="ticket-info">
          <span class="ticket-status ${ticketsAvailable ? 'available' : 'unavailable'}">
            ${ticketsAvailable ? 'Tickets Available' : 'Tickets Unavailable'}
          </span>
          <span class="price-range">${priceRange}</span>
        </div>
      </div>
    `;
    
    return card;
  }
  
  // Helper function to update the map
  function updateMap(lat, lon, name) {
    if (window.updateMap && typeof window.updateMap === 'function') {
      log('Using global updateMap function');
      window.updateMap(lat, lon, name);
    } else {
      log('Global updateMap function not available');
    }
  }
  
  // Initialize when the document is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Small delay to ensure all scripts are loaded
    setTimeout(init, 10);
  }
})();