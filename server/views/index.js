// Main JavaScript for Event Finder Application

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the map if it exists
    initMap();
    
    // Initialize event cards
    initEventCards();
    
    // Initialize location search
    initLocationSearch();
  });
  
  // Map Initialization
  function initMap() {
    const mapView = document.querySelector('[data-map-view]');
    
    if (!mapView) return;
    
    // Get coordinates from data attributes
    const defaultLat = parseFloat(mapView.dataset.lat) || 52.3676;
    const defaultLon = parseFloat(mapView.dataset.lon) || 4.9041;
    const locationName = mapView.dataset.name || 'Amsterdam';
    
    // Initialize the map
    const map = L.map('map').setView([defaultLat, defaultLon], 13);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Add marker for the location
    L.marker([defaultLat, defaultLon])
      .addTo(map)
      .bindPopup(locationName)
      .openPopup();
    
    // Add store markers based on the mockup
    addStoreMarkers(map);
  }
  
  // Add store markers based on the mockup
  function addStoreMarkers(map) {
    // Sample store data - in a real app, this would come from an API or data attributes
    const stores = [
      { id: 'adidas1', name: 'Adidas', lat: 52.370, lon: 4.905, icon: 'adidas', rating: 100, open: '\'til 6pm', distance: '0.5 mi' },
      { id: 'nike1', name: 'Nike', lat: 52.372, lon: 4.920, icon: 'nike', rating: 15, open: '\'til 6pm', distance: '0.7 mi' },
      { id: 'puma1', name: 'Puma', lat: 52.365, lon: 4.910, icon: 'puma', rating: 100, open: '\'til 6pm', distance: '0.3 mi' },
      { id: 'underarmour1', name: 'Under Armour', lat: 52.360, lon: 4.915, icon: 'under-armour', rating: 80, open: '\'til 6pm', distance: '0.2 mi' },
      { id: 'timberland1', name: 'Timberland', lat: 52.355, lon: 4.925, icon: 'timberland', rating: 80, open: '\'til 6pm', distance: '0.4 mi' },
      { id: 'ea71', name: 'EA7 Emporio Armani', lat: 52.380, lon: 4.900, icon: 'ea7', rating: null, open: '\'til 6pm', distance: '2.1 mi' },
      { id: 'converse1', name: 'Converse', lat: 52.375, lon: 4.895, icon: 'converse', rating: null, open: '\'til 6pm', distance: '2.5 mi' }
    ];
    
    // Create custom icon for stores
    function createStoreIcon(store) {
      // In a real app, you would use actual brand logos
      // For this demo, we'll create colored circles with text
      const iconHtml = `
        <div class="store-marker" style="background-color: #fff; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
          <span style="font-weight: bold; font-size: 10px;">${store.name.substr(0, 2)}</span>
        </div>
      `;
      
      return L.divIcon({
        html: iconHtml,
        className: `store-marker-${store.icon}`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });
    }
    
    // Add markers for each store
    stores.forEach(store => {
      const marker = L.marker([store.lat, store.lon], { icon: createStoreIcon(store) })
        .addTo(map);
      
      // Create popup content
      const popupContent = `
        <div class="store-popup">
          <h3>${store.name}</h3>
          <p>${store.distance} • ${store.open}</p>
          ${store.rating ? `<p>Rating: ${store.rating}/100</p>` : ''}
        </div>
      `;
      
      marker.bindPopup(popupContent);
      
      // Add click event
      marker.on('click', function() {
        // In a real app, you would fetch store details from an API
        showStoreDetails(store);
      });
    });
  }
  
  // Show store details in a overlay or sidebar
  function showStoreDetails(store) {
    console.log('Showing details for store:', store);
    // In a real app, you would update a detail panel or show a modal
  }
  
  // Initialize Event Cards
  function initEventCards() {
    const eventCards = document.querySelectorAll('[data-event-card]');
    
    eventCards.forEach(card => {
      const header = card.querySelector('[data-event-card-header]');
      const details = card.querySelector('[data-event-card-details]');
      
      if (header && details) {
        header.addEventListener('click', function() {
          // Toggle expanded class
          card.classList.toggle('expanded');
          
          // Scroll the card into view if it's expanding and not fully visible
          if (card.classList.contains('expanded')) {
            setTimeout(() => {
              const cardRect = card.getBoundingClientRect();
              const isFullyVisible = 
                cardRect.top >= 0 &&
                cardRect.bottom <= window.innerHeight;
              
              if (!isFullyVisible) {
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            }, 100);
          }
        });
      }
    });
  }
  
  // Initialize Location Search
  function initLocationSearch() {
    const locationForm = document.querySelector('[data-location-form]');
    const locationInput = document.querySelector('[data-location-search-input]');
    const geolocationButton = document.querySelector('[data-geolocation-button]');
    const radiusInput = document.querySelector('[data-radius-input]');
    
    if (!locationForm || !locationInput) return;
    
    // Setup location search with debouncing
    let searchTimeout;
    locationInput.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      
      const query = this.value.trim();
      if (query.length < 2) return;
      
      searchTimeout = setTimeout(() => {
        fetchLocationSuggestions(query);
      }, 300);
    });
    
    // Setup form submission
    locationForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const query = locationInput.value.trim();
      const radius = radiusInput.value;
      
      if (query.length > 0) {
        searchEvents(query, radius);
      }
    });
    
    // Setup geolocation
    if (geolocationButton) {
      geolocationButton.addEventListener('click', function() {
        if (navigator.geolocation) {
          geolocationButton.disabled = true;
          geolocationButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 6v6l4 2"></path>
            </svg>
          `;
          
          navigator.geolocation.getCurrentPosition(
            position => {
              const { latitude, longitude } = position.coords;
              
              // Reverse geocode to get location name
              reverseGeocode(latitude, longitude)
                .then(locationName => {
                  locationInput.value = locationName;
                  
                  // Search for events using coordinates
                  searchEventsByCoordinates(latitude, longitude, radiusInput.value);
                })
                .catch(error => {
                  console.error('Error reverse geocoding:', error);
                  alert('Could not determine your location name. Please try again or enter a location manually.');
                })
                .finally(() => {
                  resetGeolocationButton();
                });
            },
            error => {
              console.error('Geolocation error:', error);
              alert('Could not access your location. Please check your browser permissions or enter a location manually.');
              resetGeolocationButton();
            }
          );
        } else {
          alert('Geolocation is not supported by your browser. Please enter a location manually.');
        }
      });
    }
    
    function resetGeolocationButton() {
      if (geolocationButton) {
        geolocationButton.disabled = false;
        geolocationButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        `;
      }
    }
  }
  
  // Fetch location suggestions from API
  async function fetchLocationSuggestions(query) {
    try {
      const response = await fetch(`/api/locations?q=${encodeURIComponent(query)}`);
      const suggestions = await response.json();
      
      // Update datalist with suggestions
      updateLocationOptions(suggestions);
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
    }
  }
  
  // Update datalist options with location suggestions
  function updateLocationOptions(locations) {
    const datalist = document.getElementById('location-options');
    if (!datalist) return;
    
    // Clear existing options
    datalist.innerHTML = '';
    
    // Add new options
    locations.forEach(location => {
      const option = document.createElement('option');
      option.value = location.display_name;
      option.dataset.lat = location.lat;
      option.dataset.lon = location.lon;
      datalist.appendChild(option);
    });
  }
  
  // Reverse geocode coordinates to get location name
  async function reverseGeocode(latitude, longitude) {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`, {
        headers: {
          'User-Agent': 'EventFinderApp/1.0'
        }
      });
      
      const data = await response.json();
      return data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  }
  
  // Search for events by location name
  function searchEvents(query, radius) {
    // Redirect to homepage with query parameters
    window.location.href = `/?q=${encodeURIComponent(query)}&radius=${radius}`;
  }
  
  // Search for events by coordinates
  async function searchEventsByCoordinates(latitude, longitude, radius) {
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          latitude,
          longitude,
          radius,
          unit: 'km'
        })
      });
      
      if (response.ok) {
        const eventsHtml = await response.text();
        
        // Update events section
        const eventsSection = document.querySelector('[data-events-section]');
        if (eventsSection) {
          eventsSection.innerHTML = eventsHtml;
          
          // Re-initialize event cards
          initEventCards();
        }
        
        // Update map (if needed)
        updateMap(latitude, longitude);
      } else {
        console.error('Error searching for events:', response.statusText);
      }
    } catch (error) {
      console.error('Error searching for events:', error);
    }
  }
  
  // Update map with new coordinates
  function updateMap(latitude, longitude) {
    const mapView = document.querySelector('[data-map-view]');
    if (!mapView || !window.L) return;
    
    // Get the map instance
    const map = L.map('map');
    
    // Clear existing layers
    map.eachLayer(layer => {
      map.removeLayer(layer);
    });
    
    // Set new view
    map.setView([latitude, longitude], 13);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Add marker
    L.marker([latitude, longitude]).addTo(map);
    
    // Add store markers
    addStoreMarkers(map);
  }
  
  // Share event functionality (for event detail page)
  document.addEventListener('DOMContentLoaded', function() {
    const shareButton = document.querySelector('[data-share-button]');
    
    if (shareButton) {
      shareButton.addEventListener('click', function() {
        if (navigator.share) {
          navigator.share({
            title: document.title,
            url: window.location.href
          })
          .catch(error => console.error('Error sharing:', error));
        } else {
          // Fallback for browsers that don't support Web Share API
          // Copy URL to clipboard
          const tempInput = document.createElement('input');
          tempInput.value = window.location.href;
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand('copy');
          document.body.removeChild(tempInput);
          
          alert('URL copied to clipboard!');
        }
      });
    }
  });