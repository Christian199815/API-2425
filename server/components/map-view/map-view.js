// Map Component JavaScript
(function() {
  // Debug flag - set to true to see debugging messages in console
  const DEBUG = true;
  
  function log(...args) {
    if (DEBUG) console.log('[Map Component]', ...args);
  }

  // Global variable to track initialization status
  let mapInitialized = false;
  let pendingUpdates = [];

  // Map style definitions - using the most reliable tile providers
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
    },
    {
      name: 'Satellite',
      // Using MapBox satellite tiles which are more reliable
      url: 'https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiZXhhbXBsZW1hcGJveCIsImEiOiJjbHZ4eDdhdXIwNXljMmpsODVkMmhldzk2In0.lY9-6g1DsQ4xEJVhVYt6kA',
      attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
      tileSize: 512,
      zoomOffset: -1
    }
  ];

  // Initialize all map components on the page
  function initializeMaps() {
    const mapContainers = document.querySelectorAll('.leaflet-map-container');
    log('Initializing maps, found:', mapContainers.length);
    
    if (mapContainers.length === 0) {
      log('No map containers found to initialize');
      return false;
    }
    
    mapContainers.forEach(container => {
      // Check if this map has already been initialized
      if (container.dataset.initialized === 'true') {
        log('Map already initialized, skipping:', container.id);
        return;
      }
      
      // Get the coordinates from the data attributes
      const lat = parseFloat(container.dataset.lat || 52.3676);
      const lon = parseFloat(container.dataset.lon || 4.9041);
      const name = container.dataset.name || 'Location';
      
      log('Creating map with coordinates:', { lat, lon, name });
      
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
          // Using SVG for better tile quality
          preferCanvas: false,
          renderer: L.svg(),
          // Important: Don't set minZoom too low
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
        log('Map initialized successfully');
        
        // Force a resize event right away
        map.invalidateSize(true);
        
        // Sequential refreshes to ensure all tiles are loaded
        setTimeout(() => {
          map.invalidateSize(true);
          log('Map size refreshed (1st pass)');
          
          // Second refresh
          setTimeout(() => {
            map.invalidateSize(true);
            
            // Handle any tiles that failed to load
            const emptyTiles = document.querySelectorAll('.leaflet-tile:not(.leaflet-tile-loaded)');
            if (emptyTiles.length > 0) {
              log('Found empty tiles, forcing reload:', emptyTiles.length);
              // Force tile layer reload
              map.removeLayer(tileLayer);
              map.addLayer(tileLayer);
            }
            
            log('Map size refreshed (2nd pass)');
          }, 500);
          
        }, 100);
        
        // Add reload handler for missing tiles
        container.addEventListener('error', function(e) {
          if (e.target && e.target.classList && e.target.classList.contains('leaflet-tile')) {
            log('Tile loading error detected, retrying');
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
            log('Map size refreshed after full page load');
          }, 500);
        });
        
        // Add event listener for when viewport changes
        map.on('moveend', function() {
          log('Map moved');
        });
        
        // Add event listener to handle zoom and ensure tiles are loaded
        map.on('zoomend', function() {
          log('Map zoomed');
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
    
    // Process any pending updates
    if (pendingUpdates.length > 0) {
      log('Processing', pendingUpdates.length, 'pending updates');
      pendingUpdates.forEach(update => {
        updateAllMaps(update.lat, update.lon, update.name);
      });
      pendingUpdates = [];
    }
    
    return true;
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
          
          log('Map style changed to:', newStyle.name);
        });
      });
      
      // Initialize button text
      button.textContent = 'Map Style: ' + mapStyles[0].name;
    });
  }
  
  // Function to update a single map with new coordinates
  function updateMap(mapContainer, lat, lon, name) {
    if (!mapContainer) {
      log('Cannot update map: container not found');
      return false;
    }
    
    if (!mapContainer.mapInstance && !mapContainer.leafletMap) {
      log('Cannot update map: no map instance found on container');
      return false;
    }
    
    log('Updating map to:', { lat, lon, name });
    
    try {
      // Get map instance, preferring the explicit property if available
      const map = mapContainer.leafletMap || mapContainer.mapInstance;
      const marker = mapContainer.leafletMarker || mapContainer.marker;
      
      if (!map || !marker) {
        log('Map or marker reference not found');
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
          log('Found empty tiles after map update, forcing reload');
          // Force tile layer reload
          map.removeLayer(mapContainer.tileLayer);
          map.addLayer(mapContainer.tileLayer);
        }
      }, 500);
      
      log('Map updated successfully');
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
      log('Invalid coordinates for updateAllMaps:', { lat, lon });
      return false;
    }
    
    if (!mapInitialized) {
      log('Maps not yet initialized, queuing update for later');
      pendingUpdates.push({ lat, lon, name });
      return false;
    }
    
    log('Updating all maps to:', { lat, lon, name });
    
    // Find all map containers
    const mapContainers = document.querySelectorAll('.leaflet-map-container');
    if (mapContainers.length === 0) {
      log('No map containers found to update');
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
    log('Setting up location selection listener');
    
    // Listen for the custom locationSelected event
    document.addEventListener('locationSelected', function(e) {
      log('locationSelected event received:', e.detail);
      
      if (!e.detail) {
        log('No detail provided in locationSelected event');
        return;
      }
      
      const { lat, lon, name } = e.detail;
      
      // Validate the data
      if (typeof lat !== 'number' || isNaN(lat) || 
          typeof lon !== 'number' || isNaN(lon)) {
        log('Invalid coordinates in event:', e.detail);
        return;
      }
      
      updateAllMaps(lat, lon, name);
    });
    
    log('Location selection listener setup complete');
  }
  
  // Direct connection to the select component
  function setupDirectConnection() {
    log('Setting up direct connection to select component');
    
    document.addEventListener('click', function(e) {
      // Check if the clicked element is an option in the location dropdown
      const selectedOption = e.target.closest('[data-location-options] li');
      if (!selectedOption) return;
      
      log('Location option clicked directly:', selectedOption);
      
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
    
    log('Direct connection setup complete');
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
            log('Found empty tiles after style change, forcing reload');
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
    log('Manual map refresh requested');
    
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
      log('Global tile error handler caught a tile loading error');
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
  
  // Initialize when the DOM is ready
  function init() {
    log('Initializing map component');
    
    // Check if Leaflet is available
    if (typeof L === 'undefined') {
      log('Leaflet not loaded, waiting...');
      
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
      log('Leaflet already loaded');
      finishInit();
    }
  }
  
  function finishInit() {
    // Fix Leaflet's default icon paths globally
    if (typeof L !== 'undefined' && L.Icon && L.Icon.Default) {
      log('Setting global Leaflet default icon paths');
      
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
    
    log('Map component initialization complete');
    
    // Add window resize handler to refresh map
    window.addEventListener('resize', function() {
      log('Window resized, refreshing maps');
      document.querySelectorAll('.leaflet-map-container').forEach(container => {
        if (container.mapInstance) {
          container.mapInstance.invalidateSize(true);
        } else if (container.leafletMap) {
          container.leafletMap.invalidateSize(true);
        }
      });
    });
  }
  
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
  
  // Initialize when the document is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Small delay to ensure all scripts are loaded
    setTimeout(init, 10);
  }
})();