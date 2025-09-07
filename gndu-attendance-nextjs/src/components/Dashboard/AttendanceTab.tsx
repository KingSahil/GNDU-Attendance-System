'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { students } from '@/data/students';
import { SUBJECTS, AttendanceSession, AttendanceRecord } from '@/types';
import { generateSessionId, formatDate, formatTime, getSessionUrl } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { AttendanceTable } from './AttendanceTable';
import { SessionInfo } from './SessionInfo';

export function AttendanceTab() {
  const [currentSession, setCurrentSession] = useState<AttendanceSession | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [sessionSetup, setSessionSetup] = useState({
    date: formatDate(new Date()),
    subjectCode: '',
    secretCode: ''
  });
  const [loading, setLoading] = useState(false);

  // Listen to attendance records for current session
  useEffect(() => {
    if (!currentSession) return;

    const attendanceRef = collection(db, 'attendanceSessions', currentSession.sessionId, 'attendance');
    const unsubscribe = onSnapshot(attendanceRef, (snapshot) => {
      const records: AttendanceRecord[] = [];
      snapshot.forEach((doc) => {
        records.push({ ...doc.data() } as AttendanceRecord);
      });
      setAttendanceRecords(records);
    });

    return () => unsubscribe();
  }, [currentSession]);

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const sessionId = generateSessionId();
      const now = new Date();
      const expiryTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      
      const subject = SUBJECTS.find(s => s.code === sessionSetup.subjectCode);
      if (!subject) throw new Error('Subject not found');

      const session: AttendanceSession = {
        sessionId,
        date: sessionSetup.date,
        day: now.toLocaleDateString('en-US', { weekday: 'long' }),
        timeSlot: `${formatTime(now)} - ${formatTime(new Date(now.getTime() + 55 * 60 * 1000))}`,
        subjectCode: sessionSetup.subjectCode,
        subjectName: subject.name,
        teacherName: 'Sahil Sharma', // This could be dynamic based on auth user
        secretCode: sessionSetup.secretCode,
        expiryTime: expiryTime.toISOString(),
        isExpired: false,
        createdAt: now
      };

      // Save session to Firestore
      await addDoc(collection(db, 'attendanceSessions'), session);
      
      setCurrentSession(session);
      setAttendanceRecords([]);
    } catch (error) {
      console.error('Error starting session:', error);
      alert('Failed to start session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExpireSession = async () => {
    if (!currentSession) return;

    try {
      // Update session in Firestore to mark as expired
      // For now, just update local state
      setCurrentSession({
        ...currentSession,
        isExpired: true
      });
    } catch (error) {
      console.error('Error expiring session:', error);
    }
  };

  const copySessionLink = () => {
    if (!currentSession) return;
    
    const url = getSessionUrl(currentSession.sessionId);
    navigator.clipboard.writeText(url);
    alert('Session link copied to clipboard!');
  };

  const shareWhatsApp = () => {
    if (!currentSession) return;
    
    const url = getSessionUrl(currentSession.sessionId);
    const message = `Mark your attendance for ${currentSession.subjectName}\nDate: ${currentSession.date}\nSecret Code: ${currentSession.secretCode}\n\n${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (currentSession) {
    return (
      <div className="space-y-6">
        <SessionInfo
          session={currentSession}
          onExpire={handleExpireSession}
          onCopyLink={copySessionLink}
          onShareWhatsApp={shareWhatsApp}
        />
        
        <AttendanceTable
          students={students}
          attendanceRecords={attendanceRecords}
          sessionId={currentSession.sessionId}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold">Start Attendance Session</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleStartSession} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="date"
              label="Select Date"
              value={sessionSetup.date}
              onChange={(e) => setSessionSetup(prev => ({ ...prev, date: e.target.value }))}
              required
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Subject
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                value={sessionSetup.subjectCode}
                onChange={(e) => setSessionSetup(prev => ({ ...prev, subjectCode: e.target.value }))}
                required
              >
                <option value="">Select Subject</option>
                {SUBJECTS.map((subject) => (
                  <option key={subject.code} value={subject.code}>
                    {subject.code} - {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              type="text"
              label="Secret Code"
              placeholder="Set the Secret Code"
              value={sessionSetup.secretCode}
              onChange={(e) => setSessionSetup(prev => ({ ...prev, secretCode: e.target.value }))}
              maxLength={20}
              required
              className="bg-gradient-to-r from-yellow-50 to-orange-50 border-orange-300 font-bold tracking-wider uppercase"
            />
          </div>

          <div className="text-center">
            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="px-8"
            >
              {loading ? 'Starting Session...' : 'Start Attendance Session'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}