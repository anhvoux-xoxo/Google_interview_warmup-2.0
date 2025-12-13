import React from 'react';
import { View } from '../types';
import { Layout, Video, Mic } from 'lucide-react';

interface NavbarProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const navItems = [
    { label: 'Home', view: View.HOME, icon: <Layout className="w-4 h-4 mr-2" /> },
    { label: 'Practice', view: View.PRACTICE, icon: <Video className="w-4 h-4 mr-2" /> },
    { label: 'Recordings', view: View.RECORDINGS, icon: <Mic className="w-4 h-4 mr-2" /> },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center cursor-pointer" onClick={() => onNavigate(View.HOME)}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-2">
              <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">SimplePrep</span>
          </div>
          
          <div className="flex space-x-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => onNavigate(item.view)}
                className={`
                  flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${currentView === item.view 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                `}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};