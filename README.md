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
- **Location Verification** - Ensures students are within campus boundaries
- **Session Validation** - Validates session codes for security
- **Attendance History** - View personal attendance records

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Authentication, Firestore Database)
- **Libraries**:
  - Firebase Web SDK (v9.23.0)
  - SheetJS (for Excel export)
  - jsPDF (for PDF generation)

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Edge, or Safari)
- Firebase project with Firestore and Authentication enabled

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

3. Update the Firebase configuration in `script.js` with your project's details.

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
- **Location Verification** - Ensures attendance is marked from within campus
- **Session Expiry** - Automatic session expiration after a set period
- **Secure Authentication** - Firebase Authentication with email/password

## Browser Support

The system is compatible with all modern web browsers including:
- Google Chrome (recommended)
- Mozilla Firefox
- Microsoft Edge
- Safari

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Guru Nanak Dev University for the opportunity to develop this system
- Firebase for providing a robust backend infrastructure
- Open-source community for valuable libraries and resources
