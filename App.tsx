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

const INITIAL_QUESTIONS: Record<string, Question[]> = {
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
  [QuestionCategory.DATA_ANALYTICS]: [
    { id: 'da-beh-1', text: 'Can you describe your experience as a data analyst?', category: QuestionCategory.DATA_ANALYTICS, type: 'Background' },
    { id: 'da-tech-1', text: 'What is the difference between descriptive and predictive analytics?', category: QuestionCategory.DATA_ANALYTICS, type: 'Technical' },
    { id: 'da-sit-1', text: 'Tell me about a time data changed a business decision.', category: QuestionCategory.DATA_ANALYTICS, type: 'Situational' },
  ],
  [QuestionCategory.CYBERSECURITY]: [
    { id: 'cs-beh-1', text: 'Can you describe your cybersecurity background?', category: QuestionCategory.CYBERSECURITY, type: 'Background' },
    { id: 'cs-tech-1', text: 'What is the CIA triad?', category: QuestionCategory.CYBERSECURITY, type: 'Technical' },
    { id: 'cs-sit-1', text: 'Tell me about a security incident you handled.', category: QuestionCategory.CYBERSECURITY, type: 'Situational' },
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

  const currentView = history[currentViewIndex];
  
  // Session logic: Are we currently in a 5-question flow?
  const isInSession = currentView === View.QUESTION_FLOW && sessionQuestions.length > 0;
  
  const canGoBack = isInSession 
    ? currentSessionIndex > 0 
    : currentViewIndex > 0;
    
  const canGoForward = isInSession 
    ? true // Can always go forward in session (last one goes to result)
    : currentViewIndex < history.length - 1;

  const navigateTo = (view: View) => {
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
      navigateTo(View.QUESTION_FLOW);
    } else {
      navigateTo(View.ALL_QUESTIONS);
    }
  };

  const handleNextInSession = () => {
    const nextIdx = currentSessionIndex + 1;
    if (nextIdx < sessionQuestions.length) {
      setCurrentSessionIndex(nextIdx);
      setSelectedQuestion(sessionQuestions[nextIdx]);
    } else {
      navigateTo(View.ALL_QUESTIONS);
    }
  };

  const handlePrevInSession = () => {
    const prevIdx = currentSessionIndex - 1;
    if (prevIdx >= 0) {
      setCurrentSessionIndex(prevIdx);
      setSelectedQuestion(sessionQuestions[prevIdx]);
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
    navigateTo(View.QUESTION_FLOW);
  };

  const renderView = () => {
    switch (currentView) {
      case View.ONBOARDING: return <Onboarding onStart={handleStartFromOnboarding} />;
      case View.FIELD_SELECTION: return <FieldSelection selectedCategory={selectedCategory} onSelectCategory={handleSelectCategory} />;
      case View.PRACTICE_START: return <PracticeStart onStartPractice={handleStartPractice} onSeeAllQuestions={handleSeeAllQuestions} isCustom={selectedCategory === QuestionCategory.CUSTOM} />;
      case View.CUSTOM_DESCRIPTION: return <CustomJobInput onStart={handleStartCustomJob} onManualAdd={() => navigateTo(View.CUSTOM_ADD)} />;
      case View.CUSTOM_ADD: return <CustomQuestionInput onAdd={handleAddCustomQuestion} />;
      case View.ALL_QUESTIONS: return <Practice category={selectedCategory || QuestionCategory.UX_DESIGN} questions={questions[selectedCategory!] || []} onSelectQuestion={handleSelectQuestion} onAddCustomQuestion={() => navigateTo(View.CUSTOM_ADD)} />;
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
          />
        );
      default: return <div>Unknown View</div>;
    }
  };

  const navIconClass = "fixed top-1/2 -translate-y-1/2 z-40 w-16 h-16 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-xl text-slate-700 hover:bg-slate-50 transition-all hover:scale-110 active:scale-95 group disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:scale-100";

  return (
    <div className="min-h-screen text-slate-900 flex flex-col relative bg-[#f8fafc] font-sans">
      <Navbar 
        onHome={handleHome}
        backLabel={selectedCategory || ''}
        isLanding={currentView === View.ONBOARDING}
      />

      <div className="flex-grow flex justify-center w-full relative">
        {/* Fixed Navigation Arrows */}
        {(canGoBack || currentViewIndex > 0) && (
          <button 
            onClick={handleBack}
            disabled={!canGoBack}
            onMouseEnter={playHoverSound}
            className={`${navIconClass} left-8 lg:left-12`}
            title="Go Back"
          >
            <ArrowLeft className="w-7 h-7 group-hover:-translate-x-1 transition-transform" />
          </button>
        )}

        <main className="flex-grow z-10 w-full max-w-5xl px-6 lg:px-10 py-8">
          {renderView()}
        </main>

        {(canGoForward || currentViewIndex < history.length - 1) && (
          <button 
            onClick={handleForward}
            disabled={!canGoForward}
            onMouseEnter={playHoverSound}
            className={`${navIconClass} right-8 lg:right-12`}
            title="Go Forward"
          >
            <ArrowRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
}