import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { FieldSelection } from './components/FieldSelection';
import { Practice } from './components/Practice';
import { PracticeStart } from './components/PracticeStart';
import { QuestionFlow } from './components/QuestionFlow';
import { CustomJobInput } from './components/CustomJobInput';
import { CustomQuestionInput } from './components/CustomQuestionInput';
import { View, QuestionCategory, Question, Recording } from './types';
import { generateSpeech, GlobalAudio, prefetchSpeech } from './services/geminiService';

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

const VIEW_LABELS: Record<View, string> = {
  [View.FIELD_SELECTION]: 'Home',
  [View.ALL_QUESTIONS]: 'All Questions',
  [View.QUESTION_FLOW]: 'Practice Session',
  [View.CUSTOM_DESCRIPTION]: 'Job Description',
  [View.CUSTOM_ADD]: 'Add Question',
  [View.PRACTICE_START]: 'Start Practice',
};

export default function App() {
  const [history, setHistory] = useState<View[]>([View.FIELD_SELECTION]);
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [questions, setQuestions] = useState(INITIAL_QUESTIONS);
  const [dontAskRedo, setDontAskRedo] = useState(false);

  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);

  const currentView = history[currentViewIndex];
  
  const getBackLabel = () => {
    if (currentViewIndex === 0) return '';
    if (selectedCategory) return selectedCategory;
    return VIEW_LABELS[history[currentViewIndex - 1]] || '';
  };

  const previousViewLabel = getBackLabel();

  const navigateTo = (view: View) => {
    GlobalAudio.init(); // Warm up context on every navigation
    const newHistory = history.slice(0, currentViewIndex + 1);
    newHistory.push(view);
    setHistory(newHistory);
    setCurrentViewIndex(newHistory.length - 1);
  };

  const handleBack = () => { GlobalAudio.stop(); GlobalAudio.init(); if (currentViewIndex > 0) setCurrentViewIndex(prev => prev - 1); };
  const handleForward = () => { GlobalAudio.init(); if (currentViewIndex < history.length - 1) setCurrentViewIndex(prev => prev + 1); };

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
      const firstQ = randomFive[0];
      setSelectedQuestion(firstQ);
      
      // IMMEDIATE START: Trigger playback on the click thread
      const audioPromise = prefetchSpeech(firstQ.text);
      GlobalAudio.playSpeech(audioPromise);
      
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
      
      // IMMEDIATE START: Trigger playback on the click thread
      const audioPromise = prefetchSpeech(nextQ.text);
      GlobalAudio.playSpeech(audioPromise);
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
      
      // IMMEDIATE START: Trigger playback on the click thread
      const audioPromise = prefetchSpeech(prevQ.text);
      GlobalAudio.playSpeech(audioPromise);
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

  const handleSelectQuestion = (q: Question) => {
    // CRITICAL: Immediately warm up context and trigger the play command
    GlobalAudio.init();
    setSessionQuestions([]);
    setSelectedQuestion(q);
    
    // Pull from predictive cache or start immediately - on the UI THREAD
    const audioPromise = prefetchSpeech(q.text);
    GlobalAudio.playSpeech(audioPromise);
    
    navigateTo(View.QUESTION_FLOW);
  };

  const renderView = () => {
    switch (currentView) {
      case View.FIELD_SELECTION: return <FieldSelection selectedCategory={selectedCategory} onSelectCategory={handleSelectCategory} />;
      case View.PRACTICE_START: return <PracticeStart onStartPractice={handleStartPractice} onSeeAllQuestions={() => navigateTo(View.ALL_QUESTIONS)} isCustom={selectedCategory === QuestionCategory.CUSTOM} />;
      case View.CUSTOM_DESCRIPTION: return <CustomJobInput onStart={handleStartCustomJob} onManualAdd={() => navigateTo(View.CUSTOM_ADD)} />;
      case View.CUSTOM_ADD: return <CustomQuestionInput onAdd={handleAddCustomQuestion} />;
      case View.ALL_QUESTIONS: return (
        <Practice 
          category={selectedCategory || QuestionCategory.UX_DESIGN} 
          questions={questions[selectedCategory!] || []} 
          onSelectQuestion={handleSelectQuestion} 
          onAddCustomQuestion={() => navigateTo(View.CUSTOM_ADD)} 
          onPrefetch={prefetchSpeech}
        />
      );
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

  return (
    <div className="min-h-screen text-slate-900 flex flex-col">
      <Navbar 
        onBack={handleBack} 
        onForward={handleForward}
        canGoBack={currentViewIndex > 0}
        canGoForward={currentViewIndex < history.length - 1}
        backLabel={previousViewLabel}
      />
      <main className="flex-grow">{renderView()}</main>
    </div>
  );
}