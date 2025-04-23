// Custom Select Component JavaScript
(function () {
  // Debug flag - set to true to see debugging messages in console
  const DEBUG = false;

  function log(...args) {
    if (DEBUG) console.log('[Custom Select]', ...args);
  }

  function initializeSelects() {
    log('Initializing custom select components');

    const searchInputs = document.querySelectorAll('[data-location-search-input]');
    log('Found search inputs:', searchInputs.length);

    const savedLocationJSON = localStorage.getItem('savedLocation');
    let savedLocation = null;

    if (savedLocationJSON) {
      try {
        savedLocation = JSON.parse(savedLocationJSON);
        log('Loaded saved location from localStorage:', savedLocation);
      } catch (e) {
        console.error('Failed to parse saved location:', e);
      }
    }


    searchInputs.forEach(searchInput => {
      const container = searchInput.closest('[data-custom-select]');
      if (!container) {
        log('No container found for search input');
        return;
      }

      const form = container.querySelector('[data-location-form]');
      const datalist = container.querySelector('#location-options');
      const geoButton = container.querySelector('[data-geolocation-button]');
      const radiusInput = container.querySelector('[data-radius-input]');

      if (!form || !datalist) {
        log('Missing required elements for custom select');
        return;
      }

      // Note: We're no longer creating the enhanced dropdown

      let debounceTimer;
      let originalOptions = [];
      let currentLocation = null;

      // Check for previously stored location
const storedLocation = localStorage.getItem('customSelectLocation');
if (storedLocation) {
  try {
    const parsed = JSON.parse(storedLocation);
    if (parsed.lat && parsed.lon && parsed.name) {
      currentLocation = parsed;
      log('Restored location from localStorage:', currentLocation);

      // Set search input value
      searchInput.value = parsed.name;

      // Update form hidden inputs and map
      updateLocation(currentLocation);

      // Optionally trigger results fetch
      fetchResults();
    }
  } catch (e) {
    console.error('Failed to parse stored location', e);
  }
}


      // Handle form submission
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        fetchResults();
      });

      if (savedLocation) {
        currentLocation = savedLocation;
        searchInput.value = savedLocation.name;
        updateLocation(savedLocation);
        fetchResults();
      }
      

      // Handle radius changes
      if (radiusInput) {
        log('Setting up radius input handler');

        // Handle both change and input events for better responsiveness
        radiusInput.addEventListener('input', handleRadiusChange);
        radiusInput.addEventListener('change', handleRadiusChange);

        function handleRadiusChange() {
          log('Radius changed to:', radiusInput.value);

          // Ensure the radius is within bounds
          const minRadius = parseInt(radiusInput.min) || 1;
          const maxRadius = parseInt(radiusInput.max) || 160;
          let radius = parseInt(radiusInput.value);

          if (isNaN(radius)) {
            radius = 40; // Default value
          } else if (radius < minRadius) {
            radius = minRadius;
          } else if (radius > maxRadius) {
            radius = maxRadius;
          }

          // Update the input value if it was out of bounds
          if (radius !== parseInt(radiusInput.value)) {
            radiusInput.value = radius;
          }

          // Only proceed if we have a current location
          if (currentLocation) {
            log('Updating with current location and new radius:', radius);
            updateLocationInputs(currentLocation);
            fetchResults();
          } else {
            log('No current location, cannot update radius');
          }
        }
      }

      // Handle input changes (filter and fetch)
      searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        log('Input changed:', searchTerm);

        // Clear previous timer
        clearTimeout(debounceTimer);

        // Fetch new results after typing stops
        debounceTimer = setTimeout(() => {
          if (searchTerm.length >= 2) {
            log('Fetching locations for:', searchTerm);
            fetchLocations(searchTerm);
          } else {
            // Clear options if search term is too short
            clearOptions();
          }
        }, 500);
      });

      // Add form change listener to detect any form changes
      form.addEventListener('change', (e) => {
        // Only trigger API fetch if we have a location and the changed element wasn't the search input
        // (since the search input has its own specific handler)
        if (currentLocation && e.target !== searchInput) {
          log('Form field changed:', e.target.name);
          fetchResults();
        }
      });

      // Handle datalist option selection
      searchInput.addEventListener('change', () => {
        const selectedValue = searchInput.value;
        log('Input value changed to:', selectedValue);

        // Find the matching option in the datalist
        const selectedOption = Array.from(datalist.options).find(
          option => option.value === selectedValue
        );

        if (selectedOption) {
          // Store current location
          currentLocation = {
            lat: parseFloat(selectedOption.dataset.lat),
            lon: parseFloat(selectedOption.dataset.lon),
            name: selectedValue.trim()
          };

          // Update location
          updateLocation(currentLocation);

          // Trigger fetch results to send data to API
          fetchResults();
        }
      });

      // Setup geolocation button if it exists
      if (geoButton) {
        log('Setting up geolocation button');
        geoButton.addEventListener('click', handleGeolocation);
      }

      // Get user's current location
      function handleGeolocation() {
        log('Geolocation button clicked');

        // Check if geolocation is supported
        if (!navigator.geolocation) {
          alert('Geolocation is not supported by your browser');
          return;
        }

        // Show loading state
        geoButton.setAttribute('data-loading', 'true');

        // Get current position
        navigator.geolocation.getCurrentPosition(
          // Success handler
          function (position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            log('User location found:', { lat, lon });

            // Remove loading state
            geoButton.removeAttribute('data-loading');

            // Reverse geocode to get address
            reverseGeocode(lat, lon);
          },
          // Error handler
          function (error) {
            // Remove loading state
            geoButton.removeAttribute('data-loading');

            let errorMessage;
            switch (error.code) {
              case error.PERMISSION_DENIED:
                errorMessage = 'Location access was denied by the user.';
                break;
              case error.POSITION_UNAVAILABLE:
                errorMessage = 'Location information is unavailable.';
                break;
              case error.TIMEOUT:
                errorMessage = 'The request to get user location timed out.';
                break;
              default:
                errorMessage = 'An unknown error occurred.';
                break;
            }
            log('Geolocation error:', errorMessage);
            alert('Error getting your location: ' + errorMessage);
          },
          // Options
          {
            enableHighAccuracy: true,
            timeout: 10000, // 10 seconds
            maximumAge: 60000 // 1 minute
          }
        );
      }

      // Reverse geocode coordinates to address
      function reverseGeocode(lat, lon) {
        log('Reverse geocoding coordinates:', { lat, lon });

        // Use Nominatim for reverse geocoding
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;

        fetch(url, {
          headers: {
            'User-Agent': 'YourAppName/1.0' // Replace with your app name
          }
        })
          .then(response => response.json())
          .then(data => {
            log('Reverse geocoding response:', data);

            if (data && data.display_name) {
              // Update input field with display name
              searchInput.value = data.display_name;

              // Store current location
              currentLocation = {
                lat: lat,
                lon: lon,
                name: data.display_name
              };

              // Update location
              updateLocation(currentLocation);
            } else {
              log('No address found for coordinates');
              alert('Could not find a location address for your coordinates.');
            }
          })
          .catch(error => {
            log('Error reverse geocoding:', error);
            alert('Error getting location details. Please try again.');
          });
      }

      // Clear all options
      function clearOptions() {
        datalist.innerHTML = '';
        originalOptions = [];
      }

      // Fetch locations from API
      async function fetchLocations(searchTerm) {
        try {
          log('Fetching from API:', searchTerm);
          const response = await fetch(`/api/locations?q=${encodeURIComponent(searchTerm)}`);
          const data = await response.json();

          log('API returned locations:', data.length);

          // Clear existing options
          clearOptions();

          if (data.length > 0) {
            // Add locations only to the datalist
            data.forEach(place => {
              // Add to datalist
              const option = document.createElement('option');
              option.value = place.display_name;
              option.dataset.value = place.place_id;
              option.dataset.lat = place.lat;
              option.dataset.lon = place.lon;
              datalist.appendChild(option);
              originalOptions.push(option);
            });
          }

          return data;
        } catch (error) {
          console.error("Error fetching locations:", error);
          return [];
        }
      }

      // Update location with current radius
      function updateLocation(location) {
        const radius = radiusInput ? parseInt(radiusInput.value) : 40;

        log('Updating location:', { ...location, radius });

        // Update hidden input fields
        updateLocationInputs(location);

        // Try direct update using global window function first (for maps)
        if (window.updateMap && typeof window.updateMap === 'function') {
          log('Using direct window.updateMap function');
          window.updateMap(location.lat, location.lon, location.name);
        }

        // Also dispatch custom event for other components to listen to
        const event = new CustomEvent('locationSelected', {
          bubbles: true,
          detail: {
            lat: location.lat,
            lon: location.lon,
            name: location.name,
            radius: radius
          }
        });

        document.dispatchEvent(event);
        log('Event dispatched');

        localStorage.setItem('savedLocation', JSON.stringify(location));
      }

      // Update hidden input fields with location data
      function updateLocationInputs(location) {
        // Create or update hidden input fields for lat/lon
        let latInput = form.querySelector('[name="lat"]');
        let lonInput = form.querySelector('[name="lon"]');

        if (!latInput) {
          latInput = document.createElement('input');
          latInput.type = 'hidden';
          latInput.name = 'lat';
          form.appendChild(latInput);
        }

        if (!lonInput) {
          lonInput = document.createElement('input');
          lonInput.type = 'hidden';
          lonInput.name = 'lon';
          form.appendChild(lonInput);
        }

        latInput.value = location.lat;
        lonInput.value = location.lon;
      }

      // Fetch results and update URL
      function fetchResults() {
        // Ensure we have all required data
        if (!currentLocation) {
          log('Cannot fetch results: no current location');
          return;
        }

        const formData = new FormData(form);
        const queryString = new URLSearchParams(formData).toString();
        const url = `/?${queryString}`;

        log('Fetching results with URL:', url);

        // Update URL without page reload
        window.history.replaceState(null, null, url);

        // Show loading state if available
        const resultsContainer = document.querySelector('[data-location-results]');
        if (resultsContainer) {
          resultsContainer.setAttribute('data-loading', 'true');
        }

        // Fetch results with AJAX
        fetch(url, {
          method: form.method,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest'
          }
        })
          .then(response => {
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
            return response.text();
          })
          .then(html => {
            // Update the results container if it exists
            if (resultsContainer) {
              resultsContainer.innerHTML = html;
              resultsContainer.removeAttribute('data-loading');
            }
          })
          .catch(error => {
            console.error('Error fetching results:', error);
            if (resultsContainer) {
              resultsContainer.removeAttribute('data-loading');
            }
          });
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSelects);
  } else {
    initializeSelects();
  }
})();