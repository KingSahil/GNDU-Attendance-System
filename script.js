// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCcn9HfE4RGoyNzR6pVJ9Lihg2jRXrRup8",
  authDomain: "gndu-attendance-system.firebaseapp.com",
  projectId: "gndu-attendance-system",
  storageBucket: "gndu-attendance-system.appspot.com",
  messagingSenderId: "874240831454",
  appId: "1:874240831454:web:5358a9e3016b9df1e0f74f",
  measurementId: "G-0XCLY4F1YH"
};

// Initialize Firebase
let db;
let firebaseInitialized = false;
let auth;
let sessionId = null;

// Check for session in URL immediately
const urlParams = new URLSearchParams(window.location.search);
sessionId = urlParams.get('session');

// If there's a session ID in the URL, show the check-in page immediately
if (sessionId) {
  console.log('Found session in URL, showing check-in page');
  // Hide everything initially
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('teacherDashboard').style.display = 'none';
  document.getElementById('studentCheckin').style.display = 'block';
  
  // Initialize Firebase in the background but don't wait for it
  initializeFirebase();
  showStudentCheckin(sessionId);
} else {
  // Normal flow - initialize Firebase first
  initializeFirebase();
}

function initializeFirebase() {
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  auth = firebase.auth();

  // Enable offline persistence
  db.enablePersistence({ experimentalForceOwningTab: true })
    .catch((err) => {
      console.warn('Firebase persistence error:', err);
      if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
      } else if (err.code === 'unimplemented') {
        console.warn('The current browser does not support all of the features required to enable persistence');
      }
    });

  // Set persistence to LOCAL to keep users logged in
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
      console.log('Auth persistence set to LOCAL');
      // Enable network but don't fail if offline
      return db.enableNetwork().catch(err => {
        console.warn('Working in offline mode', err);
        updateFirebaseStatus('⚠️ Working in offline mode', 'warning');
      });
    })
    .then(() => {
      firebaseInitialized = true;
      updateFirebaseStatus('🟢 Connected to Firebase', 'connected');
      console.log('✅ Firebase initialized and connected successfully');
      
      // Only set up auth state listener if not already on student check-in page
      if (!sessionId) {
        auth.onAuthStateChanged((user) => {
          if (user) {
            console.log('User is signed in:', user.email);
            showDashboard();
          } else {
            console.log('No user is signed in');
            showLoginScreen();
          }
        });
      }
    })
    .catch((error) => {
      console.error('Firebase initialization error:', error);
      updateFirebaseStatus('⚠️ Firebase connection error', 'error');
    });
}

// Sorting variables
let sortColumn = null;
let sortAsc = true;
let statusSortMode = null;

// Location checking variables
const UNIVERSITY_LAT = 31.635428012027894;
const UNIVERSITY_LNG = 74.82433444456309;
const ALLOWED_RADIUS_METERS = 150;

// Timetable data
const timetable = {
  'Monday': {
    '09:00-09:55': { 'MTL1001': 'Dr. Ramandeep Kaur' },
    '10:00-10:55': { 'PBL1021': 'Mr. Saraj' },
    '11:00-11:55': { 'PHL1083': 'Dr. Vaishali' },
    '12:00-12:55': { 'CEL1020': 'Sahil Sharma' },
    '02:00-02:55': { 'CEL1020': 'Sahil Sharma' },
    '03:00-03:55': { 'PBL1022': 'Dr. Kanwaljit Kaur', 'HSL4000': 'NTB' }
  },
  'Tuesday': {
    '09:00-09:55': { 'MTL1001': 'Dr. Ramandeep Kaur' },
    '10:00-10:55': { 'PHL1083': 'Dr. Vaishali' },
    '11:00-11:55': { 'MEL1021': 'Er. Satnam Singh' },
    '12:00-12:55': { 'CEL1020': 'Sahil Sharma' }
  },
  'Wednesday': {
    '09:00-09:55': { 'MEL1021': 'Er. Satnam Singh' },
    '10:00-10:55': { 'PBL1021': 'Mr. Saraj' },
    '11:00-11:55': { 'PHL1083': 'Dr. Vaishali' },
    '02:00-02:55': { 'CEL1020': 'Sahil Sharma' },
    '03:00-03:55': { 'MTL1001': 'Dr. Ramandeep Kaur' },
    '04:00-04:55': { 'MTL1001': 'Dr. Ramandeep Kaur' }
  },
  'Thursday': {
    '09:00-09:55': { 'MEL1021': 'Er. Satnam Singh' },
    '10:00-10:55': { 'MTL1001': 'Dr. Ramandeep Kaur' },
    '11:00-11:55': { 'MEL1021': 'Er. Satnam Singh' }
  },
  'Friday': {
    '09:00-09:55': { 'MEL1021': 'Er. Satnam Singh' },
    '10:00-10:55': { 'CEL1020': 'Sahil Sharma' },
    '11:00-11:55': { 'MEL1021': 'Er. Satnam Singh' },
    '03:00-03:55': { 'PBL1022': 'Dr. Kanwaljit Kaur', 'HSL4000': 'NTB' }
  }
};

const subjectNames = {
  'CEL1020': 'Engineering Mechanics',
  'MEL1021': 'Engineering Graphics & Drafting', 
  'MTL1001': 'Mathematics I',
  'PHL1083': 'Physics',
  'PBL1021': 'Punjabi (Compulsory)',
  'PBL1022': 'Basic Punjabi',
  'HSL4000': 'Punjab History & Culture'
};

