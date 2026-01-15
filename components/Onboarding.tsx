import React from 'react';
import { ArrowRight, Search, Mic, Zap, Sparkles } from 'lucide-react';
import { playHoverSound } from '../utils/sound';

interface OnboardingProps {
  onStart: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onStart }) => {
  const steps = [
    {
      title: "1. Choose Your Path",
      description: "Pick your professional field or custom practice to generate AI-powered interview questions instantly.",
      icon: <Search className="w-5 h-5 text-blue-500" />,
      color: "from-blue-500/10 to-transparent",
    },
    {
      title: "2. Practice",
      description: "Record and review your answers with voice, video, or text. Auto-transcription helps you build confidence faster.",
      icon: <Mic className="w-5 h-5 text-purple-500" />,
      color: "from-purple-500/10 to-transparent",
    },
    {
      title: "3. Customize",
      description: "Create your own questions and way of practice. Get AI suggestions, and tailor your practice to your goals.",
      icon: <Zap className="w-5 h-5 text-emerald-500" />,
      color: "from-emerald-500/10 to-transparent",
    }
  ];

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden flex flex-col items-center justify-center bg-[#f8fafc] py-12">
      <div className="relative z-10 w-full max-w-5xl px-8 lg:px-12 flex flex-col items-center">
        {/* Modern Badge */}
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 mb-6 rounded-full bg-white border border-slate-200 shadow-sm animate-fade-in-up">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest font-sans">AI-Powered Interview Coach</span>
        </div>

        {/* Hero Branding */}
        <div className="text-center mb-10 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 tracking-tight leading-tight mb-6 font-serif">
            Simple<span className="text-[#1B6FF3]">Prep.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 max-w-xl mx-auto leading-relaxed font-normal font-sans">
            Ready for your next interview? Practice real-world questions and boost your confidence.
          </p>
        </div>

        {/* Primary CTA */}
        <div className="mb-16 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <button 
            onMouseEnter={playHoverSound}
            onClick={onStart}
            className="group relative px-10 py-4 bg-[#1B6FF3] text-white text-lg font-semibold rounded-2xl hover:bg-blue-600 transition-all shadow-md active:scale-95 flex items-center font-sans"
          >
            Start now
            <ArrowRight className="ml-2.5 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {steps.map((step, index) => (
            <div 
              key={index} 
              style={{ animationDelay: `${300 + index * 100}ms` }}
              className="group animate-fade-in-up bg-white rounded-[24px] p-8 border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300 flex flex-col items-start font-sans"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} border border-slate-50 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300`}>
                {step.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">
                {step.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed font-normal">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
      `}} />
    </div>
  );
};