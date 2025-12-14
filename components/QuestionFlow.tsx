import React, { useState, useEffect, useRef } from 'react';
import { Question, Recording } from '../types';
import { Mic, Video, Keyboard, RefreshCcw, Edit2, Info, Check, FileText, RotateCcw, Play, Square } from 'lucide-react';
import { playHoverSound } from '../utils/sound';

interface QuestionFlowProps {
  question: Question;
  onComplete: (recording: Recording) => void;
  dontAskRedo: boolean;
  setDontAskRedo: (val: boolean) => void;
}

type FlowState = 'READING' | 'INPUT_SELECTION' | 'RECORDING_VOICE' | 'PREVIEW_CAMERA' | 'RECORDING_CAMERA' | 'TYPING' | 'REVIEW' | 'REDO_CONFIRM';

// Simple Audio Visualizer Component
const AudioVisualizer = ({ stream }: { stream: MediaStream | null }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!stream || !canvasRef.current) return;
    
    let audioCtx: AudioContext;
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      return;
    }

    const analyser = audioCtx.createAnalyser();
    
    // Create source from stream
    let source: MediaStreamAudioSourceNode;
    try {
        source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
    } catch (e) {
        return;
    }
    
    analyser.fftSize = 64; // Low detail for bars
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    let animationId: number;
    
    const draw = () => {
      animationId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;
      
      for(let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        // Red color for waveform
        canvasCtx.fillStyle = '#EF4444'; 
        
        // Draw rounded bars or simple rects. Simple rects for "memos" look.
        const y = (canvas.height - barHeight) / 2;
        canvasCtx.fillRect(x, y, barWidth - 2, barHeight);
        
        x += barWidth;
      }
    };
    
    draw();
    
    return () => {
      cancelAnimationFrame(animationId);
      audioCtx.close();
    };
  }, [stream]);

  return <canvas ref={canvasRef} width={200} height={40} className="w-full h-full" />;
};