// Firebase Authentication functions
async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const messageDiv = document.getElementById('loginMessage');
  const loginBtn = document.getElementById('loginBtn');

  if (!email || !password) {
    messageDiv.innerHTML = '<div class="error-message">Please enter both email and password</div>';
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in...';
  messageDiv.innerHTML = '';

  try {
    // Sign in with email and password
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    messageDiv.innerHTML = '<div class="success-message">✅ Login successful! Redirecting...</div>';
    console.log('User logged in:', user.email);
    
    // Show dashboard after successful login
    showDashboard();
    
  } catch (error) {
    console.error('Login error:', error);
    
    let errorMessage = 'Login failed. Please try again.';
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No user found with this email.';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password. Please try again.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address format.';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many failed attempts. Please try again later.';
        break;
      default:
        errorMessage = error.message || 'Login failed. Please try again.';
        break;
    }
    
    messageDiv.innerHTML = `<div class="error-message">❌ ${errorMessage}</div>`;
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login';
  }
}

async function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    try {
      // Sign out from Firebase
      await auth.signOut();
      
      // Clear any existing sessions
      sessionId = null;
      currentSession = null;
      attendance = {};
      attendanceTime = {};
      
      // Reset UI
      document.getElementById('loginEmail').value = '';
      document.getElementById('loginPassword').value = '';
      document.getElementById('loginMessage').innerHTML = '';
      
      // Reset any modified header text
      const header = document.querySelector('.login-header h1');
      if (header) {
        header.textContent = '🔐 Secure Login';
      }
      
      // Show login screen and hide others
      document.getElementById('loginScreen').style.display = 'flex';
      document.getElementById('teacherDashboard').style.display = 'none';
      document.getElementById('studentCheckin').style.display = 'none';
      
      // Reset any other UI elements if needed
      const statusElement = document.getElementById('firebaseStatus');
      if (statusElement) {
        statusElement.textContent = '🔄 Connecting to Firebase...';
      }
      
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('Error signing out. Please try again.');
    }
  }
}

function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'block';
  document.getElementById('teacherDashboard').style.display = 'none';
  document.getElementById('studentCheckin').style.display = 'none';
  
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginMessage').innerHTML = '';
  document.getElementById('loginBtn').disabled = false;
  document.getElementById('loginBtn').textContent = 'Login';
}

function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('teacherDashboard').style.display = 'block';
  document.getElementById('studentCheckin').style.display = 'none';
}

// Function to handle page display based on URL and auth state
function handlePageDisplay(user) {
  // This function is called on auth state changes
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session');
  
  // If we're on a student check-in page, show it regardless of auth state
  if (sessionId) {
    console.log('Auth state changed, showing student check-in page for session:', sessionId);
    showStudentCheckin(sessionId);
    return;
  }
  
  // Otherwise handle normal auth flow
  if (user) {
    console.log('User is signed in, showing dashboard');
    showDashboard();
  } else {
    console.log('User is signed out, showing login screen');
    showLoginScreen();
  }
}

// Geolocation functions
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function updateLocationStatus(message, className) {
  const statusDiv = document.getElementById('locationStatus');
  if (statusDiv) {
    statusDiv.textContent = message;
    statusDiv.className = `location-status ${className}`;
  }
}

async function checkUserLocation() {
  console.log('🌐 Starting location check...');
  
  if (!navigator.geolocation) {
    const errorMsg = '❌ Location services not supported by your browser';
    console.error(errorMsg);
    updateLocationStatus(errorMsg, 'denied');
    return false;
  }
  
  // Check if we're running in a secure context (required for geolocation)
  if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
    const errorMsg = '❌ Please use HTTPS for location services to work';
    console.error(errorMsg);
    updateLocationStatus(errorMsg, 'denied');
    return false;
  }
  
  // Check geolocation permission status
  if (navigator.permissions) {
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
      console.log('🔒 Geolocation permission status:', permissionStatus.state);
      
      if (permissionStatus.state === 'denied') {
        const errorMsg = '❌ Location permission denied. Please enable it in your browser settings.';
        console.error(errorMsg);
        updateLocationStatus(errorMsg, 'denied');
        return false;
      }
      
      // Listen for permission changes
      permissionStatus.onchange = () => {
        console.log('🔄 Geolocation permission changed to:', permissionStatus.state);
        if (permissionStatus.state === 'granted') {
          window.location.reload();
        }
      };
    } catch (error) {
      console.warn('⚠️ Could not check geolocation permission status:', error);
    }
  }

  return new Promise((resolve) => {
    updateLocationStatus('📍 Getting your location...', 'checking');
    
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,  // 10 seconds
      maximumAge: 0     // Force fresh location
    };
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const distance = calculateDistance(userLat, userLng, UNIVERSITY_LAT, UNIVERSITY_LNG);
        
        console.log(`📍 User location: ${userLat}, ${userLng}`);
        console.log(`🏫 University location: ${UNIVERSITY_LAT}, ${UNIVERSITY_LNG}`);
        console.log(`📏 Distance from university: ${distance.toFixed(2)} meters`);
        
        if (distance <= ALLOWED_RADIUS_METERS) {
          updateLocationStatus(`✅ You are inside university campus (${distance.toFixed(0)}m from center)`, 'allowed');
          resolve(true);
        } else {
          updateLocationStatus(`❌ You are outside university campus (${distance.toFixed(0)}m away). You must be within ${ALLOWED_RADIUS_METERS}m to mark attendance.`, 'denied');
          resolve(false);
        }
      },
      (error) => {
        console.error('❌ Geolocation error:', error);
        let errorMessage = '';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '❌ Location access denied. Please allow location access to continue.';
            // Show a button to open settings
            const locationStatus = document.getElementById('locationStatus');
            if (locationStatus) {
              locationStatus.innerHTML += `
                <div style="margin-top: 10px;">
                  <button onclick="requestLocationPermission()" style="
                    background: #3498db;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                  ">
                    Grant Location Permission
                  </button>
                </div>`;
            }
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '❌ Location information is unavailable. Please check your device settings.';
            break;
          case error.TIMEOUT:
            errorMessage = '❌ The request to get your location timed out. Please try again.';
            break;
          case error.UNKNOWN_ERROR:
            errorMessage = '❌ An unknown error occurred while getting your location.';
            break;
        }
        updateLocationStatus(errorMessage, 'denied');
        resolve(false);
      },
      options
    );
  });
}

