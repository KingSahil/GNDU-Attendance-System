# GNDU Attendance System

A modern, web-based attendance management system designed for Guru Nanak Dev University (GNDU), specifically for the Department of Computer Engineering & Technology. This system provides a seamless way for teachers to manage student attendance and for students to mark their attendance using a secure, location-based check-in system.

## Features

### For Teachers:
- **Secure Authentication** - Firebase-based authentication system
- **Session Management** - Create and manage attendance sessions
- **Real-time Updates** - View attendance updates in real-time
- **Student Management** - Track and manage student attendance records
- **Export Capabilities** - Export attendance data to Excel and PDF formats
- **Print Functionality** - Print attendance sheets directly from the system

### For Students:
- **Easy Check-in** - Simple interface for marking attendance
- **Enhanced Location Verification** - Multi-layer location validation using Geoapify
- **Session Validation** - Validates session codes for security
- **Attendance History** - View personal attendance records

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Authentication, Firestore Database)
- **Location Services**: Geoapify API for enhanced location verification
- **Libraries**:
  - Firebase Web SDK (v9.23.0)
  - Geoapify API for location services
  - ExcelJS (for Excel export)
  - html2pdf.js (for PDF generation)

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Edge, or Safari)
- Firebase project with Firestore and Authentication enabled
- Geoapify API key (free tier available)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/KingSahil/GNDU-Attendance-System.git
   ```

2. Configure Firebase:
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Email/Password authentication
   - Set up Firestore Database in test mode
   - Add your web app to the Firebase project and get the configuration object
   - Update the Firebase configuration in `script.js` with your project's details

3. Configure Geoapify (Enhanced Location Services):
   - Get a free API key from [Geoapify.com](https://www.geoapify.com/)
   - Update `geoapify-config.js` with your API key
   - See `GEOAPIFY_SETUP.md` for detailed setup instructions

4. Deploy the application to a web server or open `index.html` directly in a browser.

## Usage

### Teacher Login
1. Open the application in a web browser
2. Log in using your teacher credentials
3. Create a new attendance session or load an existing one
4. Share the session link with students
5. Monitor attendance in real-time
6. Export or print attendance records as needed

### Student Check-in
1. Click on the session link provided by your teacher
2. Enter your details (Roll Number, Name)
3. Allow location access when prompted
4. Submit your attendance

## Security Features

- **Content Security Policy (CSP)** - Protects against XSS attacks
- **Enhanced Location Verification** - Multi-layer location validation using Geoapify
- **Anti-Spoofing Protection** - Cross-verification with IP geolocation
- **Address Validation** - Reverse geocoding to verify actual addresses
- **Geographic Boundaries** - Validates location is within Punjab/university area
- **Session Expiry** - Automatic session expiration after a set period
- **Secure Authentication** - Firebase Authentication with email/password
- **Audit Trail** - Detailed location logs for security review

## Location Services

This system uses **Geoapify** for enhanced location verification instead of basic JavaScript geolocation:

### Benefits:
- **Professional-grade accuracy** - More reliable than browser geolocation
- **Anti-spoofing detection** - Cross-verification with IP location
- **Address validation** - Converts coordinates to human-readable addresses
- **Geographic boundaries** - Validates location is within Punjab/university area
- **Audit trail** - Detailed location logs for security review

### Testing:
Use these browser console commands to test the integration:
```javascript
// Test full Geoapify integration
testGeoapifyIntegration();

// Show detailed location information
showCurrentLocationDetails();

// View location attempt history
getLocationHistory();
```

## Browser Support

The system is compatible with all modern web browsers including:
- Google Chrome (recommended)
- Mozilla Firefox
- Microsoft Edge
- Safari

## File Structure

```
├── index.html              # Main application file
├── script.js              # Core application logic
├── student.js             # Student data
├── styles.css             # Application styles
├── geoapify-config.js     # Geoapify configuration
├── GEOAPIFY_SETUP.md      # Geoapify setup guide
├── README.md              # This file
└── files/                 # Static files (PDFs, images)
    ├── Academic Calender 2025-26.pdf
    ├── Syllabus.pdf
    ├── Time Table.png
    └── favicon.png
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Guru Nanak Dev University for the opportunity to develop this system
- Firebase for providing a robust backend infrastructure
- Geoapify for enhanced location services
- Open-source community for valuable libraries and resources