import React, { useState, useEffect, useRef } from 'react';
import { Question, Recording } from '../types';
import { Mic, Video, Keyboard, Edit2, Info, ChevronDown, ChevronRight, Play, Pause, ArrowRight, ArrowLeft, Loader2, Lightbulb, X } from 'lucide-react';
import { playHoverSound } from '../utils/sound';
import { generateSpeech, transcribeAudio, getAiSuggestion } from '../services/geminiService';

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

type FlowState = 'READING' | 'INPUT_SELECTION' | 'RECORDING_VOICE' | 'PREVIEW_CAMERA' | 'RECORDING_CAMERA' | 'TYPING' | 'REVIEW';

async function decodePCM(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

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
        } catch (e) {
            console.error("Audio context error", e);
        }
    }

    const bufferLength = analyser ? analyser.frequencyBinCount : 32;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      
      if (analyser) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        for(let i=0; i<bufferLength; i++) dataArray[i] = 0; 
      }
      
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = 4;
      const gap = 4;
      const totalBars = Math.floor(canvas.width / (barWidth + gap));
      const startX = (canvas.width - (totalBars * (barWidth + gap))) / 2;

      for(let i = 0; i < totalBars; i++) {
        const dataIndex = Math.floor(i * (bufferLength / totalBars));
        const value = dataArray[dataIndex] || 0;
        const percent = value / 255;
        const height = Math.max(4, percent * canvas.height);
        
        canvasCtx.fillStyle = '#C084FC';
        if (value > 10) {
            canvasCtx.fillStyle = '#A855F7';
        }

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
                let height = 10;
                if (isPlaying) {
                    height = 10 + Math.sin(i * 0.5 + step) * 10 + Math.random() * 10;
                } else {
                    height = 10 + Math.sin(i * 0.5) * 8;
                }
                
                ctx.fillStyle = '#C084FC';
                if (isPlaying) ctx.fillStyle = '#A855F7';

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
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [isAnswerVisible, setIsAnswerVisible] = useState(true);
  const [isAnswerLarge, setIsAnswerLarge] = useState(false);
  
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [voiceStream, setVoiceStream] = useState<MediaStream | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playbackIsPlaying, setPlaybackIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const ttsSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const ttsAudioContextRef = useRef<AudioContext | null>(null);

  const [showRedoConfirm, setShowRedoConfirm] = useState(false);
  const [pendingRedoMode, setPendingRedoMode] = useState<'VOICE' | 'CAMERA' | 'TYPE' | null>(null);

  useEffect(() => {
    let interval: number;
    if ((flowState === 'RECORDING_VOICE' || flowState === 'RECORDING_CAMERA') && !isPaused) {
        interval = window.setInterval(() => {
            setRecordingDuration(prev => prev + 1);
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [flowState, isPaused]);

  useEffect(() => {
    return () => {
        if (playbackAudioRef.current) {
            playbackAudioRef.current.pause();
            playbackAudioRef.current = null;
        }
    };
  }, []);

  useEffect(() => {
    setFlowState('READING');
    setTranscript('');
    setSuggestion(null);
    setRecordedVideoUrl(null);
    setRecordedAudioUrl(null);
    setVoiceStream(null);
    setCameraStream(null);
    setRecordingDuration(0);
    setIsPaused(false);
    setIsTranscribing(false);
    setIsAnswerVisible(true);
    setIsAnswerLarge(false);

    let isMounted = true;

    const playQuestionAudio = async () => {
        const pcmData = await generateSpeech(question.text);
        if (!isMounted) return;

        if (pcmData) {
            try {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                const ctx = new AudioContextClass({ sampleRate: 24000 });
                ttsAudioContextRef.current = ctx;
                const audioBuffer = await decodePCM(pcmData, ctx);
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.onended = () => {
                   if (isMounted) setFlowState(prev => prev === 'READING' ? 'INPUT_SELECTION' : prev);
                };
                ttsSourceRef.current = source;
                source.start();
            } catch (err) {
                fallbackSynthesis();
            }
        } else {
            fallbackSynthesis();
        }
    };
    
    const fallbackSynthesis = () => {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(question.text);
        utter.onend = () => {
           if (isMounted) setFlowState(prev => prev === 'READING' ? 'INPUT_SELECTION' : prev);
        };
        window.speechSynthesis.speak(utter);
    };
    
    const timer = setTimeout(() => {
        playQuestionAudio();
    }, 1000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      window.speechSynthesis.cancel();
      if (ttsSourceRef.current) { try { ttsSourceRef.current.stop(); } catch(e) {} }
      if (ttsAudioContextRef.current && ttsAudioContextRef.current.state !== 'closed') ttsAudioContextRef.current.close();
      stopCamera();
    };
  }, [question]);

  const handleGetSuggestion = async () => {
    if (isLoadingSuggestion) return;
    setIsLoadingSuggestion(true);
    const res = await getAiSuggestion(question.text);
    
    const sanitized = res
        .replace(/[#*]/g, '')
        .replace(/^- /gm, '• ')
        .replace(/^\+ /gm, '• ')
        .trim();

    setSuggestion(sanitized);
    setIsLoadingSuggestion(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
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

  useEffect(() => {
    if (flowState === 'PREVIEW_CAMERA' || flowState === 'RECORDING_CAMERA') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [flowState]);

  const startRecording = async (mode: 'video' | 'audio') => {
    try {
      let stream;
      if (mode === 'video') stream = cameraStream;
      else {
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
         if (mode === 'video') setRecordedVideoUrl(url);
         else setRecordedAudioUrl(url);
         
         if (blob.size > 0) {
           setIsTranscribing(true);
           const reader = new FileReader();
           reader.readAsDataURL(blob);
           reader.onloadend = async () => {
              const base64data = (reader.result as string).split(',')[1];
              const result = await transcribeAudio(base64data, mimeType);
              const trimmedResult = result ? result.trim() : '';
              setTranscript(trimmedResult);
              setIsTranscribing(false);
           };
         } else {
           setTranscript('');
         }

         if (mode === 'audio') { stream.getTracks().forEach(t => t.stop()); setVoiceStream(null); }
      };
      mediaRecorder.start();
      if (mode === 'video') setFlowState('RECORDING_CAMERA');
      else { setTranscript(''); setFlowState('RECORDING_VOICE'); }
    } catch (e) { console.error("Recording start failed", e); }
  };

  const stopRecordingMedia = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
       mediaRecorderRef.current.stop();
       setFlowState('REVIEW');
    }
  };

  const togglePause = () => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
    } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
    }
  };

  const handlePlayPause = () => {
      if (!recordedAudioUrl) return;
      if (!playbackAudioRef.current) {
          playbackAudioRef.current = new Audio(recordedAudioUrl);
          playbackAudioRef.current.onended = () => setPlaybackIsPlaying(false);
      }
      if (playbackIsPlaying) {
          playbackAudioRef.current.pause();
          setPlaybackIsPlaying(false);
      } else {
          playbackAudioRef.current.play();
          setPlaybackIsPlaying(true);
      }
  };

  const handleRedoRequest = (mode: 'VOICE' | 'CAMERA' | 'TYPE') => {
    if (dontAskRedo) {
      executeRedo(mode);
    } else {
      setPendingRedoMode(mode);
      setShowRedoConfirm(true);
    }
  };

  const executeRedo = (mode: 'VOICE' | 'CAMERA' | 'TYPE') => {
    // Erase current answer
    setRecordedAudioUrl(null);
    setRecordedVideoUrl(null);
    setTranscript('');
    setRecordingDuration(0);
    setIsPaused(false);

    if (mode === 'VOICE') {
      startRecording('audio');
    } else if (mode === 'CAMERA') {
      setFlowState('PREVIEW_CAMERA');
    } else if (mode === 'TYPE') {
      setFlowState('TYPING');
    }
    setShowRedoConfirm(false);
    setPendingRedoMode(null);
  };

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const headerClass = "text-2xl text-slate-800 leading-snug font-medium flex items-center";

  const ActionButton = ({ icon: Icon, onClick, active = false, className = "", large = false, title }: any) => {
     const sizeClass = large ? "w-16 h-16" : "w-14 h-14"; 
     const iconSize = large ? "w-8 h-8" : "w-6 h-6";
     return (
        <button
          onClick={onClick}
          onMouseEnter={playHoverSound}
          title={title}
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

  const hasUserAnswer = transcript.trim().length > 0 || recordedAudioUrl !== null || isTranscribing;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col min-h-[80vh]">
      
      {sessionIndex !== undefined && sessionTotal !== undefined && (
        <div className="mb-4 flex justify-start">
           <span className="text-slate-600 text-xs font-semibold font-sans tracking-wide">
             Question {sessionIndex} of {sessionTotal}
           </span>
        </div>
      )}

      <div className="bg-white rounded-2xl p-8 mb-6 shadow-[0_10px_30px_rgba(90,85,120,0.15)] border border-slate-100">
        <span className={`
            inline-flex items-center px-2 py-1 rounded text-xs font-medium mb-4
            ${question.type === 'Background' ? 'bg-purple-100 text-purple-700' : 
              question.type === 'Custom question' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-700'}
        `}>
            <Info className="w-3 h-3 mr-1" />
            {question.type === 'Custom question' ? 'Custom question' : `${question.type} question`}
        </span>
        <h2 className="text-2xl text-slate-800 leading-snug font-bold">
          {question.text}
        </h2>
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

        {flowState === 'INPUT_SELECTION' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_10px_30px_rgba(90,85,120,0.15)] animate-fade-in flex flex-col">
             <div className="mb-6 flex items-center justify-between">
                <div 
                  className="flex items-center cursor-pointer select-none group"
                  onClick={() => setIsAnswerVisible(!isAnswerVisible)}
                >
                   <div className="mr-3 text-slate-800 transition-transform duration-200">
                      {isAnswerVisible ? <ChevronDown className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
                   </div>
                   <h3 className={headerClass}>Your answer</h3>
                </div>
             </div>
             
             <div className={`grid transition-all duration-300 ease-in-out ${isAnswerVisible ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
               <div className="overflow-hidden">
                 {suggestion && (
                    <div className="mb-6 p-6 bg-amber-50 rounded-xl border border-amber-200 relative">
                      <div className="flex items-center text-amber-800 font-semibold mb-2">
                        <Lightbulb className="w-5 h-5 mr-2" />
                        Key Points for your answer
                      </div>
                      <div className="text-amber-900 text-sm whitespace-pre-wrap leading-relaxed">
                        {suggestion}
                      </div>
                    </div>
                 )}

                 {isLoadingSuggestion && (
                   <div className="mb-6 p-6 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin mr-3" />
                      <span className="text-slate-600 font-medium">Getting key points...</span>
                   </div>
                 )}
               </div>
             </div>

             <div className="flex items-center justify-between">
                <div className="flex space-x-4">
                    <ActionButton icon={Mic} onClick={() => startRecording('audio')} title="Voice" />
                    <ActionButton icon={Video} onClick={() => setFlowState('PREVIEW_CAMERA')} title="Camera" />
                    <ActionButton icon={Keyboard} onClick={() => setFlowState('TYPING')} title="Type" />
                </div>
                <button 
                  onClick={handleGetSuggestion}
                  onMouseEnter={playHoverSound}
                  disabled={isLoadingSuggestion}
                  className={`
                    w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200
                    bg-amber-100 text-amber-600 border border-amber-200 hover:bg-amber-200
                    ${isLoadingSuggestion ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  title="Get key points"
                >
                  <Lightbulb className="w-6 h-6" />
                </button>
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
             <div className="p-6"><button onClick={stopRecordingMedia} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-[20px] hover:bg-blue-700 transition-colors shadow-md text-lg">Done</button></div>
          </div>
        )}

        {(flowState === 'PREVIEW_CAMERA' || flowState === 'RECORDING_CAMERA') && (
          <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-[0_10px_30px_rgba(90,85,120,0.15)]">
             <div className="aspect-[4/3] bg-black relative w-full">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" style={{ filter: 'brightness(1.05) contrast(1.02) saturate(1.05) blur(0.3px)' }} />
                {flowState === 'RECORDING_CAMERA' && (
                  <div className="absolute top-4 right-4 flex items-center space-x-2 bg-red-600/80 text-white px-3 py-1 rounded-full text-xs font-bold">
                     <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                     <span>REC {formatTime(recordingDuration)}</span>
                  </div>
                )}
             </div>
             <div className="p-6">{flowState === 'PREVIEW_CAMERA' ? (<button onClick={() => startRecording('video')} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-[20px] hover:bg-blue-700 shadow-md text-lg">Start</button>) : (<button onClick={stopRecordingMedia} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-[20px] hover:bg-blue-700 shadow-md text-lg">Done</button>)}</div>
          </div>
        )}

        {flowState === 'TYPING' && (
           <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_10px_30px_rgba(90,85,120,0.15)] flex flex-col min-h-[400px]">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center select-none">
                    <h3 className={headerClass}><Keyboard className="w-8 h-8 mr-3" /> Type your answer</h3>
                 </div>
              </div>
              
              <div className="flex-grow flex flex-col h-full animate-fade-in">
                <div className="relative flex-grow group">
                  <textarea 
                    ref={transcriptRef}
                    value={transcript} 
                    onChange={(e) => setTranscript(e.target.value)} 
                    className={`w-full transition-all duration-300 resize-y border-none focus:ring-0 focus:outline-none text-lg text-black placeholder:text-slate-300 bg-white pr-24 ${isAnswerLarge ? 'min-h-[400px]' : 'min-h-[300px]'}`} 
                    placeholder="Type your answer here..." 
                    autoFocus 
                  />
                  <div className="absolute bottom-4 right-10 flex items-center">
                     <button onClick={() => transcriptRef.current?.focus()} className="text-slate-400 hover:text-blue-600 transition-colors" title="Edit">
                       <Edit2 className="w-4 h-4" />
                     </button>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100"><button onClick={() => setFlowState('REVIEW')} className="px-6 py-2 bg-blue-600 text-white rounded-[20px] font-medium hover:bg-blue-700">Done</button></div>
              </div>
           </div>
        )}

        {flowState === 'REVIEW' && (
           <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_10px_30px_rgba(90,85,120,0.15)] overflow-hidden flex flex-col">
             {recordedVideoUrl && <div className="aspect-video bg-black w-full"><video src={recordedVideoUrl} controls className="w-full h-full" style={{ filter: 'brightness(1.05) contrast(1.02) saturate(1.05) blur(0.3px)' }} /></div>}
             
             <div className="flex flex-col">
               <div 
                 className="flex items-center p-6 cursor-pointer select-none group border-b border-slate-100"
                 onClick={() => setIsAnswerVisible(!isAnswerVisible)}
               >
                 <div className="mr-3 text-slate-800 transition-transform duration-200">
                    {isAnswerVisible ? <ChevronDown className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
                 </div>
                 <span className={headerClass}>Your answer</span>
               </div>

               {/* Collapsible area for transcribed answer and audio */}
               <div className={`grid transition-all duration-300 ease-in-out ${isAnswerVisible ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                     {hasUserAnswer ? (
                        <div className="bg-white">
                           {recordedAudioUrl && (
                             <div className="px-6 pt-6">
                               <div className="w-full bg-white border border-slate-200 rounded-full shadow-sm p-3 flex items-center justify-between">
                                  <button onClick={handlePlayPause} className="w-10 h-10 rounded-full border-2 border-[#1B6FF3] flex items-center justify-center text-[#1B6FF3] hover:bg-blue-50">
                                     {playbackIsPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                                  </button>
                                  <div className="flex-grow mx-4 h-10"><PlaybackVisualizer isPlaying={playbackIsPlaying} /></div>
                                  <div className="text-slate-900 font-mono font-medium min-w-[3rem] text-right">{formatTime(recordingDuration)}</div>
                               </div>
                             </div>
                           )}
                           
                           <div className="p-6 relative bg-white">
                              {isTranscribing ? (
                                  <div className="flex items-center justify-center py-8 animate-fade-in">
                                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mr-3" />
                                      <span className="text-slate-600 font-medium">Transcribing ...</span>
                                  </div>
                              ) : (
                                  transcript ? (
                                    <div className="relative group animate-fade-in">
                                      <textarea 
                                          ref={transcriptRef}
                                          value={transcript} 
                                          onChange={(e) => setTranscript(e.target.value)} 
                                          className={`w-full transition-all duration-300 resize-y outline-none text-black text-lg leading-relaxed bg-white pr-24 ${isAnswerLarge ? 'min-h-[300px]' : 'min-h-[120px]'}`} 
                                          placeholder="" 
                                      />
                                      {/* Small Pen icon */}
                                      <div className="absolute bottom-4 right-10 flex items-center">
                                         <button 
                                           onClick={() => transcriptRef.current?.focus()} 
                                           className="text-slate-400 hover:text-blue-600 transition-colors" 
                                           title="Edit"
                                         >
                                           <Edit2 className="w-4 h-4" />
                                         </button>
                                      </div>
                                    </div>
                                  ) : null
                              )}
                           </div>
                        </div>
                     ) : null}
                  </div>
               </div>
             </div>

             {/* Redo section stays visible at all times */}
             <div className="p-6 bg-white border-t border-slate-100">
                <h3 className="text-xl font-medium text-slate-800 mb-4">Redo</h3>
                <div className="flex space-x-4">
                   <ActionButton icon={Mic} onClick={() => handleRedoRequest('VOICE')} title="Voice Redo" />
                   <ActionButton icon={Video} onClick={() => handleRedoRequest('CAMERA')} title="Camera Redo" />
                   <ActionButton icon={Keyboard} onClick={() => handleRedoRequest('TYPE')} title="Type Redo" />
                </div>
             </div>
           </div>
        )}
      </div>

      {/* Redo Confirmation Modal */}
      {showRedoConfirm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-scale-up border border-slate-100">
            <div className="flex justify-between items-start mb-4">
               <h2 className="text-2xl font-semibold text-slate-900">Redo your answer?</h2>
               <button onClick={() => setShowRedoConfirm(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                  <X className="w-6 h-6" />
               </button>
            </div>
            
            <p className="text-slate-600 mb-8 leading-relaxed">
              This will erase your current answer. Would you like to redo it?
            </p>
            
            <div className="flex items-center mb-10 group cursor-pointer" onClick={() => setDontAskRedo(!dontAskRedo)}>
               <div className={`w-6 h-6 rounded border-2 mr-3 flex items-center justify-center transition-all ${dontAskRedo ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                  {dontAskRedo && <X className="w-4 h-4 text-white" />}
               </div>
               <span className="text-slate-700 font-medium select-none">Don’t ask again</span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setShowRedoConfirm(false)}
                className="flex-1 py-3 px-6 rounded-[20px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors order-2 sm:order-1"
              >
                Cancel
              </button>
              <button 
                onClick={() => pendingRedoMode && executeRedo(pendingRedoMode)}
                className="flex-1 py-3 px-6 rounded-[20px] font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm order-1 sm:order-2"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};