# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

The GNDU Attendance System is a web-based attendance tracking application built for Guru Nanak Dev University's Computer Engineering & Technology department. The system allows teachers to create attendance sessions and students to mark their attendance using geolocation verification.

## Architecture

### Core Components

**Frontend-Only Application**: This is a client-side web application with no backend server required. All data is stored in Firebase Firestore and localStorage for offline functionality.

**Authentication Flow**: 
- Teachers log in using Firebase Auth (email/password)
- Students don't need authentication - they use session-based links
- Authentication state is cached in localStorage for persistence

**Session Management**:
- Each attendance session has a unique ID and secret code
- Sessions expire after 1 hour by default
- Session data is stored both in Firestore and localStorage for offline support

**Location Verification**:
- Uses browser geolocation API to verify students are on campus
- GNDU coordinates: lat 31.648496, lng 74.817549
- Students must be within 1000 meters to mark attendance

### File Structure

- `index.html` - Main application with all three views (login, teacher dashboard, student check-in)
- `script.js` - Core application logic (~2000+ lines)
- `student.js` - Student data definitions
- `styles.css` - CSS with dark/light theme support
- `env.js` - Firebase configuration (not committed, see Firebase Setup)

### Data Models

**Session Object**:
```javascript
{
  sessionId: "ATT_[32-char-hex]",
  date: "DD/MM/YYYY",
  day: "Monday",
  timeSlot: "09:00-09:55", 
  subjectCode: "CEL1020",
  subjectName: "Engineering Mechanics",
  teacherName: "Sahil Sharma",
  secretCode: "TEACHER_SET_CODE",
  expiryTime: ISO_DATE_STRING,
  isExpired: false
}
```

**Attendance Record**:
```javascript
{
  studentId: "17032400001",
  studentName: "Student Name",
  markedAt: FIREBASE_TIMESTAMP,
  sessionId: "session_id"
}
```

## Development Commands

### Local Development

**Start Development Server:**
```bash
# Using Python (recommended)
python -m http.server 8000

# Using Node.js
npx http-server -p 8000

# Using PHP
php -S localhost:8000
```

**Access the application:**
- Teacher dashboard: http://localhost:8000
- Student check-in: http://localhost:8000?session=SESSION_ID

### Testing

**Manual Testing Scenarios:**
```bash
# Test session creation
# 1. Login as teacher
# 2. Set date, subject, secret code
# 3. Start attendance session
# 4. Verify session URL generation

# Test student attendance
# 1. Open session URL in new browser/incognito
# 2. Test location verification
# 3. Enter secret code and student details
# 4. Verify attendance recording

# Test offline functionality
# 1. Disconnect internet after login
# 2. Create attendance session
# 3. Verify localStorage fallback
# 4. Reconnect and verify sync
```

### Firebase Setup

**Required Configuration:**
Create `env.js` file in project root:
```javascript
window.firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id", 
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

**Firestore Collections:**
- `attendanceSessions/{sessionId}` - Session metadata
- `attendanceSessions/{sessionId}/attendance/{studentId}` - Individual attendance records
- `students/{id}` - Student information

**Required Firestore Indexes:**
```
Collection: attendanceSessions
Fields: date (Ascending), subjectCode (Ascending)
```

## Key Features & Implementation

### Session Expiry System
- Sessions auto-expire after 1 hour
- Manual expiry available via teacher dashboard
- Expired sessions can be viewed but not used for new attendance
- Buffer time (5 minutes) prevents premature expiry due to clock differences

### Location Verification
- Uses Haversine formula for distance calculation
- Multiple retry attempts with exponential backoff
- Graceful degradation when geolocation unavailable
- Campus boundary: 1000m radius from GNDU coordinates

### Offline Support
- Firestore offline persistence enabled
- localStorage fallback for all critical data
- Session data cached locally for immediate access
- Seamless sync when connection restored

### Roll Number System
- Absolute roll numbers (1-N) based on student array index
- Maintains consistent numbering across sessions
- Handles both roll numbers and student IDs for input

## Timetable Integration

The application includes hardcoded timetable data for automatic teacher/time detection:
- Monday through Friday schedules
- Subject codes: CEL1020, MEL1021, MTL1001, PHL1083, PBL1021, PBL1022, HSL4000
- Time slots from 09:00 to 16:55

## Security Considerations

- CSP headers implemented in HTML
- Secret codes for session access control
- Location verification prevents remote attendance
- Device verification prevents multiple attendance marks from the same device (for non-logged-in users)
- No sensitive data in client-side code (Firebase config expected to be public)
- Session expiry prevents indefinite access

## Browser Compatibility

- Modern browsers with ES6+ support required
- Geolocation API required for student attendance
- Firebase v9 compat library used
- Responsive design for mobile devices

## Debugging

**Console Commands Available:**
```javascript
// Test session expiry logic
testExpiry()

// Check current attendance data
console.log(attendance, attendanceTime)

// Verify student data loading
console.log(students.length, 'students loaded')
```

**Common Issues:**
- "Students not loading" → Check Firestore connection and students collection
- "Session expiry issues" → Verify system time and expiry calculation
- "Location denied" → Check HTTPS requirement and browser permissions
- "Firebase errors" → Verify env.js configuration and Firestore rules

## Browser Storage

**localStorage Keys:**
- `user` - Cached auth user data
- `session_${date}_${subject}` - Session data by date/subject
- `attendanceSession_${sessionId}` - Session data by ID  
- `attendance_${sessionId}` - Local attendance records

## Performance Notes

- Large student dataset (~50+ students) handled efficiently
- Minimal Firebase reads through caching
- Real-time updates only for attendance changes
- Table sorting/filtering performed client-side
