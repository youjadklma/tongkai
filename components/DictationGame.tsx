import React, { useState, useEffect, useRef } from 'react';
import { WordItem, GameMode } from '../types';
import { getWordAudio, playAudioBuffer } from '../services/geminiService';
import { Volume2, XCircle, CheckCircle, Lightbulb, RefreshCw } from 'lucide-react';

interface DictationGameProps {
  words: WordItem[];
  mode: GameMode;
  onComplete: (correctCount: number) => void;
  onExit: () => void;
}

const DictationGame: React.FC<DictationGameProps> = ({ words, mode, onComplete, onExit }) => {
  // Game State
  const [queue, setQueue] = useState<WordItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [gameState, setGameState] = useState<'PRELOAD' | 'PLAYING' | 'SUCCESS' | 'GAME_OVER'>('PRELOAD');
  const [hintsLeft, setHintsLeft] = useState(3);
  const [feedback, setFeedback] = useState<'NONE' | 'SHAKE' | 'CORRECT'>('NONE');
  const [audioCache, setAudioCache] = useState<Record<string, ArrayBuffer>>({});
  
  // Refs for logic
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize Game
  useEffect(() => {
    // Shuffle words
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    setCurrentIndex(0);
    setGameState('PRELOAD');
    setHintsLeft(3); // Reset hints for the session
    
    // Preload audio for the first word immediately, others in background
    if (shuffled.length > 0) {
      loadAudio(shuffled[0].english).then(() => {
        setGameState('PLAYING');
      });
      // Background load others
      shuffled.slice(1).forEach(w => loadAudio(w.english));
    } else {
        // No words to review
        onExit(); 
        alert("没有单词可以复习哦！");
    }
  }, [words]); // eslint-disable-line react-hooks/exhaustive-deps

  // Effect to play audio when word changes or game starts
  useEffect(() => {
    if (gameState === 'PLAYING' && queue[currentIndex]) {
      playCurrentWord();
      setUserInput('');
      // Focus input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [gameState, currentIndex, queue]);

  // Audio Loader
  const loadAudio = async (text: string) => {
    if (audioCache[text]) return;
    const buffer = await getWordAudio(text);
    if (buffer) {
      setAudioCache(prev => ({ ...prev, [text]: buffer }));
    }
  };

  const playCurrentWord = async () => {
    const word = queue[currentIndex].english;
    if (audioCache[word]) {
      playAudioBuffer(audioCache[word]);
    } else {
      // Fallback or just-in-time fetch
      const buffer = await getWordAudio(word);
      if (buffer) {
        setAudioCache(prev => ({ ...prev, [word]: buffer }));
        playAudioBuffer(buffer);
      } else {
        // Web Speech API fallback
        const msg = new SpeechSynthesisUtterance(word);
        msg.lang = 'en-US';
        window.speechSynthesis.speak(msg);
      }
    }
  };

  // Speak letter on typing (Web Speech API for low latency)
  const speakLetter = (char: string) => {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(char);
    msg.rate = 1.5; // Faster for typing
    msg.lang = 'en-US';
    window.speechSynthesis.speak(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      submitWord();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Speak only the new character if added
    if (val.length > userInput.length) {
      const char = val.slice(-1);
      if (/[a-zA-Z]/.test(char)) {
        speakLetter(char);
      }
    }
    setUserInput(val);
  };

  const submitWord = () => {
    const target = queue[currentIndex].english.toLowerCase().trim();
    const input = userInput.toLowerCase().trim();

    if (input === target) {
      // Correct
      setFeedback('CORRECT');
      
      setTimeout(() => {
        setFeedback('NONE');
        if (currentIndex < queue.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          // Finished all words
          handleWin();
        }
      }, 800);
    } else {
      // Wrong
      handleError();
    }
  };

  const handleError = () => {
    if (mode === GameMode.DAILY) {
      // Daily mode: Sudden death immediately
      setGameState('GAME_OVER');
    } else {
      // Review mode
      setFeedback('SHAKE');
      setTimeout(() => setFeedback('NONE'), 500);
      
      // Strict rule: if hints used up and wrong -> game over? 
      // User prompt: "Chance used up then wrong -> exit"
      // If hintsLeft == 0, and they got it wrong, game over.
      if (hintsLeft <= 0) {
        setGameState('GAME_OVER');
      }
    }
  };

  const useHint = () => {
    if (hintsLeft > 0) {
      setHintsLeft(prev => prev - 1);
      const target = queue[currentIndex].english;
      // Audio hint
      const msg = new SpeechSynthesisUtterance(`The word starts with ${target.charAt(0)}`);
      window.speechSynthesis.speak(msg); 
      
      // Visual hint: Fill incomplete
      const currentLen = userInput.length;
      if (currentLen < target.length) {
          setUserInput(target.substring(0, currentLen + 1));
      } else {
          setUserInput(target);
      }
      inputRef.current?.focus();
    }
  };

  const handleWin = () => {
    setGameState('SUCCESS');
    // Words are already saved in App.tsx before game start for Daily Mode
  };

  // Renderers
  if (gameState === 'PRELOAD') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <RefreshCw className="animate-spin text-cute-blue mb-4" size={48} />
        <p className="font-cute text-xl text-text-main">准备单词中...</p>
      </div>
    );
  }

  if (gameState === 'GAME_OVER') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] animate-bounce">
        <XCircle className="text-red-400 mb-6" size={80} />
        <h2 className="text-3xl font-cute font-bold text-text-main mb-4">哎呀！出错了</h2>
        <p className="text-gray-500 mb-8">别灰心，重新开始挑战吧！</p>
        <button 
          onClick={onExit}
          className="bg-cute-blue text-white font-bold py-3 px-8 rounded-full shadow-lg hover:scale-105 transition"
        >
          重新开始
        </button>
      </div>
    );
  }

  if (gameState === 'SUCCESS') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-cute font-bold text-text-main mb-4">太棒了！</h2>
        <p className="text-gray-500 mb-8">
            {mode === GameMode.DAILY ? "今天的任务完成了！单词已保存！" : "复习挑战成功！"}
        </p>
        <button 
          onClick={() => { onComplete(queue.length); onExit(); }}
          className="bg-green-400 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:scale-105 transition"
        >
          回到主页
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto p-4 flex flex-col items-center">
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-4 mb-8 overflow-hidden border-2 border-white shadow-inner">
        <div 
          className="bg-cute-pink h-full transition-all duration-500"
          style={{ width: `${((currentIndex) / queue.length) * 100}%` }}
        ></div>
      </div>

      {/* Main Card */}
      <div className="bg-white p-8 rounded-[40px] shadow-xl w-full text-center border-4 border-cute-blue relative">
        
        {/* Mode Indicator */}
        <div className="absolute top-4 right-6 text-sm font-bold text-gray-300">
           {mode === GameMode.DAILY ? "每日听写" : "复习模式"}
        </div>

        {/* Word Counter */}
        <div className="text-gray-400 font-bold mb-6">
           单词 {currentIndex + 1} / {queue.length}
        </div>

        {/* Audio Button (Big) */}
        <button 
          onClick={playCurrentWord}
          className="bg-cute-yellow p-6 rounded-full mb-8 shadow-md hover:scale-110 active:scale-95 transition-transform group"
        >
          <Volume2 size={48} className="text-orange-400 group-hover:text-orange-500" />
        </button>

        {/* Input Field */}
        <div className={`relative transition-transform ${feedback === 'SHAKE' ? 'animate-[wiggle_0.3s_ease-in-out]' : ''}`}>
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className={`
              w-full text-center text-4xl font-bold font-cute py-4 border-b-4 outline-none bg-transparent
              ${feedback === 'CORRECT' ? 'border-green-400 text-green-500' : 'border-gray-200 text-text-main focus:border-cute-blue'}
            `}
            placeholder="听写单词..."
            autoComplete="off"
            autoFocus
          />
          {feedback === 'CORRECT' && (
             <CheckCircle className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500 animate-bounce" size={32} />
          )}
        </div>

        {/* Hints (Review Mode Only) */}
        {mode === GameMode.REVIEW && (
           <div className="mt-8 flex justify-center">
             <button
               onClick={useHint}
               disabled={hintsLeft === 0}
               className={`
                 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition
                 ${hintsLeft > 0 ? 'bg-orange-100 text-orange-500 hover:bg-orange-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
               `}
             >
               <Lightbulb size={18} />
               提示 ({hintsLeft})
             </button>
           </div>
        )}

      </div>

      <div className="mt-8 text-gray-400 text-sm">
        按 Enter 提交
      </div>
    </div>
  );
};

export default DictationGame;