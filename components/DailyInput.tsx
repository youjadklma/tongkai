import React, { useState, useRef, useEffect } from 'react';
import { WordItem } from '../types';
import { Loader2, Save, Sparkles, Wand2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { getWordDefinition } from '../services/geminiService';

interface DailyInputProps {
  onStartDictation: (words: WordItem[]) => void;
  onBack: () => void;
}

interface InputPair {
  english: string;
  chinese: string;
}

const DailyInput: React.FC<DailyInputProps> = ({ onStartDictation, onBack }) => {
  const [inputs, setInputs] = useState<InputPair[]>(Array(6).fill({ english: '', chinese: '' }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track which fields are currently fetching definitions
  const [translatingIndices, setTranslatingIndices] = useState<Set<number>>(new Set());
  
  // Refs for debouncing
  const debounceTimers = useRef<{[key: number]: number}>({});

  useEffect(() => {
    return () => {
      // Cleanup timers
      Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer as number));
    };
  }, []);

  const triggerTranslation = async (index: number, englishWord: string) => {
    if (!englishWord.trim()) return;

    setTranslatingIndices(prev => new Set(prev).add(index));

    try {
      const definition = await getWordDefinition(englishWord);
      
      if (definition) {
        setInputs(prev => {
          const newInputs = [...prev];
          // Only auto-fill if the Chinese field is currently empty to avoid overwriting user edits
          if (!newInputs[index].chinese.trim()) {
            newInputs[index] = { ...newInputs[index], chinese: definition };
          }
          return newInputs;
        });
      }
    } catch (e) {
      console.warn("Auto-translation failed for", englishWord);
    } finally {
      setTranslatingIndices(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  const handleEnglishChange = (index: number, value: string) => {
    // 1. Update state immediately
    const newInputs = [...inputs];
    newInputs[index] = { ...newInputs[index], english: value };
    setInputs(newInputs);

    // 2. Clear existing timer
    if (debounceTimers.current[index]) {
      clearTimeout(debounceTimers.current[index]);
    }

    // 3. Set new timer (Debounce 800ms)
    // Only trigger if value is not empty
    if (value.trim()) {
        debounceTimers.current[index] = window.setTimeout(() => {
            triggerTranslation(index, value);
        }, 800);
    }
  };

  const handleChineseChange = (index: number, value: string) => {
    const newInputs = [...inputs];
    newInputs[index] = { ...newInputs[index], chinese: value };
    setInputs(newInputs);
  };

  const handleBlur = (index: number) => {
      // If user leaves field and we haven't translated yet (or timer is pending), trigger immediately
      const word = inputs[index].english;
      // If timer exists, clear it and trigger immediately to feel responsive
      if (debounceTimers.current[index]) {
          clearTimeout(debounceTimers.current[index]);
          delete debounceTimers.current[index];
          if (word.trim()) {
             triggerTranslation(index, word);
          }
      }
  };

  const handleSubmit = async () => {
    // Validate inputs
    const emptyFields = inputs.some(pair => !pair.english.trim() || !pair.chinese.trim());
    
    if (emptyFields) {
      setError("请完整输入6个单词和对应的中文释义哦！");
      return;
    }
    
    setError(null);
    setLoading(true);

    try {
      // Create word items manually
      const processedWords: WordItem[] = inputs.map(pair => ({
        id: uuidv4(),
        english: pair.english.trim(),
        chinese: pair.chinese.trim(),
        dateAdded: Date.now(),
        errorCount: 0 // Initialize with 0 errors
      }));

      // Simulate a small delay for better UX feel
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onStartDictation(processedWords);
    } catch (e) {
      setError("保存单词时出错了，请重试！");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 animate-fade-in pb-20">
      <div className="bg-white rounded-3xl shadow-xl p-6 border-b-8 border-cute-pink">
        <h2 className="text-2xl font-cute font-bold text-center text-text-main mb-2">
          📝 输入今天的6个单词
        </h2>
        <p className="text-center text-gray-400 mb-6 text-sm flex items-center justify-center gap-1">
          <Wand2 size={14} className="text-cute-purple" />
          <span>输入英文后，AI会自动翻译中文哦</span>
        </p>

        <div className="grid grid-cols-1 gap-4 mb-8">
          {inputs.map((pair, idx) => (
            <div key={idx} className="flex flex-col md:flex-row gap-2 items-center bg-gray-50 p-3 rounded-2xl border border-gray-100 hover:border-cute-blue transition-colors group relative">
               <span className="w-8 h-8 flex items-center justify-center bg-cute-purple text-white font-bold rounded-full shadow-sm shrink-0 group-hover:bg-cute-blue transition-colors">
                 {idx + 1}
               </span>
               
               <div className="flex-1 w-full relative">
                  <input
                    type="text"
                    value={pair.english}
                    onChange={(e) => handleEnglishChange(idx, e.target.value)}
                    onBlur={() => handleBlur(idx)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-transparent bg-text-main focus:border-cute-blue focus:ring-4 focus:ring-cute-blue/30 outline-none transition text-xl font-bold text-white placeholder-white/40"
                    placeholder="English Word"
                    disabled={loading}
                    autoComplete="off"
                  />
               </div>

               <div className="flex-1 w-full relative">
                  <input
                    type="text"
                    value={pair.chinese}
                    onChange={(e) => handleChineseChange(idx, e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-transparent bg-text-main/90 focus:border-cute-pink focus:ring-4 focus:ring-cute-pink/30 outline-none transition text-lg font-bold text-white placeholder-white/40"
                    placeholder="中文释义 (自动翻译)"
                    disabled={loading}
                    autoComplete="off"
                  />
                  
                  {/* Translating Indicator */}
                  {translatingIndices.has(idx) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-cute-purple text-xs font-bold bg-white/90 px-2 py-1 rounded-full shadow-sm animate-pulse z-10">
                        <Loader2 size={12} className="animate-spin" />
                        <span>翻译中...</span>
                    </div>
                  )}

                  {/* Magic Icon for non-empty, non-translating states to show it worked */}
                  {!translatingIndices.has(idx) && pair.chinese && !pair.english.match(/[\u4e00-\u9fa5]/) && (
                     <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none">
                        <Sparkles size={16} />
                     </div>
                  )}
               </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-500 rounded-xl text-center font-bold animate-bounce text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-between items-center px-2">
          <button 
            onClick={onBack}
            className="text-gray-400 font-bold hover:text-gray-600 px-4 py-2 hover:bg-gray-100 rounded-xl transition"
          >
            返回
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`
              flex items-center gap-2 bg-gradient-to-r from-cute-pink to-pink-400 text-white font-bold py-3 px-8 rounded-full shadow-md text-lg
              ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105 active:scale-95 transition-transform hover:shadow-lg'}
            `}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save size={20} />
                保存并开始
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyInput;