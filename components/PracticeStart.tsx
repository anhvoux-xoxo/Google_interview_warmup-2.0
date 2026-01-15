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
    <div className="max-w-4xl mx-auto px-4 pt-24 pb-12 flex flex-col items-center justify-center animate-fade-in-up min-h-[calc(100vh-120px)]">
      {/* Spacing increased to mb-24 (twice the previous mb-12) to create significant vertical separation */}
      <div className="bg-white rounded-3xl p-12 border border-white shadow-[0_10px_30px_rgba(90,85,120,0.15)] mb-24 flex flex-col items-center w-full max-w-2xl">
        <h2 className="text-2xl font-semibold text-slate-800 mb-8 text-center">
          Practice with 5 interview questions
        </h2>
        
        <button 
          onMouseEnter={playHoverSound}
          onClick={onStartPractice}
          className="w-full max-w-md py-4 px-8 bg-blue-600 text-white text-xl font-medium rounded-[20px] hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center"
        >
          Start
          <ArrowRight className="w-6 h-6 ml-2" />
        </button>
      </div>
      
      {/* Restyled as plain text with no default button styling. Hover state adds background and blue text. */}
      <div className="flex justify-center w-full">
          <button 
            onMouseEnter={playHoverSound}
            onClick={onSeeAllQuestions}
            className="px-6 py-3 text-slate-800 font-semibold text-base rounded-[20px] transition-all border border-transparent outline-none focus:outline-none"
            style={{ backgroundColor: 'transparent' }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.34)';
              e.currentTarget.style.color = '#2563eb'; // Design's primary blue
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#1e293b'; // slate-800
            }}
            onMouseDown={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.6)')}
            onMouseUp={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.34)')}
          >
            {isCustom ? "See all the generated questions" : "See all the questions"}
          </button>
      </div>
    </div>
  );
};
