// Events Map Integration - Simplified Version
// This script works with the existing map component and adds event markers

(function() {
    // Debug flag - set to true to see debugging messages in console
    const DEBUG = true;
    
    function log(...args) {
      if (DEBUG) console.log('[Events Map]', ...args);
    }
    
    // Store event markers
    let eventMarkers = [];
    
    // Initialize when the DOM is ready
    function init() {
      log('Initializing Events Map Integration');
      
      // Listen for events data loading
      document.addEventListener('eventsDataLoaded', handleEventsDataLoaded);
      
      // Listen for highlighting a specific event marker
      document.addEventListener('highlightEventMarker', handleHighlightEventMarker);
      
      log('Event listeners set up');
    }
    
    // Handle when events data is loaded
    function handleEventsDataLoaded(e) {
      if (!e.detail || !e.detail.events) {
        log('No events data in eventsDataLoaded event');
        return;
      }
      
      const events = e.detail.events;
      log('Events data loaded:', events.length);
      
      // Get map container and current location
      const mapContainer = document.querySelector('.leaflet-map-container');
      if (!mapContainer) {
        log('No map container found');
        return;
      }
      
      const lat = parseFloat(mapContainer.dataset.lat);
      const lon = parseFloat(mapContainer.dataset.lon);
      
      if (isNaN(lat) || isNaN(lon)) {
        log('Invalid coordinates on map container');
        return;
      }
      
      // Add events to map
      addEventsToMap(events, lat, lon);
    }
    
    // Handle highlight event marker request
    function handleHighlightEventMarker(e) {
      if (!e.detail || !e.detail.eventId) {
        log('No event ID in highlightEventMarker event');
        return;
      }
      
      const eventId = e.detail.eventId;
      log('Highlighting event marker:', eventId);
      
      // Find the marker with this event ID
      const marker = eventMarkers.find(m => m.eventId === eventId);
      if (!marker) {
        log('No marker found for event ID:', eventId);
        return;
      }
      
      // Get the map container
      const mapContainer = document.querySelector('.leaflet-map-container');
      if (!mapContainer) {
        log('No map container found');
        return;
      }
      
      const map = mapContainer.leafletMap || mapContainer.mapInstance;
      if (!map) {
        log('No map instance found');
        return;
      }
      
      // Center the map on this marker and open its popup
      map.setView(marker.getLatLng(), 14, {
        animate: true,
        duration: 0.5
      });
      
      marker.openPopup();
    }
    
    // Add events to the map
    function addEventsToMap(events, centerLat, centerLon) {
      log('Adding events to map:', events.length);
      
      // Get the map container
      const mapContainer = document.querySelector('.leaflet-map-container');
      if (!mapContainer) {
        log('No map container found');
        return;
      }
      
      const map = mapContainer.leafletMap || mapContainer.mapInstance;
      if (!map) {
        log('No map instance found');
        return;
      }
      
      // Clear any existing event markers
      clearEventMarkers(map);
      
      // If no events, just return
      if (!events || events.length === 0) {
        log('No events to add to map');
        return;
      }
      
      // Create event icon
      const eventIcon = L.divIcon({
        className: 'event-marker',
        html: '<div class="event-marker-inner"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      
      // Add markers for each event
      const validMarkers = [];
      
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
              log(`Invalid coordinates for venue "${venue.name}"`);
              return;
            }
            
            // Create marker
            try {
              const marker = L.marker([venueLat, venueLon], {
                icon: eventIcon
              }).addTo(map);
              
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
              
              // Store event ID on marker
              marker.eventId = event.id;
              eventMarkers.push(marker);
              validMarkers.push(marker);
              
              // Add click handler to marker
              marker.on('click', function() {
                // Dispatch event for carousel to handle
                const clickEvent = new CustomEvent('markerClicked', {
                  detail: { eventId: event.id }
                });
                document.dispatchEvent(clickEvent);
              });
            } catch (error) {
              console.error(`Error creating marker for event "${event.name}":`, error);
            }
          }
        }
      });
      
      log(`Added ${validMarkers.length} event markers to map`);
      
      // Adjust map bounds to include all markers if we have any
      if (validMarkers.length > 0) {
        // Create a bounds group that includes all markers
        const group = L.featureGroup([
          ...validMarkers,
          L.marker([centerLat, centerLon]) // Include center point in bounds
        ]);
        
        // Fit the map to these bounds
        map.fitBounds(group.getBounds(), {
          padding: [50, 50],
          maxZoom: 14
        });
      }
    }
    
    // Clear existing event markers
    function clearEventMarkers(map) {
      log('Clearing existing event markers:', eventMarkers.length);
      
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
    
    // Initialize when the document is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      // Small delay to ensure all scripts are loaded
      setTimeout(init, 100);
    }
  })();