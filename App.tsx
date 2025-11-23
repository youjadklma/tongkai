import React, { useState, useEffect } from 'react';
import { WordItem, AppScreen, GameMode } from './types';
import Welcome from './components/Welcome';
import DailyInput from './components/DailyInput';
import DictationGame from './components/DictationGame';
import WordBook from './components/WordBook';
import { Book, RotateCw } from 'lucide-react';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.WELCOME);
  const [wordBook, setWordBook] = useState<WordItem[]>([]);
  const [dailyWords, setDailyWords] = useState<WordItem[]>([]);
  
  // Load from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('kaige_wordbook');
    if (saved) {
      try {
        setWordBook(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load wordbook");
      }
    }
  }, []);

  // Save to LocalStorage helper
  const saveToBook = (newWords: WordItem[]) => {
    // Prevent duplicates based on english word
    const existingEnglish = new Set(wordBook.map(w => w.english.toLowerCase()));
    const uniqueNew = newWords.filter(w => !existingEnglish.has(w.english.toLowerCase()));
    
    // Create new list, newest first or last? Let's add new ones to the end.
    const updatedBook = [...wordBook, ...uniqueNew];
    
    setWordBook(updatedBook);
    localStorage.setItem('kaige_wordbook', JSON.stringify(updatedBook));
  };

  // Navigation Handlers
  const goHome = () => setCurrentScreen(AppScreen.WELCOME);
  
  const startDaily = () => setCurrentScreen(AppScreen.DAILY_INPUT);
  
  const startReview = () => {
      if (wordBook.length === 0) {
          alert("单词本里还没有单词哦，先进行每日练习吧！");
          return;
      }
      setCurrentScreen(AppScreen.REVIEW_GAME);
  };
  
  const openBook = () => setCurrentScreen(AppScreen.WORD_BOOK);

  // Called when Daily Input is finished
  const handleDailyWordsReady = (words: WordItem[]) => {
    setDailyWords(words);
    // Save to wordbook immediately as requested ("save to wordbook when inputting")
    saveToBook(words);
    setCurrentScreen(AppScreen.DICTATION_GAME);
  };

  // Render Logic
  const renderContent = () => {
    switch (currentScreen) {
      case AppScreen.WELCOME:
        return (
          <div className="flex flex-col h-full">
             <Welcome onStart={startDaily} />
             
             {/* Main Menu for other actions */}
             <div className="fixed bottom-8 left-0 right-0 flex justify-center gap-6 animate-fade-in-up">
                <button 
                  onClick={startReview}
                  className="flex flex-col items-center gap-2 text-text-main hover:text-cute-blue transition hover:-translate-y-1"
                >
                  <div className="bg-white p-4 rounded-full shadow-lg border-2 border-cute-purple">
                    <RotateCw size={24} className="text-cute-purple" />
                  </div>
                  <span className="font-cute font-bold">复习模式</span>
                </button>

                <button 
                  onClick={openBook}
                  className="flex flex-col items-center gap-2 text-text-main hover:text-cute-blue transition hover:-translate-y-1"
                >
                  <div className="bg-white p-4 rounded-full shadow-lg border-2 border-cute-yellow">
                    <Book size={24} className="text-orange-400" />
                  </div>
                  <span className="font-cute font-bold">单词本</span>
                </button>
             </div>
          </div>
        );
      
      case AppScreen.DAILY_INPUT:
        return (
          <DailyInput 
            onStartDictation={handleDailyWordsReady}
            onBack={goHome}
          />
        );

      case AppScreen.DICTATION_GAME:
        return (
          <DictationGame 
            words={dailyWords}
            mode={GameMode.DAILY}
            onComplete={() => {}}
            onExit={goHome}
          />
        );

      case AppScreen.REVIEW_GAME:
        return (
           <DictationGame 
            words={wordBook} // Use all words for review
            mode={GameMode.REVIEW}
            onComplete={() => {}}
            onExit={goHome}
          />
        );

      case AppScreen.WORD_BOOK:
        return (
          <WordBook 
            words={wordBook}
            onBack={goHome}
          />
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-x-hidden pb-10">
      {/* Header / Brand */}
      {currentScreen !== AppScreen.WELCOME && (
         <div className="p-4 flex justify-center">
             <h1 className="font-cute font-bold text-xl text-gray-400">凯哥来听写</h1>
         </div>
      )}

      {renderContent()}
    </div>
  );
};

export default App;