import React, { useState, useEffect, useRef } from 'react';
import { Question, Recording } from '../types';
import { Mic, Video, Keyboard, Info, ChevronDown, ChevronRight, Play, Pause, ArrowRight, ArrowLeft, Loader2, X } from 'lucide-react';
import { transcribeAudio, GlobalAudio } from '../services/geminiService';

interface QuestionFlowProps {
  question: Question;
  onComplete: (recording: Recording) => void;
  dontAskRedo: boolean;
  setDontAskRedo: (val: boolean) => void;
  sessionIndex?: number;
  sessionTotal?: number;
  onNext?: () => void;
  onPrev?: () => void;
}

type FlowState = 'READING' | 'RECORDING_VOICE' | 'PREVIEW_CAMERA' | 'RECORDING_CAMERA' | 'TYPING' | 'REVIEW';

const AudioVisualizer = ({ stream, isRecording = true }: { stream: MediaStream | null, isRecording?: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;
    let animationId: number;
    let analyser: AnalyserNode | null = null;
    let audioCtx: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    if (stream && isRecording) {
        try {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 64;
        } catch (e) {}
    }
    const bufferLength = analyser ? analyser.frequencyBinCount : 32;
    const dataArray = new Uint8Array(bufferLength);
    const draw = () => {
      animationId = requestAnimationFrame(draw);
      if (analyser) analyser.getByteFrequencyData(dataArray);
      else for(let i=0; i<bufferLength; i++) dataArray[i] = 0; 
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = 4;
      const gap = 4;
      const totalBars = Math.floor(canvas.width / (barWidth + gap));
      const startX = (canvas.width - (totalBars * (barWidth + gap))) / 2;
      for(let i = 0; i < totalBars; i++) {
        const value = dataArray[Math.floor(i * (bufferLength / totalBars))] || 0;
        const height = Math.max(4, (value / 255) * canvas.height);
        canvasCtx.fillStyle = value > 10 ? '#A855F7' : '#C084FC';
        const x = startX + i * (barWidth + gap);
        const y = (canvas.height - height) / 2;
        canvasCtx.beginPath();
        canvasCtx.roundRect(x, y, barWidth, height, 4);
        canvasCtx.fill();
      }
    };
    draw();
    return () => {
      cancelAnimationFrame(animationId);
      if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
    };
  }, [stream, isRecording]);
  return <canvas ref={canvasRef} width={300} height={48} className="w-full h-full" />;
};

const PlaybackVisualizer = ({ isPlaying }: { isPlaying: boolean }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        let animationId: number;
        let step = 0;
        const draw = () => {
            animationId = requestAnimationFrame(draw);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const barWidth = 4;
            const gap = 4;
            const totalBars = Math.floor(canvas.width / (barWidth + gap));
            const startX = (canvas.width - (totalBars * (barWidth + gap))) / 2;
            step += 0.1;
            for(let i=0; i<totalBars; i++) {
                let height = isPlaying ? 10 + Math.sin(i * 0.5 + step) * 10 + Math.random() * 10 : 10 + Math.sin(i * 0.5) * 8;
                ctx.fillStyle = isPlaying ? '#A855F7' : '#C084FC';
                const x = startX + i * (barWidth + gap);
                const y = (canvas.height - height) / 2;
                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, height, 4);
                ctx.fill();
            }
        };
        draw();
        return () => cancelAnimationFrame(animationId);
    }, [isPlaying]);
    return <canvas ref={canvasRef} width={300} height={48} className="w-full h-full" />;
}