// Helper function to explicitly request location permission
function requestLocationPermission() {
  if (!navigator.geolocation) {
    updateLocationStatus('❌ Location services not supported by your browser', 'denied');
    return;
  }
  
  updateLocationStatus('📍 Please allow location access in the browser prompt...', 'checking');
  
  navigator.geolocation.getCurrentPosition(
    () => {
      // Success - reload the check
      window.location.reload();
    },
    (error) => {
      console.error('Location permission denied:', error);
      updateLocationStatus('❌ Location access denied. Please enable it in your browser settings.', 'denied');
    },
    { enableHighAccuracy: true }
  );
}

// Auto-detect and apply system color scheme
function detectSystemTheme() {
  if (window.matchMedia) {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    if (darkModeQuery.matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    
    darkModeQuery.addEventListener('change', (e) => {
      if (e.matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    });
  }
}

// Initialize theme detection on page load
detectSystemTheme();

// Utility Functions
function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.classList.add('show');
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

function updateFirebaseStatus(message, status) {
  const statusEl = document.getElementById('firebaseStatus');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `firebase-status ${status}`;
  }
}

function checkStudentsLoaded() {
  const loadingMsg = document.getElementById('loadingMessage');
  
  if (typeof students !== 'undefined' && Array.isArray(students) && students.length > 0) {
    loadingMsg.style.display = 'none';
    console.log(`✅ Students loaded successfully: ${students.length} students found`);
    return true;
  } else {
    loadingMsg.innerHTML = '❌ Error: students.js file not found or empty. Please check the file path and content.';
    loadingMsg.style.background = '#f8d7da';
    loadingMsg.style.color = '#721c24';
    console.error('❌ Students data not loaded');
    return false;
  }
}

function validateForm() {
  const date = document.getElementById('attendanceDate').value;
  const subjectCode = document.getElementById('subjectCode').value;
  const secretCode = document.getElementById('secretCode').value.trim();
  const studentsLoaded = checkStudentsLoaded();
  
  const startBtn = document.getElementById('startBtn');
  const isValid = date && subjectCode && secretCode && studentsLoaded;
  
  startBtn.disabled = !isValid;
  return isValid;
}

function generateSessionId() {
  return 'ATT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function findTeacherAndTime(date, subjectCode) {
  const selectedDate = new Date(date);
  const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
  
  const daySchedule = timetable[dayName];
  if (daySchedule) {
    for (const timeSlot in daySchedule) {
      if (daySchedule[timeSlot][subjectCode]) {
        return {
          timeSlot: timeSlot,
          teacher: daySchedule[timeSlot][subjectCode]
        };
      }
    }
  }
  
  return {
    timeSlot: 'Not Scheduled',
    teacher: 'To Be Assigned'
  };
}

// Enhanced startAttendance with secret code
async function startAttendance() {
  if (!validateForm()) {
    alert('Please ensure all fields are filled including the secret code');
    return;
  }

  const date = document.getElementById('attendanceDate').value;
  const subjectCode = document.getElementById('subjectCode').value;
  const secretCode = document.getElementById('secretCode').value.trim().toUpperCase();
  
  const selectedDate = new Date(date);
  const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = selectedDate.toLocaleDateString('en-GB');
  
  const existingSession = await findExistingSession(formattedDate, subjectCode);
  
  let isNewSession = false;
  
  if (existingSession && existingSession.id) {
    sessionId = existingSession.id;
    currentSession = existingSession;
    sessionSecretCode = existingSession.secretCode || secretCode;
    console.log('🔄 Continuing existing session:', sessionId);
    showNotification('📚 Continuing existing attendance session', 'success');
    
    await loadExistingAttendance(sessionId);
  } else {
    isNewSession = true;
    const classDetails = findTeacherAndTime(date, subjectCode);
    sessionId = generateSessionId();
    sessionSecretCode = secretCode;

    currentSession = {
      sessionId: sessionId,
      date: formattedDate,
      day: dayName,
      timeSlot: classDetails.timeSlot,
      subjectCode: subjectCode,
      subjectName: subjectNames[subjectCode],
      teacherName: classDetails.teacher,
      secretCode: sessionSecretCode
    };

    await createAttendanceSession(currentSession);
    console.log('🆕 Created new session:', sessionId);
    showNotification('✅ New attendance session started', 'success');
    
    attendance = {};
    attendanceTime = {};
  }

  checkinUrl = window.location.href.split('?')[0] + '?session=' + sessionId;

  document.getElementById('classInfo').innerHTML = `
    <h3>${isNewSession ? 'New' : 'Continuing'} Attendance Session</h3>
    <div class="class-details">
      <div><strong>Date:</strong> ${currentSession.date} (${currentSession.day})</div>
      <div><strong>Time:</strong> ${currentSession.timeSlot}</div>
      <div><strong>Subject:</strong> ${currentSession.subjectName}</div>
      <div><strong>Teacher:</strong> ${currentSession.teacherName}</div>
      ${!isNewSession ? '<div><strong>Status:</strong> Existing session resumed</div>' : ''}
    </div>
    <div class="secret-code-info">
      <strong>🔑 Secret Code:</strong>
      <div class="secret-code-display">${sessionSecretCode}</div>
    </div>
  `;

  document.getElementById('sessionUrl').textContent = checkinUrl;

  document.getElementById('setupSection').style.display = 'none';
  document.getElementById('attendanceSection').style.display = 'block';

  renderTable();
  startListeningToAttendance();
}

// Share Functions
function copyLink() {
  navigator.clipboard.writeText(checkinUrl).then(() => {
    showNotification('✅ Link copied to clipboard!');
  }).catch(() => {
    const textArea = document.createElement('textarea');
    textArea.value = checkinUrl;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showNotification('✅ Link copied to clipboard!');
  });
}

function shareWhatsApp() {
  const message = `*"GNDU Attendance System"*\n\n${currentSession.subjectName}\nDate: ${currentSession.date}\nTime: ${currentSession.timeSlot}\nTeacher: ${currentSession.teacherName}\n\n*"Important Requirements:"*\n1. You must be inside the university campus\n2. You must enter the secret code correctly told in classroom\n\nClick this link to mark your attendance:\n${checkinUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 GNDU Attendance System starting...');

  // Only set up teacher dashboard elements if we're not on the student check-in page
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session');
  
  if (!sessionId) {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDate').value = today;
    
    document.getElementById('attendanceDate').addEventListener('change', validateForm);
    document.getElementById('subjectCode').addEventListener('change', validateForm);
    document.getElementById('secretCode').addEventListener('input', validateForm);
    document.getElementById('startBtn').addEventListener('click', startAttendance);
    
    // Login form enter key handling
    document.getElementById('loginPassword').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        handleLogin();
      }
    });

    if (document.getElementById('search')) {
      document.getElementById('search').addEventListener('keyup', renderTable);
    }

    setupSorting();
    console.log('✅ Teacher dashboard initialized');
  } else {
    console.log('✅ Student check-in page initialized');
  }
});

window.addEventListener('beforeunload', function() {
  stopListeningToAttendance();
});

// Sorting functions
function compareValues(key, ascending = true) {
  return function(a, b) {
    let varA = (a[key] || '').toString().toUpperCase();
    let varB = (b[key] || '').toString().toUpperCase();
    
    if (varA < varB) {
      return ascending ? -1 : 1;
    }
    if (varA > varB) {
      return ascending ? 1 : -1;
    }
    return 0;
  };
}

function customStatusSort(a, b) {
  const aPresent = !!attendance[a.id];
  const bPresent = !!attendance[b.id];
  
  if (statusSortMode === 'presentFirst') {
    if (aPresent && !bPresent) return -1;
    if (!aPresent && bPresent) return 1;
  } else if (statusSortMode === 'absentFirst') {
    if (!aPresent && bPresent) return -1;
    if (aPresent && !bPresent) return 1;
  }
  
  return compareValues('name', true)(a, b);
}

function sortData(data) {
  if (!sortColumn) return data;
  
  if (sortColumn === 'status') {
    return data.sort(customStatusSort);
  } else if (sortColumn === 'time') {
    return data.sort((a, b) => {
      const aTime = attendanceTime[a.id] || '';
      const bTime = attendanceTime[b.id] || '';
      
      if (aTime === '' && bTime !== '') return sortAsc ? 1 : -1;
      if (bTime === '' && aTime !== '') return sortAsc ? -1 : 1;
      if (aTime === '' && bTime === '') return 0;
      
      return sortAsc ? aTime.localeCompare(bTime) : bTime.localeCompare(aTime);
    });
  }
  
  return data.sort(compareValues(sortColumn, sortAsc));
}

function setupSorting() {
  const headers = {
    'studentIdHeader': 'id',
    'nameHeader': 'name',
    'fatherHeader': 'father',
    'statusHeader': 'status',
    'timeHeader': 'time'
  };

  Object.keys(headers).forEach(headerId => {
    const header = document.getElementById(headerId);
    const columnKey = headers[headerId];
    
    if (!header) return;
    
    header.dataset.originalText = header.textContent;
    
    header.addEventListener('click', function() {
      Object.keys(headers).forEach(id => {
        const h = document.getElementById(id);
        if (h) {
          h.classList.remove('sorted');
          h.textContent = h.dataset.originalText;
        }
      });

      if (columnKey === 'status') {
        if (sortColumn !== 'status') {
          sortColumn = 'status';
          statusSortMode = 'presentFirst';
          header.textContent = 'Status (Present First)';
        } else if (statusSortMode === 'presentFirst') {
          statusSortMode = 'absentFirst';
          header.textContent = 'Status (Absent First)';
        } else {
          sortColumn = null;
          statusSortMode = null;
          header.textContent = header.dataset.originalText;
        }
      } else {
        if (sortColumn === columnKey) {
          sortAsc = !sortAsc;
        } else {
          sortColumn = columnKey;
          sortAsc = false;
          if (columnKey !== 'name') {
            sortAsc = true;
          }
        }
        statusSortMode = null;
        
        const indicator = sortAsc ? ' ▲' : ' ▼';
        header.textContent = header.dataset.originalText + indicator;
      }

      if (sortColumn) {
        header.classList.add('sorted');
      }

      renderTable();
    });
  });
}

function applyFilters() {
  if (typeof students === 'undefined' || !Array.isArray(students)) {
    return [];
  }

  let filtered = students.slice();
  const searchTerm = document.getElementById("search")?.value.toLowerCase() || '';

  if (searchTerm !== '') {
    filtered = filtered.filter(student => {
      return student.name.toLowerCase().includes(searchTerm) || 
            student.father.toLowerCase().includes(searchTerm) ||
            student.id.toLowerCase().includes(searchTerm);
    });
    
    return filtered;
  }

  return sortData(filtered);
}

async function findExistingSession(date, subjectCode) {
  if (!firebaseInitialized) {
    console.log('🔍 Firebase not available, checking local storage for existing sessions');
    
    const localSessionKey = `session_${date}_${subjectCode}`;
    const localSession = localStorage.getItem(localSessionKey);
    if (localSession) {
      console.log('📂 Found existing session in local storage');
      return JSON.parse(localSession);
    }
    return null;
  }

  try {
    console.log('🔍 Searching for existing session:', { date, subjectCode });
    
    const sessionsRef = db.collection('attendanceSessions');
    const querySnapshot = await sessionsRef
      .where('date', '==', date)
      .where('subjectCode', '==', subjectCode)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      console.log('🎯 Found existing session:', doc.id);
      return { id: doc.id, ...doc.data() };
    }

    console.log('❌ No existing session found');
    return null;
  } catch (error) {
    console.error('❌ Error searching for existing session:', error);
    return null;
  }
}

async function loadExistingAttendance(sessionId) {
  attendance = {};
  attendanceTime = {};

  if (firebaseInitialized) {
    try {
      const attendanceRef = db.collection('attendanceSessions')
        .doc(sessionId)
        .collection('attendance');
      
      const snapshot = await attendanceRef.get();
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const studentId = doc.id;
        
        attendance[studentId] = true;
        if (data.markedAt && data.markedAt.seconds) {
          attendanceTime[studentId] = new Date(data.markedAt.seconds * 1000).toLocaleTimeString();
        } else {
          attendanceTime[studentId] = data.time || '-';
        }
      });

      console.log(`📚 Loaded ${Object.keys(attendance).length} attendance records from Firebase`);
    } catch (error) {
      console.error('❌ Error loading attendance from Firebase:', error);
    }
  }

  const localAttendanceKey = 'attendance_' + sessionId;
  const localAttendance = JSON.parse(localStorage.getItem(localAttendanceKey) || '{}');
  
  Object.keys(localAttendance).forEach(studentId => {
    if (!attendance[studentId]) {
      attendance[studentId] = true;
      attendanceTime[studentId] = localAttendance[studentId].time || '-';
    }
  });

  console.log(`📊 Total attendance loaded: ${Object.keys(attendance).length} students`);
}

async function createAttendanceSession(sessionData) {
  const localSessionKey = `session_${sessionData.date}_${sessionData.subjectCode}`;
  localStorage.setItem(localSessionKey, JSON.stringify(sessionData));
  localStorage.setItem('attendanceSession_' + sessionData.sessionId, JSON.stringify(sessionData));

  if (!firebaseInitialized) {
    console.log('📂 Session saved to local storage only');
    return;
  }

  try {
    await db.collection('attendanceSessions').doc(sessionData.sessionId).set({
      ...sessionData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'active',
      totalStudents: students.length,
      presentCount: 0
    });
    console.log('✅ Attendance session created in Firebase');
  } catch (error) {
    console.error('❌ Error creating attendance session in Firebase:', error);
  }
}

async function createNewSession(date, subject, secretCode) {
  try {
    const sessionData = {
      date: date,
      subject: subject,
      secretCode: secretCode,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'active',
      createdBy: auth.currentUser.uid,
      // Add offline metadata
      _offline: true, // Mark as locally created
      _lastUpdated: new Date().toISOString()
    };

    // First try online
    try {
      const docRef = await db.collection('sessions').add(sessionData);
      sessionId = docRef.id;
      console.log('🆕 Created new session online:', sessionId);
    } catch (error) {
      console.warn('⚠️ Could not create session online, using offline mode', error);
      // Create a local ID for offline use
      sessionId = 'offline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      // Store in local storage for offline use
      const offlineSessions = JSON.parse(localStorage.getItem('offlineSessions') || '[]');
      offlineSessions.push({ id: sessionId, ...sessionData });
      localStorage.setItem('offlineSessions', JSON.stringify(offlineSessions));
      console.log('🆕 Created new offline session:', sessionId);
      
      // Show warning to user
      showNotification('⚠️ Working in offline mode. Data will sync when back online.', 'warning');
    }
    
    return sessionId;
  } catch (error) {
    console.error('❌ Error creating attendance session:', error);
    throw error;
  }
}

async function markStudentPresent(studentId, studentData) {
  const attendanceKey = 'attendance_' + sessionId;
  let sessionAttendance = JSON.parse(localStorage.getItem(attendanceKey) || '{}');
  
  // Store in local storage first for offline support
  sessionAttendance[studentId] = studentData;
  localStorage.setItem(attendanceKey, JSON.stringify(sessionAttendance));

  // Update local state
  attendance[studentId] = true;
  attendanceTime[studentId] = studentData.time || new Date().toLocaleTimeString();
  
  if (!firebaseInitialized || !studentId || !sessionId) {
    console.log('📂 Firebase not initialized, saved to local storage only');
    return false;
  }

  try {
    // Save to Firestore
    const attendanceRef = db.collection('attendanceSessions')
      .doc(sessionId)
      .collection('attendance')
      .doc(studentId.toString());
    
    // Prepare the data to save
    const attendanceData = {
      ...studentData,
      markedAt: firebase.firestore.FieldValue.serverTimestamp(),
      timestamp: Date.now()
    };
    
    // Save the attendance record
    await attendanceRef.set(attendanceData, { merge: true });

    // Update the session's present count
    await db.collection('attendanceSessions')
      .doc(sessionId)
      .update({
        presentCount: firebase.firestore.FieldValue.increment(1),
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });

    console.log('✅ Student attendance saved to Firebase');
    return true;
  } catch (error) {
    console.error('❌ Error saving attendance to Firebase:', error);
    
    // If offline, the data will be synced when back online
    if (error.code === 'unavailable') {
      console.log('📴 Offline - Attendance will sync when back online');
      return true; // Consider it a success since it will sync later
    }
    
    return false;
  }
}

function startListeningToAttendance() {
  if (!sessionId) return;
  
  console.log('🔄 Starting to listen for attendance updates for session:', sessionId);
  
  // Clear any existing listener
  if (attendanceListener) {
    attendanceListener();
  }
  
  // Try online first
  try {
    // Use the correct path: attendanceSessions/{sessionId}/attendance
    const attendanceRef = db.collection('attendanceSessions')
      .doc(sessionId)
      .collection('attendance');
      
    attendanceListener = attendanceRef.onSnapshot(
      (snapshot) => {
        // Success callback
        console.log('Received attendance update with', snapshot.docChanges().length, 'changes');
        
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data();
          const studentId = data.studentId;
          
          if (!studentId) {
            console.warn('Received attendance record without studentId:', data);
            return;
          }
          
          switch (change.type) {
            case 'added':
            case 'modified':
              console.log(`📝 Student ${studentId} attendance updated:`, data);
              // Update local attendance state
              attendance[studentId] = true;
              attendanceTime[studentId] = data.timestamp?.toDate?.() || data.markedAt?.toDate?.() || new Date();
              
              // Update the UI
              const student = students.find(s => s.id.toString() === studentId);
              if (student) {
                updateAttendance(studentId, 'present', attendanceTime[studentId]);
                console.log(`✅ ${student.name || studentId} marked present`);
              }
              break;
              
            case 'removed':
              console.log(`🗑️ Student ${studentId} attendance removed`);
              delete attendance[studentId];
              delete attendanceTime[studentId];
              updateAttendance(studentId, 'absent', null);
              console.log(`❌ ${data.name || studentId} attendance removed`);
              break;
          }
        });
        
        updateStats();
        updateFirebaseStatus('🟢 Connected to Firebase', 'connected');
        renderTable();
      },
      (error) => {
        // Error callback
        console.warn('⚠️ Online listener failed, falling back to offline mode:', error);
        loadOfflineAttendance();
        updateFirebaseStatus('⚠️ Working in offline mode', 'warning');
        showNotification('Connection issues. Working in offline mode.', 'error');
      }
    );
  } catch (error) {
    console.warn('⚠️ Error setting up online listener, using offline mode:', error);
    loadOfflineAttendance();
    updateFirebaseStatus('⚠️ Working in offline mode', 'warning');
    showNotification('Working in offline mode. Data will sync when back online.', 'warning');
  }
}

function updateAttendance(studentId, status, timestamp) {
  if (!studentId) return;
  
  attendance[studentId] = status === 'present';
  
  if (timestamp) {
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    attendanceTime[studentId] = date.toLocaleTimeString();
  } else {
    attendanceTime[studentId] = new Date().toLocaleTimeString();
  }
  
  // Update the UI
  updateStats();
  renderTable();
}

function stopListeningToAttendance() {
  if (attendanceListener) {
    attendanceListener();
    attendanceListener = null;
  }
}

function updateStats() {
  const searchTerm = document.getElementById("search")?.value.toLowerCase() || '';
  
  if (searchTerm !== '') {
    return;
  }

  const allStudents = students || [];
  const presentStudents = allStudents.filter(student => attendance[student.id]).length;
  const totalStudents = allStudents.length;
  const absentStudents = totalStudents - presentStudents;
  const attendancePercent = totalStudents > 0 ? Math.round((presentStudents / totalStudents) * 100) : 0;

  document.getElementById('totalStudents').textContent = totalStudents;
  document.getElementById('presentCount').textContent = presentStudents;
  document.getElementById('absentCount').textContent = absentStudents;
  document.getElementById('attendancePercent').textContent = attendancePercent + '%';
}

function renderTable() {
  const tbody = document.getElementById("studentTable");
  const filteredStudents = applyFilters();

  tbody.innerHTML = "";
  filteredStudents.forEach((student, index) => {
    const row = document.createElement("tr");
    if (attendance[student.id]) row.classList.add("present");
    
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${student.id}</td>
      <td>${student.name}</td>
      <td>${student.father}</td>
      <td>
        ${attendance[student.id] ? 
          '<span class="status-present">Present</span>' : 
          '<span class="status-absent">Absent</span>'
        }
      </td>
      <td>${attendanceTime[student.id] || '-'}</td>
    `;
    tbody.appendChild(row);
  });

  updateStats();
}

