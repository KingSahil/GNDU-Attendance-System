// Environment configuration loader for Vercel
// This file loads environment variables from .env and makes them available to the browser

// Environment configuration loader for Vercel
// This file loads environment variables from .env and makes them available to the browser

// Parse .env file content (for Vercel deployment)
function loadEnvConfig() {
    // Check if we're in a Node.js environment (build time)
    if (typeof process !== 'undefined' && process.env) {
        // Use process.env variables if available (Vercel build time)
        return {
            apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
            authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
            storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.REACT_APP_FIREBASE_APP_ID,
            measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
        };
    }

    // For browser environment, check if we have injected environment variables
    // This is for local development when .env is not processed
    const defaultConfig = {
        apiKey: "AIzaSyCcn9HfE4RGoyNzR6pVJ9Lihg2jRXrRup8",
        authDomain: "gndu-attendance-system.firebaseapp.com",
        projectId: "gndu-attendance-system",
        storageBucket: "gndu-attendance-system.firebasestorage.app",
        messagingSenderId: "874240831454",
        appId: "1:874240831454:web:aaaa1909d87d9a77e0f74f",
        measurementId: "G-7TNPBZ3ZZN"
    };

    // For browser environment, use injected variables or defaults
    const config = {};
    const envVars = [
        'REACT_APP_FIREBASE_API_KEY',
        'REACT_APP_FIREBASE_AUTH_DOMAIN',
        'REACT_APP_FIREBASE_PROJECT_ID',
        'REACT_APP_FIREBASE_STORAGE_BUCKET',
        'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
        'REACT_APP_FIREBASE_APP_ID',
        'REACT_APP_FIREBASE_MEASUREMENT_ID'
    ];

    envVars.forEach(key => {
        const value = window[key] || defaultConfig[key.replace('REACT_APP_FIREBASE_', '').toLowerCase()];
        if (value) {
            config[key.replace('REACT_APP_FIREBASE_', '').toLowerCase()] = value;
        }
    });

    return config;
}

// Make config available globally
window.firebaseConfig = loadEnvConfig();