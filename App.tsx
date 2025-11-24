import React, { useState, useEffect } from 'react';
import { WordItem, AppScreen, GameMode } from './types';
import Welcome from './components/Welcome';
import DailyInput from './components/DailyInput';
import DictationGame from './components/DictationGame';
import WordBook from './components/WordBook';
import { Book, RotateCw, Trophy } from 'lucide-react';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.WELCOME);
  const [wordBook, setWordBook] = useState<WordItem[]>([]);
  const [dailyWords, setDailyWords] = useState<WordItem[]>([]);
  const [reviewWords, setReviewWords] = useState<WordItem[]>([]);
  
  // Load from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('kaige_wordbook');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure legacy data has errorCount
        const sanitized = parsed.map((w: any) => ({
            ...w,
            errorCount: w.errorCount || 0
        }));
        // Initial sort
        setWordBook(sortWords(sanitized));
      } catch (e) {
        console.error("Failed to load wordbook");
      }
    }
  }, []);

  // Helper to sort words: High errors first, then by date added (newest first)
  const sortWords = (words: WordItem[]) => {
    return [...words].sort((a, b) => {
      if (b.errorCount !== a.errorCount) {
        return b.errorCount - a.errorCount; // Higher errors first
      }
      return b.dateAdded - a.dateAdded; // Newer words first
    });
  };

  // Save to LocalStorage helper
  const saveToBook = (newWords: WordItem[], merge: boolean = true) => {
    let updatedBook: WordItem[];

    if (merge) {
        // Prevent duplicates based on english word, keep existing stats if present
        // Explicitly create Map with generic types to avoid inference issues
        const existingMap = new Map<string, WordItem>();
        wordBook.forEach(w => existingMap.set(w.english.toLowerCase(), w));
        
        const mergedWords = newWords.map(nw => {
            const existing = existingMap.get(nw.english.toLowerCase());
            if (existing) {
                // Keep the old ID and error count, just update definition/date if needed
                return { ...existing, chinese: nw.chinese, dateAdded: Date.now() }; 
            }
            return nw;
        });

        // Add completely new words that weren't in the book
        const currentEnglishSet = new Set(mergedWords.map(w => w.english.toLowerCase()));
        const remainingOldWords = wordBook.filter(w => !currentEnglishSet.has(w.english.toLowerCase()));
        
        updatedBook = [...mergedWords, ...remainingOldWords];
    } else {
        updatedBook = newWords;
    }

    const sorted = sortWords(updatedBook);
    setWordBook(sorted);
    localStorage.setItem('kaige_wordbook', JSON.stringify(sorted));
  };

  // --- Actions ---

  const deleteWord = (id: string) => {
    const updated = wordBook.filter(w => w.id !== id);
    setWordBook(updated);
    localStorage.setItem('kaige_wordbook', JSON.stringify(updated));
  };

  const handleRecordError = (wordId: string) => {
    // Find the word in the book (or daily list) and increment error
    const updated = wordBook.map(w => {
      if (w.id === wordId) {
        return { ...w, errorCount: (w.errorCount || 0) + 1 };
      }
      return w;
    });
    
    // We also need to update dailyWords if it's happening during daily dictation
    // so the state stays consistent in the UI, though DictationGame uses its own queue.
    setDailyWords(prev => prev.map(w => w.id === wordId ? { ...w, errorCount: (w.errorCount || 0) + 1 } : w));

    // Save and sort immediately
    const sorted = sortWords(updated);
    setWordBook(sorted);
    localStorage.setItem('kaige_wordbook', JSON.stringify(sorted));
  };

  // Decrement error count for review mode success
  const handleWordSuccess = (wordId: string) => {
    const updated = wordBook.map(w => {
        if (w.id === wordId) {
            // Decrease error count, but not below 0
            return { ...w, errorCount: Math.max(0, (w.errorCount || 0) - 1) };
        }
        return w;
    });
    const sorted = sortWords(updated);
    setWordBook(sorted);
    localStorage.setItem('kaige_wordbook', JSON.stringify(sorted));
  };

  // --- Navigation Handlers ---
  const goHome = () => setCurrentScreen(AppScreen.WELCOME);
  
  const startDaily = () => setCurrentScreen(AppScreen.DAILY_INPUT);
  
  const startReview = () => {
      if (wordBook.length === 0) {
          alert("单词本里还没有单词哦，先进行每日练习吧！");
          return;
      }

      // Logic: Select 6 words total
      // 1. Take top 4 words with most errors (already sorted)
      // 2. Take 2 random words from the rest
      let selected: WordItem[] = [];
      const sortedBook = sortWords([...wordBook]);
      const TARGET_COUNT = 6;

      if (sortedBook.length <= TARGET_COUNT) {
          selected = sortedBook;
      } else {
          // Top 4 error words
          const topErrorWords = sortedBook.slice(0, 4);
          
          // Pool for random words (everything else)
          const remainingPool = sortedBook.slice(4);
          
          // Shuffle remaining pool
          const shuffledPool = remainingPool.sort(() => Math.random() - 0.5);
          
          // Take up to 2 random words
          const randomWords = shuffledPool.slice(0, 2);
          
          selected = [...topErrorWords, ...randomWords];
      }
      
      setReviewWords(selected);
      setCurrentScreen(AppScreen.REVIEW_GAME);
  };
  
  const openBook = () => setCurrentScreen(AppScreen.WORD_BOOK);

  // Called when Daily Input is finished
  const handleDailyWordsReady = (words: WordItem[]) => {
    setDailyWords(words);
    // Save to wordbook immediately
    saveToBook(words, true);
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
             <div className="fixed bottom-10 left-0 right-0 flex justify-center gap-8 animate-fade-in-up px-4">
                <button 
                  onClick={startReview}
                  className="group flex flex-col items-center gap-2 transition hover:-translate-y-2"
                >
                  <div className="bg-white p-5 rounded-3xl shadow-lg border-b-4 border-cute-purple group-hover:bg-cute-purple group-hover:border-purple-400 transition-colors">
                    <RotateCw size={28} className="text-cute-purple group-hover:text-white" />
                  </div>
                  <span className="font-cute font-bold text-gray-600 group-hover:text-cute-purple">复习模式</span>
                </button>

                <button 
                  onClick={openBook}
                  className="group flex flex-col items-center gap-2 transition hover:-translate-y-2"
                >
                  <div className="bg-white p-5 rounded-3xl shadow-lg border-b-4 border-cute-yellow group-hover:bg-cute-yellow group-hover:border-yellow-400 transition-colors">
                    <Book size={28} className="text-orange-400 group-hover:text-white" />
                  </div>
                  <span className="font-cute font-bold text-gray-600 group-hover:text-orange-400">单词本</span>
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
            onRecordError={handleRecordError}
            onComplete={() => {}}
            onExit={goHome}
          />
        );

      case AppScreen.REVIEW_GAME:
        return (
           <DictationGame 
            words={reviewWords} 
            mode={GameMode.REVIEW}
            onRecordError={handleRecordError}
            onWordSuccess={handleWordSuccess}
            onComplete={() => {}}
            onExit={goHome}
          />
        );

      case AppScreen.WORD_BOOK:
        return (
          <WordBook 
            words={wordBook}
            onDelete={deleteWord}
            onBack={goHome}
          />
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-x-hidden pb-10 bg-gradient-to-b from-[#FFF0F5] to-[#E6E6FA]">
      {/* Header / Brand */}
      {currentScreen !== AppScreen.WELCOME && (
         <div className="pt-4 flex justify-center">
             <div 
                className="bg-white/80 backdrop-blur-sm px-6 py-2 rounded-full shadow-sm cursor-pointer hover:bg-white"
                onClick={goHome}
             >
                <h1 className="font-cute font-bold text-lg text-cute-purple flex items-center gap-2">
                    <Trophy size={16} /> 凯哥来听写
                </h1>
             </div>
         </div>
      )}

      {renderContent()}
    </div>
  );
};

export default App;