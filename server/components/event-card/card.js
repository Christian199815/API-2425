document.addEventListener('DOMContentLoaded', function() {
    // Get all event cards
    const eventCards = document.querySelectorAll('[data-event-card]');
    
    // Add click event listeners to toggle expanded state
    eventCards.forEach(card => {
      card.addEventListener('click', function(e) {
        // Don't toggle if clicking on the event link
        if (e.target.closest('.event-link')) {
          e.stopPropagation();
          return;
        }
        
        // Toggle expanded class
        this.classList.toggle('expanded');
      });
      
      // Calculate and display distance if user location is available
      calculateDistance(card);
    });
    
    // Calculate distance between user and venue
    function calculateDistance(card) {
      const distanceElement = card.querySelector('[data-distance]');
      const venueCoordinates = card.querySelector('.venue-coordinates');
      
      if (!distanceElement || !venueCoordinates) return;
      
      const venueLat = parseFloat(venueCoordinates.getAttribute('data-lat'));
      const venueLon = parseFloat(venueCoordinates.getAttribute('data-lon'));
      
      // Check if coordinates are valid
      if (isNaN(venueLat) || isNaN(venueLon)) {
        distanceElement.textContent = 'Location unknown';
        return;
      }
      
      // Get user's location if allowed
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          // Success callback
          (position) => {
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
          () => {
            distanceElement.textContent = 'Location unavailable';
          }
        );
      } else {
        distanceElement.textContent = 'Location unavailable';
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