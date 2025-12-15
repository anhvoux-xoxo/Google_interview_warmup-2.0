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
    <div className="max-w-4xl mx-auto px-4 py-12 pb-32">
      <h1 className="text-3xl font-bold text-center text-slate-900 mb-12">
        What field do you want to practice for?
      </h1>

      <div className="space-y-6">
        {/* Category Grid */}
        <div className="grid grid-cols-1 gap-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onMouseEnter={playHoverSound}
              onClick={() => onSelectCategory(cat)}
              // Updated soft shadows with ambient glow hover using purple tints
              className={`
                w-full text-left p-6 rounded-2xl border transition-all duration-200
                ${selectedCategory === cat 
                  ? 'bg-white border-blue-200 shadow-[0_10px_30px_rgba(90,85,120,0.15)] ring-1 ring-blue-100' 
                  : 'bg-white border-transparent shadow-[0_10px_30px_rgba(90,85,120,0.15)] hover:shadow-[0_16px_40px_rgba(165,155,250,0.22)]'}
              `}
            >
              <span className={`text-lg font-medium ${selectedCategory === cat ? 'text-blue-700' : 'text-slate-800'}`}>
                {cat}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
