// Firebase Configuration (provided by env.js at runtime)
// For static sites, .env files are not available to the browser. We load
// configuration from a non-committed env.js file instead. See env.example.js.

// script.js (uses Firebase v9 compat via CDN included in index.html)


// Use the configuration from config.js
const firebaseConfig = window.firebaseConfig || {
  apiKey: "AIzaSyCcn9HfE4RGoyNzR6pVJ9Lihg2jRXrRup8",
  authDomain: "gndu-attendance-system.firebaseapp.com",
  projectId: "gndu-attendance-system",
  storageBucket: "gndu-attendance-system.firebasestorage.app",
  messagingSenderId: "874240831454",
  appId: "1:874240831454:web:aaaa1909d87d9a77e0f74f",
  measurementId: "G-7TNPBZ3ZZN"
};


// Initialize Firebase
let db;
let firebaseInitialized = false;
let auth;
let sessionId = null;
let attendanceListener = null; // Initialize the attendance listener
// Global state used across attendance features
let attendance = {};
let attendanceTime = {};
let currentSession = null;
let sessionSecretCode = '';
let checkinUrl = '';
// Students array is loaded from student.js

// NOTE: handlePageDisplay is defined later in the file with enhanced logic.
// Keeping a single implementation to avoid conflicts.

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
  // Secondary DOM ready handler for teacher dashboard wiring; avoid duplicate startup logs
  
  // Check for session or student view in URL first
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session');
  const view = urlParams.get('view');

  if (sessionId) {
    // If there's a session ID, show check-in page and validate session
    
    
    // Always show the check-in page first, then validate session from server
    // This prevents immediate expiry from potentially stale cache data
    
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('teacherDashboard').style.display = 'none';
    document.getElementById('studentCheckin').style.display = 'block';
    showStudentCheckin(sessionId);
  } else if (view === 'student') {
    // On refresh with student details URL, go to homepage instead
    
    // Strip query and show dashboard; modal can be opened via click only
    if (window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    showDashboard();
  } else {
    // Otherwise, optimistically show dashboard instantly if we have a cached user
    // to avoid login screen flicker while Firebase initializes. Auth listener will
    // correct the view if the session is actually invalid/expired.
    const cachedUser = localStorage.getItem('user');
    if (cachedUser) {
      
      showDashboard();
    } else {
      // Fall back to showing login screen
      showLoginScreen();
    }

// (moved) helper functions are declared in global scope below
  }
  
  // Initialize Firebase in the background
  initializeFirebase()
    .then(() => {
      // Set up auth state listener
      return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          if (user) {
            // Save user to cache
            localStorage.setItem('user', JSON.stringify({
              email: user.email,
              uid: user.uid,
              displayName: user.displayName
            }));
            
            // If we're not already showing the dashboard, update the UI
            handlePageDisplay(user);
          } else {
            // Clear cached user on logout
            localStorage.removeItem('user');
          }
          
          // Unsubscribe after first auth state change
          if (unsubscribe) {
            unsubscribe();
          }
          resolve(user);
        });
      });
    })
    .then(() => {
      // Load students from Firestore once Firebase/auth are ready
      return loadStudentsFromFirestore();
    })
    .catch(error => {
      
      // If there's a session ID, check expiry even if Firebase init failed
      if (sessionId) {
        // Check local storage for expiry even when Firebase fails
        const cachedSession = JSON.parse(localStorage.getItem('attendanceSession_' + sessionId) || 'null');
        if (cachedSession && isSessionExpired(cachedSession)) {
          ('❌ Session is expired (Firebase failed), showing expiry message');
          document.getElementById('loginScreen').style.display = 'none';
          document.getElementById('teacherDashboard').style.display = 'none';
          document.getElementById('studentCheckin').style.display = 'block';
          displayExpiredSessionMessage();
        } else {
          // Ensure the student check-in view is visible even if Firebase init failed
          document.getElementById('loginScreen').style.display = 'none';
          document.getElementById('teacherDashboard').style.display = 'none';
          document.getElementById('studentCheckin').style.display = 'block';
          showStudentCheckin(sessionId);
        }
      } else if (view === 'student') {
        // Ensure the student details view is visible even if Firebase init failed
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('teacherDashboard').style.display = 'none';
        document.getElementById('studentCheckin').style.display = 'none';
        document.getElementById('studentDetails').style.display = 'block';
        loadStudentDetailsPage().catch(() => {});
      }
    });
});

// Sorting variables
let sortColumn = null;
let sortAsc = true;
let statusSortMode = null;

function initializeFirebase() {
  return new Promise((resolve, reject) => {
    try {
      // Validate Firebase configuration before initializing
      const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
      const missing = requiredKeys.filter(k => !firebaseConfig || !firebaseConfig[k]);
      if (missing.length) {
        
        updateFirebaseStatus('🔴 Firebase config is missing. Please configure env.js', 'error');
        return reject(new Error('Missing Firebase config: ' + missing.join(', ')));
      }
      // Initialize Firebase
      firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      auth = firebase.auth();
      
      
      
      // Set auth persistence
      auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => {
          
          
          // Enable offline persistence for Firestore
          return db.enablePersistence({ experimentalForceOwningTab: true });
        })
        .then(() => {
          
          
          // Enable network but don't fail if offline
          return db.enableNetwork().catch(err => {
            
            updateFirebaseStatus('⚠️ Working in offline mode', 'warning');
          });
        })
        .then(() => {
          
          firebaseInitialized = true;
          updateFirebaseStatus('🟢 Connected to Firebase', 'connected');
          resolve();
        })
        .catch((err) => {
          
          if (err.code === 'failed-precondition') {
            
          } else if (err.code === 'unimplemented') {
            
          }
          // Still resolve even if there were non-critical errors
          firebaseInitialized = true;
          updateFirebaseStatus('⚠️ Limited offline functionality', 'warning');
          resolve();
        });
    } catch (error) {
      
      updateFirebaseStatus('🔴 Failed to connect to Firebase', 'error');
      reject(error);
    }
  });
}

// Track if students are already being loaded
let isStudentsLoading = false;

// Load students from Firestore (one-time fetch)
async function loadStudentsFromFirestore() {
  // If already loading or already loaded, return
  if (isStudentsLoading || students.length > 0) {
    
    return;
  }

  isStudentsLoading = true;
  
  try {
    if (!db) {
      
      isStudentsLoading = false;
      return;
    }
    
    
    const snapshot = await db.collection('students').orderBy('name').get({
      source: 'server'  // Force server fetch to avoid cache issues
    });
    
    // Clear existing students and add new ones
    students.length = 0;
    const firestoreStudents = [];
    
    snapshot.docs.forEach(doc => {
      try {
        const data = doc.data();
        if (data && data.id) {
          firestoreStudents.push({
            id: data.id,
            name: data.name || '',
            father: data.father || '',
            class_group_no: data.class_group_no || 0,
            lab_group_no: data.lab_group_no || 0
          });
        }
      } catch (e) {
        
      }
    });
    
    // Ensure Jatin (id: 17032400065) is always at the end
    const jatinIndex = firestoreStudents.findIndex(s => s.id === '17032400065');
    if (jatinIndex !== -1) {
      const jatin = firestoreStudents.splice(jatinIndex, 1)[0];
      firestoreStudents.push(jatin);
    }
    
    students.push(...firestoreStudents);
    
    
    // Update UI
    const loadingMsg = document.getElementById('loadingMessage');
    if (loadingMsg) loadingMsg.style.display = 'none';
    
    // Revalidate the form to enable Start button if needed
    if (document.getElementById('startBtn')) {
      validateForm();
    }
  } catch (e) {
    
    updateFirebaseStatus('🔴 Failed to load students from Firestore', 'error');
  } finally {
    isStudentsLoading = false;
  }
}

// Location checking variables - GNDU coordinates
const UNIVERSITY_LAT = 31.635089713797168;  // GNDU latitude
const UNIVERSITY_LNG = 74.82462040523451;  // GNDU longitude
const ALLOWED_RADIUS_METERS = 10000000;  // 100 meters radius

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
window.handleLogin = async function() {
  
  
  // Check if auth is initialized
  if (!auth) {
    
    alert('Authentication service is not ready. Please refresh the page.');
    return;
  }
  
  const email = document.getElementById('loginEmail')?.value?.trim();
  const password = document.getElementById('loginPassword')?.value;
  const messageDiv = document.getElementById('loginMessage');
  const loginBtn = document.getElementById('loginBtn');

  if (!email || !password) {
    if (messageDiv) { setMessage(messageDiv, 'error', 'Please enter both email and password'); }
    return;
  }

  if (loginBtn) {
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';
  }
  
  if (messageDiv) { clearElement(messageDiv); }

  try {
    
    // Sign in with email and password
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    
    
    if (messageDiv) { setMessage(messageDiv, 'success', '✅ Login successful! Redirecting...'); }
    
    // Show dashboard after successful login
    showDashboard();
    
  } catch (error) {
    
    
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
    
    setMessage(messageDiv, 'error', `❌ ${errorMessage}`);
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
      
      
    } catch (error) {
      
      alert('Error signing out. Please try again.');
    }
  }
}

function showLoginScreen() {
  // Only show login screen if we're not in student check-in mode
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session');
  
  if (!sessionId) {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('teacherDashboard').style.display = 'none';
    document.getElementById('studentCheckin').style.display = 'none';
    const modal = document.getElementById('studentDetailsModal');
    if (modal) modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    document.body.classList.remove('dashboard-view', 'student-checkin-page');
    document.body.classList.add('login-view');
  }
}

