'use client';

import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  icon: string;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TabNavigation({ tabs, activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex gap-2 border-b-2 border-gray-200 dark:border-gray-700">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-6 py-3 font-medium transition-all duration-200',
            'border-b-3 border-transparent hover:bg-blue-50 dark:hover:bg-gray-700',
            activeTab === tab.id && 'border-blue-600 bg-blue-50 dark:bg-gray-700 text-blue-600'
          )}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}