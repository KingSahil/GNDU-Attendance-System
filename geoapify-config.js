// Geoapify Configuration
// Replace 'YOUR_GEOAPIFY_API_KEY' with your actual Geoapify API key
// Get your free API key from: https://www.geoapify.com/

window.geoapifyConfig = {
  apiKey: '983f3961c1074baaa48de3ba26639012', // Replace with your actual API key
  baseUrl: 'https://api.geoapify.com/v1',
  
  // Optional: Configure rate limiting
  rateLimiting: {
    requestsPerSecond: 5,
    maxConcurrentRequests: 3
  },
  
  // Optional: Configure timeout
  timeout: 10000, // 10 seconds
  
  // Optional: Enable/disable features
  features: {
    ipGeolocation: true,
    reverseGeocoding: true,
    addressValidation: true
  }
};