async function showStudentCheckin(sessionParam) {
  console.log('🔍 Loading session data for:', sessionParam);
  let session = JSON.parse(localStorage.getItem('attendanceSession_' + sessionParam) || 'null');
  
  // If we have a valid cached session, use it immediately
  if (session && session.sessionId === sessionParam) {
    console.log('📦 Using cached session data');
    displayStudentCheckin(session);
    
    // Still try to update from Firestore in the background
    if (firebaseInitialized) {
      updateSessionFromFirestore(sessionParam);
    }
    return;
  }
  
  // If we don't have a valid session, try to load from Firestore
  if (firebaseInitialized) {
    try {
      console.log('🌐 Fetching session data from Firestore');
      const doc = await db.collection('attendanceSessions').doc(sessionParam).get();
      
      if (doc.exists) {
        session = doc.data();
        console.log('✅ Session data loaded from Firestore:', session);
        
        // Cache the session data
        localStorage.setItem('attendanceSession_' + sessionParam, JSON.stringify(session));
        
        // Display the check-in form
        displayStudentCheckin(session);
      } else {
        showError('Session not found or has expired');
      }
    } catch (error) {
      console.error('❌ Error loading session:', error);
      showError('Unable to load session. Please check your connection and try again.');
    }
  } else {
    showError('Unable to verify session. Please check your internet connection.');
  }
}

