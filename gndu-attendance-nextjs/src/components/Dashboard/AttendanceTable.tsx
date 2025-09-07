'use client';

import { useState, useMemo } from 'react';
import { Student, AttendanceRecord } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { Search, Printer, Download } from 'lucide-react';

interface AttendanceTableProps {
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  sessionId: string;
}

export function AttendanceTable({ students, attendanceRecords, sessionId }: AttendanceTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Student>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Create attendance map for quick lookup
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach(record => {
      map.set(record.studentId, record);
    });
    return map;
  }, [attendanceRecords]);

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    let filtered = students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.father.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.id.includes(searchTerm)
    );

    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [students, searchTerm, sortField, sortDirection]);

  const handleSort = (field: keyof Student) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Export functionality would go here
    alert('Export functionality will be implemented');
  };

  const stats = useMemo(() => {
    const total = students.length;
    const present = attendanceRecords.length;
    const absent = total - present;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, absent, percentage };
  }, [students.length, attendanceRecords.length]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Students</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.present}</div>
            <div className="text-sm text-gray-600">Present</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
            <div className="text-sm text-gray-600">Absent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.percentage}%</div>
            <div className="text-sm text-gray-600">Attendance</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1">
          <Input
            placeholder="Search students by name, father's name, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer size={16} />
            Print
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <tr>
                <th 
                  className="px-4 py-3 text-left cursor-pointer hover:bg-blue-700"
                  onClick={() => handleSort('id')}
                >
                  Roll Number {sortField === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-3 text-left cursor-pointer hover:bg-blue-700"
                  onClick={() => handleSort('id')}
                >
                  Student ID {sortField === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-3 text-left cursor-pointer hover:bg-blue-700"
                  onClick={() => handleSort('name')}
                >
                  Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-3 text-left cursor-pointer hover:bg-blue-700"
                  onClick={() => handleSort('father')}
                >
                  Father's Name {sortField === 'father' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Check-in Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, index) => {
                const attendance = attendanceMap.get(student.id);
                const isPresent = !!attendance;
                
                return (
                  <tr 
                    key={student.id}
                    className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      isPresent ? 'bg-green-50 dark:bg-green-900/20' : ''
                    }`}
                  >
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3 font-mono text-sm">{student.id}</td>
                    <td className="px-4 py-3 font-medium">{student.name}</td>
                    <td className="px-4 py-3">{student.father}</td>
                    <td className="px-4 py-3">
                      {isPresent ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Present
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Absent
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {attendance ? (
                        <span className="text-sm text-gray-600">
                          {attendance.markedAt?.toDate?.()?.toLocaleTimeString() || 'N/A'}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-sm text-gray-500 text-center">
        💡 Scroll to view all columns • Click column headers to sort
      </p>
    </div>
  );
}