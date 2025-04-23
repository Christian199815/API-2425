// Map Component with Server-Rendered Popups
(function() {
  // Debug flag - set to true to see debugging messages in console
  const DEBUG = false;
  
  // Global variables - defined at the top to avoid reference errors
  let mapInitialized = false;
  let pendingUpdates = [];
  let eventMarkers = [];

  // Map style definitions
  const mapStyles = [
    {
      name: 'OSM Standard',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      subdomains: 'abc'
    },
    {
      name: 'Black & White',
      url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attribution">CARTO</a>',
      maxZoom: 19,
      subdomains: 'abcd'
    },
    {
      name: 'Colorful',
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attribution">CARTO</a>',
      maxZoom: 19,
      subdomains: 'abcd'
    }
  ];
  
  // Helper function for logging
  function log(...args) {
    if (DEBUG) console.log('[Map Component]', ...args);
  }

  // Initialize all map components on the page
  function initializeMaps() {
    const mapContainers = document.querySelectorAll('.leaflet-map-container');
    
    if (mapContainers.length === 0) {
      return false;
    }
    
    mapContainers.forEach(container => {
      // Check if this map has already been initialized
      if (container.dataset.initialized === 'true') {
        return;
      }
      
      // Get the coordinates from the data attributes
      const lat = parseFloat(container.dataset.lat || 52.3676);
      const lon = parseFloat(container.dataset.lon || 4.9041);
      const name = container.dataset.name || 'Location';
      
      
      try {
        // Clear container first to prevent any issues with reinitialization
        container.innerHTML = '';
        
        // Create custom icon with absolute URLs to fix 404 errors
        const customIcon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });
        
        // Create map instance with optimized options for tile rendering
        const map = L.map(container, {
          center: [lat, lon],
          zoom: 13,
          zoomControl: true,
          attributionControl: true,
          fadeAnimation: false,
          zoomAnimation: false,
          markerZoomAnimation: false,
          preferCanvas: false,
          renderer: L.svg(),
          minZoom: 3,
          maxZoom: 18
        });
        
        // Store the current style index
        container.currentStyleIndex = 0;
        
        // Initialize with the first map style
        const initialStyle = mapStyles[0];
        
        // Create the tile layer with optimized options
        const tileLayer = L.tileLayer(initialStyle.url, {
          attribution: initialStyle.attribution,
          maxZoom: initialStyle.maxZoom,
          minZoom: 3,
          subdomains: initialStyle.subdomains || 'abc',
          tileSize: initialStyle.tileSize || 256,
          zoomOffset: initialStyle.zoomOffset || 0,
          // Critical tile loading options
          updateWhenIdle: false,
          updateWhenZooming: false,
          keepBuffer: 2,
          // Specific fixes for missing tiles
          errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
          // Using HTTP/2 for faster loading
          useCache: true,
          crossOrigin: true
        }).addTo(map);
        
        // Store the tile layer for later style switching
        container.tileLayer = tileLayer;
        
        // Add marker for the location using custom icon
        const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);
        
        // Use simple popup binding for maximum compatibility
        if (name && typeof name === 'string') {
          // Store the popup content for reference
          container.popupContent = name;
          
          // Use the standard popup binding approach
          marker.bindPopup(name);
          
          // Open the popup initially
          setTimeout(() => {
            marker.openPopup();
          }, 300);
          
          // Make sure clicking the marker shows the popup
          marker.on('click', function() {
            this.openPopup();
          });
        }
        
        // Store map instance in the container's data
        container.mapInstance = map;
        container.marker = marker;
        
        // Make properties non-enumerable but accessible
        Object.defineProperties(container, {
          leafletMap: {
            value: map,
            writable: true,
            configurable: true
          },
          leafletMarker: {
            value: marker,
            writable: true,
            configurable: true
          }
        });
        
        // Mark as initialized
        container.dataset.initialized = 'true';
        
        // Force a resize event right away
        map.invalidateSize(true);
        
        // Sequential refreshes to ensure all tiles are loaded
        setTimeout(() => {
          map.invalidateSize(true);
          
          // Second refresh
          setTimeout(() => {
            map.invalidateSize(true);
            
            // Handle any tiles that failed to load
            const emptyTiles = document.querySelectorAll('.leaflet-tile:not(.leaflet-tile-loaded)');
            if (emptyTiles.length > 0) {
              // Force tile layer reload
              map.removeLayer(tileLayer);
              map.addLayer(tileLayer);
            }
            
          }, 500);
          
        }, 100);
        
        // Add reload handler for missing tiles
        container.addEventListener('error', function(e) {
          if (e.target && e.target.classList && e.target.classList.contains('leaflet-tile')) {
            // Retry loading the tile
            setTimeout(() => {
              e.target.src = e.target.src + '?' + new Date().getTime();
            }, 1000);
          }
        }, true);
        
        // Add another refresh after the page has fully loaded
        window.addEventListener('load', function() {
          setTimeout(() => {
            map.invalidateSize(true);
          }, 500);
        });
        
        // Add event listener for when viewport changes
        map.on('moveend', function() {
        });
        
        // Add event listener to handle zoom and ensure tiles are loaded
        map.on('zoomend', function() {
          // Short delay to allow tiles to start loading
          setTimeout(() => {
            // Find any empty tiles and force them to reload
            const emptyTiles = document.querySelectorAll('.leaflet-tile:not(.leaflet-tile-loaded)');
            if (emptyTiles.length > 0) {
              log('Found empty tiles after zoom, forcing reload');
              emptyTiles.forEach(tile => {
                // Force reload of the tile
                if (tile.src) {
                  tile.src = tile.src + '?' + new Date().getTime();
                }
              });
            }
          }, 500);
        });
        
      } catch (error) {
        console.error('[Map Component] Error initializing map:', error);
        return false;
      }
    });
    
    // Set up style toggle button
    setupStyleToggleButton();
    
    // Mark initialization as complete
    mapInitialized = true;
    
    // Set up event listeners for the event features
    setupEventIntegration();
    
    // Try to load initial events
    tryLoadInitialEvents();
    
    // Process any pending updates
    if (pendingUpdates.length > 0) {
      pendingUpdates.forEach(update => {
        updateAllMaps(update.lat, update.lon, update.name);
      });
      pendingUpdates = [];
    }
    
    return true;
  }
  
  // Try to load and display initial events
  function tryLoadInitialEvents() {
    if (typeof window.getInitialEventsData === 'function') {
      try {
        const initialEvents = window.getInitialEventsData();
        if (initialEvents && initialEvents.length > 0) {
          log(`Found ${initialEvents.length} initial events to add to map`);
          
          // Get the first map container
          const mapContainer = document.querySelector('.leaflet-map-container');
          if (mapContainer && mapContainer.mapInstance) {
            const map = mapContainer.mapInstance;
            const center = map.getCenter();
            
            // Add events to map
            addEventsToMap(initialEvents, center.lat, center.lng);
          }
        }
      } catch (error) {
        console.error('[Map Component] Error loading initial events:', error);
      }
    }
  }
  
  // Set up event integration
  function setupEventIntegration() {
    // Listen for new events data
    document.addEventListener('eventsDataLoaded', handleEventsDataLoaded);
    
    // Listen for highlight event marker request
    document.addEventListener('highlightEventMarker', handleHighlightEventMarker);
    
    // Add custom CSS for event markers and popups
    addEventMarkerStyles();
  }
  
  // Handle when events data is loaded
  function handleEventsDataLoaded(e) {
    if (!e.detail || !e.detail.events) {
      log('No events data in eventsDataLoaded event');
      return;
    }
    
    const events = e.detail.events;
    log(`Events data loaded: ${events.length} events`);
    
    // Get the first map container
    const mapContainer = document.querySelector('.leaflet-map-container');
    if (!mapContainer || !mapContainer.mapInstance) {
      log('No map instance found');
      return;
    }
    
    const map = mapContainer.mapInstance;
    const center = map.getCenter();
    
    // Add events to map
    addEventsToMap(events, center.lat, center.lng);
  }
  
  // Handle highlight event marker request
  function handleHighlightEventMarker(e) {
    if (!e.detail || !e.detail.eventId) {
      log('No event ID in highlightEventMarker event');
      return;
    }
    
    const eventId = e.detail.eventId;
    log('Highlighting event marker:', eventId);
    
    highlightEventOnMap(eventId);
  }

  function forcePopupDisplay(marker, event) {
    console.log("Forcing popup display for marker:", marker);
    
    // Ensure the marker has the event data associated with it
    marker.eventData = event;
    
    // First, unbind any existing popup
    marker.unbindPopup();
    
    // Create a simpler popup to test if basic popups work
    const basicPopupContent = `
      <div style="padding:10px;min-width:200px;">
        <h3 style="margin:0 0 10px;font-weight:bold;">${event.name}</h3>
        <p>${event._embedded?.venues?.[0]?.name || 'Venue'}</p>
        <a href="/event/${event.id}" style="display:block;background:#000;color:#fff;padding:8px;text-align:center;border-radius:4px;margin-top:10px;text-decoration:none;">View Details</a>
      </div>
    `;
    
    // Bind a simple popup directly
    marker.bindPopup(basicPopupContent, {
      offset: [0, -10],
      autoPan: true,
      closeButton: true,
      autoClose: false,
      closeOnEscapeKey: false
    });
    
    // Explicitly open the popup
    setTimeout(() => {
      marker.openPopup();
      console.log("Popup opened programmatically");
    }, 100);
    
    // Add a direct click handler to the marker DOM element
    const markerElement = marker.getElement();
    if (markerElement) {
      markerElement.addEventListener('click', function(e) {
        console.log("Direct marker element click detected");
        marker.openPopup();
      });
    }
    
    // Return a function to test popup manually
    return function() {
      console.log("Manual popup test triggered");
      marker.openPopup();
    };
  }
  
  function addEventsToMap(events, centerLat, centerLon) {
    // Get the first map container
    const mapContainer = document.querySelector('.leaflet-map-container');
    if (!mapContainer || !mapContainer.mapInstance) {
      console.log('No map instance found for adding events');
      return;
    }
    
    const map = mapContainer.mapInstance;
    
    console.log(`Adding ${events.length} event markers to map`);
    
    // Clear any existing event markers
    clearEventMarkers(map);
    
    // Create center marker
    try {
      const centerMarker = L.marker([centerLat, centerLon], {
        icon: L.divIcon({
          html: '<div style="width:24px;height:24px;border-radius:50%;background:#3388ff;border:3px solid white;box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>',
          className: '',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })
      }).addTo(map);
      
      centerMarker.bindPopup('Search Location');
      eventMarkers.push(centerMarker);
    } catch (e) {
      console.error('Error adding center marker:', e);
    }
  
    // Create a global object to store popup testers
    window.popupTesters = {};
  
    // Add markers for each event venue
    events.forEach(event => {
      if (!event._embedded || !event._embedded.venues || !event._embedded.venues[0]) {
        return;
      }
      
      const venue = event._embedded.venues[0];
      if (!venue.location || !venue.location.latitude || !venue.location.longitude) {
        return;
      }
      
      const venueLat = parseFloat(venue.location.latitude);
      const venueLon = parseFloat(venue.location.longitude);
      
      if (isNaN(venueLat) || isNaN(venueLon)) {
        return;
      }
      
      console.log(`Adding marker for event ${event.id} at ${venueLat},${venueLon}`);
      
      // Get color based on event type
      let eventColor = '#1DB954';  // Default green
      
      if (event.classifications && event.classifications.length > 0) {
        const classification = event.classifications[0];
        if (classification.segment && classification.segment.name) {
          // Get color based on segment
          const segmentName = classification.segment.name;
          eventColor = window.EVENT_TYPE_COLORS?.[segmentName] || 
                      window.EVENT_TYPE_COLORS?.[classification.genre?.name] || 
                      window.EVENT_TYPE_COLORS?.['Default'] || 
                      '#1DB954'; // Fallback if EVENT_TYPE_COLORS is undefined
        }
      }
      
      try {
        // Create marker
        const marker = L.marker([venueLat, venueLon], {
          icon: L.divIcon({
            html: `<div style="width:20px;height:20px;border-radius:50%;background:${eventColor};border:2px solid white;box-shadow:0 0 3px rgba(0,0,0,0.5);"></div>`,
            className: '',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          }),
          eventId: event.id
        }).addTo(map);
        
        // Force popup to display
        window.popupTesters[event.id] = forcePopupDisplay(marker, event);
        
        // Store event ID on marker for highlighting
        marker.eventId = event.id;
        eventMarkers.push(marker);
        
        // Add click handler to highlight card
        marker.on('click', function() {
          console.log("Marker clicked for event:", event.id);
          
          // Highlight corresponding event card
          if (typeof window.highlightEventCard === 'function') {
            window.highlightEventCard(event.id);
          }
          
          // Explicitly open popup again
          this.openPopup();
        });
      } catch (e) {
        console.error(`Error creating marker for event ${event.id}:`, e);
      }
    });
    
    console.log(`Successfully added ${events.length} event markers`);
    
    // Adjust map bounds to show all markers
    if (eventMarkers.length > 1) {
      try {
        const bounds = L.featureGroup(eventMarkers).getBounds();
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 13
        });
      } catch (e) {
        // Fallback to center view
        map.setView([centerLat, centerLon], 10);
      }
    }
    
    // Return instructions for testing
    console.log("To test popups manually, use: window.popupTesters['event-id']()");
    console.log("Available event IDs:", Object.keys(window.popupTesters).join(", "));
  }
  

