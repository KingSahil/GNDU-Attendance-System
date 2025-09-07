'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLocation } from '@/hooks/useLocation';
import { students } from '@/data/students';
import { AttendanceSession, AttendanceRecord } from '@/types';
import { isSessionExpired } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

interface StudentCheckinProps {
  sessionId: string;
}

export function StudentCheckin({ sessionId }: StudentCheckinProps) {
  const router = useRouter();
  const { status, message, checkLocation } = useLocation();
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    secretCode: '',
    rollNumber: '',
    studentName: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load session data
  useEffect(() => {
    const loadSession = async () => {
      try {
        const sessionDoc = await getDoc(doc(db, 'attendanceSessions', sessionId));
        if (sessionDoc.exists()) {
          const sessionData = sessionDoc.data() as AttendanceSession;
          setSession(sessionData);
        } else {
          setError('Session not found');
        }
      } catch (error) {
        console.error('Error loading session:', error);
        setError('Failed to load session');
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Validate session
      if (isSessionExpired(session.expiryTime) || session.isExpired) {
        throw new Error('This session has expired');
      }

      // Validate secret code
      if (formData.secretCode.toUpperCase() !== session.secretCode.toUpperCase()) {
        throw new Error('Invalid secret code');
      }

      // Validate location
      if (status !== 'allowed') {
        throw new Error('Location verification required');
      }

      // Find student
      const rollNum = parseInt(formData.rollNumber);
      const student = students[rollNum - 1]; // Roll numbers are 1-indexed
      
      if (!student) {
        throw new Error('Invalid roll number');
      }

      if (student.name.toUpperCase() !== formData.studentName.toUpperCase()) {
        throw new Error('Name does not match roll number');
      }

      // Check if already marked attendance
      const attendanceRef = collection(db, 'attendanceSessions', sessionId, 'attendance');
      const existingQuery = query(attendanceRef, where('studentId', '==', student.id));
      const existingDocs = await getDocs(existingQuery);

      if (!existingDocs.empty) {
        throw new Error('Attendance already marked for this session');
      }

      // Mark attendance
      const attendanceRecord: AttendanceRecord = {
        studentId: student.id,
        studentName: student.name,
        markedAt: new Date(),
        sessionId: sessionId,
        rollNumber: rollNum
      };

      await addDoc(attendanceRef, attendanceRecord);

      setSuccess('✅ Attendance marked successfully!');
      
      // Clear form
      setFormData({
        secretCode: '',
        rollNumber: '',
        studentName: ''
      });

    } catch (error: any) {
      setError(error.message || 'Failed to mark attendance');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p>Loading session...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-4 text-red-600">Session Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'The requested session could not be found.'}</p>
            <Button onClick={() => router.push('/')}>
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const expired = isSessionExpired(session.expiryTime) || session.isExpired;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
          <h1 className="text-2xl font-bold mb-2">✓ Mark Attendance</h1>
          <p className="text-green-100">GNDU HUB</p>
          <div className="mt-3 text-sm">
            <div>{session.subjectCode} - {session.subjectName}</div>
            <div>{session.date} • {session.timeSlot}</div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {expired ? (
            <div className="text-center">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <strong>⚠️ Session Expired</strong>
                <p className="text-sm mt-1">This attendance session has expired and is no longer accepting submissions.</p>
              </div>
              <Button onClick={() => router.push('/')}>
                Go to Home
              </Button>
            </div>
          ) : (
            <>
              {/* Location Status */}
              <div className={`p-4 rounded-lg mb-6 ${
                status === 'allowed' ? 'bg-green-100 text-green-800 border border-green-300' :
                status === 'denied' ? 'bg-red-100 text-red-800 border border-red-300' :
                'bg-blue-100 text-blue-800 border border-blue-300'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{message}</span>
                  {status !== 'allowed' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={checkLocation}
                      className="ml-2"
                    >
                      Retry
                    </Button>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="text"
                  label="🔑 Secret Code"
                  placeholder="Enter the secret code"
                  value={formData.secretCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, secretCode: e.target.value }))}
                  maxLength={20}
                  required
                  className="bg-gradient-to-r from-yellow-50 to-orange-50 border-orange-300 font-bold tracking-wider uppercase"
                />

                <Input
                  type="number"
                  label="Roll Number"
                  placeholder="Enter your Roll Number"
                  value={formData.rollNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, rollNumber: e.target.value }))}
                  min="1"
                  max={students.length.toString()}
                  required
                />

                <Input
                  type="text"
                  label="Full Name"
                  placeholder="Enter your Full Name"
                  value={formData.studentName}
                  onChange={(e) => setFormData(prev => ({ ...prev, studentName: e.target.value }))}
                  required
                />

                <Button
                  type="submit"
                  variant="success"
                  className="w-full"
                  disabled={submitting || status !== 'allowed'}
                >
                  {submitting ? 'Marking Attendance...' : 'Mark Me Present'}
                </Button>

                {error && (
                  <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                    {success}
                  </div>
                )}
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}