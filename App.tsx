import React, { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { FieldSelection } from './components/FieldSelection';
import { Practice } from './components/Practice';
import { PracticeStart } from './components/PracticeStart';
import { QuestionFlow } from './components/QuestionFlow';
import { CustomJobInput } from './components/CustomJobInput';
import { CustomQuestionInput } from './components/CustomQuestionInput';
import { Onboarding } from './components/Onboarding';
import { View, QuestionCategory, Question } from './types';
import { playHoverSound } from './utils/sound';
import { GlobalAudio, prefetchSpeech } from './services/geminiService';

const INITIAL_QUESTIONS: Record<string, Question[]> = {
  [QuestionCategory.GENERAL]: [
    { id: 'gen-1', text: 'Walk me through your background and experiences.', category: QuestionCategory.GENERAL, type: 'Background' },
    { id: 'gen-2', text: 'Can you describe why you are interested in working with our company?', category: QuestionCategory.GENERAL, type: 'Background' },
    { id: 'gen-3', text: 'Can you describe what you are hoping to gain from this position?', category: QuestionCategory.GENERAL, type: 'Background' },
    { id: 'gen-4', text: 'Can you describe a situation where you missed a deadline or did not meet a goal? What happened, and what did you learn from it?', category: QuestionCategory.GENERAL, type: 'Situational' },
    { id: 'gen-5', text: 'Give me an example of a time you had a conflict with a teammate. How did you handle it?', category: QuestionCategory.GENERAL, type: 'Situational' },
    { id: 'gen-6', text: 'Give me an example of a challenge you faced in a project or work environment. How did you overcome it?', category: QuestionCategory.GENERAL, type: 'Situational' },
    { id: 'gen-7', text: 'Can you describe a situation where you had to manage multiple responsibilities or deadlines at once? How did you prioritize your time?', category: QuestionCategory.GENERAL, type: 'Situational' },
    { id: 'gen-8', text: 'Can you describe a situation where you had to deal with ambiguity or unclear instructions? What approach did you take?', category: QuestionCategory.GENERAL, type: 'Situational' },
    { id: 'gen-9', text: 'Give me an example of a time you received critical feedback. How did you respond?', category: QuestionCategory.GENERAL, type: 'Situational' },
    { id: 'gen-10', text: 'Give me an example of a time you worked effectively under pressure.', category: QuestionCategory.GENERAL, type: 'Situational' },
  ],
  [QuestionCategory.UX_DESIGN]: [
    { id: 'ux-beh-1', text: 'Can you walk me through your design background and career path?', category: QuestionCategory.UX_DESIGN, type: 'Background' },
    { id: 'ux-beh-2', text: 'What type of products have you primarily designed for?', category: QuestionCategory.UX_DESIGN, type: 'Background' },
    { id: 'ux-beh-3', text: 'How do you usually collaborate with product managers and engineers?', category: QuestionCategory.UX_DESIGN, type: 'Background' },
    { id: 'ux-beh-4', text: 'Which design tools do you use most, and why?', category: QuestionCategory.UX_DESIGN, type: 'Background' },
    { id: 'ux-beh-5', text: 'How do you stay updated with UX trends?', category: QuestionCategory.UX_DESIGN, type: 'Background' },
    { id: 'ux-tech-1', text: 'What are the core principles of UX design?', category: QuestionCategory.UX_DESIGN, type: 'Technical' },
    { id: 'ux-tech-2', text: 'How do you ensure consistency across a product?', category: QuestionCategory.UX_DESIGN, type: 'Technical' },
    { id: 'ux-sit-1', text: 'Tell me about a time you disagreed with a stakeholder.', category: QuestionCategory.UX_DESIGN, type: 'Situational' },
    { id: 'ux-sit-2', text: 'Describe a project where user feedback conflicted with business goals.', category: QuestionCategory.UX_DESIGN, type: 'Situational' },
  ],
  [QuestionCategory.ENGINEERING]: [
    { id: 'eng-beh-1', text: 'Can you describe your engineering background?', category: QuestionCategory.ENGINEERING, type: 'Background' },
    { id: 'eng-beh-2', text: 'What programming languages are you most comfortable with?', category: QuestionCategory.ENGINEERING, type: 'Background' },
    { id: 'eng-tech-1', text: 'Explain the concept of object-oriented programming.', category: QuestionCategory.ENGINEERING, type: 'Technical' },
    { id: 'eng-tech-2', text: 'What are RESTful APIs?', category: QuestionCategory.ENGINEERING, type: 'Technical' },
    { id: 'eng-sit-1', text: 'Describe a difficult bug you fixed.', category: QuestionCategory.ENGINEERING, type: 'Situational' },
  ],
  [QuestionCategory.CUSTOM]: []
};

export default function App() {
  const [history, setHistory] = useState<View[]>([View.ONBOARDING]);
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [questions, setQuestions] = useState(INITIAL_QUESTIONS);
  const [dontAskRedo, setDontAskRedo] = useState(false);

  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  const [pendingAudioPromise, setPendingAudioPromise] = useState<Promise<AudioBuffer | null> | null>(null);

  const currentView = history[currentViewIndex];
  
  // Session logic: Are we currently in a 5-question flow?
  const isInSession = currentView === View.QUESTION_FLOW && sessionQuestions.length > 0;
  
  const canGoBack = isInSession 
    ? (currentSessionIndex > 0 || currentViewIndex > 0) 
    : currentViewIndex > 0;
    
  const canGoForward = isInSession 
    ? true // Can always go forward in session (last one goes to result)
    : currentViewIndex < history.length - 1;

  const navigateTo = (view: View) => {
    try {
      GlobalAudio.init(); // Warm up audio context
    } catch (e) {
      console.error("Audio init failed", e);
    }
    const newHistory = history.slice(0, currentViewIndex + 1);
    newHistory.push(view);
    setHistory(newHistory);
    setCurrentViewIndex(newHistory.length - 1);
  };

  const handleBack = () => { 
    if (isInSession && currentSessionIndex > 0) {
      handlePrevInSession();
    } else if (currentViewIndex > 0) {
      setCurrentViewIndex(prev => prev - 1); 
    }
  };

  const handleForward = () => { 
    if (isInSession) {
      handleNextInSession();
    } else if (currentViewIndex < history.length - 1) {
      setCurrentViewIndex(prev => prev + 1); 
    }
  };

  const handleHome = () => { 
    setSelectedCategory(null);
    navigateTo(View.ONBOARDING); 
  };

  const handleStartFromOnboarding = () => {
    setSelectedCategory(null);
    navigateTo(View.FIELD_SELECTION);
  };

  const handleSelectCategory = (cat: QuestionCategory) => {
    setSelectedCategory(cat);
    navigateTo(cat === QuestionCategory.CUSTOM ? View.CUSTOM_DESCRIPTION : View.PRACTICE_START);
  };

  const handleStartPractice = () => {
    const allQuestions = questions[selectedCategory!] || [];
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
    const randomFive = shuffled.slice(0, 5);

    if (randomFive.length > 0) {
      setSessionQuestions(randomFive);
      setCurrentSessionIndex(0);
      setSelectedQuestion(randomFive[0]);
      
      // Prefetch and store promise
      setPendingAudioPromise(prefetchSpeech(randomFive[0].text));
      
      navigateTo(View.QUESTION_FLOW);
    } else {
      navigateTo(View.ALL_QUESTIONS);
    }
  };

  const handleNextInSession = () => {
    const nextIdx = currentSessionIndex + 1;
    if (nextIdx < sessionQuestions.length) {
      const nextQ = sessionQuestions[nextIdx];
      setCurrentSessionIndex(nextIdx);
      setSelectedQuestion(nextQ);
      setPendingAudioPromise(prefetchSpeech(nextQ.text));
    } else {
      navigateTo(View.ALL_QUESTIONS);
    }
  };

  const handlePrevInSession = () => {
    const prevIdx = currentSessionIndex - 1;
    if (prevIdx >= 0) {
      const prevQ = sessionQuestions[prevIdx];
      setCurrentSessionIndex(prevIdx);
      setSelectedQuestion(prevQ);
      setPendingAudioPromise(prefetchSpeech(prevQ.text));
    }
  };

  const handleStartCustomJob = (description: string, generated: {text: string, type: string}[]) => {
    const newQuestions: Question[] = generated.map((q, index) => ({
      id: `gen-${Date.now()}-${index}`,
      text: q.text,
      category: QuestionCategory.CUSTOM,
      type: (q.type as any) || 'Background'
    }));

    setQuestions(prev => ({
      ...prev,
      [QuestionCategory.CUSTOM]: [...(prev[QuestionCategory.CUSTOM] || []), ...newQuestions]
    }));
    
    setSelectedCategory(QuestionCategory.CUSTOM);
    navigateTo(View.PRACTICE_START);
  };

  const handleAddCustomQuestion = (text: string, answer: string) => {
    const targetCat = selectedCategory || QuestionCategory.CUSTOM;
    const newQuestion: Question = {
      id: Date.now().toString(),
      text,
      category: targetCat,
      type: 'Custom question',
      answer
    };
    
    setQuestions(prev => ({
      ...prev,
      [targetCat]: [...(prev[targetCat] || []), newQuestion]
    }));

    navigateTo(View.ALL_QUESTIONS);
  };

  const handleSeeAllQuestions = () => {
    navigateTo(View.ALL_QUESTIONS);
  };

  const handleSelectQuestion = (q: Question) => {
    setSessionQuestions([]);
    setSelectedQuestion(q);
    setPendingAudioPromise(prefetchSpeech(q.text));
    navigateTo(View.QUESTION_FLOW);
  };

  const renderView = () => {
    switch (currentView) {
      case View.ONBOARDING: return <Onboarding onStart={handleStartFromOnboarding} />;
      case View.FIELD_SELECTION: return <FieldSelection selectedCategory={selectedCategory} onSelectCategory={handleSelectCategory} />;
      case View.PRACTICE_START: return <PracticeStart onStartPractice={handleStartPractice} onSeeAllQuestions={handleSeeAllQuestions} isCustom={selectedCategory === QuestionCategory.CUSTOM} />;
      case View.CUSTOM_DESCRIPTION: return <CustomJobInput onStart={handleStartCustomJob} onManualAdd={() => navigateTo(View.CUSTOM_ADD)} />;
      case View.CUSTOM_ADD: return <CustomQuestionInput onAdd={handleAddCustomQuestion} />;
      case View.ALL_QUESTIONS: return <Practice category={selectedCategory || QuestionCategory.GENERAL} questions={questions[selectedCategory!] || []} onSelectQuestion={handleSelectQuestion} onAddCustomQuestion={() => navigateTo(View.CUSTOM_ADD)} />;
      case View.QUESTION_FLOW: return (
          <QuestionFlow 
            question={selectedQuestion!}
            onComplete={(rec) => console.log(rec)}
            dontAskRedo={dontAskRedo}
            setDontAskRedo={setDontAskRedo}
            sessionIndex={sessionQuestions.length > 0 ? currentSessionIndex + 1 : undefined}
            sessionTotal={sessionQuestions.length > 0 ? sessionQuestions.length : undefined}
            onNext={handleNextInSession}
            onPrev={handlePrevInSession}
            preFetchedAudioPromise={pendingAudioPromise}
            allQuestions={questions[selectedCategory!] || []}
            onSelectQuestion={handleSelectQuestion}
          />
        );
      default: return <div>Unknown View</div>;
    }
  };

  const navIconClass = "fixed top-1/2 -translate-y-1/2 z-40 w-12 h-12 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-xl text-slate-700 hover:text-[#1B6FF3] hover:bg-slate-50 transition-all hover:scale-110 active:scale-95 group disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:text-slate-700";

  return (
    <div className="min-h-screen text-slate-900 flex flex-col relative bg-[#f8fafc] font-sans">
      <Navbar 
        onHome={handleHome}
        backLabel={selectedCategory || ''}
        isLanding={currentView === View.ONBOARDING}
      />

      <div className="flex-grow flex justify-center w-full relative">
        {/* Fixed Navigation Arrows - Hidden on Onboarding */}
        {currentView !== View.ONBOARDING && (canGoBack || currentViewIndex > 0) && (
          <button 
            onClick={handleBack}
            disabled={!canGoBack}
            onMouseEnter={playHoverSound}
            className={`${navIconClass} left-8 lg:left-12`}
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
        )}

        <main className="flex-grow z-10 w-full max-w-5xl px-6 lg:px-10 py-8">
          {renderView()}
        </main>

        {currentView !== View.ONBOARDING && (canGoForward || currentViewIndex < history.length - 1) && (
          <button 
            onClick={handleForward}
            disabled={!canGoForward}
            onMouseEnter={playHoverSound}
            className={`${navIconClass} right-8 lg:right-12`}
            title="Go Forward"
          >
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
}