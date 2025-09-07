# GNDU Attendance System - Next.js

A modern, web-based attendance management system built with Next.js for Guru Nanak Dev University (GNDU), specifically for the Department of Computer Engineering & Technology.

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

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore Database)
- **UI Components**: Custom components with Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Hooks

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Firebase project with Firestore and Authentication enabled

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd gndu-attendance-nextjs
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Firebase:
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Email/Password authentication
   - Set up Firestore Database in test mode
   - Add your web app to the Firebase project and get the configuration object

4. Update the Firebase configuration in `.env.local`:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

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
2. Allow location access when prompted
3. Enter the secret code provided by your teacher
4. Enter your roll number and name
5. Submit your attendance

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── checkin/           # Student check-in pages
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── Dashboard/         # Dashboard components
│   ├── ui/               # Reusable UI components
│   ├── LoginForm.tsx     # Login form component
│   └── StudentCheckin.tsx # Student check-in component
├── data/                 # Static data
│   └── students.ts       # Student data
├── hooks/                # Custom React hooks
│   ├── useAuth.ts        # Authentication hook
│   └── useLocation.ts    # Location verification hook
├── lib/                  # Utility libraries
│   ├── firebase.ts       # Firebase configuration
│   └── utils.ts          # Utility functions
└── types/                # TypeScript type definitions
    └── index.ts          # Type definitions
```

## Security Features

- **Location Verification** - Ensures attendance is marked from within campus
- **Session Expiry** - Automatic session expiration after a set period
- **Secure Authentication** - Firebase Authentication with email/password
- **Real-time Validation** - Server-side validation for all attendance submissions

## Browser Support

The system is compatible with all modern web browsers including:
- Google Chrome (recommended)
- Mozilla Firefox
- Microsoft Edge
- Safari

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Environment Variables

Create a `.env.local` file in the root directory with your Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Acknowledgments

- Guru Nanak Dev University for the opportunity to develop this system
- Firebase for providing a robust backend infrastructure
- Next.js team for the excellent framework
- Open-source community for valuable libraries and resources