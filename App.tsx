import React, { useState, useEffect, useCallback } from 'react';
import { WordItem, AppScreen, GameMode } from './types';
import Welcome from './components/Welcome';
import DailyInput from './components/DailyInput';
import DictationGame from './components/DictationGame';
import WordBook from './components/WordBook';
import { Book, RotateCw, Trophy } from 'lucide-react';
import { getWordAudio, playAudioBuffer } from './services/geminiService';

// Helper: Play from URL using HTML5 Audio Element (Bypasses CORS for playback)
// Moved outside component to ensure stability
const playExternalAudio = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    let resolved = false;

    const handleSuccess = () => {
      if (!resolved) {
          resolved = true;
          resolve();
      }
    };

    const handleError = () => {
      if (!resolved) {
          resolved = true;
          reject(new Error("Audio playback failed"));
      }
    };

    audio.onplay = handleSuccess;
    audio.onerror = handleError;

    // Set a timeout to prevent hanging
    setTimeout(() => handleError(), 3000);

    audio.play().catch(handleError);
  });
};

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.WELCOME);
  const [wordBook, setWordBook] = useState<WordItem[]>([]);
  const [dailyWords, setDailyWords] = useState<WordItem[]>([]);
  const [reviewWords, setReviewWords] = useState<WordItem[]>([]);
  
  // Robust Audio Player: Youdao -> Gemini -> Baidu -> Browser TTS
  // Memoized with useCallback to prevent recreating the function on every render,
  // which would cause the DictationGame effect to re-run and clear user input.
  const playAudio = useCallback(async (word: string) => {
    try {
      // 1. Try Youdao Dictionary API (Fast, usually cached by browser)
      // Using HTML5 Audio to avoid CORS issues with fetch()
      const youdaoUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`;
      await playExternalAudio(youdaoUrl);
      return;
    } catch (e) {
      // Continue to next fallback
    }

    try {
      // 2. Try Gemini TTS (High Quality, Natural)
      const pcmBuffer = await getWordAudio(word);
      if (pcmBuffer) {
        await playAudioBuffer(pcmBuffer);
        return;
      }
    } catch (e) {
      // Continue
    }

    try {
      // 3. Try Baidu TTS (Backup)
      const baiduUrl = `https://fanyi.baidu.com/gettts?lan=en&text=${encodeURIComponent(word)}&spd=3&source=web`;
      await playExternalAudio(baiduUrl);
      return;
    } catch (e2) {
      // Continue
    }

    // 4. Fallback to Browser Speech Synthesis (Offline/Last resort)
    try {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance(word);
      msg.lang = 'en-US';
      msg.rate = 0.9;
      window.speechSynthesis.speak(msg);
    } catch (e) {
      console.error("All audio methods failed");
    }
  }, []);

  // Load from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('kaige_wordbook');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const sanitized = parsed.map((w: any) => ({
            ...w,
            errorCount: w.errorCount || 0
        }));
        setWordBook(sortWords(sanitized));
      } catch (e) {
        console.error("Failed to load wordbook");
      }
    }
  }, []);

  const sortWords = (words: WordItem[]) => {
    return [...words].sort((a, b) => {
      if (b.errorCount !== a.errorCount) {
        return b.errorCount - a.errorCount; 
      }
      return b.dateAdded - a.dateAdded; 
    });
  };

  const saveToBook = (newWords: WordItem[], merge: boolean = true) => {
    let updatedBook: WordItem[];
    if (merge) {
        const existingMap = new Map<string, WordItem>();
        wordBook.forEach(w => existingMap.set(w.english.toLowerCase(), w));
        
        const mergedWords = newWords.map(nw => {
            const existing = existingMap.get(nw.english.toLowerCase());
            if (existing) {
                return { ...existing, chinese: nw.chinese, dateAdded: Date.now() }; 
            }
            return nw;
        });

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

  const deleteWord = (id: string) => {
    const updated = wordBook.filter(w => w.id !== id);
    setWordBook(updated);
    localStorage.setItem('kaige_wordbook', JSON.stringify(updated));
  };

  const handleRecordError = (wordId: string) => {
    const updated = wordBook.map(w => {
      if (w.id === wordId) {
        return { ...w, errorCount: (w.errorCount || 0) + 1 };
      }
      return w;
    });
    setDailyWords(prev => prev.map(w => w.id === wordId ? { ...w, errorCount: (w.errorCount || 0) + 1 } : w));
    const sorted = sortWords(updated);
    setWordBook(sorted);
    localStorage.setItem('kaige_wordbook', JSON.stringify(sorted));
  };

  const handleWordSuccess = (wordId: string) => {
    const updated = wordBook.map(w => {
        if (w.id === wordId) {
            return { ...w, errorCount: Math.max(0, (w.errorCount || 0) - 1) };
        }
        return w;
    });
    const sorted = sortWords(updated);
    setWordBook(sorted);
    localStorage.setItem('kaige_wordbook', JSON.stringify(sorted));
  };

  const goHome = () => setCurrentScreen(AppScreen.WELCOME);
  const startDaily = () => setCurrentScreen(AppScreen.DAILY_INPUT);
  const startReview = () => {
      if (wordBook.length === 0) {
          alert("单词本里还没有单词哦，先进行每日练习吧！");
          return;
      }
      let selected: WordItem[] = [];
      const sortedBook = sortWords([...wordBook]);
      const TARGET_COUNT = 6;
      if (sortedBook.length <= TARGET_COUNT) {
          selected = sortedBook;
      } else {
          const topErrorWords = sortedBook.slice(0, 4);
          const remainingPool = sortedBook.slice(4);
          const shuffledPool = remainingPool.sort(() => Math.random() - 0.5);
          const randomWords = shuffledPool.slice(0, 2);
          selected = [...topErrorWords, ...randomWords];
      }
      setReviewWords(selected);
      setCurrentScreen(AppScreen.REVIEW_GAME);
  };
  const openBook = () => setCurrentScreen(AppScreen.WORD_BOOK);

  const handleDailyWordsReady = (words: WordItem[]) => {
    setDailyWords(words);
    saveToBook(words, true);
    setCurrentScreen(AppScreen.DICTATION_GAME);
  };

  const renderContent = () => {
    switch (currentScreen) {
      case AppScreen.WELCOME:
        return (
          <div className="flex flex-col h-full">
             <Welcome onStart={startDaily} />
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
            onPlayAudio={playAudio} // Pass audio handler
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
            onPlayAudio={playAudio} // Pass audio handler
          />
        );
      case AppScreen.WORD_BOOK:
        return (
          <WordBook 
            words={wordBook}
            onDelete={deleteWord}
            onBack={goHome}
            onPlayAudio={playAudio} // Pass audio handler
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-x-hidden pb-10 bg-gradient-to-b from-[#FFF0F5] to-[#E6E6FA]">
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