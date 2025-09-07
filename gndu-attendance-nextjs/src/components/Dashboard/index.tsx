'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { TabNavigation } from './TabNavigation';
import { AttendanceTab } from './AttendanceTab';
import { LogOut } from 'lucide-react';

const TEACHER_TABS = [
  { id: 'attendance', label: 'Attendance', icon: '📋' },
  { id: 'resources', label: 'Resources', icon: '📚' },
  { id: 'miscellaneous', label: 'Miscellaneous', icon: '📄' }
];

const GUEST_TABS = [
  { id: 'attendance', label: 'Attendance', icon: '📋' },
  { id: 'resources', label: 'Resources', icon: '📚' },
  { id: 'miscellaneous', label: 'Miscellaneous', icon: '📄' }
];

export function Dashboard() {
  const { user, isGuest, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('attendance');
  
  const tabs = isGuest ? GUEST_TABS : TEACHER_TABS;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'attendance':
        return <AttendanceTab />;
      case 'resources':
        return (
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-semibold mb-4">📚 Resources</h3>
              <p className="text-gray-600">Resources management will be implemented here</p>
            </CardContent>
          </Card>
        );
      case 'miscellaneous':
        return (
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-semibold mb-4">📄 Miscellaneous</h3>
              <p className="text-gray-600">Miscellaneous documents will be displayed here</p>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="px-6 py-8 relative">
            <div className="text-center">
              <h1 className="text-3xl font-light mb-2">GNDU HUB</h1>
              <p className="text-blue-100">Department of Computer Engineering & Technology</p>
              
              {isGuest && (
                <div className="mt-3">
                  <span className="bg-blue-500/30 px-3 py-1 rounded-full text-sm">
                    👤 Guest Mode
                  </span>
                </div>
              )}
            </div>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={logout}
              className="absolute top-4 right-6 flex items-center gap-2"
            >
              <LogOut size={16} />
              Logout
            </Button>
          </div>
          
          <div className="px-6">
            <TabNavigation
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}