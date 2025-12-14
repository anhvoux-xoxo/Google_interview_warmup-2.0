import React, { useState } from 'react';
import { playHoverSound } from '../utils/sound';
import { generateQuestions } from '../services/geminiService';
import { ArrowRight, Loader2 } from 'lucide-react';

interface CustomJobInputProps {
  onStart: (description: string, questions: string[]) => void;
  onManualAdd: () => void;
}

export const CustomJobInput: React.FC<CustomJobInputProps> = ({ onStart, onManualAdd }) => {
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);

  const handleStart = async () => {
    if (!description.trim()) return;
    
    setIsGenerating(true);
    const questions = await generateQuestions(description);
    setIsGenerating(false);
    setGeneratedQuestions(questions);
    
    // Trigger the callback but we might stay on page or navigate depending on flow.
    // The prompt says "When user clicks Start -> Trigger ChatGPT to generate 5 random practice questions"
    // Then "When user clicks this box (See all generated questions) -> Display the list".
    // So we don't auto-navigate immediately to the list in the App flow, we wait for user to click the new button.
    // However, the App logic usually expects onStart to do something. 
    // We will store them here and allow the new button to call onStart with the questions.
  };

  const handleSeeGenerated = () => {
    onStart(description, generatedQuestions);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col items-center">
      <div className="w-full bg-white rounded-3xl p-8 shadow-sm mb-12">
        <h2 className="text-xl font-normal text-slate-800 text-center mb-6">
          Paste or type your job description here to generate practice questions
        </h2>
        
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full h-48 p-4 bg-white border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-700 placeholder:text-slate-400 mb-8"
          placeholder="e.g. UX Designer role at Google..."
        />

        <button 
          onMouseEnter={playHoverSound}
          onClick={handleStart}
          disabled={!description.trim() || isGenerating}
          className="w-full max-w-md py-5 px-6 bg-blue-600 text-white text-xl font-medium rounded-[20px] hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center disabled:opacity-70"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-6 h-6 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            'Start'
          )}
        </button>
      </div>

      {!generatedQuestions.length ? (
        <button
          onMouseEnter={playHoverSound}
          onClick={onManualAdd}
          className="px-6 py-3 font-semibold rounded-[20px] transition-all text-slate-800"
          style={{ backgroundColor: 'rgba(255,255,255,0.34)' }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.77)')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.34)')}
          onMouseDown={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,1)')}
          onMouseUp={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.77)')}
        >
          Manually add your questions here
        </button>
      ) : (
        <button
          onMouseEnter={playHoverSound}
          onClick={handleSeeGenerated}
          className="w-full max-w-md px-6 py-4 text-slate-800 font-semibold text-base rounded-[20px] transition-all bg-white hover:shadow-md border border-transparent"
          style={{ backgroundColor: 'rgba(255,255,255,0.34)' }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.77)')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.34)')}
          onMouseDown={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,1)')}
          onMouseUp={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.77)')}
        >
          See all the generated questions
        </button>
      )}
    </div>
  );
};