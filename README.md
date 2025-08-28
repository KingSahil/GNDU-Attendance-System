# GNDU Attendance System

A web-based attendance management system for Guru Nanak Dev University, designed specifically for the Department of Computer Engineering & Technology.

## Features

- **Teacher Dashboard**: Create attendance sessions with date, subject, and secret code
- **Student Check-in**: Students can mark attendance using a unique session link
- **Real-time Updates**: Live attendance tracking and statistics
- **Export Options**: Download attendance data as Excel files
- **Mobile Responsive**: Works seamlessly on desktop and mobile devices
- **WhatsApp Integration**: Share attendance links via WhatsApp

## Environment Configuration

This project uses `.env` files for environment variable management, optimized for Vercel deployment.

### Setup Instructions

1. **Copy Environment Variables**
   ```bash
   cp .env.example .env
   ```

2. **Update Firebase Configuration**
   Open `.env` and replace the placeholder values with your actual Firebase project credentials:
   ```
   REACT_APP_FIREBASE_API_KEY=your-actual-api-key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your-project-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   REACT_APP_FIREBASE_APP_ID=your-app-id
   REACT_APP_FIREBASE_MEASUREMENT_ID=your-measurement-id
   ```

### Getting Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Click on **Project Settings** (gear icon)
4. Scroll down to **Your apps** section
5. Click on **Web app** icon (</>) to register your app
6. Copy the configuration object
7. Map the values to your `.env` file as shown above

## Vercel Deployment

### Quick Deploy

1. **Install Vercel CLI** (optional):
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

### Manual Setup

1. **Fork/Clone this repository**
2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will automatically detect the project type

3. **Set Environment Variables**:
   In Vercel dashboard, go to **Settings > Environment Variables** and add:
   - `REACT_APP_FIREBASE_API_KEY`
   - `REACT_APP_FIREBASE_AUTH_DOMAIN`
   - `REACT_APP_FIREBASE_PROJECT_ID`
   - `REACT_APP_FIREBASE_STORAGE_BUCKET`
   - `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
   - `REACT_APP_FIREBASE_APP_ID`
   - `REACT_APP_FIREBASE_MEASUREMENT_ID`

4. **Deploy**:
   - Click **Deploy** to publish your site

### Environment Variable Priority

The system uses the following priority for configuration:
1. **Vercel Environment Variables** (production)
2. **Local .env file** (development)
3. **Default values** (fallback)

## Local Development

1. **Clone the repository**:
   ```bash
   git clone [your-repo-url]
   cd gndu-attendance-system
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase credentials
   ```

3. **Run locally**:
   ```bash
   # Using Python HTTP server
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

4. **Access the application**:
   Open http://localhost:8000 in your browser

## Usage

### For Teachers

1. **Login** with your credentials
2. **Create Session**: Set date, subject, and secret code
3. **Share Link**: Copy the generated attendance link
4. **Monitor**: Watch real-time attendance updates
5. **Export**: Download attendance records

### For Students

1. **Access Link**: Click the attendance link shared by teacher
2. **Enter Details**: Provide roll number and name
3. **Secret Code**: Enter the code provided by teacher
4. **Mark Attendance**: Click "Mark Me Present"

## File Structure

```
gndu-attendance-system/
├── index.html              # Main application
├── script.js              # Core JavaScript functionality
├── student.js             # Student data
├── styles.css             # Styling
├── env-injector.js        # Environment configuration
├── .env                   # Environment variables (create from .env.example)
├── .env.example           # Environment variable template
├── vercel.json            # Vercel deployment configuration
└── README.md              # This file
```

## Security Notes

- Never commit `.env` file to version control
- Use strong secret codes for attendance sessions
- Firebase rules should be properly configured for security
- Enable Firebase Authentication for teacher access

## Troubleshooting

### Environment Variables Not Loading
- Ensure `.env` file exists in project root
- Check variable names match exactly (case-sensitive)
- Verify Firebase credentials are correct
- Clear browser cache and reload

### Firebase Connection Issues
- Check internet connectivity
- Verify Firebase project is properly set up
- Ensure Firestore database is created
- Check Firebase security rules

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify your Firebase configuration
3. Ensure all environment variables are properly set
4. Test with default configuration first

## License

This project is created for educational purposes at Guru Nanak Dev University.