function showDashboard() {
  // Only show dashboard if we're not in student check-in mode
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session');
  
  if (!sessionId) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('teacherDashboard').style.display = 'block';
    document.getElementById('studentCheckin').style.display = 'none';
    const modal = document.getElementById('studentDetailsModal');
    if (modal) modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    document.body.classList.remove('login-view', 'student-checkin-page');
    document.body.classList.add('dashboard-view');
    
    // Reset the URL to remove any session parameters
    if (window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
}

// Function to handle page display based on URL and auth state
function handlePageDisplay(user) {
  // This function is called on auth state changes
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session');
  const view = urlParams.get('view');
  
  // If we're on a student check-in page, show it regardless of auth state
  if (sessionId) {
    
    showStudentCheckin(sessionId);
    return;
  }
  // If student details view is requested (only open if already in modal-open state)
  if (view === 'student') {
    if (document.body.classList.contains('modal-open')) {
      
      document.getElementById('studentDetailsModal').style.display = 'flex';
      // Load student details
      loadStudentDetailsPage().catch(() => {});
    } else {
      // Do not auto-open modal on refresh; go to dashboard instead
      
      showDashboard();
    }
    return;
  }
  
  // Otherwise handle normal auth flow
  if (user) {
    
    showDashboard();
  } else {
    
    showLoginScreen();
  }
}


// ---------------- Student Details (Consolidated) ----------------
function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function showErrorInline(msg) {
  const box = document.getElementById('errorBox');
  if (box) {
    box.style.display = 'block';
    box.textContent = msg;
  }
}

function pct(n, d) {
  if (!d) return '0%';
  const v = Math.round((n / d) * 100);
  return v + '%';
}

function pctClass(n, d) {
  const v = d ? (n / d) : 0;
  if (v >= 0.75) return 'pill green';
  if (v >= 0.5) return 'pill orange';
  return 'pill red';
}

async function fetchAllSessionsForDetails() {
  if (!db) throw new Error('Firestore not initialized');
  const snap = await db.collection('attendanceSessions').orderBy('date', 'asc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function fetchAllAttendanceDocsForStudent(studentId) {
  const qSnap = await db.collectionGroup('attendance').where('studentId', '==', String(studentId)).get();
  return qSnap.docs.map(d => ({ id: d.id, ...d.data(), _path: d.ref.path }));
}

async function fetchAllAttendanceDocsForStudentWithFallback(studentId, sessions) {
  try {
    return await fetchAllAttendanceDocsForStudent(studentId);
  } catch (e) {
    if (e && (e.code === 'failed-precondition' || String(e.message || '').includes('COLLECTION_GROUP'))) {
      
      const results = [];
      const chunkSize = 10;
      for (let i = 0; i < sessions.length; i += chunkSize) {
        const chunk = sessions.slice(i, i + chunkSize);
        const promises = chunk.map(async (s) => {
          try {
            const qs = await db
              .collection('attendanceSessions')
              .doc(s.id)
              .collection('attendance')
              .where('studentId', '==', String(studentId))
              .limit(1)
              .get();
            if (!qs.empty) {
              const d = qs.docs[0];
              return { id: d.id, ...d.data(), _path: d.ref.path };
            }
          } catch (err) {
            
          }
          return null;
        });
        const chunkRes = await Promise.all(promises);
        chunkRes.forEach((r) => { if (r) results.push(r); });
      }
      return results;
    }
    throw e;
  }
}

async function loadStudentDetailsPage() {
  try {
    const studentId = getQueryParam('id');
    if (!studentId) {
      showErrorInline('Missing student id in URL.');
      return;
    }
    setText('metaId', studentId);
    setText('studentDetailsName', 'Loading...');

    // Wait for auth and students to load
    try {
      await new Promise(resolve => {
        let settled = false;
        if (auth) {
          auth.onAuthStateChanged(async () => { 
            if (!settled) { 
              settled = true;
              // Load students if not already loaded
              if (students.length === 0) {
                await loadStudentsFromFirestore();
              }
              resolve(); 
            } 
          });
          setTimeout(() => { 
            if (!settled) { 
              settled = true; 
              resolve(); 
            } 
          }, 1500);
        } else { 
          resolve(); 
        }
      });
    } catch (e) {
      
    }

    const sessions = await fetchAllSessionsForDetails();
    if (!sessions.length) {
      showErrorInline('No attendance sessions found.');
      return;
    }
    const attendanceDocs = await fetchAllAttendanceDocsForStudentWithFallback(studentId, sessions);

    const sessionById = new Map(sessions.map(s => [s.sessionId || s.id, s]));
    const perSubject = new Map(); // key by subjectName or subjectCode
    const totalSessions = sessions.length;
    let totalPresent = 0;
    let studentName = null;
    let fatherName = null;

    // Helper function to normalize subject names and remove duplicates
    function normalizeSubjectName(subjectString) {
      if (!subjectString) return 'General';
      
      // Remove course codes like "CEL1020 - ", "MTL1001 - ", "PHL1083 - ", etc.
      const cleanName = subjectString.replace(/^[A-Z]{2,4}\d{4}\s*-\s*/i, '').trim();
      
      // Return the cleaned name or original if no course code was found
      return cleanName || subjectString;
    }

    for (const att of attendanceDocs) {
      const sid = att.sessionId || att.session || att._sessionId;
      const session = sessionById.get(sid);
      const rawSubjName = att.subjectName || (session && (session.subjectName || session.subject)) || (att.subjectCode || 'General');
      const key = normalizeSubjectName(rawSubjName);
      const entry = perSubject.get(key) || { total: 0, present: 0 };
      entry.present += 1; // presence indicated by doc existence
      perSubject.set(key, entry);
      totalPresent += 1;
      if (!studentName && (att.name || att.studentName)) studentName = att.name || att.studentName;
      if (!fatherName && (att.father || att.fatherName)) fatherName = att.father || att.fatherName;
    }

    // Compute total sessions per subject across sessions
    const subjectSessionCounts = new Map();
    for (const s of sessions) {
      const rawSubj = s.subjectName || s.subject || s.subjectCode || 'General';
      const normalizedSubj = normalizeSubjectName(rawSubj);
      subjectSessionCounts.set(normalizedSubj, (subjectSessionCounts.get(normalizedSubj) || 0) + 1);
    }
    for (const [subject, total] of subjectSessionCounts.entries()) {
      const entry = perSubject.get(subject) || { total: 0, present: 0 };
      entry.total = total;
      perSubject.set(subject, entry);
    }

    // Debug log student data
    
    
    
    
    // If missing from attendance docs, try students cache with different ID formats
    if (!studentName || !fatherName) {
      // Try different ID formats to handle potential type mismatches
      const possibleIdFormats = [
        studentId, // original
        String(studentId), // string version
        Number(studentId), // number version
        studentId.trim(), // trimmed string
        studentId.padStart(2, '0') // handle leading zeros if any
      ];
      
      let foundStudent = null;
      
      if (Array.isArray(students)) {
        // Try each ID format until we find a match
        for (const idFormat of possibleIdFormats) {
          foundStudent = students.find(x => 
            x && (
              x.id === idFormat || 
              String(x.id) === String(idFormat) ||
              Number(x.id) === Number(idFormat)
            )
          );
          if (foundStudent) break;
        }
      }
      
      
      if (foundStudent) {
        if (!studentName && foundStudent.name) {
          studentName = foundStudent.name;
          
        }
        if (!fatherName && foundStudent.father) {
          fatherName = foundStudent.father;
          
        }
      } else {
        
      }
    }

    // Fallback to student ID if name not found
    
    const displayName = studentName || `Student ${studentId}`;
    
    // Update the student name in the UI
    setText('studentDetailsName', displayName);
    // Don't change page title for modal view
    setText('metaFather', fatherName || '-');
    setText('overall', pct(totalPresent, totalSessions));
    setText('totalSessions', String(totalSessions));

    const list = document.getElementById('subjectList');
    if (list) {
      list.innerHTML = '';
      const subjectsSorted = Array.from(perSubject.entries()).sort((a,b) => String(a[0]).localeCompare(String(b[0])));
      for (const [subject, agg] of subjectsSorted) {
        const div = document.createElement('div');
        div.className = 'subject-item';
        const left = document.createElement('div');
        left.innerHTML = `<span class="subject-name">${subject}</span><br/><small>${agg.present}/${agg.total} present</small>`;
        const right = document.createElement('div');
        const pill = document.createElement('span');
        pill.className = pctClass(agg.present, agg.total);
        pill.textContent = pct(agg.present, agg.total);
        right.appendChild(pill);
        div.appendChild(left);
        div.appendChild(right);
        list.appendChild(div);
      }
    }
  } catch (e) {
    
    showErrorInline('Failed to load student attendance. See console for details.');
  }
}

// Location checking utilities
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function showLocationStatus(message, status, isLoading = false) {
  const statusElement = document.getElementById('locationStatus');
  if (!statusElement) return;
  
  // Clear previous content and classes
  statusElement.className = `location-status ${status} show`;
  statusElement.innerHTML = '';
  
  // Add icon based on status
  let icon = '';
  if (isLoading) {
    icon = '<div class="loading-spinner"></div>';
  } else if (status === 'allowed') {
    icon = '<i class="fas fa-check-circle"></i>';
  } else if (status === 'denied') {
    icon = '<i class="fas fa-exclamation-circle"></i>';
  }
  
  // Add message
  const messageElement = document.createElement('span');
  messageElement.textContent = message;
  
  // Build the status element
  statusElement.innerHTML = icon;
  statusElement.appendChild(messageElement);
  
  // Add pulse effect for loading state
  if (isLoading) {
    statusElement.classList.add('pulse');
  } else {
    statusElement.classList.remove('pulse');
  }
}

async function checkUserLocation(retryCount = 0) {
  const maxRetries = 3;
  
  if (!navigator.geolocation) {
    showLocationStatus('Geolocation is not supported by your browser', 'denied');
    return false;
  }
  
  // For production, we recommend using HTTPS, but allow HTTP for local development
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    
    // Continue with location check even without HTTPS
  }
  
  // Show loading state
  showLocationStatus('Getting your location...', 'checking', true);
  
  return new Promise((resolve) => {
    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };
    
    // Debug: Log that we're starting location check
    
    
    const handleSuccess = (position) => {
      try {
        const { latitude, longitude, accuracy } = position.coords;
        
        
        // Calculate distance in meters
        const distance = calculateDistance(latitude, longitude, UNIVERSITY_LAT, UNIVERSITY_LNG);
        const distanceRounded = Math.round(distance);
        (`Distance from GNDU: ${distanceRounded}m (within ${ALLOWED_RADIUS_METERS}m allowed)`);
        
        if (isNaN(distance) || !isFinite(distance)) {
          throw new Error('Invalid distance calculation');
        }
        
        if (distance <= ALLOWED_RADIUS_METERS) {
          const successMsg = `✅ Location verified! You're ${distanceRounded}m from GNDU`;
          
          showLocationStatus(successMsg, 'allowed');
          resolve({ success: true, distance: distanceRounded });
        } else {
          const statusMsg = `❌ You're ${distanceRounded}m from GNDU (must be within ${ALLOWED_RADIUS_METERS}m)`;
          
          showLocationStatus(statusMsg, 'denied');
          resolve({ success: false, distance: distanceRounded });
        }
      } catch (error) {
        
        showLocationStatus('❌ Error processing your location', 'denied');
        resolve({ success: false, error: error.message });
      }
    };
    
    const handleError = (error) => {
      
      let message = '❌ Error: ';
      
      switch(error.code) {
        case error.PERMISSION_DENIED:
          message += 'Location permission denied. Please enable location access in your browser settings.';
          break;
        case error.POSITION_UNAVAILABLE:
          message += 'Location information is unavailable. Please check your internet connection.';
          break;
        case error.TIMEOUT:
          message += 'The request to get your location timed out.';
          break;
        default:
          message += 'Could not get your location.';
      }
      
      if (retryCount < maxRetries) {
        message += ` Retrying... (${retryCount + 1}/${maxRetries})`;
        showLocationStatus(message, 'checking');
        setTimeout(() => {
          checkUserLocation(retryCount + 1).then(result => {
          if (result && typeof result === 'object' && 'success' in result) {
            resolve(result);
          } else {
            // Handle legacy boolean return value for backward compatibility
            resolve({ success: result, distance: 0 });
          }
        });
        }, 2000);
        return;
      }
      
      switch(error.code) {
        case error.PERMISSION_DENIED:
          message = 'Location permission denied. Please enable it to continue.';
          break;
        case error.POSITION_UNAVAILABLE:
          message = 'Location information is unavailable.';
          break;
        case error.TIMEOUT:
          message = 'The request to get your location timed out.';
          break;
        default:
          message = 'An unknown error occurred while getting your location.';
      }
      
      showLocationStatus(message, 'denied');
      resolve(false);
    };
    
    // Check permissions first if supported
    if (navigator.permissions) {
      navigator.permissions.query({name: 'geolocation'})
        .then(permissionStatus => {
          
          
          if (permissionStatus.state === 'denied') {
            handleError({ code: 'PERMISSION_DENIED' });
            return;
          }
          
          // If permission is granted or prompt, proceed with getting location
          navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);
          
          // Listen for permission changes
          permissionStatus.onchange = () => {
            
            if (permissionStatus.state === 'granted') {
              navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);
            }
          };
        })
        .catch(error => {
          
          // If permission query fails, try getting location anyway
          navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);
        });
    } else {
      // For browsers that don't support permissions API
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);
    }
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

