import React, { useState, useEffect, useRef } from 'react';
import { WordItem, GameMode } from '../types';
import { getWordAudio, playAudioBuffer } from '../services/geminiService';
import { Volume2, XCircle, CheckCircle, Lightbulb, RefreshCw, Home } from 'lucide-react';

interface DictationGameProps {
  words: WordItem[];
  mode: GameMode;
  onRecordError: (id: string) => void;
  onComplete: (correctCount: number) => void;
  onExit: () => void;
}

const DictationGame: React.FC<DictationGameProps> = ({ words, mode, onRecordError, onComplete, onExit }) => {
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
        onExit(); 
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
    const currentWord = queue[currentIndex];
    const target = currentWord.english.toLowerCase().trim();
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
      handleError(currentWord.id);
    }
  };

  const handleError = (wordId: string) => {
    // Record error in persistent storage
    onRecordError(wordId);

    if (mode === GameMode.DAILY) {
      // Daily mode: Sudden death immediately
      setGameState('GAME_OVER');
    } else {
      // Review mode
      setFeedback('SHAKE');
      setTimeout(() => setFeedback('NONE'), 500);
      
      // Strict rule logic
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-bounce px-6">
        <div className="bg-white p-8 rounded-[3rem] shadow-xl text-center border-4 border-red-100 max-w-sm w-full">
            <XCircle className="text-red-400 mx-auto mb-4" size={80} />
            <h2 className="text-3xl font-cute font-bold text-text-main mb-2">哎呀！出错了</h2>
            <p className="text-gray-500 mb-6 font-medium">
               正确拼写是: <span className="text-cute-blue font-bold text-xl block mt-1">{queue[currentIndex].english}</span>
               <span className="text-sm text-gray-400">({queue[currentIndex].chinese})</span>
            </p>
            <p className="text-xs text-red-300 mb-8 bg-red-50 py-1 px-3 rounded-full inline-block">已记录到错题本</p>
            
            <button 
            onClick={onExit}
            className="w-full bg-gradient-to-r from-cute-blue to-blue-400 text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2"
            >
            <RefreshCw size={20} />
            重新开始
            </button>
        </div>
      </div>
    );
  }

  if (gameState === 'SUCCESS') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in px-6">
        <div className="bg-white p-8 rounded-[3rem] shadow-xl text-center border-4 border-green-100 max-w-sm w-full relative overflow-hidden">
             {/* Confetti effect placeholder */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-400 via-yellow-400 to-blue-400"></div>

            <div className="text-7xl mb-4 animate-wiggle inline-block">🎉</div>
            <h2 className="text-3xl font-cute font-bold text-text-main mb-4">太棒了！</h2>
            <p className="text-gray-500 mb-8 text-lg">
                {mode === GameMode.DAILY ? "今天的任务全部完成！" : "复习挑战成功！"}
            </p>
            <button 
            onClick={() => { onComplete(queue.length); onExit(); }}
            className="w-full bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2"
            >
            <Home size={20} />
            回到主页
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto p-4 flex flex-col items-center">
      {/* Header Info */}
      <div className="flex justify-between w-full items-center mb-6 px-4">
         <span className="text-sm font-bold bg-white px-3 py-1 rounded-full shadow-sm text-gray-400">
             {mode === GameMode.DAILY ? "📅 每日听写" : "🔄 复习模式"}
         </span>
         <span className="text-sm font-bold bg-white px-3 py-1 rounded-full shadow-sm text-cute-purple">
             {currentIndex + 1} / {queue.length}
         </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white rounded-full h-3 mb-8 overflow-hidden shadow-inner mx-4">
        <div 
          className="bg-gradient-to-r from-cute-pink to-cute-purple h-full transition-all duration-500 ease-out"
          style={{ width: `${((currentIndex) / queue.length) * 100}%` }}
        ></div>
      </div>

      {/* Main Card */}
      <div className="bg-white p-8 rounded-[3rem] shadow-xl w-full text-center border-b-8 border-cute-blue relative mx-4">
        
        {/* Audio Button (Big) */}
        <button 
          onClick={playCurrentWord}
          className="bg-cute-yellow p-8 rounded-full mb-8 shadow-md hover:scale-110 active:scale-95 transition-transform group ring-4 ring-yellow-100"
        >
          <Volume2 size={56} className="text-orange-400 group-hover:text-orange-600" />
        </button>

        <p className="text-gray-400 text-sm mb-2 font-bold">请输入听到的单词:</p>

        {/* Input Field */}
        <div className={`relative transition-transform ${feedback === 'SHAKE' ? 'animate-[wiggle_0.3s_ease-in-out]' : ''}`}>
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className={`
              w-full text-center text-5xl font-bold font-cute py-4 border-b-4 outline-none bg-transparent tracking-wider
              ${feedback === 'CORRECT' ? 'border-green-400 text-green-500' : 'border-gray-100 text-text-main focus:border-cute-blue'}
              transition-colors duration-300
            `}
            placeholder=""
            autoComplete="off"
            autoFocus
          />
          {feedback === 'CORRECT' && (
             <CheckCircle className="absolute right-0 top-1/2 -translate-y-1/2 text-green-500 animate-bounce" size={40} />
          )}
        </div>

        {/* Hints (Review Mode Only) */}
        {mode === GameMode.REVIEW && (
           <div className="mt-8 flex justify-center">
             <button
               onClick={useHint}
               disabled={hintsLeft === 0}
               className={`
                 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm
                 ${hintsLeft > 0 ? 'bg-orange-50 text-orange-500 hover:bg-orange-100' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}
               `}
             >
               <Lightbulb size={18} />
               提示 ({hintsLeft})
             </button>
           </div>
        )}

      </div>
    </div>
  );
};

export default DictationGame;