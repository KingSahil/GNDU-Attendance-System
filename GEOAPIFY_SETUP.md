# Geoapify Integration Setup Guide

This guide will help you set up Geoapify for enhanced location verification in your attendance system.

## Why Geoapify?

Geoapify provides more reliable location services compared to JavaScript's built-in geolocation:

- **Enhanced Security**: Cross-verification with IP geolocation
- **Address Validation**: Reverse geocoding to verify actual addresses
- **Better Accuracy**: Professional-grade location services
- **Anti-Spoofing**: Multiple validation layers to prevent fake locations

## Setup Steps

### 1. Get Your Geoapify API Key

1. Visit [Geoapify.com](https://www.geoapify.com/)
2. Sign up for a free account
3. Go to your dashboard and create a new project
4. Copy your API key

### 2. Configure the API Key

1. Open `geoapify-config.js` in your project
2. Replace `'YOUR_GEOAPIFY_API_KEY'` with your actual API key:

```javascript
window.geoapifyConfig = {
  apiKey: 'your-actual-api-key-here', // Replace this
  baseUrl: 'https://api.geoapify.com/v1',
  // ... other settings
};
```

### 3. Test the Integration

1. Open your attendance system
2. Try to mark attendance as a student
3. Check the browser console for location verification messages
4. You should see enhanced location information including address details

## Features Enabled

### IP Geolocation Cross-Verification
- Compares GPS location with IP-based location
- Warns if there's a large discrepancy (potential spoofing)

### Reverse Geocoding
- Converts coordinates to human-readable addresses
- Validates if the location is in Punjab, India
- Checks if the location is near the university

### Enhanced Security
- Multiple validation layers
- Detailed logging for audit purposes
- Configurable timeout and rate limiting

## Configuration Options

You can customize the behavior in `geoapify-config.js`:

```javascript
window.geoapifyConfig = {
  apiKey: 'your-api-key',
  baseUrl: 'https://api.geoapify.com/v1',
  
  // Rate limiting
  rateLimiting: {
    requestsPerSecond: 5,
    maxConcurrentRequests: 3
  },
  
  // Timeout for API requests
  timeout: 10000, // 10 seconds
  
  // Enable/disable features
  features: {
    ipGeolocation: true,        // Cross-verify with IP location
    reverseGeocoding: true,     // Get address from coordinates
    addressValidation: true     // Validate address details
  }
};
```

## Troubleshooting

### API Key Issues
- Make sure your API key is correct and active
- Check your Geoapify dashboard for usage limits
- Ensure your domain is allowed (if you've set domain restrictions)

### Network Issues
- Check if `api.geoapify.com` is accessible from your network
- Verify the Content Security Policy allows Geoapify connections

### Fallback Behavior
- If Geoapify fails, the system falls back to basic GPS validation
- Check browser console for error messages
- The system will still work without Geoapify, but with reduced security

## Free Tier Limits

Geoapify's free tier includes:
- 3,000 requests per day
- All location services
- No credit card required

This should be sufficient for most classroom attendance scenarios.

## Security Benefits

With Geoapify integration, your system now has:

1. **Multi-layer Verification**: GPS + IP location + Address validation
2. **Spoofing Detection**: Alerts when GPS and IP locations don't match
3. **Geographic Validation**: Ensures users are actually in Punjab/near university
4. **Audit Trail**: Detailed location logs for security review
5. **Professional Accuracy**: Enterprise-grade location services

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your API key in the Geoapify dashboard
3. Test with a simple location request to ensure the API is working
4. Contact Geoapify support for API-related issues

The system is designed to be resilient - if Geoapify is unavailable, it will fall back to the original GPS-only verification.