// Safe DOM helpers
function clearElement(el) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}

function setMessage(el, type, text) {
  if (!el) return;
  clearElement(el);
  const wrapper = document.createElement('div');
  wrapper.className = `${type}-message`;
  wrapper.textContent = text;
  el.appendChild(wrapper);
}

function checkStudentsLoaded() {
  const loadingMsg = document.getElementById('loadingMessage');
  
  if (Array.isArray(students) && students.length > 0) {
    if (loadingMsg) loadingMsg.style.display = 'none';
    
    return true;
  } else {
    if (loadingMsg) {
      loadingMsg.innerHTML = '⏳ Loading students from Firestore...';
      loadingMsg.style.background = '#fff3cd';
      loadingMsg.style.color = '#856404';
    }
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

// When date/subject changes, check if a session already exists and prefill
async function handleSessionPrefill() {
  try {
    const dateVal = document.getElementById('attendanceDate')?.value;
    const subjectCode = document.getElementById('subjectCode')?.value;
    const secretInput = document.getElementById('secretCode');
    const startBtn = document.getElementById('startBtn');

    if (!dateVal || !subjectCode) {
      if (startBtn) startBtn.textContent = 'Start Attendance Session';
      if (secretInput) secretInput.readOnly = false;
      return;
    }

    const selectedDate = new Date(dateVal);
    const formattedDate = selectedDate.toLocaleDateString('en-GB');

    const existing = await findExistingSession(formattedDate, subjectCode);
    if (existing && existing.id) {
      // Prefill and lock secret code, update button label
      sessionId = existing.id;
      currentSession = existing;
      sessionSecretCode = existing.secretCode || '';

      if (secretInput) {
        secretInput.value = sessionSecretCode;
        secretInput.readOnly = true;
      }
      if (startBtn) startBtn.textContent = 'View Attendance Session';

      // Ensure button gets enabled
      validateForm();
    } else {
      // No existing session, restore defaults and clear secret code
      if (secretInput) {
        secretInput.readOnly = false;
        secretInput.value = '';
      }
      if (startBtn) startBtn.textContent = 'Start Attendance Session';
      // Update validation because we cleared the secret
      validateForm();
    }
  } catch (e) {
    
  }
}

function generateSessionId() {
  // Crypto-strong 128-bit random id in hex
  const bytes = new Uint8Array(16);
  (window.crypto || window.msCrypto).getRandomValues(bytes);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return 'ATT_' + hex;
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

// Helper function to safely format expiry time
function formatExpiryTime(expiryTime) {
  if (!expiryTime) return 'N/A';
  
  try {
    let date;
    if (expiryTime && typeof expiryTime.toDate === 'function') {
      // Firestore Timestamp object
      date = expiryTime.toDate();
    } else if (typeof expiryTime === 'string') {
      // ISO string
      date = new Date(expiryTime);
    } else if (expiryTime && typeof expiryTime.seconds === 'number') {
      // Firestore Timestamp in plain object format
      date = new Date(expiryTime.seconds * 1000);
    } else {
      // Direct Date object or other format
      date = new Date(expiryTime);
    }
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleString();
  } catch (error) {
    
    return 'Invalid Date';
  }
}

// Enhanced startAttendance with secret code
// Test function to verify expiry - can be called from console: testExpiry()
window.testExpiry = function() {
  const testSession = {
    sessionId: 'TEST_123',
    date: new Date().toLocaleDateString('en-GB'),
    expiryTime: new Date(Date.now() - 1000).toISOString() // 1 second ago
  };
  
  ('Testing expiry with expired session:', isSessionExpired(testSession));
  
  const validSession = {
    sessionId: 'TEST_456',
    date: new Date().toLocaleDateString('en-GB'),
    expiryTime: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
  };
  
  ('Testing expiry with valid session:', isSessionExpired(validSession));
};

function isSessionExpired(sessionData) {
  // Handle null/undefined sessionData
  if (!sessionData) {
    
    return true;
  }
  
  
  
  // Check if session was manually expired via isExpired flag
  if (sessionData.isExpired === true) {
    ('❌ Session expired via isExpired flag (manual expiry)');
    return true;
  }
  
  if (!sessionData.expiryTime) {
    // For very old sessions (created before expiry feature), consider them expired after 2 hours
    // This prevents indefinite access to old sessions
    let sessionDate;
    if (sessionData.date) {
      try {
        // Parse dd/mm/yyyy format
        const parts = sessionData.date.split('/');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          // Check if date is valid
          if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() >= 2020) {
            sessionDate = parsedDate;
          } else {
            
            sessionDate = new Date();
          }
        } else {
          
          sessionDate = new Date();
        }
      } catch (e) {
        
        sessionDate = new Date();
      }
    } else {
      sessionDate = new Date();
    }
    
    // Only expire old sessions if they are actually old (created more than 2 hours ago)
    const maxAge = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    const age = Date.now() - sessionDate.getTime();
    const isOld = age > maxAge;
    ('📅 Old session check:', { 
      age: Math.round(age / 1000 / 60), // minutes
      maxAge: Math.round(maxAge / 1000 / 60), // minutes
      isOld, 
      parsedDate: sessionDate.toISOString() 
    });
    return isOld;
  }
  
  const now = new Date();
  
  // Handle missing or invalid expiryTime
  if (!sessionData.expiryTime || sessionData.expiryTime === 'Invalid Date') {
    
    return true; // Treat invalid dates as expired
  }
  
  try {
    // Handle Firestore Timestamp objects
    let expiryTime;
    if (sessionData.expiryTime && typeof sessionData.expiryTime.toDate === 'function') {
      // Firestore Timestamp object
      expiryTime = sessionData.expiryTime.toDate();
    } else if (typeof sessionData.expiryTime === 'string') {
      // ISO string from localStorage
      expiryTime = new Date(sessionData.expiryTime);
    } else if (sessionData.expiryTime && typeof sessionData.expiryTime.seconds === 'number') {
      // Firestore Timestamp in plain object format
      expiryTime = new Date(sessionData.expiryTime.seconds * 1000);
    } else {
      // Direct Date object or other format
      expiryTime = new Date(sessionData.expiryTime);
    }
    
    if (isNaN(expiryTime.getTime())) {
      
      return true;
    }
    
    // Add 5-minute buffer to prevent premature expiry due to clock differences
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    const isExpired = now.getTime() > (expiryTime.getTime() + bufferTime);
    ('⏰ Expiry check:', { 
      now: now.toISOString(), 
      expiryTime: expiryTime.toISOString(), 
      isExpired,
      bufferMinutes: 5
    });
    return isExpired;
  } catch (error) {
    
    return true;
  }
}

async function expireSessionManually() {
  if (!sessionId) {
    alert('No active session to expire');
    return;
  }

  if (!confirm('Are you sure you want to expire this attendance session? Students will no longer be able to mark attendance.')) {
    return;
  }

  try {
    // Update Firebase
    if (firebaseInitialized) {
      await db.collection('attendanceSessions').doc(sessionId).update({
        isExpired: true,
        expiredAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'expired'
      });
    }

    // Update local storage
    const localSessionKey = `session_${currentSession.date}_${currentSession.subjectCode}`;
    const sessionData = JSON.parse(localStorage.getItem(localSessionKey) || '{}');
    sessionData.isExpired = true;
    sessionData.expiredAt = new Date().toISOString();
    localStorage.setItem(localSessionKey, JSON.stringify(sessionData));
    localStorage.setItem('attendanceSession_' + sessionId, JSON.stringify(sessionData));

    // Update UI
    document.getElementById('sessionExpired').style.display = 'block';
    document.getElementById('expiryInfo').textContent = 'Session expired manually';
    document.getElementById('expiryInfo').style.color = '#e74c3c';
    
    // Disable attendance marking
    document.getElementById('studentCheckinForm')?.style.setProperty('opacity', '0.5');
    document.getElementById('studentCheckinForm')?.style.setProperty('pointer-events', 'none');
    
    // Change expire button to restart button
    const expireBtn = document.querySelector('.share-btn[onclick="expireSessionManually()"]');
    if (expireBtn) {
      expireBtn.textContent = '🔄 Restart Session';
      expireBtn.style.backgroundColor = '#27ae60';
      expireBtn.setAttribute('onclick', 'restartSession()');
    }
    
    showNotification('Session expired successfully', 'success');
    
  } catch (error) {
    
    alert('Error expiring session. Please try again.');
  }
}

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
      // Check if existing session is expired
      if (isSessionExpired(existingSession)) {
        sessionId = existingSession.id;
        currentSession = existingSession;
        sessionSecretCode = existingSession.secretCode || secretCode;
        
        showNotification('📖 Viewing expired attendance session', 'info');
        
        await loadExistingAttendance(sessionId);
      } else {
        sessionId = existingSession.id;
        currentSession = existingSession;
        sessionSecretCode = existingSession.secretCode || secretCode;
        
        showNotification('📚 Continuing existing attendance session', 'success');
        
        await loadExistingAttendance(sessionId);
      }
    } else {
      isNewSession = true;
    }

  if (isNewSession) {
    const classDetails = findTeacherAndTime(date, subjectCode);
    sessionId = generateSessionId();
    sessionSecretCode = secretCode;

    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + 1);

    currentSession = {
      sessionId: sessionId,
      date: formattedDate,
      day: dayName,
      timeSlot: classDetails.timeSlot,
      subjectCode: subjectCode,
      subjectName: subjectNames[subjectCode],
      teacherName: classDetails.teacher,
      secretCode: sessionSecretCode,
      expiryTime: expiryTime.toISOString(),
      isExpired: false,
      createdAt: new Date().toISOString()
    };

    await createAttendanceSession(currentSession);
    
    showNotification('✅ New attendance session started (expires in 1 hour)', 'success');
    
    attendance = {};
    attendanceTime = {};
  }

  checkinUrl = window.location.href.split('?')[0] + '?session=' + sessionId;

  const isExpired = isSessionExpired(currentSession);
  const sessionStatus = isNewSession ? 'New' : (isExpired ? 'Viewing Expired' : 'Continuing');
  
  document.getElementById('classInfo').innerHTML = `
    <h3>${sessionStatus} Attendance Session</h3>
    <div class="class-details">
      <div><strong>Date:</strong> ${currentSession.date} (${currentSession.day})</div>
      <div><strong>Time:</strong> ${currentSession.timeSlot}</div>
      <div><strong>Subject:</strong> ${currentSession.subjectName}</div>
      <div><strong>Teacher:</strong> ${currentSession.teacherName}</div>
      ${!isNewSession && !isExpired ? '<div><strong>Status:</strong> Existing session resumed</div>' : ''}
    </div>
    <div class="secret-code-info">
      <strong>🔑 Secret Code:</strong>
      <div class="secret-code-display">${sessionSecretCode}</div>
    </div>
    <div class="expiry-info" id="expiryInfo">
      ${isExpired ? '<strong>⏰ Expired:</strong> This session has expired' : `<strong>⏰ Expires:</strong> ${formatExpiryTime(currentSession.expiryTime)}`}
    </div>
    ${isExpired ? '<div class="session-expired" id="sessionExpired">❌ Session Expired - Students can no longer mark attendance</div>' : ''}
  `;

  document.getElementById('sessionUrl').textContent = checkinUrl;

  // Replace expire button with restart button for expired sessions
  if (isExpired) {
    const expireBtn = document.querySelector('.share-btn[onclick="expireSessionManually()"]');
    if (expireBtn) {
      expireBtn.textContent = '🔄 Restart Session';
      expireBtn.style.backgroundColor = '#27ae60';
      expireBtn.setAttribute('onclick', 'restartSession()');
    }
  }

  document.getElementById('setupSection').style.display = 'none';
  document.getElementById('attendanceSection').style.display = 'block';

  renderTable();
  startListeningToAttendance();
}

