import React, { useState } from 'react';
import { WordItem } from '../types';
import { Loader2, Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

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

  const handleInputChange = (index: number, field: 'english' | 'chinese', value: string) => {
    const newInputs = [...inputs];
    newInputs[index] = { ...newInputs[index], [field]: value };
    setInputs(newInputs);
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
        <p className="text-center text-gray-400 mb-6 text-sm">记得输入中文释义，保存后将加入单词本哦</p>

        <div className="grid grid-cols-1 gap-4 mb-8">
          {inputs.map((pair, idx) => (
            <div key={idx} className="flex flex-col md:flex-row gap-2 items-center bg-gray-50 p-3 rounded-2xl border border-gray-100 hover:border-cute-blue transition-colors group">
               <span className="w-8 h-8 flex items-center justify-center bg-cute-purple text-white font-bold rounded-full shadow-sm shrink-0 group-hover:bg-cute-blue transition-colors">
                 {idx + 1}
               </span>
               
               <div className="flex-1 w-full">
                  <input
                    type="text"
                    value={pair.english}
                    onChange={(e) => handleInputChange(idx, 'english', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-cute-blue focus:ring-4 focus:ring-cute-blue/10 outline-none transition text-xl font-bold text-text-main placeholder-gray-300"
                    placeholder="English Word (英文)"
                    disabled={loading}
                    autoComplete="off"
                  />
               </div>

               <div className="flex-1 w-full">
                  <input
                    type="text"
                    value={pair.chinese}
                    onChange={(e) => handleInputChange(idx, 'chinese', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-cute-pink focus:ring-4 focus:ring-cute-pink/10 outline-none transition text-lg font-medium text-gray-600 placeholder-gray-300"
                    placeholder="中文释义"
                    disabled={loading}
                    autoComplete="off"
                  />
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