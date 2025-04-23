// Minimal Map Component - For testing only
document.addEventListener('DOMContentLoaded', function() {
  console.log("Starting minimal map initialization...");
  
  // Find map container
  const mapContainer = document.querySelector('.leaflet-map-container');
  if (!mapContainer) {
    console.error("No map container found with class '.leaflet-map-container'");
    return;
  }
  
  // Check if Leaflet is available
  if (typeof L === 'undefined') {
    console.error("Leaflet library is not loaded!");
    
    // Try to load Leaflet dynamically as fallback
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    
    document.head.appendChild(link);
    document.head.appendChild(script);
    
    script.onload = function() {
      console.log("Leaflet loaded dynamically, initializing map...");
      initMinimalMap(mapContainer);
    };
    
    return;
  }
  
  // Initialize the map
  initMinimalMap(mapContainer);
});

function initMinimalMap(container) {
  // Clear container first
  container.innerHTML = '';
  
  // Get coordinates from data attributes or use defaults
  const lat = parseFloat(container.dataset.lat || 51.505);
  const lon = parseFloat(container.dataset.lon || -0.09);
  const name = container.dataset.name || 'Location';
  
  console.log(`Initializing map at coordinates: ${lat}, ${lon}`);
  
  try {
    // Create a basic map
    const map = L.map(container, {
      center: [lat, lon],
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
      // Disable animations for better performance
      fadeAnimation: false,
      zoomAnimation: false,
      markerZoomAnimation: false
    });
    
    // Add a simple tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);
    
    // Add a marker
    const marker = L.marker([lat, lon]).addTo(map);
    marker.bindPopup(name).openPopup();
    
    // Store map instance on the container
    container.mapInstance = map;
    container.dataset.initialized = 'true';
    
    // Force a resize to ensure proper display
    setTimeout(function() {
      map.invalidateSize(true);
      console.log("Map initialization complete!");
      
      // Setup event listener for locationSelected event
      document.addEventListener('locationSelected', function(e) {
        if (!e.detail) return;
        
        const { lat, lon, name } = e.detail;
        if (typeof lat !== 'number' || isNaN(lat) || 
            typeof lon !== 'number' || isNaN(lon)) {
          return;
        }
        
        console.log(`Updating map to: ${lat}, ${lon}, "${name}"`);
        map.setView([lat, lon], 13);
        marker.setLatLng([lat, lon]);
        marker.bindPopup(name).openPopup();
      });
      
      // Setup event listener for eventsDataLoaded event
      document.addEventListener('eventsDataLoaded', function(e) {
        if (!e.detail || !e.detail.events) return;
        
        const events = e.detail.events;
        console.log(`Received ${events.length} events to display on map`);
        
        // Clear existing markers (except the main one)
        map.eachLayer(function(layer) {
          if (layer !== marker && layer instanceof L.Marker) {
            map.removeLayer(layer);
          }
        });
        
        // Add markers for each event
        events.forEach(event => {
          if (!event._embedded || !event._embedded.venues || !event._embedded.venues[0]) return;
          
          const venue = event._embedded.venues[0];
          if (!venue.location || !venue.location.latitude || !venue.location.longitude) return;
          
          const venueLat = parseFloat(venue.location.latitude);
          const venueLon = parseFloat(venue.location.longitude);
          
          if (isNaN(venueLat) || isNaN(venueLon)) return;
          
          // Add a simple marker for this event
          const eventMarker = L.marker([venueLat, venueLon]).addTo(map);
          eventMarker.bindPopup(`
            <div>
              <h4>${event.name}</h4>
              <p><strong>${venue.name}</strong></p>
              <a href="/event/${event.id}">View Details</a>
            </div>
          `);
          
          // Add click handler
          eventMarker.on('click', function() {
            if (typeof window.highlightEventCard === 'function') {
              window.highlightEventCard(event.id);
            }
          });
        });
        
        // Adjust map to show all markers
        if (events.length > 0) {
          const markers = [marker];
          map.eachLayer(function(layer) {
            if (layer instanceof L.Marker) {
              markers.push(layer);
            }
          });
          
          const group = L.featureGroup(markers);
          map.fitBounds(group.getBounds(), {
            padding: [50, 50],
            maxZoom: 13
          });
        }
      });
    }, 500);
    
    // Make map available globally
    window.updateMap = function(lat, lon, name) {
      const numLat = parseFloat(lat);
      const numLon = parseFloat(lon);
      
      if (isNaN(numLat) || isNaN(numLon)) {
        console.error('Invalid coordinates for updateMap:', { lat, lon });
        return false;
      }
      
      map.setView([numLat, numLon], 13);
      marker.setLatLng([numLat, numLon]);
      if (name && typeof name === 'string') {
        marker.bindPopup(name).openPopup();
      }
      
      return true;
    };
    
  } catch (error) {
    console.error("Error initializing map:", error);
    container.innerHTML = '<div style="padding:20px;color:red;">Error loading map. Please refresh the page.</div>';
  }
}