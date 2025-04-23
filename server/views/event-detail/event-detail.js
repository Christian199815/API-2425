// Event Detail Page JavaScript with Battery Status Monitor
(function() {
  // Debug mode
  const DEBUG = true;
  
  // Logger helper function
  function log(...args) {
    if (DEBUG) console.log('[Event Detail]', ...args);
  }
  
  // Initialize the page
  function init() {
    log('Initializing event detail page');
    
    // Initialize battery status monitor
    initBatteryMonitor();
    
    // Initialize venue map if present
    initVenueMap();
    
    // Track outbound clicks for analytics purposes
    trackOutboundLinks();
    
    // Handle ticket button clicks
    initTicketButtonTracking();
    
    // Load any additional artist info if available
    loadArtistInfo();
    
    log('Event detail page initialized');
  }
  
  // Initialize battery status monitor
  function initBatteryMonitor() {
    log('Initializing battery status monitor');
    
    if ('getBattery' in navigator) {
      navigator.getBattery().then((battery) => {
        // Create battery status element to insert in the DOM
        const batteryStatusDiv = document.createElement('div');
        batteryStatusDiv.id = 'battery-status';
        batteryStatusDiv.className = 'battery-status-container';
        
        // Style the battery status container
        batteryStatusDiv.style.padding = '10px 15px';
        batteryStatusDiv.style.margin = '15px 0';
        batteryStatusDiv.style.borderRadius = '5px';
        batteryStatusDiv.style.fontFamily = 'inherit';
        batteryStatusDiv.style.fontSize = '14px';
        batteryStatusDiv.style.textAlign = 'center';
        batteryStatusDiv.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        
        // Find the event-image-main section to insert our battery status
        const eventImageSection = document.querySelector('.event-image-main');
        
        if (eventImageSection) {
          // Insert after the hero image but before the back button
          const heroImage = eventImageSection.querySelector('.event-hero-image');
          const backButton = eventImageSection.querySelector('.back-button');
          
          if (heroImage && backButton) {
            eventImageSection.insertBefore(batteryStatusDiv, backButton);
            log('Battery status element inserted into DOM');
          } else {
            // If elements not found, just append to the section
            eventImageSection.appendChild(batteryStatusDiv);
            log('Battery status element appended to event-image-main');
          }
        } else {
          log('event-image-main section not found');
          return;
        }
        
        function updateBatteryStatus() {
          const level = battery.level * 100;
          const charging = battery.charging;
          
          // Update the battery status message and styling based on conditions
          if (level > 50) {
            batteryStatusDiv.textContent = `Battery: ${level.toFixed(0)}% - Battery level is good`;
            batteryStatusDiv.style.backgroundColor = '#d4edda';
            batteryStatusDiv.style.color = '#155724';
            batteryStatusDiv.style.border = '1px solid #c3e6cb';
          } else if (level >= 30 && level <= 50 && charging) {
            batteryStatusDiv.textContent = `Battery: ${level.toFixed(0)}% - Please keep charging`;
            batteryStatusDiv.style.backgroundColor = '#fff3cd';
            batteryStatusDiv.style.color = '#856404';
            batteryStatusDiv.style.border = '1px solid #ffeeba';
          } else if (level < 50) {
            batteryStatusDiv.textContent = `Battery: ${level.toFixed(0)}% - Please charge your device`;
            batteryStatusDiv.style.backgroundColor = '#f8d7da';
            batteryStatusDiv.style.color = '#721c24';
            batteryStatusDiv.style.border = '1px solid #f5c6cb';
          }
        }
        
        // Initialize
        updateBatteryStatus();
        
        // Set up event listeners for changes
        battery.addEventListener("chargingchange", updateBatteryStatus);
        battery.addEventListener("levelchange", updateBatteryStatus);
        
        log('Battery status monitor initialized');
      }).catch(error => {
        log('Error accessing Battery API:', error);
      });
    } else {
      log('Battery API not supported');
    }
  }
  
  // Initialize the venue map
  function initVenueMap() {
    const mapElement = document.querySelector('[data-venue-map]');
    if (!mapElement) {
      log('No venue map element found');
      return;
    }
    
    // Check if we have coordinates
    const lat = parseFloat(mapElement.dataset.lat);
    const lon = parseFloat(mapElement.dataset.lon);
    const venueName = mapElement.dataset.name || 'Venue';
    
    if (isNaN(lat) || isNaN(lon)) {
      log('Invalid coordinates for venue map');
      return;
    }
    
    log('Initializing map for venue:', venueName);
    
    // Make sure Leaflet is loaded
    if (typeof L !== 'undefined') {
      try {
        // Create custom icon with absolute URLs to fix 404 errors
        const venueIcon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });
        
        // Create map instance
        const map = L.map(mapElement, {
          center: [lat, lon],
          zoom: 15,
          scrollWheelZoom: false
        });
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        // Add venue marker with custom icon
        const marker = L.marker([lat, lon], { icon: venueIcon }).addTo(map);
        marker.bindPopup(`<strong>${venueName}</strong>`).openPopup();
        
        // Store map reference
        mapElement.mapInstance = map;
        
        log('Venue map initialized successfully');
      } catch (error) {
        console.error('Error initializing venue map:', error);
      }
    } else {
      log('Leaflet library not loaded');
    }
  }
  
  // Track outbound link clicks
  function trackOutboundLinks() {
    const venueLinks = document.querySelectorAll('[data-venue-link]');
    const artistLinks = document.querySelectorAll('[data-artist-link]');
    
    // Track venue link clicks
    venueLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        const venueId = this.dataset.venueLink;
        log('Venue link clicked:', venueId);
      });
    });
    
    // Track artist link clicks
    artistLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        const artistId = this.dataset.artistLink;
        log('Artist link clicked:', artistId);
      });
    });
  }
  
  // Initialize ticket button tracking
  function initTicketButtonTracking() {
    const ticketButton = document.querySelector('[data-ticket-link]');
    if (ticketButton) {
      ticketButton.addEventListener('click', function(e) {
        const eventId = this.dataset.ticketLink;
        log('Ticket button clicked for event:', eventId);
      });
    }
  }
  
  // Load additional artist information if available
  function loadArtistInfo() {
    const artistCards = document.querySelectorAll('[data-artist-id]');
    
    if (artistCards.length === 0) {
      log('No artist cards found');
      return;
    }
    
    log('Found artist cards:', artistCards.length);
    
    // For a real implementation, you might want to fetch additional artist info
    // from an API here, but we'll just log for now
    artistCards.forEach(card => {
      const artistId = card.dataset.artistId;
      log('Artist card found:', artistId);
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