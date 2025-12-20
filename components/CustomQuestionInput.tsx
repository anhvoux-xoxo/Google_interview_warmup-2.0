
import React, { useState, useRef } from 'react';
import { Info, Edit2, ChevronDown } from 'lucide-react';
import { playHoverSound } from '../utils/sound';

interface CustomQuestionInputProps {
  onAdd: (questionText: string, answerText: string) => void;
}

export const CustomQuestionInput: React.FC<CustomQuestionInputProps> = ({ onAdd }) => {
  const [questionText, setQuestionText] = useState('');
  const [answerText, setAnswerText] = useState('');
  
  const questionInputRef = useRef<HTMLInputElement>(null);
  const answerInputRef = useRef<HTMLTextAreaElement>(null);

  const focusQuestion = () => questionInputRef.current?.focus();
  const focusAnswer = () => answerInputRef.current?.focus();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl p-8 shadow-[0_10px_30px_rgba(90,85,120,0.15)]">
        <span className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium mb-6">
          <Info className="w-3 h-3 mr-2" />
          Custom question
        </span>

        <div className="relative mb-8 flex items-center group">
            <input
                ref={questionInputRef}
                type="text"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Type your question here"
                className="w-full text-2xl md:text-3xl font-medium text-black placeholder:text-slate-300 border border-black focus:border-black focus:ring-0 focus:outline-none p-4 rounded-xl bg-white transition-all hover:border-blue-600"
                autoFocus
            />
             <button 
                onClick={focusQuestion}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
             >
                <Edit2 className="w-6 h-6" />
            </button>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-8">
          <div className="flex items-center justify-between text-slate-800 mb-4">
            <div className="flex items-center text-lg font-medium">
               <ChevronDown className="w-5 h-5 mr-3" />
               Your answer
            </div>
          </div>
          
          <div className="relative group">
            <textarea
               ref={answerInputRef}
               value={answerText}
               onChange={(e) => setAnswerText(e.target.value)}
               className="w-full min-h-[120px] bg-white rounded-xl p-4 border border-slate-200 resize-y focus:outline-none focus:border-slate-400 text-black placeholder:text-slate-400 pr-10 hover:border-blue-400"
               placeholder="Type your answer here..."
            />
            <button 
              onClick={focusAnswer}
              className="absolute bottom-3 right-8 text-slate-400 hover:text-blue-600 transition-colors"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <button
          onMouseEnter={playHoverSound}
          onClick={() => onAdd(questionText, answerText)}
          disabled={!questionText.trim()}
          className="px-10 py-3 bg-blue-600 text-white font-semibold rounded-[20px] hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:shadow-lg active:scale-95"
        >
          Add
        </button>
      </div>
    </div>
  );
};
