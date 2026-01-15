import React from 'react';
import { ArrowRight, Search, Mic, Zap } from 'lucide-react';
import { playHoverSound } from '../utils/sound';

interface HomeProps {
  onStart: () => void;
}

export const Home: React.FC<HomeProps> = ({ onStart }) => {
  return (
    <div className="relative overflow-hidden bg-white min-h-[calc(100vh-80px)] flex items-center justify-center">
      {/* Background blobs for visual tone */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-700"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h1 className="text-5xl sm:text-7xl font-bold text-slate-900 tracking-tight mb-6">
          Simple<span className="text-blue-600">Prep</span>
        </h1>
        
        <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          Prepare for your next career move with AI-powered practice. Get comfortable answering questions and receive instant feedback.
        </p>

        <div className="flex flex-col items-center justify-center gap-6 mb-20">
          <button 
            onMouseEnter={playHoverSound}
            onClick={onStart}
            className="px-10 py-5 bg-blue-600 text-white rounded-[24px] text-xl font-bold shadow-xl hover:bg-blue-700 hover:shadow-2xl transition-all flex items-center group active:scale-95"
          >
            Start Practicing
            <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Step-by-Step Guidance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
           <div className="p-8 bg-white/50 backdrop-blur-md rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl mb-3 text-slate-800">1. Choose Your Path</h3>
              <p className="text-slate-500 leading-relaxed">Pick your professional field or custom practice to generate AI-powered interview questions instantly.</p>
           </div>
           <div className="p-8 bg-white/50 backdrop-blur-md rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mb-6 text-purple-600">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl mb-3 text-slate-800">2. Practice</h3>
              <p className="text-slate-500 leading-relaxed">Record and review your answers with voice, video, or text. Auto-transcription helps you build confidence faster.</p>
           </div>
           <div className="p-8 bg-white/50 backdrop-blur-md rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 text-emerald-600">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl mb-3 text-slate-800">3. Customize</h3>
              <p className="text-slate-500 leading-relaxed">Create your own questions and way of practice. Get AI suggestions, and tailor your practice to your goals.</p>
           </div>
        </div>
      </div>
    </div>
  );
};