document.addEventListener('DOMContentLoaded', function() {
    // Get all event cards
    const eventCards = document.querySelectorAll('[data-event-card]');
    
    // Calculate distance for each card
    eventCards.forEach(card => {
      calculateDistance(card);
    });
    
    // Calculate distance between user and venue
    function calculateDistance(card) {
      const distanceElement = card.querySelector('[data-distance]');
      const venueCoordinates = card.querySelector('.venue-coordinates');
      
      if (!distanceElement || !venueCoordinates) {
        if (distanceElement) distanceElement.textContent = 'No location data';
        return;
      }
      
      const venueLat = parseFloat(venueCoordinates.getAttribute('data-lat'));
      const venueLon = parseFloat(venueCoordinates.getAttribute('data-lon'));
      
      // Check if coordinates are valid
      if (isNaN(venueLat) || isNaN(venueLon)) {
        distanceElement.textContent = 'Location unknown';
        return;
      }
      
      // Get user's location if allowed
      if (navigator.geolocation) {
        // Set a timeout to ensure we eventually display something
        const timeoutId = setTimeout(() => {
          distanceElement.textContent = 'Distance unavailable';
        }, 5000); // 5 second timeout
        
        navigator.geolocation.getCurrentPosition(
          // Success callback
          (position) => {
            clearTimeout(timeoutId); // Clear the timeout
            
            const userLat = position.coords.latitude;
            const userLon = position.coords.longitude;
            
            // Calculate distance using Haversine formula
            const distance = getDistanceFromLatLonInKm(userLat, userLon, venueLat, venueLon);
            
            // Display distance
            distanceElement.textContent = distance < 1 
              ? `${Math.round(distance * 1000)} m away` 
              : `${distance.toFixed(1)} km away`;
          },
          // Error callback
          (error) => {
            clearTimeout(timeoutId); // Clear the timeout
            
            // Handle different error cases
            switch(error.code) {
              case error.PERMISSION_DENIED:
                distanceElement.textContent = 'Location access denied';
                break;
              case error.POSITION_UNAVAILABLE:
                distanceElement.textContent = 'Location unavailable';
                break;
              case error.TIMEOUT:
                distanceElement.textContent = 'Location request timed out';
                break;
              default:
                distanceElement.textContent = 'Could not determine distance';
            }
          },
          // Options
          {
            timeout: 4000, // 4 second timeout
            maximumAge: 60000 // Accept cached positions up to 1 minute old
          }
        );
      } else {
        distanceElement.textContent = 'Geolocation not supported';
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
  });