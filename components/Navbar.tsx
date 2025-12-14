import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { playHoverSound } from '../utils/sound';

interface NavbarProps {
  onBack: () => void;
  onForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onBack, onForward, canGoBack, canGoForward }) => {
  return (
    <nav className="sticky top-0 z-50 bg-white h-20 flex items-center border-b border-slate-100/50">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <button 
          onClick={onBack} 
          onMouseEnter={playHoverSound}
          disabled={!canGoBack}
          className={`
            w-12 h-12 flex items-center justify-center rounded-[25%] transition-all duration-200 text-black
            ${canGoBack 
              ? 'bg-[#D9D9D9]/30 hover:bg-[#D9D9D9]/60 cursor-pointer' 
              : 'bg-[#D9D9D9]/10 cursor-default opacity-50'}
          `}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        <button 
          onClick={onForward}
          onMouseEnter={playHoverSound}
          disabled={!canGoForward}
          className={`
            w-12 h-12 flex items-center justify-center rounded-[25%] transition-all duration-200 text-black
            ${canGoForward 
              ? 'bg-[#D9D9D9]/30 hover:bg-[#D9D9D9]/60 cursor-pointer' 
              : 'bg-[#D9D9D9]/10 cursor-default opacity-50'}
          `}
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    </nav>
  );
};