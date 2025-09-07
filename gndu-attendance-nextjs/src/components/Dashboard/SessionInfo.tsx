'use client';

import { AttendanceSession } from '@/types';
import { getSessionUrl, isSessionExpired } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Copy, Share, Clock } from 'lucide-react';

interface SessionInfoProps {
  session: AttendanceSession;
  onExpire: () => void;
  onCopyLink: () => void;
  onShareWhatsApp: () => void;
}

export function SessionInfo({ session, onExpire, onCopyLink, onShareWhatsApp }: SessionInfoProps) {
  const sessionUrl = getSessionUrl(session.sessionId);
  const expired = isSessionExpired(session.expiryTime) || session.isExpired;

  return (
    <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <CardContent className="p-6">
        <div className="mb-4">
          <h3 className="text-xl font-semibold mb-2">Current Session</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <strong>Subject:</strong> {session.subjectCode} - {session.subjectName}
            </div>
            <div>
              <strong>Date:</strong> {session.date}
            </div>
            <div>
              <strong>Time:</strong> {session.timeSlot}
            </div>
            <div>
              <strong>Teacher:</strong> {session.teacherName}
            </div>
          </div>
        </div>

        <div className="bg-white/20 rounded-lg p-4 mb-4">
          <div className="text-center mb-3">
            <h4 className="font-semibold">Secret Code</h4>
            <div className="bg-white/30 rounded-lg p-3 mt-2 border-2 border-dashed border-white/50">
              <span className="text-2xl font-bold tracking-widest text-yellow-200">
                {session.secretCode}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">🔗 Student Check-in Link</h4>
          <p className="text-sm opacity-90">Share this link with students to mark their attendance</p>
          
          <div className="bg-white text-gray-800 rounded-lg p-3 font-mono text-sm break-all">
            {sessionUrl}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={onCopyLink}
              className="flex items-center gap-2"
            >
              <Copy size={16} />
              Copy Link
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={onShareWhatsApp}
              className="flex items-center gap-2"
            >
              <Share size={16} />
              Share on WhatsApp
            </Button>
            
            {!expired && (
              <Button
                variant="danger"
                size="sm"
                onClick={onExpire}
                className="flex items-center gap-2"
              >
                <Clock size={16} />
                Expire Session
              </Button>
            )}
          </div>

          {expired ? (
            <div className="bg-red-500/20 border border-red-400 rounded-lg p-3 mt-3">
              <p className="font-semibold">⚠️ This attendance session has expired</p>
              <p className="text-sm opacity-90">Students can no longer mark attendance</p>
            </div>
          ) : (
            <div className="bg-orange-500/20 border border-orange-400 rounded-lg p-3 mt-3">
              <p className="text-sm">
                ⏰ Session expires at: {new Date(session.expiryTime).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}