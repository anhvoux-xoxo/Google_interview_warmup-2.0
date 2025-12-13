import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Home } from './components/Home';
import { Practice } from './components/Practice';
import { Recordings } from './components/Recordings';
import { View, Recording } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [recordings, setRecordings] = useState<Recording[]>([]);

  const handleSaveRecording = (recording: Recording) => {
    setRecordings((prev) => [recording, ...prev]);
  };

  const renderView = () => {
    switch (currentView) {
      case View.HOME:
        return <Home onStart={() => setCurrentView(View.PRACTICE)} />;
      case View.PRACTICE:
        return <Practice onSaveRecording={handleSaveRecording} />;
      case View.RECORDINGS:
        return <Recordings recordings={recordings} />;
      default:
        return <Home onStart={() => setCurrentView(View.PRACTICE)} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-slate-900">
      <Navbar currentView={currentView} onNavigate={setCurrentView} />
      <main className="flex-grow">
        {renderView()}
      </main>
    </div>
  );
}