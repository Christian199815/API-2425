import 'dotenv/config';
import { App } from '@tinyhttp/app';
import { logger } from '@tinyhttp/logger';
import { Liquid } from 'liquidjs';
import sirv from 'sirv';
import { json } from 'milliparsec';
import { promises as fs } from 'fs';


// Function to fetch locations from OpenStreetMap
const fetchLocations = async (searchTerm = "Amsterdam") => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchTerm)}&format=json`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'YourAppName/1.0'
      }
    });
    
    const locationData = await response.json();
    return locationData;
  } catch (error) {
    console.error("Error fetching locations:", error);
    return [];
  }
};

// Function to fetch events from Ticketmaster API
const fetchEvents = async (latitude, longitude, radius = 25) => {
  try {
    // Get current date in format YYYY-MM-DD
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    const startDateTime = `${formattedDate}T00:00:00Z`;
    const endDateTime = `${formattedDate}T23:59:59Z`;
    
    // Call Ticketmaster API using fetch instead of axios
    const apiKey = process.env.TICKETMASTER_API_KEY;
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&latlong=${latitude},${longitude}&radius=${radius}&unit=miles&startDateTime=${startDateTime}&endDateTime=${endDateTime}&size=100`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Ticketmaster API responded with status ${response.status}`);
    }
    
    const results = await response.json();
    let events = [];
    
    if (results && results._embedded && results._embedded.events) {
      events = results._embedded.events.map(event => {
        // Extract the required information
        const eventData = {
          id: event.id,
          name: event.name,
          url: event.url,
          images: event.images || [],
          dates: event.dates || {},
          priceRanges: event.priceRanges || [],
          classifications: event.classifications || [],
          _embedded: event._embedded || {}
        };
        
        // Include attractions (artists) if available
        if (event._embedded && event._embedded.attractions) {
          eventData.attractions = event._embedded.attractions.map(attraction => ({
            id: attraction.id,
            name: attraction.name,
            url: attraction.url
          }));
        }
        
        return eventData;
      });
    }
    
    return events;
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
};

// Initialize Liquid template engine
const engine = new Liquid({
  extname: '.liquid',
  root: ['server/views', 'server', 'server/components'], // Template root directory
  layouts: 'server/layouts', // Optional layouts directory
  cache: process.env.NODE_ENV === 'production'
});

// Set up a render function for TinyHTTP
const setupRender = (app) => {
  // Add render method to response object
  app.use((req, res, next) => {
    res.render = async (template, locals = {}) => {
      try {
        const templateData = {
          NODE_ENV: process.env.NODE_ENV || 'production',
          ...locals
        };
        
        const html = await engine.renderFile(template, templateData);
        res.send(html);
      } catch (error) {
        console.error('Template render error:', error);
        res.status(500).send('Error rendering template');
      }
    };
    next();
  });
  
  return app;
};

const app = setupRender(new App());

app
  .use(logger())
  .use(json())
  .use('/public', sirv('public'))
  .use('/', sirv(process.env.NODE_ENV === 'development' ? 'client' : 'dist'));

// Initial page load
app.get('/', async (req, res) => {
  try {
    // Default location data for first load 
    const searchTerm = req.query.q || 'Amsterdam';
    const locations = await fetchLocations(searchTerm);
    
    // Default coordinates for Amsterdam
    const defaultLat = '52.3676';
    const defaultLon = '4.9041';
    
    // Fetch events for the default location
    const events = await fetchEvents(defaultLat, defaultLon);
    
    // Check if it's an AJAX request
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      // For AJAX requests, return the events overview block
      return res.render('events-overview-block/events-overview-block.liquid', { 
        events,
        locations,
        defaultLat,
        defaultLon,
        isAjax: true // Add flag to indicate this is an AJAX response
      });
    }
    
    // For regular page loads, return the full page
    return res.render('index.liquid', { 
      title: 'Events Near You', 
      locations,
      events,
      defaultLat,
      defaultLon,
      isAjax: false
    });
  } catch (error) {
    console.error("Error rendering home page:", error);
    return res.status(500).render('error/error.liquid', { 
      error: "Internal Server Error",
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

// API endpoint for location search
app.get('/api/locations', async (req, res) => {
  try {
    const searchTerm = req.query.q || '';
    if (searchTerm.length < 2) {
      return res.json([]);
    }
    
    const locations = await fetchLocations(searchTerm);
    return res.json(locations);
  } catch (error) {
    console.error("Error in location search:", error);
    return res.status(500).json({ error: "Failed to fetch locations" });
  }
});

// API endpoint for event search
app.post('/api/events', async (req, res) => {
  try {
    const { latitude, longitude, radius, unit } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    // Default radius is 40 km if not provided
    let searchRadius = radius || 40;
    let searchUnit = unit || 'km';
    
    // If unit is kilometers (default) but Ticketmaster expects miles, convert
    if (searchUnit.toLowerCase() === 'km') {
      const kmToMiles = 0.621371;
      searchRadius = Math.round(searchRadius * kmToMiles);
      searchUnit = 'miles';
    }
    
    const events = await fetchEvents(latitude, longitude, searchRadius);
    
    // For each event, try to render a map popup
    if (req.headers['x-include-popups'] === 'true') {
      for (let event of events) {
        try {
          // Instead of storing the rendered HTML, we'll create a popup ID for later rendering
          event.popupId = event.id;
        } catch (popupError) {
          console.error(`Error setting popup ID for event ${event.id}:`, popupError);
          event.popupId = null;
        }
      }
    }
    
    // If it's an AJAX request and not a popup-specific request, render the events overview block
    if (req.headers['x-requested-with'] === 'XMLHttpRequest' && req.headers['x-include-popups'] !== 'true') {
      return res.render('events-overview-block/events-overview-block.liquid', {
        events,
        isAjax: true
      });
    }
    
    // Otherwise return JSON response
    return res.json({ events });
  } catch (error) {
    console.error("Error fetching events:", error);
    return res.status(500).json({ error: "Failed to fetch events" });
  }
});

// JSON parser middleware for specific routes
const parseJson = (req, res, next) => {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    if (body) {
      try {
        req.body = JSON.parse(body);
      } catch (error) {
        req.body = {};
      }
    } else {
      req.body = {};
    }
    next();
  });
};

// Event card rendering endpoint
app.post('/api/render-event-card', parseJson, async (req, res) => {
  try {
    const { event } = req.body;
    
    if (!event) {
      return res.status(400).json({ error: 'Event data is required' });
    }
    
    // Render the event card component
    return res.render('event-card/card.liquid', { 
      event,
      isAjax: true // Add flag to indicate this is an AJAX response
    });
  } catch (error) {
    console.error("Error rendering event card:", error);
    return res.status(500).render('error.liquid', { 
      error: "Failed to render event card",
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

// Event detail page route - always a full page load
app.get('/event/:id', async (req, res) => {
  try {
    const eventId = req.params.id;
    
    if (!eventId) {
      return res.redirect('/');
    }
    
    console.log(`Fetching details for event: ${eventId}`);
    
    // Make sure API key exists
    const apiKey = process.env.TICKETMASTER_API_KEY;
    if (!apiKey) {
      console.error('Ticketmaster API key is not set');
      return res.status(500).send('Server configuration error');
    }
    
    // Fetch event details
    const url = `https://app.ticketmaster.com/discovery/v2/events/${eventId}?apikey=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).render('error/error.liquid', {
          error: "Event Not Found",
          details: "The requested event could not be found."
        });
      }
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const event = await response.json();
    console.log(`Received event data for: ${event.name}`);
    
    return res.render('event-detail/event-detail.liquid', {
      title: `${event.name} - Event Details`,
      event: event,
      isAjax: false // This is always a full page load
    });
    
  } catch (error) {
    console.error('Error handling event detail page:', error);
    return res.status(500).render('error/error.liquid', { 
      error: "Error loading event details",
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

// API endpoint for rendering map popups - UPDATED to use res.render instead of res.send
app.post('/api/render-map-popup', parseJson, async (req, res) => {
  try {
    const { event } = req.body;
    
    if (!event) {
      return res.status(400).json({ error: 'Event data is required' });
    }
    
    // Extract relevant data for the popup
    const eventTitle = event.name || 'Event';
    
    // Calculate distance if provided
    let distance = 'Unknown distance';
    if (req.body.distance) {
      distance = req.body.distance;
    }
    
    // Extract genre and subgenre from classifications if available
    let genre = 'Music';
    let subgenre = '';
    
    if (event.classifications && event.classifications.length > 0) {
      const classification = event.classifications[0];
      if (classification.segment) {
        genre = classification.segment.name || 'Music';
      }
      if (classification.genre) {
        genre = classification.genre.name || genre;
      }
      if (classification.subGenre) {
        subgenre = classification.subGenre.name || '';
      }
    }
    
    // Get venue name
    let venue = 'Unknown Venue';
    if (event._embedded && event._embedded.venues && event._embedded.venues.length > 0) {
      venue = event._embedded.venues[0].name;
    }
    
    // Get image URL
    let imageUrl = '';
    if (event.images && event.images.length > 0) {
      // Find a good size image
      const image = event.images.find(img => img.width > 500) || event.images[0];
      imageUrl = image.url;
    }
    
    // Render the map popup using the template - CHANGED from res.send to res.render
    return res.render('map-popup/map-popup.liquid', {
      event_title: eventTitle,
      distance: distance,
      genre: genre,
      subgenre: subgenre,
      venue: venue,
      image_url: imageUrl,
      event_id: event.id,
      isAjax: true
    });
  } catch (error) {
    console.error("Error rendering map popup:", error);
    return res.status(500).render('error/error.liquid', { 
      error: "Failed to render map popup",
      details: process.env.NODE_ENV === 'development' ? error.message : null,
      isAjax: true
    });
  }
});

// Modified /api/events endpoint - Using consistent rendering approach
app.post('/api/events', async (req, res) => {
  try {
    const { latitude, longitude, radius, unit } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    // Default radius is 40 km if not provided
    let searchRadius = radius || 40;
    let searchUnit = unit || 'km';
    
    // If unit is kilometers (default) but Ticketmaster expects miles, convert
    if (searchUnit.toLowerCase() === 'km') {
      const kmToMiles = 0.621371;
      searchRadius = Math.round(searchRadius * kmToMiles);
      searchUnit = 'miles';
    }
    
    const events = await fetchEvents(latitude, longitude, searchRadius);
    
    // For each event, we store popupId instead of rendered HTML
    if (req.headers['x-include-popups'] === 'true') {
      for (let event of events) {
        event.popupId = event.id;
      }
    }
    
    // If it's an AJAX request and not a popup-specific request, render the events overview block
    if (req.headers['x-requested-with'] === 'XMLHttpRequest' && req.headers['x-include-popups'] !== 'true') {
      return res.render('events-overview-block/events-overview-block.liquid', {
        events,
        isAjax: true
      });
    }
    
    // Otherwise return JSON response
    return res.json({ events });
  } catch (error) {
    console.error("Error fetching events:", error);
    return res.status(500).json({ error: "Failed to fetch events" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));