// Location API Performance Test Suite
// This file demonstrates the improvements made to handle high concurrent load

class LocationPerformanceTest {
  constructor() {
    this.testResults = [];
    this.isRunning = false;
  }

  // Simulate multiple concurrent location requests
  async simulateHighLoad(numRequests = 50) {
    if (this.isRunning) {
      console.log('Test already running...');
      return;
    }

    this.isRunning = true;
    console.log(`🚀 Starting high-load simulation with ${numRequests} concurrent requests...`);
    
    const startTime = Date.now();
    const promises = [];
    
    // Create multiple concurrent location verification requests
    for (let i = 0; i < numRequests; i++) {
      const promise = this.simulateLocationRequest(i);
      promises.push(promise);
      
      // Stagger requests slightly to simulate real-world conditions
      if (i % 10 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    try {
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      
      this.analyzeResults(results, startTime, endTime, numRequests);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async simulateLocationRequest(requestId) {
    const startTime = Date.now();
    
    try {
      // Simulate location coordinates near GNDU campus
      const baseLatitude = 31.634801;
      const baseLongitude = 74.824416;
      
      // Add small random variations to simulate different student locations
      const latitude = baseLatitude + (Math.random() - 0.5) * 0.002; // ~200m variation
      const longitude = baseLongitude + (Math.random() - 0.5) * 0.002;
      const accuracy = 10 + Math.random() * 40; // 10-50m accuracy
      
      // Use the enhanced LocationManager if available
      if (typeof locationManager !== 'undefined') {
        const result = await locationManager.verifyLocation({
          latitude,
          longitude,
          accuracy,
          priority: requestId < 10 ? 'high' : 'normal' // First 10 requests get high priority
        });
        
        return {
          requestId,
          success: true,
          responseTime: Date.now() - startTime,
          method: result.method,
          cached: result.cached,
          distance: result.distance,
          locationSuccess: result.success
        };
      } else {
        // Fallback to basic simulation
        const responseTime = 1000 + Math.random() * 2000; // 1-3 second response
        await new Promise(resolve => setTimeout(resolve, responseTime));
        
        return {
          requestId,
          success: true,
          responseTime: Date.now() - startTime,
          method: 'simulated',
          cached: false,
          distance: Math.random() * 100,
          locationSuccess: Math.random() > 0.1 // 90% success rate
        };
      }
    } catch (error) {
      return {
        requestId,
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  analyzeResults(results, startTime, endTime, numRequests) {
    const totalTime = endTime - startTime;
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'rejected' || !r.value.success);
    
    const responseTimes = successful.map(r => r.value.responseTime);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);
    
    // Analyze methods used
    const methodCounts = {};
    const cachedCount = successful.filter(r => r.value.cached).length;
    
    successful.forEach(r => {
      const method = r.value.method || 'unknown';
      methodCounts[method] = (methodCounts[method] || 0) + 1;
    });
    
    // Analyze location verification success
    const locationSuccessful = successful.filter(r => r.value.locationSuccess).length;
    
    console.log('\n📊 Performance Test Results');
    console.log('============================');
    console.log(`Total Requests: ${numRequests}`);
    console.log(`Total Time: ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
    console.log(`Successful Requests: ${successful.length} (${(successful.length/numRequests*100).toFixed(1)}%)`);
    console.log(`Failed Requests: ${failed.length} (${(failed.length/numRequests*100).toFixed(1)}%)`);
    console.log(`Location Verifications Passed: ${locationSuccessful} (${(locationSuccessful/numRequests*100).toFixed(1)}%)`);
    console.log('');
    console.log('Response Time Statistics:');
    console.log(`  Average: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`  Minimum: ${minResponseTime}ms`);
    console.log(`  Maximum: ${maxResponseTime}ms`);
    console.log('');
    console.log('Method Usage:');
    Object.entries(methodCounts).forEach(([method, count]) => {
      console.log(`  ${method}: ${count} requests (${(count/successful.length*100).toFixed(1)}%)`);
    });
    console.log(`  Cached Results: ${cachedCount} (${(cachedCount/successful.length*100).toFixed(1)}%)`);
    
    // Performance assessment
    console.log('\n🎯 Performance Assessment:');
    if (avgResponseTime < 2000) {
      console.log('✅ Excellent: Average response time under 2 seconds');
    } else if (avgResponseTime < 5000) {
      console.log('⚠️ Good: Average response time under 5 seconds');
    } else {
      console.log('❌ Needs Improvement: Average response time over 5 seconds');
    }
    
    if (successful.length / numRequests > 0.95) {
      console.log('✅ Excellent: Over 95% success rate');
    } else if (successful.length / numRequests > 0.90) {
      console.log('⚠️ Good: Over 90% success rate');
    } else {
      console.log('❌ Needs Improvement: Below 90% success rate');
    }
    
    if (cachedCount / successful.length > 0.3) {
      console.log('✅ Excellent: High cache utilization (>30%)');
    } else if (cachedCount / successful.length > 0.1) {
      console.log('⚠️ Good: Moderate cache utilization (>10%)');
    } else {
      console.log('💡 Info: Low cache utilization - consider longer cache TTL');
    }
    
    // Show current system metrics if available
    if (typeof locationManager !== 'undefined') {
      console.log('\n📈 Current System Metrics:');
      const metrics = locationManager.getPerformanceMetrics();
      console.log(`  Total System Requests: ${metrics.totalRequests}`);
      console.log(`  Overall Success Rate: ${metrics.successRate}%`);
      console.log(`  Cache Hit Rate: ${metrics.cacheHitRate}%`);
      console.log(`  System Uptime: ${Math.round(metrics.uptime / 1000)}s`);
    }
  }

  // Quick test with fewer requests
  async quickTest() {
    console.log('🔬 Running quick performance test...');
    await this.simulateHighLoad(10);
  }

  // Stress test with many requests
  async stressTest() {
    console.log('💪 Running stress test...');
    await this.simulateHighLoad(100);
  }

  // Test cache effectiveness
  async cacheTest() {
    console.log('🗄️ Testing cache effectiveness...');
    
    // Make same location request multiple times
    const testLocation = {
      latitude: 31.634801,
      longitude: 74.824416,
      accuracy: 15
    };
    
    console.log('Making 5 identical location requests to test caching...');
    
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      
      if (typeof locationManager !== 'undefined') {
        const result = await locationManager.verifyLocation(testLocation);
        const responseTime = Date.now() - startTime;
        
        console.log(`Request ${i + 1}: ${responseTime}ms, Method: ${result.method}, Cached: ${result.cached}`);
      } else {
        console.log(`Request ${i + 1}: LocationManager not available`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

// Create global test instance
window.locationTest = new LocationPerformanceTest();

// Add convenience functions to window
window.testLocationPerformance = () => locationTest.simulateHighLoad(50);
window.quickLocationTest = () => locationTest.quickTest();
window.stressLocationTest = () => locationTest.stressTest();
window.cacheLocationTest = () => locationTest.cacheTest();

console.log('🧪 Location Performance Test Suite loaded!');
console.log('Available commands:');
console.log('  testLocationPerformance() - Test with 50 concurrent requests');
console.log('  quickLocationTest() - Quick test with 10 requests');
console.log('  stressLocationTest() - Stress test with 100 requests');
console.log('  cacheLocationTest() - Test cache effectiveness');
console.log('  showLocationPerformance() - Show current system metrics');