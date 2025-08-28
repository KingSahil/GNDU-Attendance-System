// Simple build script for Vercel deployment
// This script injects environment variables into the HTML

const fs = require('fs');
const path = require('path');

// Read .env file
function loadEnvFile() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        console.log('No .env file found, using defaults');
        return {};
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            env[key.trim()] = value.trim();
        }
    });
    
    return env;
}

// Inject environment variables into HTML
function injectEnvVars() {
    const env = loadEnvFile();
    
    // Create environment injection script
    const envScript = `
<script>
    window.process = window.process || {};
    window.process.env = ${JSON.stringify(env)};
</script>`;
    
    // Read index.html
    const htmlPath = path.join(__dirname, 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // Insert env script before config.js
    html = html.replace(
        '<script src="config.js"></script>',
        envScript + '\n    <script src="config.js"></script>'
    );
    
    // Write modified HTML
    fs.writeFileSync(path.join(__dirname, 'index.html'), html);
    console.log('Environment variables injected successfully');
}

// Run build
injectEnvVars();