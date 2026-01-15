import React from 'react';
import { ArrowRight, CheckCircle } from 'lucide-react';

interface HomeProps {
  onStart: () => void;
}

export const Home: React.FC<HomeProps> = ({ onStart }) => {
  return (
    <div className="relative overflow-hidden bg-white min-h-[calc(100vh-64px)] flex items-center justify-center">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h1 className="text-5xl sm:text-7xl font-extrabold text-slate-900 tracking-tight mb-6">
          interview <span className="text-blue-600">warmup</span>
        </h1>
        
        <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto mb-10">
          A quick way to prepare for your next interview. Practice key questions, get insights about your answers, and get more comfortable interviewing.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button 
            onClick={onStart}
            className="px-8 py-4 bg-blue-600 text-white rounded-full text-lg font-semibold shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all flex items-center group"
          >
            Start Practicing
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left mt-12">
           <div className="p-6 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Real Questions</h3>
              <p className="text-slate-500">Practice with questions curated by industry experts from top companies.</p>
           </div>
           <div className="p-6 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mb-4 text-purple-600">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">AI Insights</h3>
              <p className="text-slate-500">Receive instant feedback and improvement suggestions powered by Gemini.</p>
           </div>
           <div className="p-6 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Record & Review</h3>
              <p className="text-slate-500">Watch your recordings back to spot habits and improve your delivery.</p>
           </div>
        </div>
      </div>
    </div>
  );
};