async function restartSession() {
  if (!confirm('Are you sure you want to restart this session? This will reset the session expiry time and clear existing attendance data.')) {
    return;
  }

  try {
    // Reuse existing session ID to keep the same address
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + 1);

    const newSession = {
      sessionId: sessionId, // Keep the same session ID
      date: currentSession.date,
      day: currentSession.day,
      timeSlot: currentSession.timeSlot,
      subjectCode: currentSession.subjectCode,
      subjectName: currentSession.subjectName,
      teacherName: currentSession.teacherName,
      secretCode: currentSession.secretCode,
      expiryTime: expiryTime.toISOString(),
      isExpired: false,
      createdAt: new Date().toISOString()
    };

    await createAttendanceSession(newSession);
    
    // Update current session
    currentSession = newSession;
    
    // Keep the same checkin URL since session ID hasn't changed
    checkinUrl = window.location.href.split('?')[0] + '?session=' + sessionId;
    document.getElementById('sessionUrl').textContent = checkinUrl;
    
    document.getElementById('classInfo').innerHTML = `
      <h3>Restarted Attendance Session</h3>
      <div class="class-details">
        <div><strong>Date:</strong> ${newSession.date} (${newSession.day})</div>
        <div><strong>Time:</strong> ${newSession.timeSlot}</div>
        <div><strong>Subject:</strong> ${newSession.subjectName}</div>
        <div><strong>Teacher:</strong> ${newSession.teacherName}</div>
        <div><strong>Status:</strong> Session restarted with fresh expiry</div>
      </div>
      <div class="secret-code-info">
        <strong>🔑 Secret Code:</strong>
        <div class="secret-code-display">${newSession.secretCode}</div>
      </div>
      <div class="expiry-info" id="expiryInfo">
        <strong>⏰ Expires:</strong> ${expiryTime.toLocaleString()}
      </div>
    `;
    
    // Remove any existing expired session warning
    const existingExpiredWarning = document.getElementById('sessionExpired');
    if (existingExpiredWarning) {
      existingExpiredWarning.remove();
    }

    // Reset button back to expire
    const restartBtn = document.querySelector('.share-btn[onclick="restartSession()"]');
    if (restartBtn) {
      restartBtn.textContent = '⏰ Expire Session';
      restartBtn.style.backgroundColor = '#e74c3c';
      restartBtn.setAttribute('onclick', 'expireSessionManually()');
    }

    // Keep existing attendance data when restarting session
    renderTable();
    startListeningToAttendance();
    
    showNotification('✅ Session restarted successfully with fresh expiry', 'success');
    
    
  } catch (error) {
    
    alert('Error restarting session. Please try again.');
  }
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
// Function to close the student details modal
function closeStudentDetailsModal() {
  const modal = document.getElementById('studentDetailsModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    // Remove view=student from URL without reload
    if (window.history.replaceState) {
      const base = window.location.pathname;
      window.history.replaceState({}, document.title, base);
    }
  }
}

document.addEventListener('DOMContentLoaded', function() {
  

  // Add click handler for close button
  const closeBtn = document.getElementById('closeStudentDetails');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeStudentDetailsModal);
  }
  
  // Close modal when clicking outside the card
  const modal = document.getElementById('studentDetailsModal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeStudentDetailsModal();
      }
    });
  }

  // Sync modal with back/forward navigation
  window.addEventListener('popstate', function() {
    const params = new URLSearchParams(window.location.search);
    const isStudent = params.get('view') === 'student';
    const id = params.get('id');
    const modalEl = document.getElementById('studentDetailsModal');
    if (!modalEl) return;
    if (isStudent && id) {
      modalEl.style.display = 'flex';
      document.body.classList.add('modal-open');
      loadStudentDetailsPage().catch(console.error);
    } else {
      closeStudentDetailsModal();
    }
  });

  // Only set up teacher dashboard elements if we're not on the student check-in page
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session');
  
  if (!sessionId) {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDate').value = today;
    
    document.getElementById('attendanceDate').addEventListener('change', () => { validateForm(); handleSessionPrefill(); });
    document.getElementById('subjectCode').addEventListener('change', () => { validateForm(); handleSessionPrefill(); });
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

    // Wire up Print and Export buttons
    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
      printBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (isAndroid()) {
          downloadAttendancePdf();
        } else {
          printAttendance();
        }
      });
    }
    const printAsIsBtn = document.getElementById('printAsIsBtn');
    if (printAsIsBtn) {
      printAsIsBtn.addEventListener('click', (e) => { e.preventDefault(); printTableAsIs(); });
    }
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', (e) => { e.preventDefault(); exportToExcel(); });
    }

    // Build absolute roll number maps (1..N) once
    if (Array.isArray(window.students)) {
      window.rollNumbers = {}; // id -> roll
      window.idByRoll = {};    // roll -> id
      window.students.forEach((s, i) => {
        const roll = i + 1;
        const sid = String(s.id);
        window.rollNumbers[sid] = roll;
        window.idByRoll[roll] = sid;
      });
    }
    updateRollPlaceholder();
    setupSorting();
    
    // Run once on load to detect any existing session for today/selected subject
    handleSessionPrefill();
    // Ensure initial render with proper roll numbers
    buildRollMapsIfNeeded();
    updateRollPlaceholder();
    renderTable();
  } else {
    
    (function ensureStudentPageRollMaps(){
      const studentList = (typeof students !== 'undefined' && Array.isArray(students))
        ? students
        : (Array.isArray(window.students) ? window.students : []);
      if (!Array.isArray(studentList) || studentList.length === 0) return;
      window.rollNumbers = window.rollNumbers || {};
      window.idByRoll = window.idByRoll || {};
      if (Object.keys(window.rollNumbers).length === 0) {
        studentList.forEach((s, i) => {
          const roll = i + 1;
          const sid = String(s.id);
          window.rollNumbers[sid] = roll;
          window.idByRoll[roll] = sid;
        });
      }
      updateRollPlaceholder();
    })();
    buildRollMapsIfNeeded();
  }
});

window.addEventListener('beforeunload', function() {
  stopListeningToAttendance();
});

// Sorting functions

// Ensure roll maps are available
function buildRollMapsIfNeeded() {
  const studentList = (typeof students !== 'undefined' && Array.isArray(students))
    ? students
    : (Array.isArray(window.students) ? window.students : []);
  if (!Array.isArray(studentList) || studentList.length === 0) return;
  if (!window.rollNumbers) window.rollNumbers = {};
  if (!window.idByRoll) window.idByRoll = {};
  if (Object.keys(window.rollNumbers).length === 0) {
    studentList.forEach((s, i) => {
      const roll = i + 1;
      const sid = String(s.id);
      window.rollNumbers[sid] = roll;
      window.idByRoll[roll] = sid;
    });
  }
}

// Get absolute roll number (1..N) for a given student id
function getRollNumberById(id) {
  buildRollMapsIfNeeded();
  const sid = String(id);
  let rn = window.rollNumbers?.[sid];
  if (!rn) {
    const studentList = (typeof students !== 'undefined' && Array.isArray(students))
      ? students
      : (Array.isArray(window.students) ? window.students : []);
    const idx = studentList.findIndex(s => String(s.id) === sid);
    if (idx >= 0) {
      rn = idx + 1;
      // cache it
      window.rollNumbers[sid] = rn;
      window.idByRoll[rn] = sid;
    }
  }
  return rn || '';
}

