import React, { useState } from 'react';
import { QuestionCategory, Question, Recording } from '../types';
import { ChevronRight, ArrowLeft, Info, Play, Star } from 'lucide-react';
import { QuestionModal } from './QuestionModal';

interface PracticeProps {
  onSaveRecording: (recording: Recording) => void;
}

const QUESTIONS_DB: Record<string, Question[]> = {
  [QuestionCategory.UX_DESIGN]: [
    { id: 'ux1', text: 'Can you please tell me a bit about yourself?', category: QuestionCategory.UX_DESIGN, type: 'Background' },
    { id: 'ux2', text: 'How do you make sure your designs are accessible?', category: QuestionCategory.UX_DESIGN, type: 'Technical' },
    { id: 'ux3', text: 'When would you conduct a usability study?', category: QuestionCategory.UX_DESIGN, type: 'Technical' },
    { id: 'ux4', text: 'What are your career goals for the next five years?', category: QuestionCategory.UX_DESIGN, type: 'Background' },
    { id: 'ux5', text: 'Imagine you just led a design sprint. What metrics would you use to determine success?', category: QuestionCategory.UX_DESIGN, type: 'Technical' },
    { id: 'ux6', text: 'Describe a time you had to handle a difficult stakeholder.', category: QuestionCategory.UX_DESIGN, type: 'Situational' },
  ],
  [QuestionCategory.DATA_ANALYTICS]: [
    { id: 'da1', text: 'Tell me about yourself.', category: QuestionCategory.DATA_ANALYTICS, type: 'Background' },
    { id: 'da2', text: 'What is the difference between supervised and unsupervised learning?', category: QuestionCategory.DATA_ANALYTICS, type: 'Technical' },
  ],
};

export const Practice: React.FC<PracticeProps> = ({ onSaveRecording }) => {
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);

  const categories = Object.values(QuestionCategory);

  if (activeQuestion) {
    return (
      <QuestionModal 
        question={activeQuestion} 
        onClose={() => setActiveQuestion(null)}
        onSave={(rec) => {
          onSaveRecording(rec);
          setActiveQuestion(null);
        }}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {!selectedCategory ? (
        <div className="space-y-6 animate-fade-in">
          <div className="text-center py-8">
            <h2 className="text-3xl font-bold text-slate-800">What field do you want to practice for?</h2>
            <p className="text-slate-500 mt-2">Choose a category to see relevant questions.</p>
          </div>
          
          <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="group flex items-center justify-between p-5 bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all text-left"
              >
                <span className="font-medium text-lg text-slate-700 group-hover:text-blue-700">{cat}</span>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center space-x-4 mb-8">
            <button 
              onClick={() => setSelectedCategory(null)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
            <h2 className="text-2xl font-bold text-slate-800">{selectedCategory} Questions</h2>
          </div>

          <div className="flex space-x-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
            {['All', 'Background', 'Situational', 'Technical'].map((filter, idx) => (
               <button 
                key={filter} 
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${idx === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
               >
                 {filter}
               </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(QUESTIONS_DB[selectedCategory] || QUESTIONS_DB[QuestionCategory.UX_DESIGN]).map((q) => (
              <div 
                key={q.id}
                onClick={() => setActiveQuestion(q)}
                className="group cursor-pointer bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-200 flex flex-col justify-between h-full min-h-[180px]"
              >
                <div>
                  <span className={`inline-block px-3 py-1 rounded-md text-xs font-semibold mb-4
                    ${q.type === 'Background' ? 'bg-purple-100 text-purple-700' : 
                      q.type === 'Technical' ? 'bg-emerald-100 text-emerald-700' : 
                      'bg-rose-100 text-rose-700'}`}
                  >
                    {q.type}
                  </span>
                  <h3 className="text-lg font-medium text-slate-800 group-hover:text-blue-700 transition-colors">
                    {q.text}
                  </h3>
                </div>
                <div className="flex justify-end mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="flex items-center text-blue-600 font-medium text-sm">
                        Practice <Play className="w-4 h-4 ml-1 fill-current" />
                    </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};