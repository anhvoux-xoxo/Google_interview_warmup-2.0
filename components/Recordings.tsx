import React from 'react';
import { Recording } from '../types';
import { Video, Mic, FileText, Calendar, Clock, Trash2, MoreHorizontal } from 'lucide-react';

interface RecordingsProps {
  recordings: Recording[];
}

export const Recordings: React.FC<RecordingsProps> = ({ recordings }) => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800">Your Recordings</h2>
        <p className="text-slate-500 mt-2">Review your past answers to track your progress.</p>
      </div>

      {recordings.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No recordings yet</h3>
          <p className="text-slate-500 mt-1">Head over to the Practice tab to start answering questions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {recordings.map((rec) => (
            <div key={rec.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6">
               {/* Thumbnail/Icon */}
               <div className="w-full md:w-48 h-32 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  {rec.type === 'Video' ? <Video className="w-10 h-10 text-blue-500" /> :
                   rec.type === 'Audio' ? <Mic className="w-10 h-10 text-purple-500" /> :
                   <FileText className="w-10 h-10 text-slate-500" />}
               </div>
               
               {/* Content */}
               <div className="flex-grow flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between">
                       <h3 className="text-lg font-semibold text-slate-800 mb-1">{rec.questionText}</h3>
                       <button className="text-slate-400 hover:text-slate-600">
                         <MoreHorizontal className="w-5 h-5" />
                       </button>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-slate-500 mb-3">
                       <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {rec.date.toLocaleDateString()}</span>
                       {rec.durationSeconds && (
                         <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {Math.floor(rec.durationSeconds / 60)}:{String(rec.durationSeconds % 60).padStart(2, '0')}</span>
                       )}
                       <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">{rec.type}</span>
                    </div>

                    <p className="text-slate-600 text-sm line-clamp-2 italic">
                      "{rec.transcript}"
                    </p>
                  </div>
                  
                  <div className="mt-4 flex space-x-3">
                     <button className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">Review Answer</button>
                     <button className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors flex items-center">
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                     </button>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};