// Normalize names for reliable comparison (trim, collapse spaces, case-insensitive)
function normalizeName(str) {
  return (str || '')
    .toString()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Update student roll number input placeholder to show valid range (1..N)
function updateRollPlaceholder() {
  try {
    const input = document.getElementById('studentId');
    if (!input) return;
    const listForTotal = (typeof students !== 'undefined' && Array.isArray(students))
      ? students
      : (Array.isArray(window.students) ? window.students : []);
    const total = listForTotal.length;
    if (total > 0) {
      input.placeholder = `Enter your Roll Number (1-${total})`;
    }
  } catch {}
}
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
  } else if (sortColumn === 'roll') {
    // Sort by absolute roll number derived from original order
    return data.sort((a, b) => {
      const ra = getRollNumberById(a.id) || 0;
      const rb = getRollNumberById(b.id) || 0;
      return sortAsc ? (ra - rb) : (rb - ra);
    });
  }
  
  return data.sort(compareValues(sortColumn, sortAsc));
}

function setupSorting() {
  const headers = {
    'rollHeader': 'roll',
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
      const rollStr = String(getRollNumberById(student.id) || '').toLowerCase();
      return student.name.toLowerCase().includes(searchTerm) || 
            student.father.toLowerCase().includes(searchTerm) ||
            student.id.toLowerCase().includes(searchTerm) ||
            rollStr.includes(searchTerm);
    });
    
    return filtered;
  }

  return sortData(filtered);
}

async function findExistingSession(date, subjectCode) {
  if (!firebaseInitialized) {
    
    
    const localSessionKey = `session_${date}_${subjectCode}`;
    const localSession = localStorage.getItem(localSessionKey);
    if (localSession) {
      
      return JSON.parse(localSession);
    }
    return null;
  }

  try {
    
    
    const sessionsRef = db.collection('attendanceSessions');
    const querySnapshot = await sessionsRef
      .where('date', '==', date)
      .where('subjectCode', '==', subjectCode)
      .limit(1)
      .get();

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      
      return { id: doc.id, ...doc.data() };
    }

    
    return null;
  } catch (error) {
    
    return null;
  }
}

async function loadExistingAttendance(sessionId) {
  // Keep existing attendance data to prevent UI flicker
  const existingAttendance = { ...attendance };
  const existingAttendanceTime = { ...attendanceTime };
  
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

      (`📚 Loaded ${Object.keys(attendance).length} attendance records from Firebase`);
    } catch (error) {
      
    }
  }

  const localAttendanceKey = 'attendance_' + sessionId;
  const localAttendance = JSON.parse(localStorage.getItem(localAttendanceKey) || '{}');
  
  // Merge local attendance with existing data
  Object.keys(localAttendance).forEach(studentId => {
    if (!attendance[studentId]) {
      attendance[studentId] = true;
      attendanceTime[studentId] = localAttendance[studentId].time || '-';
    }
  });
  
  // Preserve any existing attendance that wasn't overwritten
  Object.keys(existingAttendance).forEach(studentId => {
    if (!attendance[studentId]) {
      attendance[studentId] = existingAttendance[studentId];
      attendanceTime[studentId] = existingAttendanceTime[studentId] || '-';
    }
  });

  (`📊 Total attendance loaded: ${Object.keys(attendance).length} students`);
}

async function createAttendanceSession(sessionData) {
  // Calculate expiry time (1 hour from now)
  const expiryTime = new Date();
  expiryTime.setHours(expiryTime.getHours() + 1);
  
  // Ensure all required fields are included in the session data
  const sessionWithExpiry = {
    ...sessionData,
    secretCode: sessionData.secretCode || '', // Ensure secretCode exists
    expiryTime: expiryTime.toISOString(),
    isExpired: false,
    createdAt: sessionData.createdAt || new Date().toISOString()
  };
  
  // Save to localStorage with both keys for backward compatibility
  const localSessionKey = `session_${sessionData.date}_${sessionData.subjectCode}`;
  const sessionString = JSON.stringify(sessionWithExpiry);
  localStorage.setItem(localSessionKey, sessionString);
  localStorage.setItem('attendanceSession_' + sessionData.sessionId, sessionString);

  if (!firebaseInitialized) {
    
    return;
  }

  try {
    await db.collection('attendanceSessions').doc(sessionData.sessionId).set({
      ...sessionWithExpiry,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'active',
      totalStudents: students.length,
      presentCount: 0,
      expiryTime: firebase.firestore.Timestamp.fromDate(expiryTime),
      isExpired: false
    });
    
  } catch (error) {
    
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
      
    } catch (error) {
      
      // Create a local ID for offline use
      sessionId = 'offline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      // Store in local storage for offline use
      const offlineSessions = JSON.parse(localStorage.getItem('offlineSessions') || '[]');
      offlineSessions.push({ id: sessionId, ...sessionData });
      localStorage.setItem('offlineSessions', JSON.stringify(offlineSessions));
      
      
      // Show warning to user
      showNotification('⚠️ Working in offline mode. Data will sync when back online.', 'warning');
    }
    
    return sessionId;
  } catch (error) {
    
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

    
    return true;
  } catch (error) {
    
    
    // If offline, the data will be synced when back online
    if (error.code === 'unavailable') {
      
      return true; // Consider it a success since it will sync later
    }
    
    return false;
  }
}

function startListeningToAttendance() {
  if (!sessionId) return;
  
  
  
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
        ('Received attendance update with', snapshot.docChanges().length, 'changes');
        
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data();
          const studentId = data.studentId;
          
          if (!studentId) {
            
            return;
          }
          
          switch (change.type) {
            case 'added':
            case 'modified':
              
              // Update local attendance state
              attendance[studentId] = true;
              attendanceTime[studentId] = data.timestamp?.toDate?.() || data.markedAt?.toDate?.() || new Date();
              
              // Update the UI
              const student = students.find(s => s.id.toString() === studentId);
              if (student) {
                updateAttendance(studentId, 'present', attendanceTime[studentId]);
                
              }
              break;
              
            case 'removed':
              
              delete attendance[studentId];
              delete attendanceTime[studentId];
              updateAttendance(studentId, 'absent', null);
              
              break;
          }
        });
        
        updateStats();
        updateFirebaseStatus('🟢 Connected to Firebase', 'connected');
        renderTable();
      },
      (error) => {
        // Error callback
        
        loadOfflineAttendance();
        updateFirebaseStatus('⚠️ Working in offline mode', 'warning');
        showNotification('Connection issues. Working in offline mode.', 'error');
      }
    );
  } catch (error) {
    
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

  clearElement(tbody);
  filteredStudents.forEach((student, index) => {
    const row = document.createElement("tr");
    if (attendance[student.id]) row.classList.add("present");
    const td1 = document.createElement('td'); td1.textContent = String(getRollNumberById(student.id));
    const td2 = document.createElement('td'); td2.textContent = String(student.id);
    const td3 = document.createElement('td');
  // Make student name clickable to view detailed attendance in modal
  const nameLink = document.createElement('a');
  // Keep the URL format as requested (?view=student&id=...)
  nameLink.href = `${window.location.pathname}?view=student&id=${encodeURIComponent(String(student.id))}`;
  nameLink.textContent = String(student.name || '');
  nameLink.className = 'student-link';
  nameLink.title = 'View attendance details';
  nameLink.addEventListener('click', function(e) {
    e.preventDefault();
    // Update URL without reloading the page (preserve requested format)
    const newUrl = nameLink.href;
    window.history.pushState({ path: newUrl }, '', newUrl);
    
    // Show the modal and load student details
    const modal = document.getElementById('studentDetailsModal');
    if (modal) {
      modal.style.display = 'flex';
      document.body.classList.add('modal-open');
      loadStudentDetailsPage().catch(console.error);
    }
  });
  td3.appendChild(nameLink);
  // Make entire cell clickable for easier tapping
  td3.style.cursor = 'pointer';
  td3.addEventListener('click', (e) => {
    // Avoid double-handling if anchor default fires
    if (e.target && e.target.tagName === 'A') return;
    // Trigger the same behavior as clicking the name link
    nameLink.click();
  });
    const td4 = document.createElement('td'); td4.textContent = String(student.father || '');
    const td5 = document.createElement('td');
    const statusSpan = document.createElement('span');
    if (attendance[student.id]) { statusSpan.className = 'status-present'; statusSpan.textContent = 'Present'; }
    else { statusSpan.className = 'status-absent'; statusSpan.textContent = 'Absent'; }
    td5.appendChild(statusSpan);
    const td6 = document.createElement('td'); td6.textContent = attendanceTime[student.id] ? String(attendanceTime[student.id]) : '-';
    row.appendChild(td1); row.appendChild(td2); row.appendChild(td3); row.appendChild(td4); row.appendChild(td5); row.appendChild(td6);
    tbody.appendChild(row);
  });

  updateStats();
}

