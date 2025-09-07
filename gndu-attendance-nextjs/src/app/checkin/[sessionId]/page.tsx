'use client';

import { StudentCheckin } from '@/components/StudentCheckin';

interface CheckinPageProps {
  params: {
    sessionId: string;
  };
}

export default function CheckinPage({ params }: CheckinPageProps) {
  return <StudentCheckin sessionId={params.sessionId} />;
}