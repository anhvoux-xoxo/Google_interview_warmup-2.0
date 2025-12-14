import React, { useState } from 'react';
import { Info, Edit2 } from 'lucide-react';
import { playHoverSound } from '../utils/sound';

interface CustomQuestionInputProps {
  onAdd: (questionText: string) => void;
}

export const CustomQuestionInput: React.FC<CustomQuestionInputProps> = ({ onAdd }) => {
  const [questionText, setQuestionText] = useState('');
  const [answerText, setAnswerText] = useState('');

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl p-8 shadow-sm">
        <span className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium mb-6">
          <Info className="w-3 h-3 mr-2" />
          Custom question
        </span>

        <div className="relative mb-8 flex items-center">
            {/* Updated border style: Black border only */}
            <input
            type="text"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Type your question here"
            className="w-full text-2xl md:text-3xl font-medium text-slate-900 placeholder:text-slate-300 border border-black focus:border-black focus:ring-0 p-4 rounded-xl bg-transparent"
            autoFocus
            />
            {/* Pen icon removed from inside input as per "Manually Add Question" section instructions which implies only black border? 
                Wait, "the pen icon in the type your question here must be the same icon design and layout with the pen below it" was previous.
                New instruction: "When user clicks into the text input field -> Show black border only -> Remove the current styled border design"
                It doesn't say remove the icon. I'll keep icon outside or positioned. The previous design had an icon. 
                I will align it with the input.
            */}
             <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <Edit2 className="w-6 h-6 text-slate-400" />
            </div>
        </div>

        <div className="border-t border-slate-200 pt-6 mb-8">
          <div className="flex items-center justify-between text-slate-800 mb-4">
            <div className="flex items-center text-lg font-medium">
               <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
               </svg>
               Your answer
            </div>
            <div className="p-2 border border-blue-500 rounded-lg text-blue-500">
              <Edit2 className="w-5 h-5" />
            </div>
          </div>
          
          <textarea
             value={answerText}
             onChange={(e) => setAnswerText(e.target.value)}
             className="w-full min-h-[120px] bg-slate-50 rounded-xl p-4 border-none resize-none focus:ring-1 focus:ring-blue-200 text-slate-700 placeholder:text-slate-400"
             placeholder="Type your answer here..."
          />
        </div>

        <button
          onMouseEnter={playHoverSound}
          onClick={() => onAdd(questionText)}
          disabled={!questionText.trim()}
          className="px-10 py-3 bg-blue-600 text-white font-semibold rounded-[20px] hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>
    </div>
  );
};