// Export currently visible table data to native .xlsx with formatting
async function exportToExcel() {
  try {
    if (!window.ExcelJS) {
      alert('ExcelJS library not loaded. Please check your internet connection and try again.');
      return;
    }

    const filtered = applyFilters();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Attendance');

    // Optional: Title and session info
    const title = 'GNDU Attendance';
    ws.mergeCells('A1:F1');
    ws.getCell('A1').value = title;
    ws.getCell('A1').font = { size: 16, bold: true };
    ws.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

    // Session details row (if available)
    const infoParts = [];
    if (currentSession?.date) infoParts.push(`Date: ${currentSession.date}`);
    if (currentSession?.timeSlot) infoParts.push(`Time: ${currentSession.timeSlot}`);
    if (currentSession?.subjectName) infoParts.push(`Subject: ${currentSession.subjectName}`);
    if (currentSession?.teacherName) infoParts.push(`Teacher: ${currentSession.teacherName}`);
    const info = infoParts.join('  •  ');
    if (info) {
      ws.mergeCells('A2:F2');
      ws.getCell('A2').value = info;
      ws.getCell('A2').font = { size: 11, color: { argb: 'FF555555' } };
      ws.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
    }

    // Header row at row 4 for clear spacing
    const headerRowIndex = 4;
    const headers = ['Roll Number', 'Student ID', 'Name', "Father's Name", 'Status', 'Check-in Time'];
    ws.getRow(headerRowIndex).values = headers;

    // Column widths approximating UI
    ws.columns = [
      { key: 'roll', width: 12 },
      { key: 'id', width: 14 },
      { key: 'name', width: 28 },
      { key: 'father', width: 28 },
      { key: 'status', width: 12 },
      { key: 'time', width: 16 }
    ];

    // Style header
    const headerRow = ws.getRow(headerRowIndex);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A5568' } }; // gray-700
    headerRow.height = 20;

    // Add data rows starting at row 5
    const startRow = headerRowIndex + 1;
    filtered.forEach((student, i) => {
      const rowIndex = startRow + i;
      const isPresent = !!attendance[student.id];
      const time = attendanceTime[student.id] || '-';
      const row = ws.getRow(rowIndex);
      row.values = [
        getRollNumberById(student.id),
        String(student.id),
        String(student.name || ''),
        String(student.father || ''),
        isPresent ? 'Present' : 'Absent',
        String(time)
      ];

      // Row styling
      row.alignment = { vertical: 'middle' };
      // Mimic UI: green-ish background for present rows
      if (isPresent) {
        row.eachCell((cell, col) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFFAF0' } }; // light green tint
        });
      }
      // Status cell color coding
      const statusCell = ws.getCell(rowIndex, 5);
      statusCell.font = { bold: true, color: { argb: isPresent ? 'FF1F7A1F' : 'FFB00020' } };
      statusCell.alignment = { horizontal: 'center' };
    });

    // Borders for table area
    const lastRow = startRow + filtered.length - 1;
    for (let r = headerRowIndex; r <= lastRow; r++) {
      for (let c = 1; c <= 6; c++) {
        const cell = ws.getCell(r, c);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFAAAAAA' } },
          left: { style: 'thin', color: { argb: 'FFAAAAAA' } },
          bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } },
          right: { style: 'thin', color: { argb: 'FFAAAAAA' } }
        };
      }
    }

    // Freeze header (no autofilter to avoid filter arrows)
    ws.views = [{ state: 'frozen', ySplit: headerRowIndex }];

    // Align certain columns
    ['A', 'B', 'E', 'F'].forEach(col => {
      ws.getColumn(col).alignment = { horizontal: 'center' };
    });

    // Generate and download
    const dateStr = new Date().toISOString().slice(0, 10);
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${dateStr}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    
    alert('Failed to export Excel file. Please try again.');
  }
}

// Detect Android devices
function isAndroid() {
  return /Android/i.test(navigator.userAgent || '');
}

// Generate and download a PDF of the current view (Android-friendly)
async function downloadAttendancePdf() {
  try {
    if (typeof html2pdf === 'undefined') {
      // Fallback if library missing
      printAttendance();
      return;
    }

    const filtered = applyFilters();
    const dateStr = new Date().toISOString().slice(0, 10);
    const title = 'GNDU Attendance';

    // Build a printable container
    const container = document.createElement('div');
    container.style.padding = '16px';
    container.style.fontFamily = 'Arial, Helvetica, sans-serif';
    container.style.color = '#000';

    const h1 = document.createElement('h1');
    h1.textContent = title;
    h1.style.fontSize = '18px';
    h1.style.margin = '0 0 8px';
    container.appendChild(h1);

    const meta = document.createElement('div');
    meta.style.fontSize = '12px';
    meta.style.margin = '0 0 12px';
    const sessionBits = [];
    if (currentSession) {
      if (currentSession.date) sessionBits.push(`Date: ${currentSession.date}`);
      if (currentSession.timeSlot) sessionBits.push(`Time: ${currentSession.timeSlot}`);
      if (currentSession.subjectName) sessionBits.push(`Subject: ${currentSession.subjectName}`);
      if (currentSession.teacherName) sessionBits.push(`Teacher: ${currentSession.teacherName}`);
    }
    meta.textContent = sessionBits.join(' • ');
    container.appendChild(meta);

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '11px';

    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    const headers = ['Roll Number', 'Student ID', 'Name', "Father's Name", 'Status', 'Check-in Time'];
    headers.forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      th.style.border = '1px solid #333';
      th.style.padding = '6px';
      th.style.textAlign = 'left';
      th.style.background = '#f0f0f0';
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    filtered.forEach((s) => {
      const tr = document.createElement('tr');
      const isPresent = !!attendance[s.id];
      const cells = [
        String(getRollNumberById(s.id)),
        String(s.id),
        String(s.name || ''),
        String(s.father || ''),
        isPresent ? 'Present' : 'Absent',
        attendanceTime[s.id] || '-'
      ];
      cells.forEach((text, idx) => {
        const td = document.createElement('td');
        td.textContent = text;
        td.style.border = '1px solid #333';
        td.style.padding = '6px';
        td.style.verticalAlign = 'top';
        if (idx === 4) { // Status column styling for better contrast
          td.style.fontWeight = '700';
          td.style.color = isPresent ? '#0a5a0a' : '#b00020';
          td.style.textAlign = 'left';
        }
        tr.appendChild(td);
      });
      if (isPresent) tr.style.background = '#dff0d8'; // darker success background
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);

    // Prepare filename
    const subjectPart = currentSession?.subjectCode ? `_${currentSession.subjectCode}` : '';
    const fileName = `attendance${subjectPart}_${dateStr}.pdf`;

    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     fileName,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    // Use html2pdf to save
    await html2pdf().from(container).set(opt).save();
  } catch (e) {
    
    // Fallback to print
    try { printAttendance(); } catch (_) {}
  }
}

// Print the currently visible table data
function printAttendance() {
  const filtered = applyFilters();
  const dateStr = new Date().toLocaleString();
  let html = '';
  html += '<!DOCTYPE html><html><head><title>Attendance Print</title>';
  html += '<meta name="viewport" content="width=device-width, initial-scale=1">';
  html += '<style>'+
          'html,body{background:#fff !important}'+
          'body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#000}'+
          'h1{font-size:20px;margin:0 0 10px} h2{font-size:14px;margin:0 0 20px;color:#333}'+
          'table{width:100%;border-collapse:collapse;table-layout:auto}'+
          'thead{display:table-header-group} tfoot{display:table-footer-group}'+
          'tr, td, th{page-break-inside:avoid; break-inside:avoid}'+
          'th,td{border:1px solid #333;padding:8px;text-align:left;font-size:12px;vertical-align:top}'+
          'th{background:#f0f0f0}'+
          'tr.present td{background:#eefbea}'+
          '@page { size: A4 landscape; margin: 10mm; }'+
          '@media print { body{ -webkit-print-color-adjust: exact; print-color-adjust: exact; } }'+
          '</style></head><body>';
  html += '<h1>GNDU Attendance</h1>';
  html += `<h2>Printed: ${dateStr}</h2>`;
  html += '<table><thead><tr>'+
          '<th>Roll Number</th>'+
          '<th>Student ID</th>'+
          '<th>Name</th>'+
          "<th>Father\\'s Name</th>"+
          '<th>Status</th>'+
          '<th>Check-in Time</th>'+
          '</tr></thead><tbody>';
  filtered.forEach((student) => {
    const status = attendance[student.id] ? 'Present' : 'Absent';
    const time = attendanceTime[student.id] || '-';
    html += '<tr class="'+(attendance[student.id] ? 'present' : '')+'">'+
            `<td>${getRollNumberById(student.id)}</td>`+
            `<td>${String(student.id)}</td>`+
            `<td>${String(student.name || '')}</td>`+
            `<td>${String(student.father || '')}</td>`+
            `<td>${status}</td>`+
            `<td>${time}</td>`+
            '</tr>';
  });
  html += '</tbody></table>';
  html += '<script>window.addEventListener("afterprint", function(){ setTimeout(function(){ window.close && window.close(); }, 0); });<\/script>';
  html += '</body></html>';
  // Android-safe print via hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');

  const cleanup = () => {
    try { document.body.removeChild(iframe); } catch (_) {}
  };

  const triggerPrint = () => {
    try {
      const win = iframe.contentWindow || iframe;
      // Delay slightly to ensure layout/render is complete
      setTimeout(() => {
        try { win.focus(); } catch (_) {}
        try { win.print(); } catch (_) {}
        // Fallback cleanup if afterprint doesn't fire
        setTimeout(cleanup, 3000);
      }, 500);
    } catch (_) {
      cleanup();
    }
  };

  iframe.onload = triggerPrint;
  // Prefer srcdoc when available
  if ('srcdoc' in iframe) {
    iframe.srcdoc = html;
    document.body.appendChild(iframe);
  } else {
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow ? iframe.contentWindow.document : iframe.document;
    doc.open();
    doc.write(html);
    doc.close();
    // onload may not fire reliably after document.write; ensure print anyway
    setTimeout(triggerPrint, 700);
  }
}

// Manual test function for expiry
window.testExpiredSession = function() {
  const testSessionId = 'TEST_EXPIRED_' + Date.now();
  const expiredSession = {
    sessionId: testSessionId,
    date: new Date().toLocaleDateString('en-GB'),
    subjectName: 'Test Session',
    teacherName: 'Test Teacher',
    timeSlot: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    secretCode: 'TEST123',
    expiryTime: new Date(Date.now() - 1000).toISOString(), // 1 second ago
    isExpired: true
  };
  
  // Store in localStorage for testing
  localStorage.setItem('attendanceSession_' + testSessionId, JSON.stringify(expiredSession));
  
  // Navigate to test URL
  const testUrl = window.location.href.split('?')[0] + '?session=' + testSessionId;
  
  
  // Optionally open in new tab
  if (confirm('Open test expired session in new tab?')) {
    window.open(testUrl, '_blank');
  }
};

// Print the table exactly as it appears on the page with full styling
function printTableAsIs() {
  try {
    const container = document.querySelector('.table-container');
    if (!container) {
      alert('Table not found to print.');
      return;
    }
    const theme = document.body.getAttribute('data-theme') || '';
    const tableHTML = container.innerHTML; // includes <table> markup
    const w = window.open('', '_blank');
    if (!w) return;

    const doc = `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Print - Original Table</title>
        <link rel="stylesheet" href="styles.css" />
        <style>
          /* Ensure print-friendly spacing */
          body { background: white !important; padding: 20px; }
          .table-container { box-shadow: none; border-radius: 0; }
          .scroll-hint, .controls, .stats, .link-section, .current-class-info { display: none !important; }
          @media print {
            .table-container { overflow: visible !important; }
          }
        </style>
      </head>
      <body ${theme ? `data-theme="${theme}"` : ''}>
        <div class="table-container">${tableHTML}</div>
        <script>
          setTimeout(function(){ window.print(); window.close(); }, 300);
        <\/script>
      </body>
    </html>`;

    w.document.open();
    w.document.write(doc);
    w.document.close();
  } catch (err) {
    
    alert('Unable to print the table.');
  }
}

// Expose for debugging/manual calls
window.exportToExcel = exportToExcel;
window.printAttendance = printAttendance;
window.printTableAsIs = printTableAsIs;

async function showStudentCheckin(sessionParam) {
  
  let session = JSON.parse(localStorage.getItem('attendanceSession_' + sessionParam) || 'null');
  
  // If we have a valid cached session, use it temporarily while validating from server
  if (session && session.sessionId === sessionParam) {
    
    
    // If session appears expired in cache, still try to validate from server first
    // This handles cases where local clock is wrong or cache is stale
    if (isSessionExpired(session)) {
      
      
      // If Firebase is initialized, validate from server before showing expiry
      if (firebaseInitialized) {
        try {
          
          const doc = await db.collection('attendanceSessions').doc(sessionParam).get();
          
          if (doc.exists) {
            const freshSession = doc.data();
            
            
            // Convert Firestore Timestamp to proper format
            if (freshSession.expiryTime && typeof freshSession.expiryTime.toDate === 'function') {
              freshSession.expiryTime = freshSession.expiryTime.toDate().toISOString();
            } else if (freshSession.expiryTime && typeof freshSession.expiryTime.seconds === 'number') {
              freshSession.expiryTime = new Date(freshSession.expiryTime.seconds * 1000).toISOString();
            }
            
            // Update cache with fresh data
            localStorage.setItem('attendanceSession_' + sessionParam, JSON.stringify(freshSession));
            
            // Now check expiry with fresh data
            if (isSessionExpired(freshSession)) {
              
              displayExpiredSessionMessage();
              return;
            } else {
              
              session = freshSession;
              displayStudentCheckin(session);
              return;
            }
          } else {
            
            showError('Session not found or has expired');
            return;
          }
        } catch (error) {
          
          // If server check fails, fall back to cached session expiry
          
          displayExpiredSessionMessage();
          return;
        }
      } else {
        // Firebase not initialized, fall back to cached expiry check
        
        displayExpiredSessionMessage();
        return;
      }
    }
    
    // For cached sessions without expiry, force refresh from Firestore
    if (!session.expiryTime && firebaseInitialized) {
      
      // Skip cached session and use Firestore instead
    } else {
      displayStudentCheckin(session);
      
      // Still try to update from Firestore in the background
      if (firebaseInitialized) {
        updateSessionFromFirestore(sessionParam);
      }
      return;
    }
  }
  
  // If we don't have a valid session, try to load from Firestore
  if (firebaseInitialized) {
    try {
      
      const doc = await db.collection('attendanceSessions').doc(sessionParam).get();
      
      if (doc.exists) {
        session = doc.data();
        
        
        // Convert Firestore Timestamp to proper format before expiry check
        if (session.expiryTime && typeof session.expiryTime.toDate === 'function') {
          session.expiryTime = session.expiryTime.toDate().toISOString();
        } else if (session.expiryTime && typeof session.expiryTime.seconds === 'number') {
          session.expiryTime = new Date(session.expiryTime.seconds * 1000).toISOString();
        }
        
        // Check if session is expired before displaying
        if (isSessionExpired(session)) {
          displayExpiredSessionMessage();
          return;
        }
        
        // Cache the session data
        localStorage.setItem('attendanceSession_' + sessionParam, JSON.stringify(session));
        
        // Display the check-in form
        displayStudentCheckin(session);
      } else {
        showError('Session not found or has expired');
      }
    } catch (error) {
      
      showError('Unable to load session. Please check your connection and try again.');
    }
  } else {
    // Wait for Firebase to initialize
    
    try {
      await initializeFirebase();
      // Once Firebase is initialized, try loading the session again
      await showStudentCheckin(sessionParam);
    } catch (error) {
      
      showError('Unable to connect to the server. Please check your internet connection and refresh the page.');
    }
  }
}

async function updateSessionFromFirestore(sessionParam) {
  try {
    const doc = await db.collection('attendanceSessions').doc(sessionParam).get();
    if (doc.exists) {
      let session = doc.data();
      
      
      // Convert Firestore Timestamp to proper format for consistency
      if (session.expiryTime && typeof session.expiryTime.toDate === 'function') {
        session.expiryTime = session.expiryTime.toDate().toISOString();
      } else if (session.expiryTime && typeof session.expiryTime.seconds === 'number') {
        session.expiryTime = new Date(session.expiryTime.seconds * 1000).toISOString();
      }
      
      localStorage.setItem('attendanceSession_' + sessionParam, JSON.stringify(session));
    }
  } catch (error) {
    
  }
}

function showError(message) {
  const messageDiv = document.getElementById('checkinMessage');
  if (messageDiv) {
    setMessage(messageDiv, 'error', `❌ ${message}`);
    // Scroll to the error message
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Re-enable the submit button if it was disabled
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Mark Me Present';
    }
    
    // Enable all form fields
    const form = document.getElementById('studentCheckinForm');
    if (form) {
      form.querySelectorAll('input').forEach(input => input.disabled = false);
    }
  } else {
    alert(message);
  }
}

