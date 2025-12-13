import React, { useState, useRef, useEffect } from 'react';
import { Question, Recording } from '../types';
import { X, Mic, Video, Keyboard, Lightbulb, Save, RotateCcw, PlayCircle, StopCircle, Check } from 'lucide-react';
import { getAiSuggestion } from '../services/geminiService';

interface QuestionModalProps {
  question: Question;
  onClose: () => void;
  onSave: (recording: Recording) => void;
}

export const QuestionModal: React.FC<QuestionModalProps> = ({ question, onClose, onSave }) => {
  const [mode, setMode] = useState<'camera' | 'voice' | 'text' | 'ai'>('camera');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (mode === 'camera' || mode === 'voice') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
      stopTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (mode === 'ai' && !aiSuggestion && !loadingAi) {
      handleGetAiSuggestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const startCamera = async () => {
    try {
      const constraints = mode === 'camera' ? { video: true, audio: true } : { audio: true, video: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current && mode === 'camera') {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing media devices", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startTimer = () => {
    setElapsed(0);
    timerRef.current = window.setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      // Stop
      setIsRecording(false);
      stopTimer();
      // Simulate transcription completion
      if (!transcript) {
         setTranscript("I believe I am a strong candidate for this role because I have extensive experience in React development and a passion for user-centric design...");
      }
    } else {
      // Start
      setIsRecording(true);
      setTranscript('');
      startTimer();
    }
  };

  const handleGetAiSuggestion = async () => {
    setLoadingAi(true);
    const suggestion = await getAiSuggestion(question.text);
    setAiSuggestion(suggestion);
    setLoadingAi(false);
  };

  const handleSave = () => {
    onSave({
      id: Date.now().toString(),
      questionId: question.id,
      questionText: question.text,
      date: new Date(),
      transcript: transcript || "No transcript recorded.",
      type: mode === 'camera' ? 'Video' : mode === 'voice' ? 'Audio' : 'Text',
      durationSeconds: elapsed
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative animate-scale-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded text-xs font-semibold ${question.type === 'Background' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {question.type} question
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Panel: Context & Video */}
          <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col border-r border-slate-100 overflow-y-auto bg-slate-50">
             <h2 className="text-2xl font-bold text-slate-800 mb-6 leading-snug">
               {question.text}
             </h2>

             <div className="flex-grow flex flex-col justify-center mb-6">
                {mode === 'ai' ? (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
                    <div className="flex items-center mb-4 text-blue-600">
                      <Lightbulb className="w-5 h-5 mr-2" />
                      <h3 className="font-semibold">AI Suggestion</h3>
                    </div>
                    {loadingAi ? (
                      <div className="flex flex-col items-center py-8">
                        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-500 text-sm">Analyzing question...</p>
                      </div>
                    ) : (
                      <div className="prose prose-sm prose-blue text-slate-600 whitespace-pre-wrap">
                        {aiSuggestion}
                      </div>
                    )}
                  </div>
                ) : mode === 'text' ? (
                   <div className="w-full h-64 bg-white rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                      <Keyboard className="w-12 h-12 mb-2 opacity-50" />
                      <span>Typing Mode Active</span>
                   </div>
                ) : (
                  <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-lg group">
                    {mode === 'camera' ? (
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover transform scale-x-[-1]" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800">
                         <div className={`w-24 h-24 rounded-full bg-blue-500/20 flex items-center justify-center ${isRecording ? 'animate-pulse' : ''}`}>
                            <Mic className="w-10 h-10 text-blue-400" />
                         </div>
                      </div>
                    )}
                    
                    {isRecording && (
                      <div className="absolute top-4 right-4 bg-red-500/90 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                        REC {formatTime(elapsed)}
                      </div>
                    )}
                  </div>
                )}
             </div>

             {/* Controls */}
             <div className="flex justify-center space-x-4">
                <button 
                  onClick={() => setMode('camera')}
                  className={`p-3 rounded-full transition-all ${mode === 'camera' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                  title="Camera"
                >
                  <Video className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setMode('voice')}
                  className={`p-3 rounded-full transition-all ${mode === 'voice' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                  title="Voice Only"
                >
                  <Mic className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setMode('text')}
                  className={`p-3 rounded-full transition-all ${mode === 'text' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                  title="Type Answer"
                >
                  <Keyboard className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setMode('ai')}
                  className={`p-3 rounded-full transition-all ${mode === 'ai' ? 'bg-amber-400 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                  title="AI Hints"
                >
                  <Lightbulb className="w-5 h-5" />
                </button>
             </div>
          </div>

          {/* Right Panel: Transcription/Answer */}
          <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-700">Your Answer</h3>
              {mode !== 'text' && mode !== 'ai' && (
                 <button 
                   onClick={toggleRecording}
                   className={`
                     flex items-center px-4 py-2 rounded-full text-sm font-semibold transition-all
                     ${isRecording 
                       ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' 
                       : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'}
                   `}
                 >
                   {isRecording ? <StopCircle className="w-4 h-4 mr-2" /> : <PlayCircle className="w-4 h-4 mr-2" />}
                   {isRecording ? 'Stop Recording' : 'Start Recording'}
                 </button>
              )}
            </div>

            <div className="flex-grow bg-slate-50 rounded-2xl border border-slate-100 p-4 mb-6 relative overflow-hidden">
               <textarea
                 value={transcript}
                 onChange={(e) => setTranscript(e.target.value)}
                 placeholder={mode === 'text' ? "Type your answer here..." : "Transcription will appear here after recording..."}
                 className="w-full h-full bg-transparent border-none resize-none focus:ring-0 text-slate-700 leading-relaxed placeholder:text-slate-400"
               />
               {isRecording && mode !== 'text' && (
                 <div className="absolute bottom-4 left-4 right-4 text-center">
                    <span className="text-slate-400 text-sm animate-pulse">Listening... speak clearly</span>
                 </div>
               )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
               <div className="flex space-x-3">
                  <button 
                    onClick={() => setTranscript('')}
                    className="flex items-center px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors text-sm font-medium"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Redo
                  </button>
                  {transcript && (
                    <button className="flex items-center px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors text-sm font-medium">
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Replay
                    </button>
                  )}
               </div>
               
               <button 
                 onClick={handleSave}
                 disabled={!transcript}
                 className="flex items-center px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
               >
                 <Save className="w-4 h-4 mr-2" />
                 Save Answer
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};