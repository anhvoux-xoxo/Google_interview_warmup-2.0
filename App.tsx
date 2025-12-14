import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { FieldSelection } from './components/FieldSelection';
import { Practice } from './components/Practice';
import { QuestionFlow } from './components/QuestionFlow';
import { CustomJobInput } from './components/CustomJobInput';
import { CustomQuestionInput } from './components/CustomQuestionInput';
import { View, QuestionCategory, Question, Recording } from './types';

// Mock Data
const INITIAL_QUESTIONS: Record<string, Question[]> = {
  [QuestionCategory.UX_DESIGN]: [
    { id: '1', text: 'Please tell me why would you be a good fit for this role?', category: QuestionCategory.UX_DESIGN, type: 'Background' },
    { id: '2', text: 'How does your experience align with the position you applied?', category: QuestionCategory.UX_DESIGN, type: 'Background' },
    { id: '3', text: 'Please share a time when you set a goal for yourself and achieved it. How did you go about that?', category: QuestionCategory.UX_DESIGN, type: 'Situational' },
    { id: '4', text: 'When would you conduct a usability study?', category: QuestionCategory.UX_DESIGN, type: 'Technical' },
    { id: '5', text: 'How do you measure success?', category: QuestionCategory.UX_DESIGN, type: 'Custom question' },
  ],
  [QuestionCategory.ENGINEERING]: [
     { id: 'e1', text: 'Explain the CAP theorem.', category: QuestionCategory.ENGINEERING, type: 'Technical' }
  ],
  [QuestionCategory.CUSTOM]: []
};

export default function App() {
  const [history, setHistory] = useState<View[]>([View.FIELD_SELECTION]);
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [questions, setQuestions] = useState(INITIAL_QUESTIONS);
  const [dontAskRedo, setDontAskRedo] = useState(false);

  const currentView = history[currentViewIndex];

  const navigateTo = (view: View) => {
    const newHistory = history.slice(0, currentViewIndex + 1);
    newHistory.push(view);
    setHistory(newHistory);
    setCurrentViewIndex(newHistory.length - 1);
  };

  const handleBack = () => {
    if (currentViewIndex > 0) {
      setCurrentViewIndex(prev => prev - 1);
    }
  };

  const handleForward = () => {
    if (currentViewIndex < history.length - 1) {
      setCurrentViewIndex(prev => prev + 1);
    }
  };

  const handleSelectCategory = (cat: QuestionCategory) => {
    setSelectedCategory(cat);
    if (cat === QuestionCategory.CUSTOM) {
      navigateTo(View.CUSTOM_DESCRIPTION);
    }
  };

  const handleStartPractice = () => {
    // Start with the first question of the selected category
    const catQuestions = questions[selectedCategory!] || questions[QuestionCategory.UX_DESIGN];
    if (catQuestions.length > 0) {
      setSelectedQuestion(catQuestions[0]);
      navigateTo(View.QUESTION_FLOW);
    } else {
       // Fallback or empty state
       navigateTo(View.ALL_QUESTIONS);
    }
  };

  const handleStartCustomJob = (description: string, generatedQuestions: string[]) => {
    // Convert generated strings to Question objects
    const newQuestions: Question[] = generatedQuestions.map((text, index) => ({
      id: `gen-${Date.now()}-${index}`,
      text: text,
      category: QuestionCategory.CUSTOM,
      type: 'Custom question'
    }));

    setQuestions(prev => ({
      ...prev,
      [QuestionCategory.CUSTOM]: [...(prev[QuestionCategory.CUSTOM] || []), ...newQuestions]
    }));
    
    // As per requirement "Display the list of questions that were generated earlier",
    // when "See all generated questions" is clicked in CustomJobInput, we navigate here.
    setSelectedCategory(QuestionCategory.CUSTOM);
    navigateTo(View.ALL_QUESTIONS);
  };

  const handleManualAddCustom = () => {
    navigateTo(View.CUSTOM_ADD);
  };

  const handleAddCustomQuestion = (text: string) => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      text: text,
      category: QuestionCategory.CUSTOM,
      type: 'Custom question'
    };
    
    setQuestions(prev => {
      const updated = {
          ...prev,
          [QuestionCategory.CUSTOM]: [...(prev[QuestionCategory.CUSTOM] || []), newQuestion]
      };
      return updated;
    });

    setSelectedCategory(QuestionCategory.CUSTOM); 
    navigateTo(View.ALL_QUESTIONS);
  };

  const handleSeeAllQuestions = () => {
    navigateTo(View.ALL_QUESTIONS);
  };

  const handleSelectQuestion = (q: Question) => {
    setSelectedQuestion(q);
    navigateTo(View.QUESTION_FLOW);
  };

  const renderView = () => {
    switch (currentView) {
      case View.FIELD_SELECTION:
        return (
          <FieldSelection 
            selectedCategory={selectedCategory}
            onSelectCategory={handleSelectCategory}
            onStartPractice={handleStartPractice}
            onSeeAllQuestions={handleSeeAllQuestions}
          />
        );
      case View.CUSTOM_DESCRIPTION:
        return (
          <CustomJobInput 
            onStart={handleStartCustomJob}
            onManualAdd={handleManualAddCustom}
          />
        );
      case View.CUSTOM_ADD:
        return (
          <CustomQuestionInput 
             onAdd={handleAddCustomQuestion}
          />
        );
      case View.ALL_QUESTIONS:
        return (
          <Practice 
            category={selectedCategory || QuestionCategory.UX_DESIGN}
            questions={questions[selectedCategory!] || questions[QuestionCategory.UX_DESIGN]}
            onSelectQuestion={handleSelectQuestion}
          />
        );
      case View.QUESTION_FLOW:
        return (
          <QuestionFlow 
            question={selectedQuestion!}
            onComplete={(rec) => console.log(rec)}
            dontAskRedo={dontAskRedo}
            setDontAskRedo={setDontAskRedo}
          />
        );
      default:
        return <div>Unknown View</div>;
    }
  };

  return (
    <div className="min-h-screen text-slate-900 flex flex-col">
      <Navbar 
        onBack={handleBack} 
        onForward={handleForward}
        canGoBack={currentViewIndex > 0}
        canGoForward={currentViewIndex < history.length - 1}
      />
      <main className="flex-grow">
        {renderView()}
      </main>
    </div>
  );
}