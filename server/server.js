import 'dotenv/config';
import { App } from '@tinyhttp/app';
import { logger } from '@tinyhttp/logger';
import { Liquid } from 'liquidjs';
import sirv from 'sirv';

// #old data set
const data = {
  'beemdkroon': {
    id: 'beemdkroon',
    name: 'Beemdkroon',
    image: {
      src: 'https://i.pinimg.com/736x/09/0a/9c/090a9c238e1c290bb580a4ebe265134d.jpg',
      alt: 'Beemdkroon',
      width: 695,
      height: 1080,
    }
  },
  'wilde-peen': {
    id: 'wilde-peen',
    name: 'Wilde Peen',
    image: {
      src: 'https://mens-en-gezondheid.infonu.nl/artikel-fotos/tom008/4251914036.jpg',
      alt: 'Wilde Peen',
      width: 418,
      height: 600,
    }
  }
};

// Function to fetch locations
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

const engine = new Liquid({
  extname: '.liquid',
});

const app = new App();

app
  .use(logger())
  .use('/', sirv('dist'));

// Initial page load
app.get('/', async (req, res) => {
  try {
    // Default location data for first load
    const locations = await fetchLocations();
    
    return res.send(renderTemplate('server/views/index.liquid', { 
      title: 'Home', 
      items: Object.values(data),
      locations
    }));
  } catch (error) {
    console.error("Error rendering home page:", error);
    return res.status(500).send("Internal Server Error");
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

app.get('/plant/:id/', async (req, res) => {
  const id = req.params.id;
  const item = data[id];
  if (!item) {
    return res.status(404).send('Not found');
  }
  return res.send(renderTemplate('server/views/detail.liquid', { title: `Detail page for ${id}`, item }));
});

const renderTemplate = (template, data) => {
  const templateData = {
    NODE_ENV: process.env.NODE_ENV || 'production',
    ...data
  };

  return engine.renderFileSync(template, templateData);
};

app.listen(3000, () => console.log('Server available on http://localhost:3000'));