export const QuestionFlow: React.FC<QuestionFlowProps> = ({ 
  question, 
  onComplete, 
  dontAskRedo, 
  setDontAskRedo,
  sessionIndex,
  sessionTotal,
  onNext,
  onPrev
}) => {
  const [flowState, setFlowState] = useState<FlowState>('READING');
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnswerVisible, setIsAnswerVisible] = useState(true);
  const [voiceStream, setVoiceStream] = useState<MediaStream | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playbackIsPlaying, setPlaybackIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [showRedoConfirm, setShowRedoConfirm] = useState(false);
  const [pendingRedoMode, setPendingRedoMode] = useState<'VOICE' | 'CAMERA' | 'TYPE' | null>(null);

  const startRecording = async (mode: 'video' | 'audio') => {
    try {
      let stream;
      if (mode === 'video') {
         stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
         if (videoRef.current) videoRef.current.srcObject = stream;
      } else {
         stream = await navigator.mediaDevices.getUserMedia({ audio: true });
         setVoiceStream(stream);
      }
      if (!stream) return;
      chunksRef.current = [];
      setRecordingDuration(0);
      setIsPaused(false);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
         const mimeType = mode === 'video' ? 'video/webm' : 'audio/webm';
         const blob = new Blob(chunksRef.current, { type: mimeType });
         const url = URL.createObjectURL(blob);
         if (mode === 'video') setRecordedVideoUrl(url); else setRecordedAudioUrl(url);
         if (blob.size > 0) {
           setIsTranscribing(true);
           const reader = new FileReader();
           reader.readAsDataURL(blob);
           reader.onloadend = async () => {
              const base64data = (reader.result as string).split(',')[1];
              const result = await transcribeAudio(base64data, mimeType);
              setTranscript(result?.trim() || "");
              setIsTranscribing(false);
           };
         }
         if (mode === 'audio') { stream.getTracks().forEach(t => t.stop()); setVoiceStream(null); }
      };
      mediaRecorder.start();
      if (mode === 'video') setFlowState('RECORDING_CAMERA'); else { setTranscript(''); setFlowState('RECORDING_VOICE'); }
    } catch (e) { setFlowState('REVIEW'); }
  };

  useEffect(() => {
    let interval: number;
    if ((flowState === 'RECORDING_VOICE' || flowState === 'RECORDING_CAMERA') && !isPaused) {
        interval = window.setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [flowState, isPaused]);

  useEffect(() => {
    setFlowState('READING');
    setTranscript('');
    setRecordedVideoUrl(null);
    setRecordedAudioUrl(null);
    setVoiceStream(null);
    setRecordingDuration(0);
    setIsPaused(false);
    setIsTranscribing(false);

    let isMounted = true;
    
    // Wire up completion listener to the global singleton
    GlobalAudio.setOnEnded(() => {
        if (isMounted) startRecording('audio');
    });

    // Check if audio finished before we even mounted
    if (!GlobalAudio.isPlaying()) {
        startRecording('audio');
    }

    return () => {
      isMounted = false;
      GlobalAudio.setOnEnded(null);
    };
  }, [question]);

  const stopRecordingMedia = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
       mediaRecorderRef.current.stop();
       setFlowState('REVIEW');
    }
  };

  const togglePause = () => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) { mediaRecorderRef.current.resume(); setIsPaused(false); }
    else { mediaRecorderRef.current.pause(); setIsPaused(true); }
  };

  const handlePlayPause = () => {
      if (!recordedAudioUrl) return;
      if (!playbackAudioRef.current) {
          playbackAudioRef.current = new Audio(recordedAudioUrl);
          playbackAudioRef.current.onended = () => setPlaybackIsPlaying(false);
      }
      if (playbackIsPlaying) { playbackAudioRef.current.pause(); setPlaybackIsPlaying(false); }
      else { playbackAudioRef.current.play(); setPlaybackIsPlaying(true); }
  };

  const executeRedo = (mode: 'VOICE' | 'CAMERA' | 'TYPE') => {
    setRecordedAudioUrl(null); setRecordedVideoUrl(null); setTranscript(''); setRecordingDuration(0); setIsPaused(false);
    if (mode === 'VOICE') startRecording('audio'); else if (mode === 'CAMERA') setFlowState('PREVIEW_CAMERA'); else if (mode === 'TYPE') setFlowState('TYPING');
    setShowRedoConfirm(false);
  };

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  const headerClass = "text-2xl text-slate-800 leading-snug font-medium flex items-center";

  return (
    <div className="max-w-3xl mx-auto px-4 pt-24 pb-8 flex flex-col min-h-[80vh]">
      {sessionIndex !== undefined && sessionTotal !== undefined && (
        <div className="mb-4 flex items-center justify-between">
           <div className="flex items-center space-x-4">
              <button onClick={onPrev} disabled={sessionIndex === 1} className="p-2 rounded-full text-slate-400 hover:text-slate-800 disabled:opacity-30 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <span className="text-slate-400 text-sm font-medium">Question {sessionIndex} of {sessionTotal}</span>
              <button onClick={onNext} disabled={sessionIndex === sessionTotal} className="p-2 rounded-full text-slate-400 hover:text-slate-800 disabled:opacity-30 transition-colors">
                <ArrowRight className="w-5 h-5" />
              </button>
           </div>
           {flowState === 'REVIEW' && sessionIndex < sessionTotal && onNext && (
              <button onClick={onNext} className="flex items-center text-blue-600 hover:text-blue-700 font-semibold">Next question <ArrowRight className="w-4 h-4 ml-1" /></button>
           )}
        </div>
      )}

      <div className="bg-white rounded-2xl p-8 mb-6 shadow-[0_10px_30px_rgba(90,85,120,0.15)] border border-slate-100">
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium mb-4 ${question.type === 'Background' ? 'bg-purple-100 text-purple-700' : question.type === 'Custom question' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-700'}`}>
            <Info className="w-3 h-3 mr-1" />{question.type === 'Custom question' ? 'Custom question' : `${question.type} question`}
        </span>
        <h2 className="text-2xl text-slate-800 leading-snug">{question.text}</h2>
      </div>

      <div className="flex-grow">
        {flowState === 'READING' && (
          <div className="flex flex-col items-center pt-10">
            <div className="flex items-center space-x-2 text-slate-400 animate-pulse mb-8">
               <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
               <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-100"></div>
               <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-200"></div>
               <span className="text-sm font-medium text-slate-500">Reading question...</span>
            </div>
          </div>
        )}

        {flowState === 'RECORDING_VOICE' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_10px_30px_rgba(90,85,120,0.15)] overflow-hidden">
             <div className="flex flex-col p-6 border-b border-slate-100">
                 <h3 className={`${headerClass} mb-6`}><div className="mr-3"><Mic className="w-6 h-6" /></div>Recording your answer</h3>
                 <div className="w-full bg-white border border-slate-200 rounded-full shadow-sm p-3 flex items-center justify-between">
                     <button onClick={togglePause} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isPaused ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600 animate-pulse'}`}>
                        {isPaused ? <Mic className="w-6 h-6" /> : <Pause className="w-6 h-6 fill-current" />}
                    </button>
                     <div className="flex-grow mx-4 h-10">{voiceStream && <AudioVisualizer stream={voiceStream} isRecording={!isPaused} />}</div>
                     <div className="text-slate-900 font-mono font-medium min-w-[3rem] text-right">{formatTime(recordingDuration)}</div>
                 </div>
             </div>
             <div className="p-6"><button onClick={stopRecordingMedia} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-[20px] hover:bg-blue-700 shadow-md text-lg">Done</button></div>
          </div>
        )}

        {(flowState === 'PREVIEW_CAMERA' || flowState === 'RECORDING_CAMERA') && (
          <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-[0_10px_30px_rgba(90,85,120,0.15)]">
             <div className="aspect-[4/3] bg-black relative w-full"><video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" /></div>
             <div className="p-6">
               <button onClick={stopRecordingMedia} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-[20px] shadow-md text-lg">Done</button>
             </div>
          </div>
        )}

        {flowState === 'TYPING' && (
           <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_10px_30px_rgba(90,85,120,0.15)] flex flex-col min-h-[400px]">
              <h3 className={`${headerClass} mb-4`}><Keyboard className="w-8 h-8 mr-3" /> Type your answer</h3>
              <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} className="w-full flex-grow border-none focus:ring-0 focus:outline-none text-lg text-black placeholder:text-slate-300 bg-white" placeholder="Type your answer here..." autoFocus />
              <div className="pt-4 border-t border-slate-100"><button onClick={() => setFlowState('REVIEW')} className="px-6 py-2 bg-blue-600 text-white rounded-[20px] font-medium hover:bg-blue-700">Done</button></div>
           </div>
        )}

        {flowState === 'REVIEW' && (
           <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_10px_30px_rgba(90,85,120,0.15)] overflow-hidden flex flex-col">
             {recordedVideoUrl && <div className="aspect-video bg-black w-full"><video src={recordedVideoUrl} controls className="w-full h-full" /></div>}
             <div className="flex flex-col">
               <div className="flex items-center p-6 cursor-pointer select-none group border-b border-slate-100" onClick={() => setIsAnswerVisible(!isAnswerVisible)}>
                 <div className="mr-3 text-slate-800">{isAnswerVisible ? <ChevronDown className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}</div>
                 <span className={headerClass}>Your answer</span>
               </div>
               <div className={`grid transition-all duration-300 ease-in-out ${isAnswerVisible ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                     <div className="bg-white p-6">
                        {recordedAudioUrl && (
                          <div className="w-full bg-white border border-slate-200 rounded-full shadow-sm p-3 flex items-center justify-between mb-4">
                             <button onClick={handlePlayPause} className="w-10 h-10 rounded-full border-2 border-[#1B6FF3] flex items-center justify-center text-[#1B6FF3]">{playbackIsPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}</button>
                             <div className="flex-grow mx-4 h-10"><PlaybackVisualizer isPlaying={playbackIsPlaying} /></div>
                             <div className="text-slate-900 font-mono font-medium">{formatTime(recordingDuration)}</div>
                          </div>
                        )}
                        {isTranscribing ? <div className="flex items-center justify-center py-8"><Loader2 className="w-8 h-8 text-blue-600 animate-spin mr-3" />Transcribing...</div> : 
                          <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} className="w-full min-h-[120px] outline-none text-black text-lg leading-relaxed bg-white" />}
                     </div>
                  </div>
               </div>
             </div>
             <div className="p-6 bg-white border-t border-slate-100">
                <h3 className="text-xl font-medium text-slate-800 mb-4">Redo</h3>
                <div className="flex space-x-4">
                   <button onClick={() => executeRedo('VOICE')} className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white text-[#1B6FF3] border border-[#1B6FF3] hover:bg-blue-50"><Mic className="w-6 h-6" /></button>
                   <button onClick={() => executeRedo('CAMERA')} className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white text-[#1B6FF3] border border-[#1B6FF3] hover:bg-blue-50"><Video className="w-6 h-6" /></button>
                   <button onClick={() => executeRedo('TYPE')} className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white text-[#1B6FF3] border border-[#1B6FF3] hover:bg-blue-50"><Keyboard className="w-6 h-6" /></button>
                </div>
             </div>
           </div>
        )}
      </div>

      {showRedoConfirm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-scale-up border border-slate-100">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">Redo your answer?</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setShowRedoConfirm(false)} className="flex-1 py-3 px-6 rounded-[20px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">Cancel</button>
              <button onClick={() => pendingRedoMode && executeRedo(pendingRedoMode)} className="flex-1 py-3 px-6 rounded-[20px] font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm">Yes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};