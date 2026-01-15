import React, { useState } from 'react';
import { Volume2, VolumeX, Home as HomeIcon } from 'lucide-react';
import { playHoverSound, toggleSoundEnabled, getSoundEnabled } from '../utils/sound';

interface NavbarProps {
  onHome: () => void;
  backLabel?: string;
  isLanding?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onHome, 
  backLabel,
  isLanding
}) => {
  const [isSoundOn, setIsSoundOn] = useState(getSoundEnabled());

  const toggleSound = () => {
    const newState = toggleSoundEnabled();
    setIsSoundOn(newState);
  };

  const navButtonClass = "flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all duration-200 hover:bg-slate-50 text-slate-600 hover:text-[#1B6FF3] active:scale-95 group";

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-100 h-24 flex items-center shadow-sm">
      <div className="w-full max-w-5xl mx-auto px-8 lg:px-12 flex justify-between items-center">
        {/* Left Side: Empty on onboarding page, shows logo elsewhere */}
        <div className="flex items-center">
          {!isLanding && (
            <div className="flex flex-col">
              <span 
                className="text-3xl font-bold text-slate-900 font-serif tracking-tight cursor-pointer hover:opacity-80 transition-opacity"
                onClick={onHome}
              >
                Simple<span className="text-[#1B6FF3]">Prep.</span>
              </span>
              {backLabel && (
                <span className="text-xs font-bold text-[#1B6FF3] uppercase tracking-widest font-sans mt-0.5">
                  {backLabel}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Home & Sound Buttons (Vertical Layout) */}
        <div className="flex items-center space-x-2">
          <button 
            onClick={onHome}
            onMouseEnter={playHoverSound}
            className={navButtonClass}
          >
            <HomeIcon className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold font-sans">Home</span>
          </button>

          <button
            onClick={toggleSound}
            onMouseEnter={playHoverSound}
            className={navButtonClass}
          >
            {isSoundOn ? (
              <Volume2 className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
            ) : (
              <VolumeX className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
            )}
            <span className="text-xs font-semibold font-sans">Sound</span>
          </button>
        </div>
      </div>
    </nav>
  );
};