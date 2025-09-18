// Test Google Maps API Integration
// This script tests the Google Maps API loading and integration with the enhanced location system

async function testGoogleMapsIntegration() {
  console.log('🧪 Testing Google Maps API Integration...');
  
  try {
    // Test 1: Check if Google Maps API can be loaded
    console.log('Test 1: Loading Google Maps API...');
    await loadGoogleMapsAPI();
    
    if (window.google && window.google.maps && window.google.maps.geometry) {
      console.log('✅ Google Maps API loaded successfully');
    } else {
      console.log('❌ Google Maps API failed to load properly');
      return;
    }
    
    // Test 2: Test distance calculation with Google Maps
    console.log('Test 2: Testing Google Maps distance calculation...');
    const testCoords = {
      latitude: 31.634801,  // GNDU coordinates
      longitude: 74.824416,
      accuracy: 15
    };
    
    try {
      const result = await locationManager.fallbackEngine.verifyWithGoogleMaps(testCoords);
      console.log('✅ Google Maps verification successful:', result);
    } catch (error) {
      console.log('❌ Google Maps verification failed:', error.message);
    }
    
    // Test 3: Test enhanced location manager with Google Maps
    console.log('Test 3: Testing LocationManager with Google Maps...');
    try {
      const result = await locationManager.verifyLocation(testCoords);
      console.log('✅ LocationManager verification successful:', result);
      console.log(`   Method used: ${result.method}`);
      console.log(`   Distance: ${result.distance}m`);
      console.log(`   Success: ${result.success}`);
      console.log(`   Cached: ${result.cached}`);
    } catch (error) {
      console.log('❌ LocationManager verification failed:', error.message);
    }
    
    // Test 4: Performance comparison
    console.log('Test 4: Performance comparison (Google vs Native)...');
    
    const testLocations = [
      { lat: 31.634801, lng: 74.824416, name: 'GNDU Center' },
      { lat: 31.634901, lng: 74.824516, name: 'Near GNDU (100m)' },
      { lat: 31.635801, lng: 74.825416, name: 'Edge of campus (200m)' },
      { lat: 31.640801, lng: 74.830416, name: 'Outside campus (1km)' }
    ];
    
    for (const location of testLocations) {
      console.log(`\nTesting location: ${location.name}`);
      
      const coords = {
        latitude: location.lat,
        longitude: location.lng,
        accuracy: 10
      };
      
      // Test Google Maps method
      const googleStart = Date.now();
      try {
        const googleResult = await locationManager.fallbackEngine.verifyWithGoogleMaps(coords);
        const googleTime = Date.now() - googleStart;
        console.log(`  Google Maps: ${googleTime}ms, ${googleResult.distance}m, ${googleResult.success ? 'ALLOWED' : 'DENIED'}`);
      } catch (error) {
        console.log(`  Google Maps: FAILED (${error.message})`);
      }
      
      // Test Native method
      const nativeStart = Date.now();
      try {
        const nativeResult = await locationManager.fallbackEngine.verifyWithNativeGeolocation(coords);
        const nativeTime = Date.now() - nativeStart;
        console.log(`  Native Calc: ${nativeTime}ms, ${nativeResult.distance}m, ${nativeResult.success ? 'ALLOWED' : 'DENIED'}`);
      } catch (error) {
        console.log(`  Native Calc: FAILED (${error.message})`);
      }
    }
    
    console.log('\n🎉 Google Maps integration test completed!');
    
  } catch (error) {
    console.error('❌ Google Maps integration test failed:', error);
  }
}

// Test cache effectiveness with Google Maps
async function testGoogleMapsCaching() {
  console.log('🗄️ Testing Google Maps caching effectiveness...');
  
  const testCoords = {
    latitude: 31.634801,
    longitude: 74.824416,
    accuracy: 15
  };
  
  console.log('Making 5 identical requests to test caching...');
  
  for (let i = 0; i < 5; i++) {
    const startTime = Date.now();
    
    try {
      const result = await locationManager.verifyLocation(testCoords);
      const responseTime = Date.now() - startTime;
      
      console.log(`Request ${i + 1}: ${responseTime}ms, Method: ${result.method}, Cached: ${result.cached}, Distance: ${result.distance}m`);
    } catch (error) {
      console.log(`Request ${i + 1}: FAILED (${error.message})`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

// Test API key load balancing
async function testAPIKeyLoadBalancing() {
  console.log('⚖️ Testing API key load balancing...');
  
  const loadBalancer = locationManager.loadBalancer;
  
  console.log('Current API key statistics:');
  const stats = loadBalancer.getKeyStats();
  console.table(stats);
  
  // Make multiple requests to test load distribution
  console.log('Making 10 requests to test load distribution...');
  
  const testCoords = {
    latitude: 31.634801,
    longitude: 74.824416,
    accuracy: 15
  };
  
  for (let i = 0; i < 10; i++) {
    try {
      await locationManager.fallbackEngine.verifyWithGoogleMaps(testCoords);
      console.log(`Request ${i + 1}: Success`);
    } catch (error) {
      console.log(`Request ${i + 1}: Failed (${error.message})`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('Updated API key statistics:');
  const updatedStats = loadBalancer.getKeyStats();
  console.table(updatedStats);
}

// Add test functions to window for easy access
window.testGoogleMapsIntegration = testGoogleMapsIntegration;
window.testGoogleMapsCaching = testGoogleMapsCaching;
window.testAPIKeyLoadBalancing = testAPIKeyLoadBalancing;

console.log('🧪 Google Maps Integration Test Suite loaded!');
console.log('Available commands:');
console.log('  testGoogleMapsIntegration() - Test Google Maps API integration');
console.log('  testGoogleMapsCaching() - Test caching with Google Maps');
console.log('  testAPIKeyLoadBalancing() - Test API key load balancing');