export const QuestionFlow: React.FC<QuestionFlowProps> = ({ question, onComplete, dontAskRedo, setDontAskRedo }) => {
  const [flowState, setFlowState] = useState<FlowState>('READING');
  const [transcript, setTranscript] = useState('');
  
  // Media State
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [voiceStream, setVoiceStream] = useState<MediaStream | null>(null); // Dedicated voice stream
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isRecordingMedia, setIsRecordingMedia] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false); // Default collapsed as per "click will show"
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Redo State
  const [nextRedoMode, setNextRedoMode] = useState<'voice' | 'camera' | 'typing' | null>(null);
  
  // Speech Recognition
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        // Use functional update to avoid stale closure issues if we were appending
        setTranscript(prev => prev + finalTranscript); 
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        // If 'no-speech' or network error, maybe ignore. 
        // If aborted, we might need to restart if still recording.
      };
      
      recognitionRef.current.onend = () => {
         // Auto-restart if we are still recording and it stopped unexpectedly
         if (isRecordingMedia && recognitionRef.current) {
             try {
                 recognitionRef.current.start();
             } catch(e) { /* ignore */ }
         }
      };
    }
  }, [isRecordingMedia]); // Add dependency to help restart logic

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) { /* Already started */ }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) { /* Already stopped */ }
    }
  };

  // Auto-read question on mount
  useEffect(() => {
    setFlowState('READING');
    setTranscript('');
    setRecordedVideoUrl(null);
    setRecordedAudioUrl(null);
    setVoiceStream(null);
    setCameraStream(null);
    
    const utter = new SpeechSynthesisUtterance(question.text);
    utter.rate = 1.0;
    utter.onend = () => {
       setFlowState(prev => prev === 'READING' ? 'INPUT_SELECTION' : prev);
    };
    
    setTimeout(() => {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
    }, 500);

    return () => {
      window.speechSynthesis.cancel();
      stopCamera();
      stopListening();
      if (voiceStream) voiceStream.getTracks().forEach(t => t.stop());
    };
  }, [question]);

  // Camera Logic
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.error("Camera access failed", e);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
  };

  // State Management Effect
  useEffect(() => {
    if (flowState === 'PREVIEW_CAMERA' || flowState === 'RECORDING_CAMERA') {
      startCamera();
    } else {
      stopCamera();
    }
    
    // Transcription logic
    if (flowState === 'RECORDING_VOICE' || flowState === 'RECORDING_CAMERA') {
        setIsRecordingMedia(true);
        startListening();
    } else {
        setIsRecordingMedia(false);
        stopListening();
    }
  }, [flowState]);

  // Recording Logic
  const startRecording = async (mode: 'video' | 'audio') => {
    try {
      let stream;
      if (mode === 'video') {
         stream = cameraStream;
      } else {
         stream = await navigator.mediaDevices.getUserMedia({ audio: true });
         setVoiceStream(stream);
      }

      if (!stream) return;

      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
         if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
         const type = mode === 'video' ? 'video/webm' : 'audio/webm';
         const blob = new Blob(chunksRef.current, { type });
         const url = URL.createObjectURL(blob);
         if (mode === 'video') setRecordedVideoUrl(url);
         else setRecordedAudioUrl(url);

         // Clean up audio stream if voice only
         if (mode === 'audio') {
             stream.getTracks().forEach(t => t.stop());
             setVoiceStream(null);
         }
      };

      mediaRecorder.start();
      
      if (mode === 'video') setFlowState('RECORDING_CAMERA');
      else {
          setTranscript('');
          setFlowState('RECORDING_VOICE');
      }

    } catch (e) {
      console.error("Recording start failed", e);
    }
  };

  const stopRecordingMedia = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
       mediaRecorderRef.current.stop();
       setFlowState('REVIEW');
    }
  };

  // Handlers
  const handleVoiceStart = () => {
    startRecording('audio');
  };

  const handleVoiceDone = () => {
    stopRecordingMedia();
  };

  const handleCameraRecordStart = () => startRecording('video');
  const handleCameraRecordStop = stopRecordingMedia;

  const handleTypingDone = () => {
    setFlowState('REVIEW');
  };

  const initiateRedo = (mode: 'voice' | 'camera' | 'typing') => {
    if (dontAskRedo) {
      performRedo(mode);
    } else {
      setNextRedoMode(mode);
      setFlowState('REDO_CONFIRM');
    }
  };

  const performRedo = (mode: 'voice' | 'camera' | 'typing') => {
    setTranscript('');
    setRecordedVideoUrl(null);
    setRecordedAudioUrl(null);
    setFlowState('READING');
    const utter = new SpeechSynthesisUtterance(question.text);
    utter.onend = () => setFlowState('INPUT_SELECTION');
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  const playAudio = () => {
      if (recordedAudioUrl) {
          if (!audioRef.current) {
              audioRef.current = new Audio(recordedAudioUrl);
              audioRef.current.onended = () => {
                  // Optional: Reset play state if visual needed
              };
          }
          audioRef.current.play();
      }
  };

  // Typography helpers
  const headerClass = "text-2xl text-slate-800 leading-snug font-medium flex items-center";

  // Action Button Component
  const ActionButton = ({ icon: Icon, onClick, active = false, className = "", large = false }: any) => {
     const sizeClass = large ? "w-16 h-16" : "w-14 h-14"; 
     const iconSize = large ? "w-8 h-8" : "w-6 h-6";

     return (
        <button
          onClick={onClick}
          onMouseEnter={playHoverSound}
          className={`
            ${sizeClass} rounded-2xl flex items-center justify-center transition-all duration-200
            ${active 
                ? 'bg-[#1B6FF3] text-white border-0' 
                : 'bg-white text-[#1B6FF3] border border-[#1B6FF3] hover:border-transparent hover:bg-[#1B6FF3]/15 hover:shadow-[0_0_10px_rgba(0,0,0,0.1)]'
            }
            ${className}
          `}
        >
           <Icon className={iconSize} />
        </button>
     );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col min-h-[80vh]">
      
      {/* Question Card */}
      <div className="bg-white rounded-2xl p-8 mb-6 shadow-sm border border-slate-100">
        <span className={`
            inline-flex items-center px-2 py-1 rounded text-xs font-medium mb-4
            ${question.type === 'Background' ? 'bg-purple-100 text-purple-700' : 
              question.type === 'Custom question' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-700'}
        `}>
            <Info className="w-3 h-3 mr-1" />
            {question.type === 'Custom question' ? 'Custom question' : `${question.type} question`}
        </span>
        <h2 className="text-2xl text-slate-800 leading-snug">
          {question.text}
        </h2>
      </div>

      {/* Dynamic Area based on State */}
      <div className="flex-grow">
        
        {/* STATE: READING */}
        {flowState === 'READING' && (
          <div className="flex justify-center pt-10">
            <div className="flex items-center space-x-2 text-slate-400 animate-pulse">
               <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
               <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-100"></div>
               <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-200"></div>
               <span className="text-sm font-medium text-slate-500">Reading question...</span>
            </div>
          </div>
        )}

        {/* STATE: INPUT SELECTION */}
        {flowState === 'INPUT_SELECTION' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-fade-in">
             <div className="mb-6">
                <h3 className={headerClass}>
                    Answer
                </h3>
             </div>
             
             <div className="flex space-x-4 pl-0">
                <ActionButton icon={Mic} onClick={handleVoiceStart} />
                <ActionButton icon={Video} onClick={() => setFlowState('PREVIEW_CAMERA')} />
                <ActionButton icon={Keyboard} onClick={() => setFlowState('TYPING')} />
             </div>
          </div>
        )}

        {/* STATE: RECORDING VOICE */}
        {flowState === 'RECORDING_VOICE' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
             <div className="flex items-center justify-between mb-8">
                 <h3 className={headerClass}>
                    <div className="mr-3 w-8 h-8 flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
                        </svg>
                    </div>
                    Your answer
                 </h3>
                 {/* Visualizer Area */}
                 <div className="h-12 w-48 flex items-center justify-end">
                     {voiceStream && <AudioVisualizer stream={voiceStream} />}
                 </div>
             </div>

             <div className="flex justify-start">
                <button 
                   onClick={handleVoiceDone}
                   className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-[20px] hover:bg-blue-700 transition-colors shadow-md text-lg"
                >
                   Done
                </button>
             </div>
          </div>
        )}

        {/* STATE: CAMERA PREVIEW & RECORDING */}
        {(flowState === 'PREVIEW_CAMERA' || flowState === 'RECORDING_CAMERA') && (
          <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
             <div className="aspect-video bg-black relative">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                {flowState === 'RECORDING_CAMERA' && (
                  <div className="absolute top-4 right-4 flex items-center space-x-2 bg-red-600/80 text-white px-3 py-1 rounded-full text-xs font-bold">
                     <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                     <span>REC</span>
                  </div>
                )}
             </div>
             <div className="p-8 flex justify-center items-center">
               {flowState === 'PREVIEW_CAMERA' ? (
                   <ActionButton icon={Video} onClick={handleCameraRecordStart} active={false} large={true} className="w-20 h-20" />
               ) : (
                   <ActionButton icon={Video} onClick={handleCameraRecordStop} active={true} large={true} className="w-20 h-20" />
               )}
             </div>
          </div>
        )}

        {/* STATE: TYPING */}
        {flowState === 'TYPING' && (
           <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm h-96 flex flex-col">
              <h3 className={`${headerClass} mb-4`}>
                <Keyboard className="w-8 h-8 mr-3" /> Your answer
              </h3>
              <textarea 
                 value={transcript}
                 onChange={(e) => setTranscript(e.target.value)}
                 className="flex-grow w-full resize-none border-none focus:ring-0 text-lg text-slate-700 placeholder:text-slate-300"
                 placeholder="Type your answer here..."
                 autoFocus
              />
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                 <button 
                   onClick={handleTypingDone}
                   className="px-6 py-2 bg-blue-600 text-white rounded-[20px] font-medium hover:bg-blue-700"
                 >
                   Done
                 </button>
              </div>
           </div>
        )}

        {/* STATE: REVIEW */}
        {flowState === 'REVIEW' && (
           <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
             
             {/* If video exists, show it first */}
             {recordedVideoUrl && (
                <div className="mb-8">
                    <div className="aspect-video bg-black rounded-xl overflow-hidden relative group shadow-sm">
                        <video src={recordedVideoUrl} controls className="w-full h-full" />
                    </div>
                </div>
             )}

             {/* Header with Divider and File+Arrow Icon */}
             <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
               <div className="flex items-center">
                 <button 
                    onClick={() => setIsContentExpanded(!isContentExpanded)}
                    className="mr-3 text-slate-500 hover:text-slate-800 transition-colors"
                 >
                    {/* The icon in screenshot looks like a File with lines and maybe an arrow. FileText is close. */}
                    <FileText className="w-6 h-6" />
                 </button>
                 <span className={headerClass}>Your answer</span>
               </div>

               {/* Right side: Replay Icon */}
               <div>
                  {(recordedAudioUrl || recordedVideoUrl) && (
                      <button 
                        onClick={playAudio}
                        className="text-blue-600 border border-blue-200 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Replay"
                      >
                         <RotateCcw className="w-6 h-6" />
                      </button>
                  )}
               </div>
             </div>
             
             {/* Collapsible Content - Editable Transcript */}
             {isContentExpanded && (
                <div className="mb-6 animate-fade-in">
                  <textarea
                     value={transcript}
                     onChange={(e) => setTranscript(e.target.value)}
                     className="w-full min-h-[120px] p-4 bg-slate-50 rounded-xl border border-transparent focus:border-blue-200 focus:bg-white transition-all text-slate-700 leading-relaxed text-lg resize-none outline-none"
                     placeholder="No speech detected."
                  />
                  <div className="text-right mt-2">
                     <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Transcripted</span>
                  </div>
                </div>
             )}

             <div className="flex items-center justify-between mt-4">
                <div className="flex flex-col">
                   <span className="text-2xl font-medium text-slate-800 mb-4">Redo</span>
                   <div className="flex space-x-3">
                      <ActionButton icon={Mic} onClick={() => initiateRedo('voice')} />
                      <ActionButton icon={Video} onClick={() => initiateRedo('camera')} />
                      <ActionButton icon={Keyboard} onClick={() => initiateRedo('typing')} />
                   </div>
                </div>
             </div>
           </div>
        )}

        {/* STATE: REDO CONFIRMATION */}
        {flowState === 'REDO_CONFIRM' && (
           <div className="mt-4 bg-white rounded-2xl p-8 border border-slate-100 shadow-lg animate-fade-in-up">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Redo your answer?</h3>
              <p className="text-slate-600 mb-6">This will erase your current answer. Would you like to redo it?</p>
              
              <div className="flex items-center mb-8 cursor-pointer" onClick={() => setDontAskRedo(!dontAskRedo)}>
                 <div className={`
                    w-6 h-6 rounded border-2 flex items-center justify-center transition-colors mr-3
                    ${dontAskRedo ? 'bg-blue-600 border-blue-600' : 'bg-transparent border-blue-600'}
                 `}>
                    {dontAskRedo && <Check className="w-4 h-4 text-white" />}
                 </div>
                 <label className="text-slate-600 select-none cursor-pointer">Don't ask again</label>
              </div>

              <div className="flex justify-end space-x-4">
                 <button 
                   onClick={() => setFlowState('REVIEW')}
                   className="px-4 py-2 text-slate-600 font-medium hover:text-slate-900"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={() => nextRedoMode && performRedo(nextRedoMode)}
                   className="px-6 py-2 bg-blue-50 text-blue-700 font-semibold rounded-lg border border-blue-100 hover:bg-blue-100"
                 >
                   Yes
                 </button>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};