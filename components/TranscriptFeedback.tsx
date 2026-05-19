import React from 'react';
import { CheckCircle2, AlertCircle, Clock, Zap, HelpCircle, Volume2, Sparkles, PlusCircle } from 'lucide-react';

interface TranscriptFeedbackProps {
  transcript: string;
  recordingDuration?: number; // Optional actual recorded duration
}

export const TranscriptFeedback: React.FC<TranscriptFeedbackProps> = ({
  transcript,
  recordingDuration
}) => {
  const text = transcript.trim();
  const words = text ? text.split(/\s+/) : [];
  const wordCount = words.length;

  // 1. FILLER WORDS ANALYSIS
  const fillerPatterns = [
    { label: 'um / uh', regex: /\b(um|uh|er|ah)\b/gi, canonical: 'um/uh' },
    { label: 'like (filler)', regex: /\b(like)\b/gi, canonical: 'like' },
    { label: 'basically', regex: /\b(basically)\b/gi, canonical: 'basically' },
    { label: 'actually', regex: /\b(actually)\b/gi, canonical: 'actually' },
    { label: 'you know', regex: /\byou\s+know\b/gi, canonical: 'you know' },
    { label: 'sort of / kind of', regex: /\b(sort\s+of|kind\s+of)\b/gi, canonical: 'sort of/kind of' },
  ];

  let totalFillerCount = 0;
  const detectedFillersList: string[] = [];

  fillerPatterns.forEach(p => {
    const matches = text.match(p.regex);
    const count = matches ? matches.length : 0;
    totalFillerCount += count;
    if (count > 0) {
      detectedFillersList.push(`${p.canonical} (${count}x)`);
    }
  });

  const fillerPercentage = wordCount > 0 ? (totalFillerCount / wordCount) * 100 : 0;

  // 2. TOTAL RESPONSE TIME ESTIMATION
  // Standard executive interview pace is ~135-150 words per minute. Let's use 140 WPM as the base.
  const estimatedSeconds = recordingDuration && recordingDuration > 0
    ? recordingDuration
    : Math.max(5, Math.round((wordCount / 140) * 60));

  const formatEstimatedTime = (totalSecs: number) => {
    if (totalSecs < 60) {
      return `${totalSecs} seconds`;
    }
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const totalResponseTimeStr = formatEstimatedTime(estimatedSeconds);

  let timingAdvice = '';
  if (estimatedSeconds < 35) {
    timingAdvice = 'This response is quite brief. For standard interview questions, aim for 65s to 90s to cover relevant details fully.';
  } else if (estimatedSeconds > 130) {
    timingAdvice = 'This is highly detailed, but exceeds 2 minutes. Try trimming secondary context details to maintain optimal focus.';
  } else {
    timingAdvice = 'Perfect length. This duration allows you to stay highly engaging while fully covering your past experience.';
  }

  // 3. DELIVERY TONE ASSESSMENT
  const powerWords = [
    'delivered', 'solved', 'implemented', 'created', 'successfully',
    'definitely', 'absolutely', 'managed', 'led', 'achieved',
    'resolved', 'collaborated', 'optimized', 'designed', 'impact', 'orchestrated'
  ];

  let powerWordCount = 0;
  powerWords.forEach(word => {
    const rgx = new RegExp(`\\b${word}\\w*\\b`, 'gi');
    const matches = text.match(rgx);
    if (matches) powerWordCount += matches.length;
  });

  let deliveryTone = 'Balanced';
  let toneObservation = 'The speaking tone is natural and conversational. Pacing is consistent.';
  let toneColorTextClass = 'text-[#1B6FF3]';

  if (wordCount === 0) {
    deliveryTone = 'N/A';
    toneObservation = 'Please provide or record an answer to analyze delivery tone.';
    toneColorTextClass = 'text-slate-400';
  } else if (totalFillerCount > 4 && fillerPercentage > 10) {
    deliveryTone = 'Nervous / Hesitant';
    toneObservation = 'Pacing indicates slight hesitation. Try replacing fillers with relaxed pauses to project greater poise.';
    toneColorTextClass = 'text-amber-650 font-bold';
  } else if (powerWordCount >= 3 && fillerPercentage < 5) {
    deliveryTone = 'Confident & Articulate';
    toneObservation = 'Highly assured and descriptive. Uses active delivery verbs and maintains zero-to-low filler usage.';
    toneColorTextClass = 'text-emerald-600 font-bold';
  } else if (wordCount < 30 && powerWordCount === 0) {
    deliveryTone = 'Monotone / Direct';
    toneObservation = 'Brief, uniform sentence structure. Inject active action verbs and vary syntax slightly to increase energy.';
    toneColorTextClass = 'text-slate-500 font-bold';
  } else {
    deliveryTone = 'Balanced & Natural';
    toneObservation = 'Expresses information clearly with steady, authentic conversational transitions.';
    toneColorTextClass = 'text-[#1B6FF3] font-bold';
  }

  // 4. STAR STRUCTURE CHECKLIST
  const starComponents = [
    {
      key: 'Situation',
      desc: 'Set the initial scenario or context',
      triggers: ['when i was', 'previously', 'at my', 'in my role', 'the company', 'working as', 'context', 'during a', 'encountered', 'facing', 'project where', 'i used to'],
      textExample: 'e.g., "At my last job, we faced high bounce rates..."',
    },
    {
      key: 'Task',
      desc: 'Formulate the direct objective or challenge',
      triggers: ['tasked with', 'responsible for', 'goal was', 'objective', 'needed to', 'expectation', 'challenge', 'assigned to', 'had to', 'my job was'],
      textExample: 'e.g., "I was assigned to fix the transaction latency..."',
    },
    {
      key: 'Action',
      desc: 'Explain the personal actions you took',
      triggers: ['i created', 'i built', 'i implemented', 'i designed', 'i led', 'i conducted', 'i analyzed', 'i worked', 'i proposed', 'i configured', 'i decided', 'i started by'],
      textExample: 'e.g., "I refactored the database triggers and code..."',
    },
    {
      key: 'Result',
      desc: 'Define the real outcome and business validation',
      triggers: ['resulting in', 'outcome was', 'consequently', 'successfully', 'increased by', 'decreased by', 'the result was', 'saved', 'improved', 'which led to', 'percent', '%', 'impact'],
      textExample: 'e.g., "Consequently, pages loaded 40% faster."',
    }
  ];

  const starStatus = starComponents.map(comp => {
    const isPresent = comp.triggers.some(trigger => {
      const escaped = trigger.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}`, 'gi');
      return regex.test(text);
    });
    return { ...comp, isPresent };
  });

  const missingComponents = starStatus.filter(c => !c.isPresent).map(c => c.key);

  // 5. INTUITIVE, HIGHLY DETAILED IMPROVEMENT SUGGESTIONS BASED ON METRICS
  const detailedSuggestions: string[] = [];

  if (wordCount < 18) {
    detailedSuggestions.push(`💡 **Elaborate context**: Expand answer length dynamically (~120–180 words) to fully demonstrate technical depth.`);
    detailedSuggestions.push(`🎯 **Adopt STAR framework**: Structure your past example around a distinct **S**ituation, **T**ask, **A**ction, and **R**esult.`);
  } else {
    // missing STAR parts
    if (missingComponents.length > 0) {
      if (missingComponents.includes('Result')) {
        detailedSuggestions.push(`📊 **Include measurable results**: Conclude with a concrete outcome or quantitative metric (e.g., *"reduced latencies by 30%"*).`);
      }
      if (missingComponents.includes('Action')) {
        detailedSuggestions.push(`🛠️ **Detail personal contributions**: Specify *your* individual actions and tech choices using active *"I"* verbs.`);
      }
      if (missingComponents.includes('Situation') || missingComponents.includes('Task')) {
        detailedSuggestions.push(`📌 **Hook the client context**: Start with a quick 2-sentence setup of your role, product scope, and original project constraints.`);
      }
    }

    // Filler words specific advice
    if (totalFillerCount > 3) {
      const frequencyDesc = fillerPercentage > 12 ? 'elevated' : 'mild';
      detailedSuggestions.push(`🗣️ **Reduce speech fillers**: Replace repetitive syllables (like *${detectedFillersList.join(', ')}*) with clean 1-second silent pauses.`);
    }

    // Timing behavior advice
    if (estimatedSeconds < 45) {
      detailedSuggestions.push(`⏳ **Extend answer body**: Aim for 60 to 90 seconds of delivery to fully unpack your technical contribution.`);
    } else if (estimatedSeconds > 130) {
      detailedSuggestions.push(`⏹️ **Streamline secondary stories**: Trim auxiliary details or secondary contexts to keep the main story highly focused.`);
    }

    // Vocabulary / passive phrasing advice
    if (powerWordCount < 2) {
      detailedSuggestions.push(`✨ **Anchor active verbs**: Inject strong action verbs (e.g., *"optimized"*, *"orchestrated"*, *"spearheaded"*, *"resolved"*).`);
    }
  }

  // If everything is flawless, give a superb compliment and advanced advice
  if (detailedSuggestions.length === 0) {
    detailedSuggestions.push(`🌟 **Outstanding response flow**: Excellent pacing (~${totalResponseTimeStr}), no hesitant syllables, and complete structural context.`);
    detailedSuggestions.push(`💭 **Add an aftermath takeaway**: Share a 1-sentence retrospective of long-term learnings or future-proofing implementations.`);
  }

  const renderSuggestionText = (textStr: string) => {
    const parts = textStr.split('**');
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="text-slate-900 font-bold">{part}</strong>;
      }
      return part;
    });
  };

  if (!text) {
    return (
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 mt-6 text-center text-slate-400">
        <p className="text-sm">Provide an answer above to generate real-time feedback and review guidance.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_10px_30px_rgba(90,85,120,0.1)] mt-8 animate-fade-in text-left">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-6 pb-4 border-b border-slate-100">
        <Sparkles className="w-5 h-5 text-[#1B6FF3]" />
        <h3 className="text-lg font-bold text-slate-800">Answer Analysis + Feedback</h3>
      </div>

      {/* 3 Criteria Displayed Vertically */}
      <div className="flex flex-col space-y-4 mb-8">
        
        {/* Row 1: Total Response Time */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4 min-w-[240px]">
            <div className="p-3 rounded-xl bg-blue-50 text-[#1B6FF3] shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Total Response Time
              </span>
              <span className="text-slate-800 text-lg font-bold flex items-center">
                {totalResponseTimeStr}
              </span>
            </div>
          </div>
          <div className="flex-1 text-xs sm:text-sm text-slate-650 leading-relaxed font-medium pl-1 md:pl-0">
            {timingAdvice}
          </div>
        </div>

        {/* Row 2: Delivery Tone */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4 min-w-[240px]">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Delivery Tone
              </span>
              <span className={`text-lg font-bold ${toneColorTextClass}`}>
                {deliveryTone}
              </span>
            </div>
          </div>
          <div className="flex-1 text-xs sm:text-sm text-slate-650 leading-relaxed font-medium pl-1 md:pl-0">
            {toneObservation}
          </div>
        </div>

        {/* Row 3: Filler Words */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4 min-w-[240px]">
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Filler Words
              </span>
              <span className={`text-lg font-bold ${totalFillerCount > 4 ? 'text-amber-600' : 'text-emerald-700'}`}>
                {totalFillerCount === 0 ? '0 detected' : `${totalFillerCount} detected`}
              </span>
            </div>
          </div>
          <div className="flex-1 pl-1 md:pl-0 flex flex-col justify-center">
            {detectedFillersList.length > 0 ? (
              <div className="flex flex-col space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider leading-none">Specific detected occurrences:</span>
                <div className="flex flex-wrap gap-1.5">
                  {detectedFillersList.map((str, idx) => (
                    <span key={idx} className="px-2.5 py-0.5 bg-amber-50 border border-amber-100 text-amber-705 text-xs rounded-full font-mono font-bold">
                      {str}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <span className="text-xs sm:text-sm text-emerald-650 font-semibold leading-relaxed">
                Superb pacing! No nervous verbal fillers was detected in your transcribed spoken response.
              </span>
            )}
          </div>
        </div>

      </div>

      {/* STAR Structure Checklist */}
      <div className="mb-8">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          STAR Structure Checklist
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {starStatus.map((step) => (
            <div 
              key={step.key} 
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all h-full ${
                step.isPresent 
                  ? 'bg-emerald-50/40 border-emerald-100 shadow-sm' 
                  : 'bg-rose-50/20 border-rose-100/60'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold text-slate-800">
                  {step.key}
                </span>
                <div>
                  {step.isPresent ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                      Present
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 border border-rose-100 text-rose-650">
                      Missing
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2.5 leading-snug">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Actionable Improvement Suggestions Section */}
      <div className="bg-blue-50/50 border border-blue-105 rounded-xl p-5 flex flex-col space-y-4">
        <div className="flex items-center space-x-2 pb-2.5 border-b border-blue-100/40">
          <AlertCircle className="w-5 h-5 text-[#1B6FF3] shrink-0 animate-bounce" />
          <h5 className="text-xs font-bold text-[#1B6FF3] tracking-wider uppercase">
            Actionable Improvement Plan
          </h5>
        </div>
        <div className="flex flex-col space-y-3 pt-0.5">
          {detailedSuggestions.map((item, idx) => (
            <div key={idx} className="text-xs sm:text-sm text-slate-650 leading-relaxed font-medium pl-1">
              {renderSuggestionText(item)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