async function updateSessionFromFirestore(sessionParam) {
  try {
    const doc = await db.collection('attendanceSessions').doc(sessionParam).get();
    if (doc.exists) {
      const session = doc.data();
      console.log('🔄 Updated session data from Firestore');
      localStorage.setItem('attendanceSession_' + sessionParam, JSON.stringify(session));
    }
  } catch (error) {
    console.warn('⚠️ Could not update session from Firestore:', error);
  }
}

function showError(message) {
  const checkinSection = document.getElementById('studentCheckin');
  if (checkinSection) {
    checkinSection.innerHTML = `
      <div class="error-container">
        <h2>❌ Error</h2>
        <p>${message}</p>
        <p>Please contact your teacher for assistance.</p>
      </div>
    `;
  } else {
    alert(message);
  }
}

async function displayStudentCheckin(session) {
  console.log('🎯 Displaying student check-in for session:', session.sessionId);
  
  // Store the secret code for validation
  window.sessionSecretCode = session.secretCode || '';
  
  // Hide other sections
  const loginScreen = document.getElementById('loginScreen');
  const teacherDashboard = document.getElementById('teacherDashboard');
  if (loginScreen) loginScreen.style.display = 'none';
  if (teacherDashboard) teacherDashboard.style.display = 'none';
  
  // Show the check-in section
  const checkinSection = document.getElementById('studentCheckin');
  if (checkinSection) {
    checkinSection.style.display = 'block';
  }
  
  // Update session info
  const classInfo = document.getElementById('checkinClassInfo');
  if (classInfo) {
    classInfo.innerHTML = `
      <h3>${session.subjectName || 'No Subject'}</h3>
      <p>📅 ${session.date || 'No date'} • ⏰ ${session.timeSlot || 'No time slot'}</p>
      <p>👨‍🏫 ${session.teacherName || 'Teacher'}</p>
    `;
  }
  
  // Initialize form elements
  const form = document.getElementById('studentCheckinForm');
  const submitBtn = document.getElementById('submitBtn');
  const messageDiv = document.getElementById('checkinMessage');
  
  if (form) form.reset();
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Checking location...';
  }
  if (messageDiv) {
    messageDiv.innerHTML = '<div class="info-message">Checking your location...</div>';
  }
  
  // Start location check
  try {
    const locationAllowed = await checkUserLocation();
    
    if (submitBtn) {
      submitBtn.disabled = !locationAllowed;
      submitBtn.textContent = locationAllowed ? 'Mark Me Present' : 'Location Required';
    }
    
    // Update location status messagewe
    if (locationAllowed) {
      updateLocationStatus('✅ Location verified - You are inside the campus', 'allowed');
      
      // Focus on the first input field
      const firstInput = form?.querySelector('input');
      if (firstInput) {
        firstInput.focus();
      }
    } else {
      updateLocationStatus('❌ You must be inside the university campus to mark attendance', 'denied');
    }
  } catch (error) {
    console.error('Error during location check:', error);
    if (messageDiv) {
      messageDiv.innerHTML = `
        <div class="error-message">
          Error checking location. Please ensure location services are enabled and try again.
          <button onclick="window.location.reload()" class="retry-button">Retry</button>
        </div>`;
    }
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Location Error';
    }
  }
}

