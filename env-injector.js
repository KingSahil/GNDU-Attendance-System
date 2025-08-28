// Environment variable injector for static sites
// This script runs during build time to inject environment variables

(function() {
    // This will be replaced during build time with actual env vars
    const envVars = {
        REACT_APP_FIREBASE_API_KEY: '%REACT_APP_FIREBASE_API_KEY%',
        REACT_APP_FIREBASE_AUTH_DOMAIN: '%REACT_APP_FIREBASE_AUTH_DOMAIN%',
        REACT_APP_FIREBASE_PROJECT_ID: '%REACT_APP_FIREBASE_PROJECT_ID%',
        REACT_APP_FIREBASE_STORAGE_BUCKET: '%REACT_APP_FIREBASE_STORAGE_BUCKET%',
        REACT_APP_FIREBASE_MESSAGING_SENDER_ID: '%REACT_APP_FIREBASE_MESSAGING_SENDER_ID%',
        REACT_APP_FIREBASE_APP_ID: '%REACT_APP_FIREBASE_APP_ID%',
        REACT_APP_FIREBASE_MEASUREMENT_ID: '%REACT_APP_FIREBASE_MEASUREMENT_ID%'
    };

    // Replace placeholders with actual values or defaults
    const firebaseConfig = {
        apiKey: envVars.REACT_APP_FIREBASE_API_KEY !== '%REACT_APP_FIREBASE_API_KEY%' ? 
               envVars.REACT_APP_FIREBASE_API_KEY : "AIzaSyCcn9HfE4RGoyNzR6pVJ9Lihg2jRXrRup8",
        authDomain: envVars.REACT_APP_FIREBASE_AUTH_DOMAIN !== '%REACT_APP_FIREBASE_AUTH_DOMAIN%' ? 
                   envVars.REACT_APP_FIREBASE_AUTH_DOMAIN : "gndu-attendance-system.firebaseapp.com",
        projectId: envVars.REACT_APP_FIREBASE_PROJECT_ID !== '%REACT_APP_FIREBASE_PROJECT_ID%' ? 
                  envVars.REACT_APP_FIREBASE_PROJECT_ID : "gndu-attendance-system",
        storageBucket: envVars.REACT_APP_FIREBASE_STORAGE_BUCKET !== '%REACT_APP_FIREBASE_STORAGE_BUCKET%' ? 
                     envVars.REACT_APP_FIREBASE_STORAGE_BUCKET : "gndu-attendance-system.firebasestorage.app",
        messagingSenderId: envVars.REACT_APP_FIREBASE_MESSAGING_SENDER_ID !== '%REACT_APP_FIREBASE_MESSAGING_SENDER_ID%' ? 
                           envVars.REACT_APP_FIREBASE_MESSAGING_SENDER_ID : "874240831454",
        appId: envVars.REACT_APP_FIREBASE_APP_ID !== '%REACT_APP_FIREBASE_APP_ID%' ? 
              envVars.REACT_APP_FIREBASE_APP_ID : "1:874240831454:web:aaaa1909d87d9a77e0f74f",
        measurementId: envVars.REACT_APP_FIREBASE_MEASUREMENT_ID !== '%REACT_APP_FIREBASE_MEASUREMENT_ID%' ? 
                     envVars.REACT_APP_FIREBASE_MEASUREMENT_ID : "G-7TNPBZ3ZZN"
    };

    // Make configuration available globally
    window.firebaseConfig = firebaseConfig;
    console.log('Firebase configuration loaded');
})();