function displayExpiredSessionMessage() {
  // Hide other sections
  const loginScreen = document.getElementById('loginScreen');
  const teacherDashboard = document.getElementById('teacherDashboard');
  const checkinSection = document.getElementById('studentCheckin');
  
  if (loginScreen) loginScreen.style.display = 'none';
  if (teacherDashboard) teacherDashboard.style.display = 'none';
  if (checkinSection) {
    checkinSection.style.display = 'block';
    
    // Replace the entire content with expired message
    checkinSection.innerHTML = `
      <div class="checkin-header">
        <h2>⏰ Attendance Over</h2>
        <p>GNDU Attendance System</p>
      </div>
      <div style="text-align: center; padding: 40px 20px; max-width: 400px; margin: 0 auto;">
        <div style="font-size: 64px; margin-bottom: 20px;">⏰</div>
        <h2 style="color: #e74c3c; margin-bottom: 15px;">Attendance is Over</h2>
        <p style="font-size: 16px; color: #666; margin-bottom: 20px;">
          This attendance session has expired and is no longer accepting responses.
        </p>
        <p style="font-size: 14px; color: #999;">
          Please contact your teacher if you need to mark attendance for this session.
        </p>
      </div>
    `;
  }
}

async function displayStudentCheckin(session) {
  
  
  // Check if session is expired
  if (isSessionExpired(session)) {
    // Hide other sections and show expired message
    const loginScreen = document.getElementById('loginScreen');
    const teacherDashboard = document.getElementById('teacherDashboard');
    const checkinSection = document.getElementById('studentCheckin');
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (teacherDashboard) teacherDashboard.style.display = 'none';
    if (checkinSection) {
      checkinSection.style.display = 'block';
      
      // Clear the form and show attendance over message
      const form = document.querySelector('.checkin-form');
      if (form) {
        form.innerHTML = `
          <div style="text-align: center; padding: 40px 20px;">
            <div style="font-size: 48px; margin-bottom: 20px;">⏰</div>
            <h2 style="color: #e74c3c; margin-bottom: 15px;">Attendance is Over</h2>
            <p style="font-size: 16px; color: #666; margin-bottom: 20px;">
              This attendance session has expired and is no longer accepting responses.
            </p>
            <p style="font-size: 14px; color: #999;">
              Please contact your teacher if you need to mark attendance for this session.
            </p>
          </div>
        `;
      }
    }
    return;
  }
  
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
    
    // Add form submission handler
    const form = document.querySelector('.checkin-form');
    if (form) {
      form.onsubmit = function(e) {
        e.preventDefault();
        submitAttendance();
        return false;
      };
    }
  }
  
  // Update session info
  const classInfo = document.getElementById('checkinClassInfo');
  if (classInfo) {
    clearElement(classInfo);
    const h3 = document.createElement('h3');
    h3.textContent = session.subjectName || 'No Subject';
    const p1 = document.createElement('p');
    p1.textContent = `📅 ${session.date || 'No date'} • ⏰ ${session.timeSlot || 'No time slot'}`;
    const p2 = document.createElement('p');
    p2.textContent = `👨‍🏫 ${session.teacherName || 'Teacher'}`;
    classInfo.appendChild(h3);
    classInfo.appendChild(p1);
    classInfo.appendChild(p2);
  }
  
  // Initialize form elements
  const form = document.getElementById('studentCheckinForm');
  const submitBtn = document.getElementById('submitBtn');
  const messageDiv = document.getElementById('checkinMessage');
  
  let locationVerified = false;
  let locationDistance = 0;
  
  // Initialize form
  if (form) form.reset();
  
  // Set initial button state
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Checking location...';
  }
  
  // Initialize location variables
  window.locationVerified = false;
  window.locationDistance = 0;
  
  // Show initial message
  if (messageDiv) {
    messageDiv.innerHTML = '';
  }
  
  // Start location check
  try {
    const locationResult = await checkUserLocation();
    window.locationVerified = locationResult.success;
    window.locationDistance = locationResult.distance || 0;
    
    // If Firebase is not initialized, bypass location verification
    if (!firebaseInitialized) {
      
      window.locationVerified = true;
      
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Mark Me Present';
        showLocationStatus('✅ Location verification bypassed - Demo mode', 'success');
      }
    } else if (submitBtn) {
      submitBtn.disabled = !window.locationVerified;
      submitBtn.textContent = 'Mark Me Present';
      
      // Show status message based on location result
      if (!window.locationVerified) {
        const distanceText = window.locationDistance >= 1000 
          ? `${(window.locationDistance / 1000).toFixed(1)} km away` 
          : `${Math.round(window.locationDistance)} meters away`;
        showLocationStatus(`❌ You are ${distanceText} from GNDU`, 'error');
      } else {
        showLocationStatus('✅ Location verified - You are inside the campus', 'success');
      }
    }
  } catch (error) {
    
    if (messageDiv) {
      setMessage(messageDiv, 'error', 'Error checking location. Please ensure location services are enabled and refresh the page.');
    }
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Location Error';
    }
  }
  
  // Focus on the first input field after location check
  const firstInput = form?.querySelector('input');
  if (firstInput) {
    firstInput.focus();
  }
}

 
async function submitAttendance() {
  // Gather inputs and helpers
  const urlSessionId = new URLSearchParams(window.location.search).get('session') || (currentSession && currentSession.sessionId) || sessionId || '';
  const isLoggedIn = auth && auth.currentUser;
  const secretCodeInput = document.getElementById('secretCodeInput')?.value?.trim().toUpperCase();
  const studentId = document.getElementById('studentId')?.value?.trim(); // Roll Number input
  const studentName = document.getElementById('studentName')?.value?.trim();
  const form = document.getElementById('studentCheckinForm');
  const submitBtn = document.getElementById('submitBtn');
  const messageDiv = document.getElementById('checkinMessage');

  function showError(msg) {
    if (messageDiv) setMessage(messageDiv, 'error', msg);
  }
  function normalizeName(n) {
    return (n || '').toString().trim().replace(/\s+/g, ' ').toUpperCase();
  }
  function buildRollMapsIfNeeded() { /* no-op if already built elsewhere */ }

  // Validate Roll Number format and range (1..N)
  const rollNum = parseInt(studentId, 10);
  const listForTotal = (typeof students !== 'undefined' && Array.isArray(students))
    ? students
    : (Array.isArray(window.students) ? window.students : []);
  let total = listForTotal.length;
  // Fallback to map length if list not available
  if (!total && window.idByRoll) total = Object.keys(window.idByRoll).length;
  if (!total) {
    showError('Student list not loaded yet. Please refresh the page and try again.');
    // Re-enable form on validation error
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Mark Me Present';
    }
    if (form) form.querySelectorAll('input').forEach(input => input.disabled = false);
    return;
  }
  if (!Number.isInteger(rollNum) || rollNum < 1 || rollNum > total) {
    showError(`Roll Number must be a number between 1 and ${total} (inclusive).`);
    // Re-enable form on validation error
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Mark Me Present';
    }
    if (form) form.querySelectorAll('input').forEach(input => input.disabled = false);
    return;
  }

  // Get session data
  let session;
  try {
    // First try to get from localStorage
    const sessionData = localStorage.getItem('attendanceSession_' + urlSessionId);
    
    if (sessionData) {
      // If found in localStorage, use it
      session = JSON.parse(sessionData);
      
      
      // If session exists but is missing secretCode, try to get fresh data
      if (!session.secretCode) {
        
        const sessionDoc = await db.collection('attendanceSessions').doc(urlSessionId).get();
        if (sessionDoc.exists) {
          session = sessionDoc.data();
          
          // Update localStorage with fresh data
          localStorage.setItem('attendanceSession_' + urlSessionId, JSON.stringify(session));
        }
      }
    } else {
      // If not in localStorage, try to fetch from Firestore
      
      const sessionDoc = await db.collection('attendanceSessions').doc(urlSessionId).get();
      
      if (!sessionDoc.exists) {
        throw new Error('Session not found in database');
      }
      
      session = sessionDoc.data();
      
      
      // Save to localStorage for future use
      localStorage.setItem('attendanceSession_' + urlSessionId, JSON.stringify(session));
    }
    
    // Final validation
    if (!session) {
      throw new Error('Failed to load session data');
    }
    
    if (!session.secretCode) {
      
      throw new Error('This session is not properly configured. Please contact your teacher.');
    }
  } catch (error) {
    
    showError('Session configuration error. Please contact your teacher or try again later.');
    // Re-enable form on validation error
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Mark Me Present';
    }
    if (form) form.querySelectorAll('input').forEach(input => input.disabled = false);
    return;
  }

  // Verify secret code
  if (secretCodeInput !== session.secretCode.toUpperCase()) {
    showError('❌ Incorrect secret code. Please check with your teacher and try again.');
    // Re-enable form on validation error
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Mark Me Present';
    }
    if (form) form.querySelectorAll('input').forEach(input => input.disabled = false);
    return;
  }

  // Use the location result from the initial check
  if (!window.locationVerified) {
    const distance = window.locationDistance || 0;
    const distanceText = distance >= 1000 
      ? `${(distance / 1000).toFixed(1)} km away` 
      : `${Math.round(distance)} meters away`;
    showError(`❌ You must be inside the university campus to mark attendance. You are ${distanceText} from GNDU.`);
    // Re-enable form on validation error
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Mark Me Present';
    }
    if (form) form.querySelectorAll('input').forEach(input => input.disabled = false);
    return;
  }

  // Disable form during submission
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
  }
  if (form) form.querySelectorAll('input').forEach(input => input.disabled = true);

  // Verify student using Roll Number -> Student ID mapping
  try {
    // Ensure maps exist
    buildRollMapsIfNeeded();
    let mappedStudentId = window.idByRoll?.[rollNum];
    if (!mappedStudentId && Array.isArray(students) && students[rollNum - 1]) {
      mappedStudentId = String(students[rollNum - 1].id);
    }
    const studentList = Array.isArray(students) ? students : (Array.isArray(window.students) ? window.students : []);
    const student = studentList.find(s => s?.id?.toString() === String(mappedStudentId));
    const inputNorm = normalizeName(studentName);
    
    // Validate both name and roll number match
    if (!student) {
      showError('❌ Invalid Roll Number. Please check your roll number and try again.');
      // Re-enable form on validation error
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Mark Me Present';
      }
      if (form) form.querySelectorAll('input').forEach(input => input.disabled = false);
      return;
    }
    
    const actualNameNorm = normalizeName(student.name);
    if (inputNorm !== actualNameNorm) {
      showError('❌ Name does not match the roll number. Please ensure both your name and roll number are correct.');
      // Re-enable form on validation error
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Mark Me Present';
      }
      if (form) form.querySelectorAll('input').forEach(input => input.disabled = false);
      return;
    }
    
    // Check if already marked present in this session (both locally and on server)
    const attendanceKey = `attendance_${urlSessionId}_${mappedStudentId}`;
    const localAttendanceBool = localStorage.getItem(attendanceKey) === 'true';
    let localAttendanceObj = {};
    try { localAttendanceObj = JSON.parse(localStorage.getItem(attendanceKey) || '{}'); } catch (_) { localAttendanceObj = {}; }
    
    // IP address verification for non-logged-in users
    if (!isLoggedIn) {
      // Create a key for this session using IP address hash to prevent multiple attendance marks
      const deviceKey = `device_${urlSessionId}`;
      const deviceVerification = localStorage.getItem(deviceKey);
      
      if (deviceVerification) {
        showError('❌ Your device can mark attendance only one time per session. If you need to update your attendance, please contact your teacher.');
        // Disable the form since this device already marked attendance
        if (form) form.querySelectorAll('input').forEach(input => input.disabled = true);
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Limited to One Attendance';
        }
        return;
      }
    }
    
    // Check server for existing attendance
    try {
      // Check both the session document and the attendance subcollection
      const [sessionDoc, attendanceDoc] = await Promise.all([
        db.collection('attendanceSessions').doc(urlSessionId).get(),
        db.collection('attendanceSessions').doc(urlSessionId)
          .collection('attendance').doc(mappedStudentId).get()
      ]);
      
      const sessionData = sessionDoc.exists ? sessionDoc.data() : {};
      const isMarkedInSession = sessionData.attendance && sessionData.attendance[mappedStudentId] === true;
      const hasAttendanceRecord = attendanceDoc.exists;
      
      if (localAttendanceBool || isMarkedInSession || hasAttendanceRecord) {
        showError('✅ Your attendance is already marked as present for this session.');
        // Disable the form since attendance is already marked
        if (form) form.querySelectorAll('input').forEach(input => input.disabled = true);
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Already Marked Present';
        }
        // Update local storage in case it was missing
        if (!localAttendanceBool) {
          localStorage.setItem(attendanceKey, 'true');
        }
        return;
      }
    } catch (error) {
      
      // Continue with submission if we can't verify from server
    }
    
    // Check old local storage format for backward compatibility
    const oldLocalAttendance = JSON.parse(localStorage.getItem('attendance_' + urlSessionId) || '{}');
    if (oldLocalAttendance[mappedStudentId]) {
      showError('✅ Your attendance is already marked as present for this session.');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Already Marked Present';
      }
      if (form) form.querySelectorAll('input').forEach(input => input.disabled = true);
      // Update to new storage format
      localStorage.setItem(attendanceKey, 'true');
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
    if (messageDiv) { setMessage(messageDiv, 'info', 'Submitting your attendance, please wait...'); }

    try {
      // Check if Firebase is initialized
      if (firebaseInitialized && typeof db !== 'undefined') {
        const batch = db.batch();
        const sessionRef = db.collection('attendanceSessions').doc(urlSessionId);
        
        // Update the attendance map in the session document
        const updateData = {
          [`attendance.${mappedStudentId}`]: true,
          [`attendanceTime.${mappedStudentId}`]: firebase.firestore.FieldValue.serverTimestamp(),
          [`attendanceRecords.${mappedStudentId}`]: attendanceData,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Add the update to the batch
        batch.update(sessionRef, updateData);
        
        // Also add to the attendance subcollection for detailed records
        const attendanceRef = sessionRef.collection('attendance').doc(mappedStudentId);
        batch.set(attendanceRef, {
          ...attendanceData,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        // Commit the batch
        await batch.commit();
        
        
        
      // Update local storage to prevent duplicate submissions
      localStorage.setItem(attendanceKey, 'true');
      
      // For non-logged-in users, mark this device as having submitted attendance for this session
      if (!isLoggedIn) {
        const deviceKey = `device_${urlSessionId}`;
        localStorage.setItem(deviceKey, new Date().toISOString());
      }
        
        // Show success message
        if (messageDiv) { setMessage(messageDiv, 'success', `✅ Attendance recorded successfully! ${student.name} (${student.id}) is marked present.`); }
      } else {
        // Firebase not initialized, save to local storage only
        const localId = 'local_' + Date.now();
        localAttendanceObj[student.id] = {
          ...attendanceData,
          id: localId,
          synced: false,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(attendanceKey, JSON.stringify(localAttendanceObj));
        
        if (messageDiv) { setMessage(messageDiv, 'success', `✅ Attendance recorded locally! ${student.name} (${student.id}) is marked present.`); }
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
        if (message) { clearElement(message); }
      }, 5000);
      
    } catch (error) {
      
      
      // Fallback to local storage if Firestore fails
      const localId = 'local_' + Date.now();
      localAttendanceObj[student.id] = {
        ...attendanceData,
        id: localId,
        synced: false,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(attendanceKey, JSON.stringify(localAttendanceObj));
      
      // For non-logged-in users, mark this device as having submitted attendance for this session
      if (!isLoggedIn) {
        const deviceKey = `device_${urlSessionId}`;
        localStorage.setItem(deviceKey, new Date().toISOString());
      }
      
      // For non-logged-in users, mark this device as having submitted attendance for this session
      if (!isLoggedIn) {
        const deviceKey = `device_${urlSessionId}`;
        localStorage.setItem(deviceKey, new Date().toISOString());
      }
      
      if (messageDiv) { setMessage(messageDiv, 'warning', '⚠️ Attendance saved offline. It will sync when online.'); }
      
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
    
    if (messageDiv) { setMessage(messageDiv, 'error', `❌ An error occurred while processing your request. Please try again later. ${error.message ? error.message : ''}`); }
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
  window.handleLogout = handleLogout;

  // Note: Firebase initialization is triggered once from the main DOMContentLoaded
