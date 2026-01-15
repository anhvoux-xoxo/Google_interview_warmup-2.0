import React from 'react';
import { QuestionCategory } from '../types';
import { playHoverSound } from '../utils/sound';

interface FieldSelectionProps {
  onSelectCategory: (category: QuestionCategory) => void;
  selectedCategory: QuestionCategory | null;
}

export const FieldSelection: React.FC<FieldSelectionProps> = ({ 
  onSelectCategory, 
  selectedCategory 
}) => {
  const categories = Object.values(QuestionCategory);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 pb-32 font-sans">
      <h1 className="text-3xl font-bold text-center text-slate-900 mb-10">
        What path would you like to explore?
      </h1>

      <div className="space-y-4">
        {categories.map((cat) => (
          <button
            key={cat}
            onMouseEnter={playHoverSound}
            onClick={() => onSelectCategory(cat)}
            className={`
              w-full text-left p-6 rounded-2xl border-2 transition-all duration-200 transform active:scale-[0.99]
              ${selectedCategory === cat 
                ? 'bg-blue-50 border-blue-600 text-blue-800 shadow-sm' 
                : 'bg-white border-slate-100 text-slate-800 shadow-sm hover:border-blue-400 hover:text-blue-700'}
            `}
          >
            <span className="text-lg font-bold">
              {cat}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};