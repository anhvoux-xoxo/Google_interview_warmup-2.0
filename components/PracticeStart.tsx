import React from 'react';
import { ArrowRight } from 'lucide-react';
import { playHoverSound } from '../utils/sound';

interface PracticeStartProps {
  onStartPractice: () => void;
  onSeeAllQuestions: () => void;
  isCustom: boolean;
}

export const PracticeStart: React.FC<PracticeStartProps> = ({ 
  onStartPractice, 
  onSeeAllQuestions,
  isCustom
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] w-full max-w-2xl mx-auto px-4 animate-fade-in-up font-sans">
      {/* Centered Main Card - Reduced Scale */}
      <div className="bg-white rounded-[32px] p-10 md:p-12 border border-slate-50 shadow-[0_15px_45px_rgba(0,0,0,0.03)] flex flex-col items-center w-full">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-10 text-center tracking-tight">
          Practice with 5 interview questions
        </h2>
        
        <button 
          onMouseEnter={playHoverSound}
          onClick={onStartPractice}
          className="w-full max-w-xs py-4 px-8 bg-[#2563EB] text-white text-xl font-semibold rounded-[20px] hover:bg-blue-700 transition-all flex items-center justify-center group active:scale-[0.98] shadow-lg shadow-blue-600/5"
        >
          Start
          <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
      
      {/* "See all questions" - Plain text style - Increased Size */}
      <div className="mt-8">
          <button 
            onMouseEnter={playHoverSound}
            onClick={onSeeAllQuestions}
            className="px-8 py-3 text-slate-900 font-bold text-lg transition-all rounded-full hover:text-[#2563EB] hover:bg-white border-0 bg-transparent active:scale-95"
          >
            {isCustom ? "See all the generated questions" : "See all the questions"}
          </button>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out forwards;
        }
      `}} />
    </div>
  );
};