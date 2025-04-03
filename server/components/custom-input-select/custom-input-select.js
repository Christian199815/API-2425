const searchInput = document.querySelector('[data-location-search-input]');
const hiddenInput = document.querySelector('[data-location-value]');
const dropdown = document.querySelector('[data-custom-select-dropdown]');
const optionsList = document.querySelector('[data-location-options]');

let debounceTimer;
let originalOptions = Array.from(optionsList.children);


// Handle input changes (filter and fetch)
searchInput.addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  
  // Clear the hidden value when input changes
  hiddenInput.value = '';
  
  // Show dropdown
  dropdown.style.display = 'block';
  
  // Filter existing options first
  filterOptions(searchTerm);
  
  // Clear previous timer
  clearTimeout(debounceTimer);
  
  // Fetch new results after typing stops
  debounceTimer = setTimeout(() => {
    if (searchTerm.length >= 2) {
      fetchLocations(searchTerm);
    }
  }, 500);
});

// Filter existing options
function filterOptions(searchTerm) {
  if (!searchTerm) {
    // Restore original options
    optionsList.innerHTML = '';
    originalOptions.forEach(option => {
      optionsList.appendChild(option.cloneNode(true));
    });
    return;
  }
  
  // Filter options
  const filteredOptions = originalOptions.filter(option => 
    option.textContent.toLowerCase().includes(searchTerm)
  );
  
  // Update dropdown
  optionsList.innerHTML = '';
  filteredOptions.forEach(option => {
    optionsList.appendChild(option.cloneNode(true));
  });
  
  // Add event listeners to new options
  addOptionListeners();
}

// Fetch locations from API
async function fetchLocations(searchTerm) {
  try {
    const response = await fetch(`/api/locations?q=${encodeURIComponent(searchTerm)}`);
    const data = await response.json();
    
    if (data.length > 0) {
      // Clear and rebuild options
      optionsList.innerHTML = '';
      originalOptions = [];
      
      // Add all locations
      data.forEach(place => {
        const li = document.createElement('li');
        li.textContent = place.display_name;
        li.dataset.value = place.place_id;
        li.dataset.lat = place.lat;
        li.dataset.lon = place.lon;
        
        optionsList.appendChild(li);
        originalOptions.push(li);
      });
      
      // Add event listeners to new options
      addOptionListeners();
    }
  } catch (error) {
    console.error("Error fetching locations:", error);
  }
}

// Add click listeners to all options
function addOptionListeners() {
  const options = optionsList.querySelectorAll('li');
  options.forEach(option => {
    option.addEventListener('click', selectOption);
  });
}

// Handle option selection
function selectOption(e) {
  const selectedOption = e.target;
  
  // Update input field with display text
  searchInput.value = selectedOption.textContent;
  
  // Update hidden input with value
  hiddenInput.value = selectedOption.dataset.value;
  
  // Hide dropdown
  dropdown.setAttribute("data-item-close", "");
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.custom-select-container')) {
    dropdown.style.display = 'none';
  }
});

// Initialize option listeners
addOptionListeners();