async function submitAttendance() {
  const urlSessionId = new URLSearchParams(window.location.search).get('session');
  const studentId = document.getElementById('studentId')?.value.trim() || '';
  const studentName = document.getElementById('studentName')?.value.trim() || '';
  const secretCodeInput = (document.getElementById('secretCodeInput')?.value || '').trim().toUpperCase();
  const messageDiv = document.getElementById('checkinMessage');
  const submitBtn = document.getElementById('submitBtn');
  const form = document.getElementById('studentCheckinForm');

  console.log('📝 Submitting attendance:', { urlSessionId, studentId, studentName });

  // Reset any previous messages
  if (messageDiv) messageDiv.innerHTML = '';
  
  // Basic validation
  if (!urlSessionId) {
    showError('Invalid session. Please use a valid attendance link.');
    return;
  }

  if (!studentId || !studentName || !secretCodeInput) {
    showError('Please fill in all fields including the secret code');
    return;
  }

  // Get session data
  let session;
  try {
    const sessionData = localStorage.getItem('attendanceSession_' + urlSessionId);
    if (!sessionData) throw new Error('Session not found');
    session = JSON.parse(sessionData);
    
    if (!session || !session.secretCode) {
      throw new Error('Invalid session configuration');
    }
  } catch (error) {
    console.error('Error loading session:', error);
    showError('Session configuration error. Please contact your teacher or try again later.');
    return;
  }

  // Verify secret code
  if (secretCodeInput !== session.secretCode.toUpperCase()) {
    showError('❌ Incorrect secret code. Please check with your teacher and try again.');
    return;
  }

  // Verify location
  updateLocationStatus('📍 Verifying your location...', 'checking');
  let locationAllowed = false;
  try {
    locationAllowed = await checkUserLocation();
    if (!locationAllowed) {
      showError('❌ You must be inside the university campus to mark attendance. Please move to the campus and try again.');
      return;
    }
  } catch (error) {
    console.error('Location verification failed:', error);
    showError('❌ Unable to verify your location. Please ensure location services are enabled and try again.');
    return;
  }

  // Disable form during submission
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
  }
  if (form) form.querySelectorAll('input').forEach(input => input.disabled = true);

  // Verify student
  try {
    const student = students.find(s => 
      s?.id?.toString().toLowerCase() === studentId.toLowerCase() && 
      s?.name?.toLowerCase() === studentName.toLowerCase()
    );

    if (!student) {
      showError('Student ID and Name do not match our records. Please check your spelling and try again.');
      if (submitBtn) submitBtn.disabled = false;
      if (form) form.querySelectorAll('input').forEach(input => input.disabled = false);
      return;
    }

    // Check if already marked attendance locally
    const attendanceKey = 'attendance_' + urlSessionId;
    const localAttendance = JSON.parse(localStorage.getItem(attendanceKey) || '{}');
    
    if (localAttendance[student.id]) {
      showError('You have already marked your attendance for this session.');
      if (submitBtn) submitBtn.disabled = true;
      return;
    }
    
    // Prepare attendance data with all required fields
    const currentTime = new Date();
    const attendanceData = {
      studentId: student.id.toString(),
      studentName: student.name,
      name: student.name,
      father: student.father || 'N/A',
      time: currentTime.toLocaleTimeString(),
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      localTimestamp: currentTime.toISOString(),
      secretCode: secretCodeInput,
      status: 'present',
      locationVerified: true,
      sessionId: urlSessionId,
      latitude: null,
      longitude: null
    };

    // Try to get geolocation if available
    if (navigator.geolocation) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });
        
        if (position?.coords) {
          attendanceData.latitude = position.coords.latitude;
          attendanceData.longitude = position.coords.longitude;
          attendanceData.locationAccuracy = position.coords.accuracy;
        }
      } catch (geoError) {
        console.warn('Geolocation error (attendance will still be recorded):', geoError);
      }
    }

    // Update UI to show submission in progress
    if (messageDiv) {
      messageDiv.innerHTML = '<div class="info-message">Submitting your attendance, please wait...</div>';
    }

    try {
      // Save to Firestore
      const docRef = await db.collection('attendanceSessions')
        .doc(urlSessionId)
        .collection('attendance')
        .add(attendanceData);
      
      console.log('Attendance recorded with ID: ', docRef.id);
      
      // Update local storage to prevent duplicate submissions
      localAttendance[student.id] = {
        ...attendanceData,
        id: docRef.id,
        synced: true,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(attendanceKey, JSON.stringify(localAttendance));
      
      // Show success message
      if (messageDiv) {
        messageDiv.innerHTML = `
          <div class="success-message">
            ✅ <strong>Attendance recorded successfully!</strong><br>
            ${student.name} (${student.id}) is marked present.
          </div>`;
      }
      
      // Reset form and disable submit button
      if (form) form.reset();
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Attendance Recorded';
      }
      
      // Auto-close after 5 seconds
      setTimeout(() => {
        const message = document.getElementById('checkinMessage');
        if (message) {
          message.innerHTML = '';
        }
      }, 5000);
      
    } catch (error) {
      console.error('Error saving attendance:', error);
      
      // Fallback to local storage if Firestore fails
      const localId = 'local_' + Date.now();
      localAttendance[student.id] = {
        ...attendanceData,
        id: localId,
        synced: false,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(attendanceKey, JSON.stringify(localAttendance));
      
      if (messageDiv) {
        messageDiv.innerHTML = `
          <div class="warning-message">
            ⚠️ <strong>Attendance saved offline</strong><br>
            Your attendance has been saved locally and will sync when online.
          </div>`;
      }
      
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saved Offline';
      }
      
      // Update UI if in teacher view
      if (currentSession && currentSession.sessionId === urlSessionId) {
        attendance[student.id] = true;
        attendanceTime[student.id] = new Date();
        renderTable();
      }
      
      // Disable form fields
      if (form) {
        form.querySelectorAll('input').forEach(input => input.disabled = true);
      }
    }
  } catch (error) {
    console.error('Error in submitAttendance:', error);
    if (messageDiv) {
      messageDiv.innerHTML = `
        <div class="error-message">
          ❌ An error occurred while processing your request. Please try again later.
          ${error.message ? `<br><small>${error.message}</small>` : ''}
        </div>`;
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Try Again';
    }
    if (form) form.querySelectorAll('input').forEach(input => input.disabled = false);
  }
}

// Make functions globally accessible
window.submitAttendance = submitAttendance;
window.copyLink = copyLink;
window.shareWhatsApp = shareWhatsApp;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