// Fetch server-rendered popup for an event
async function fetchEventPopup(event, marker) {
  try {
    // Default popup content while loading
    marker.bindPopup(`<div class="loading-popup">Loading event details...</div>`);
    
    // Fetch the popup HTML from the server
    const response = await fetch('/api/render-map-popup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ event })
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }
    
    const popupHtml = await response.text();
    
    // Update the marker's popup with the server-rendered HTML
    marker.unbindPopup();
    marker.bindPopup(popupHtml);
    
    // Store the rendered popup on the event for future use
    event.renderedPopup = popupHtml;
    
  } catch (error) {
    console.error(`Error fetching popup for event ${event.id}:`, error);
    
    // Use fallback popup if server rendering fails
    const venue = event._embedded?.venues?.[0]?.name || 'Unknown Venue';
    const genre = event.classifications?.[0]?.segment?.name || 'Music';
    
    marker.unbindPopup();
    marker.bindPopup(`
      <div style="padding:5px;min-width:150px;">
        <h4 style="margin:0 0 5px;font-size:16px;">${event.name}</h4>
        <p style="margin:5px 0;"><strong>${venue}</strong></p>
        <p style="margin:5px 0;font-size:14px;color:#555;">${genre}</p>
        <a href="/event/${event.id}" style="display:inline-block;background:#1a1a1a;color:white;padding:5px 10px;border-radius:4px;text-decoration:none;font-size:14px;margin-top:5px;">View Details</a>
      </div>
    `);
  }
}
  
  // Clear all event markers from the map
  function clearEventMarkers(map) {
    if (!map) {
      // Try to get map from the first container
      const mapContainer = document.querySelector('.leaflet-map-container');
      if (mapContainer && mapContainer.mapInstance) {
        map = mapContainer.mapInstance;
      } else {
        log('No map instance found for clearing markers');
        return;
      }
    }
    
    log(`Clearing ${eventMarkers.length} event markers`);
    
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
  
  // Highlight an event on the map
  function highlightEventOnMap(eventId) {
    // Find the marker with this event ID
    const marker = eventMarkers.find(m => m.eventId === eventId);
    
    if (!marker) {
      log(`No marker found for event ID: ${eventId}`);
      return;
    }
    
    // Get the first map container
    const mapContainer = document.querySelector('.leaflet-map-container');
    if (!mapContainer || !mapContainer.mapInstance) {
      log('No map instance found for highlighting');
      return;
    }
    
    const map = mapContainer.mapInstance;
    
    // Open the popup
    marker.openPopup();
    
    // Pan to the marker
    map.setView(marker.getLatLng(), 14);
    
    // Add a temporary highlight effect
    try {
      const highlight = L.circle(marker.getLatLng(), {
        color: marker.options.eventColor || '#1DB954',
        fillColor: marker.options.eventColor || '#1DB954',
        fillOpacity: 0.2,
        radius: 300
      }).addTo(map);
      
      // Remove highlight after 3 seconds
      setTimeout(() => {
        if (map.hasLayer(highlight)) {
          map.removeLayer(highlight);
        }
      }, 3000);
    } catch (e) {
      console.error('Error creating highlight circle:', e);
    }
  }
  
  // Add CSS for event markers
  function addEventMarkerStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Event marker styles */
      .event-marker-inner {
        width: 20px;
        height: 20px;
        background-color: #ff5500;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
        transition: transform 0.2s;
      }
      
      .event-marker-inner:hover {
        transform: scale(1.2);
      }
      
      /* Loading popup style */
      .loading-popup {
        padding: 10px;
        text-align: center;
        color: #555;
        font-style: italic;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Set up map style toggle button
  function setupStyleToggleButton() {
    const styleToggleButtons = document.querySelectorAll('#map-style-toggle');
    
    styleToggleButtons.forEach(button => {
      button.addEventListener('click', function() {
        const mapContainers = document.querySelectorAll('.leaflet-map-container');
        
        mapContainers.forEach(container => {
          if (!container.mapInstance) return;
          
          // Increment the style index
          container.currentStyleIndex = (container.currentStyleIndex + 1) % mapStyles.length;
          const newStyle = mapStyles[container.currentStyleIndex];
          
          // Remove the current tile layer if it exists
          if (container.tileLayer) {
            container.mapInstance.removeLayer(container.tileLayer);
          }
          
          // Add the new tile layer with optimized options
          container.tileLayer = L.tileLayer(newStyle.url, {
            attribution: newStyle.attribution,
            maxZoom: newStyle.maxZoom,
            minZoom: 3,
            subdomains: newStyle.subdomains || 'abc',
            tileSize: newStyle.tileSize || 256,
            zoomOffset: newStyle.zoomOffset || 0,
            // Critical tile loading options
            updateWhenIdle: false,
            updateWhenZooming: false,
            keepBuffer: 2,
            // Specific fixes for missing tiles
            errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            // Using HTTP/2 for faster loading
            useCache: true,
            crossOrigin: true
          }).addTo(container.mapInstance);
          
          // Update button text to show current style
          button.textContent = 'Map Style: ' + newStyle.name;
          
          // Force a redraw
          setTimeout(() => {
            container.mapInstance.invalidateSize(true);
            
            // Additional refresh to ensure all tiles load
            setTimeout(() => {
              // Try to reload any missing tiles
              const emptyTiles = document.querySelectorAll('.leaflet-tile:not(.leaflet-tile-loaded)');
              if (emptyTiles.length > 0) {
                log('Found empty tiles after style change, forcing reload');
                // Force tile layer reload
                container.mapInstance.removeLayer(container.tileLayer);
                container.mapInstance.addLayer(container.tileLayer);
              }
            }, 500);
            
          }, 100);
          
        });
      });
      
      // Initialize button text
      button.textContent = 'Map Style: ' + mapStyles[0].name;
    });
  }
  
  // Function to update a single map with new coordinates
  function updateMap(mapContainer, lat, lon, name) {
    if (!mapContainer) {
      return false;
    }
    
    if (!mapContainer.mapInstance && !mapContainer.leafletMap) {
      return false;
    }
    
    
    try {
      // Get map instance, preferring the explicit property if available
      const map = mapContainer.leafletMap || mapContainer.mapInstance;
      const marker = mapContainer.leafletMarker || mapContainer.marker;
      
      if (!map || !marker) {
        return false;
      }
      
      // Update the view with animation
      map.setView([lat, lon], 13, {
        animate: true,
        duration: 0.5
      });
      
      // Update the marker
      marker.setLatLng([lat, lon]);
      
      // Ensure name is a string before binding to popup
      if (name && typeof name === 'string') {
        // Store the popup content
        mapContainer.popupContent = name;
        
        // Simple popup binding
        marker.bindPopup(name);
        
        // Open the popup with a slight delay to ensure map is ready
        setTimeout(() => {
          marker.openPopup();
        }, 300);
      }
      
      // Update the data attributes
      mapContainer.dataset.lat = lat;
      mapContainer.dataset.lon = lon;
      if (name && typeof name === 'string') {
        mapContainer.dataset.name = name;
      }
      
      // Force a resize to ensure proper display
      map.invalidateSize(true);
      
      // Additional refresh after a delay to ensure all tiles load
      setTimeout(() => {
        map.invalidateSize(true);
        
        // Try to reload any missing tiles
        const emptyTiles = document.querySelectorAll('.leaflet-tile:not(.leaflet-tile-loaded)');
        if (emptyTiles.length > 0) {
          // Force tile layer reload
          map.removeLayer(mapContainer.tileLayer);
          map.addLayer(mapContainer.tileLayer);
        }
      }, 500);
      
      return true;
    } catch (error) {
      console.error('[Map Component] Error updating map:', error);
      return false;
    }
  }
  
  // Function to update all maps on the page
  function updateAllMaps(lat, lon, name) {
    // Validate input parameters
    if (typeof lat !== 'number' || isNaN(lat) || 
        typeof lon !== 'number' || isNaN(lon)) {
      return false;
    }
    
    if (!mapInitialized) {
      pendingUpdates.push({ lat, lon, name });
      return false;
    }
    
    
    // Find all map containers
    const mapContainers = document.querySelectorAll('.leaflet-map-container');
    if (mapContainers.length === 0) {
      return false;
    }
    
    let updateSuccess = false;
    
    // Update each map
    mapContainers.forEach(container => {
      if (updateMap(container, lat, lon, name)) {
        updateSuccess = true;
      }
    });
    
    return updateSuccess;
  }
  
  // Setup location selection event listener
  function setupLocationListener() {
    
    // Listen for the custom locationSelected event
    document.addEventListener('locationSelected', function(e) {
      
      if (!e.detail) {
        return;
      }
      
      const { lat, lon, name } = e.detail;
      
      // Validate the data
      if (typeof lat !== 'number' || isNaN(lat) || 
          typeof lon !== 'number' || isNaN(lon)) {
        return;
      }
      
      updateAllMaps(lat, lon, name);
    });
    
  }
  
  // Direct connection to the select component
  function setupDirectConnection() {
    
    document.addEventListener('click', function(e) {
      // Check if the clicked element is an option in the location dropdown
      const selectedOption = e.target.closest('[data-location-options] li');
      if (!selectedOption) return;
      
      
      const lat = parseFloat(selectedOption.dataset.lat);
      const lon = parseFloat(selectedOption.dataset.lon);
      const name = selectedOption.textContent.trim();
      
      if (!isNaN(lat) && !isNaN(lon)) {
        log('Updating maps from direct click:', { lat, lon, name });
        updateAllMaps(lat, lon, name);
      } else {
        log('Invalid coordinates in clicked option:', selectedOption.dataset);
      }
    });
    
  }
  
  // Global function to change map style
  window.changeMapStyle = function(styleIndex) {
    if (typeof styleIndex !== 'number' || styleIndex < 0 || styleIndex >= mapStyles.length) {
      console.error('[Map Component] Invalid style index:', styleIndex);
      return false;
    }
    
    document.querySelectorAll('.leaflet-map-container').forEach(container => {
      if (!container.mapInstance) return;
      
      container.currentStyleIndex = styleIndex;
      const newStyle = mapStyles[styleIndex];
      
      // Remove the current tile layer if it exists
      if (container.tileLayer) {
        container.mapInstance.removeLayer(container.tileLayer);
      }
      
      // Add the new tile layer with optimized options
      container.tileLayer = L.tileLayer(newStyle.url, {
        attribution: newStyle.attribution,
        maxZoom: newStyle.maxZoom,
        minZoom: 3,
        subdomains: newStyle.subdomains || 'abc',
        tileSize: newStyle.tileSize || 256,
        zoomOffset: newStyle.zoomOffset || 0,
        // Critical tile loading options
        updateWhenIdle: false,
        updateWhenZooming: false,
        keepBuffer: 2,
        // Specific fixes for missing tiles
        errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        // Using HTTP/2 for faster loading
        useCache: true,
        crossOrigin: true
      }).addTo(container.mapInstance);
      
      // Update button text if button exists
      const styleButton = document.getElementById('map-style-toggle');
      if (styleButton) {
        styleButton.textContent = 'Map Style: ' + newStyle.name;
      }
      
      // Force a redraw and handle missing tiles
      setTimeout(() => {
        container.mapInstance.invalidateSize(true);
        
        // Additional refresh to ensure all tiles load
        setTimeout(() => {
          // Try to reload any missing tiles
          const emptyTiles = document.querySelectorAll('.leaflet-tile:not(.leaflet-tile-loaded)');
          if (emptyTiles.length > 0) {
            // Force tile layer reload
            container.mapInstance.removeLayer(container.tileLayer);
            container.mapInstance.addLayer(container.tileLayer);
          }
        }, 500);
        
      }, 100);
      
      log('Map style changed to:', newStyle.name);
    });
    
    return true;
  };
  
  // Global function to update maps from anywhere
  window.updateMap = function(lat, lon, name) {
    // Ensure lat and lon are numbers
    const numLat = parseFloat(lat);
    const numLon = parseFloat(lon);
    
    if (isNaN(numLat) || isNaN(numLon)) {
      console.error('[Map Component] Invalid coordinates for updateMap:', { lat, lon });
      return false;
    }
    
    return updateAllMaps(numLat, numLon, name);
  };
  
  // Global function to refresh all maps
  window.refreshMaps = function() {
    
    // Force invalidateSize on all maps
    document.querySelectorAll('.leaflet-map-container').forEach(container => {
      if (container.mapInstance) {
        container.mapInstance.invalidateSize(true);
        
        // Additionally, force tile layer reload
        if (container.tileLayer) {
          const currentLayer = container.tileLayer;
          container.mapInstance.removeLayer(currentLayer);
          container.mapInstance.addLayer(currentLayer);
        }
      }
    });
    
    return true;
  };
  
  // Handle empty tiles globally
  document.addEventListener('error', function(e) {
    if (e.target && e.target.classList && e.target.classList.contains('leaflet-tile')) {
      // Set empty tile to transparent
      e.target.style.background = 'transparent';
      // Add retry class
      e.target.classList.add('tile-error');
      // Try to reload this tile
      setTimeout(() => {
        if (e.target.src) {
          e.target.src = e.target.src + '?' + new Date().getTime();
        }
      }, 1000);
    }
  }, true);
  
  // Add CSS for empty tile fix
  const style = document.createElement('style');
  style.textContent = `
    .leaflet-tile.tile-error {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
    }
  `;
  document.head.appendChild(style);
  
  // Initialize when the DOM is ready
  function init() {
    // Check if Leaflet is available
    if (typeof L === 'undefined') {
      // Wait for Leaflet to load
      let leafletCheckAttempts = 0;
      const maxAttempts = 10;
      
      const waitForLeaflet = setInterval(() => {
        leafletCheckAttempts++;
        if (typeof L !== 'undefined') {
          clearInterval(waitForLeaflet);
          log('Leaflet loaded, continuing initialization');
          finishInit();
        } else if (leafletCheckAttempts >= maxAttempts) {
          clearInterval(waitForLeaflet);
          console.error('[Map Component] Leaflet not available after multiple attempts');
        }
      }, 200);
    } else {
      finishInit();
    }
  }

  // Map Component Event Handler Fix
// Add this to your Map Component JavaScript to improve handling of event updates

// Make sure the map component properly handles the eventsDataLoaded event
function enhanceMapEventHandling() {
  console.log("Enhancing map event handling");
  
  const mapContainer = document.querySelector('.leaflet-map-container');
  if (mapContainer) {
    if (mapContainer.mapInstance) {
      console.log("Found map instance via container.mapInstance");
      return mapContainer.mapInstance;
    }
    if (mapContainer.leafletMap) {
      console.log("Found map instance via container.leafletMap");
      return mapContainer.leafletMap;
    }
  }
  
  // Re-register the event listener to ensure it's active
  document.removeEventListener('eventsDataLoaded', handleEventsDataLoaded);
  document.addEventListener('eventsDataLoaded', handleEventsDataLoaded);
  
  console.log("Re-registered eventsDataLoaded event listener");
  
  // Also monitor locationSelected event directly
  document.removeEventListener('locationSelected', handleLocationSelected);
  document.addEventListener('locationSelected', handleLocationSelected);
  
  console.log("Re-registered locationSelected event listener");
  
  // Add debug handler
  window.debugMapEvents = function() {
    console.log("Map instance:", mapInstance);
    console.log("Event markers:", eventMarkers ? eventMarkers.length : "not defined");
    console.log("Map initialized:", mapInitialized);
    
    // Test with sample data
    const testEvents = generateTestEvents(mapInstance.getCenter(), 5);
    console.log("Generated test events:", testEvents);
    
    const testEvent = new CustomEvent('eventsDataLoaded', {
      detail: { events: testEvents }
    });
    
    console.log("Dispatching test eventsDataLoaded event");
    document.dispatchEvent(testEvent);
  };
  
  console.log("Added window.debugMapEvents() function for testing");
}

// Helper to find the map instance
function findMapInstance() {
  // Try to get from container
  const mapContainer = document.querySelector('.leaflet-map-container');
  if (mapContainer && (mapContainer.mapInstance || mapContainer.leafletMap)) {
    return mapContainer.mapInstance || mapContainer.leafletMap;
  }
  
  // Try to get from Leaflet internal storage
  if (window.L && typeof L._leaflet_id_map !== 'undefined') {
    try {
      const leafletMaps = Object.values(L._leaflet_id_map).filter(obj => obj && obj._mapPane);
      if (leafletMaps.length > 0) {
        return leafletMaps[0];
      }
    } catch (e) {
      console.error("Error finding map from Leaflet:", e);
    }
  }
  
  return null;
}

// Enhanced event data handler
function handleEventsDataLoaded(e) {
  console.log("eventsDataLoaded event received");
  
  if (!e.detail || !e.detail.events) {
    console.log("No events data in eventsDataLoaded event");
    return;
  }
  
  const events = e.detail.events;
  console.log(`Received ${events.length} events from eventsDataLoaded event`);
  
  // Find the map instance
  const mapInstance = findMapInstance();
  if (!mapInstance) {
    console.error("No map instance found for adding events");
    return;
  }
  
  // Get center coordinates
  const center = mapInstance.getCenter();
  const centerLat = center.lat;
  const centerLng = center.lng;
  
  // Clear existing markers and add new ones
  try {
    // Make sure eventMarkers is defined
    if (typeof eventMarkers === 'undefined') {
      console.log("eventMarkers was undefined, creating new array");
      window.eventMarkers = [];
      eventMarkers = window.eventMarkers;
    }
    
    // Clear existing markers
    clearEventMarkers(mapInstance);
    
    // Add new events to map
    addEventsToMap(events, centerLat, centerLng);
    
    console.log(`Successfully updated map with ${events.length} events`);
  } catch (error) {
    console.error("Error updating map with new events:", error);
  }
}

// Direct handler for location changes
function handleLocationSelected(e) {
  console.log("locationSelected event received directly in map component");
  
  if (!e.detail) return;
  
  const { lat, lon, name } = e.detail;
  
  if (typeof lat !== 'number' || isNaN(lat) || 
      typeof lon !== 'number' || isNaN(lon)) {
    return;
  }
  
  // Update the map view
  const mapInstance = findMapInstance();
  if (!mapInstance) {
    console.error("No map instance found for updating location");
    return;
  }
  
  // Update map view
  mapInstance.setView([lat, lon], 13);
  
  // Update center marker if it exists
  if (eventMarkers && eventMarkers.length > 0) {
    const centerMarker = eventMarkers[0];
    centerMarker.setLatLng([lat, lon]);
    centerMarker.bindPopup(name || 'Selected Location').openPopup();
  }
  
  console.log(`Map updated to new location: ${lat}, ${lon}, "${name}"`);
}

// Generate test events around a center point
function generateTestEvents(center, count) {
  const events = [];
  const centerLat = center.lat;
  const centerLng = center.lng;
  
  for (let i = 0; i < count; i++) {
    // Random position around center
    const lat = centerLat + (Math.random() - 0.5) * 0.05;
    const lng = centerLng + (Math.random() - 0.5) * 0.05;
    
    events.push({
      id: 'test-' + i,
      name: 'Test Event ' + (i + 1),
      _embedded: {
        venues: [{
          name: 'Venue ' + (i + 1),
          location: {
            latitude: lat,
            longitude: lng
          }
        }]
      }
    });
  }
  
  return events;
}

function clearAllMarkers(map) {
  map.eachLayer(function(layer) {
    // Remove all marker layers
    if (layer instanceof L.Marker) {
      map.removeLayer(layer);
    }
  });
  
  // Reset the markers array
  eventMarkers = [];
}

// Call this function after the map component is initialized
// You can add this to your existing initialization code
// or call it directly
enhanceMapEventHandling();
  
  function finishInit() {
    // Fix Leaflet's default icon paths globally
    if (typeof L !== 'undefined' && L.Icon && L.Icon.Default) {
      delete L.Icon.Default.prototype._getIconUrl;
      
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
      });
    }
    
    // Initialize maps
    initializeMaps();
    
    // Setup event listeners
    setupLocationListener();
    setupDirectConnection();
    
    // Add window resize handler to refresh map
    window.addEventListener('resize', function() {
      document.querySelectorAll('.leaflet-map-container').forEach(container => {
        if (container.mapInstance) {
          container.mapInstance.invalidateSize(true);
        } else if (container.leafletMap) {
          container.leafletMap.invalidateSize(true);
        }
      });
    });
  }
  
  // Initialize when the document is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Small delay to ensure all scripts are loaded
    setTimeout(init, 10);
  }

})();