import React, { useState } from 'react';
import { WordItem } from '../types';
import { Volume2, ArrowLeft, BookOpen, Trash2, AlertCircle } from 'lucide-react';
import { getWordAudio, playAudioBuffer } from '../services/geminiService';

interface WordBookProps {
  words: WordItem[];
  onBack: () => void;
  onDelete: (id: string) => void;
}

const WordBook: React.FC<WordBookProps> = ({ words, onBack, onDelete }) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const playWord = async (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const buffer = await getWordAudio(word);
    if (buffer) {
        playAudioBuffer(buffer);
    } else {
        const msg = new SpeechSynthesisUtterance(word);
        window.speechSynthesis.speak(msg);
    }
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setConfirmDeleteId(id);
  };

  const confirmDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirmDeleteId) {
          onDelete(confirmDeleteId);
          setConfirmDeleteId(null);
      }
  };

  const cancelDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      setConfirmDeleteId(null);
  }

  return (
    <div className="w-full h-full p-4 flex flex-col animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="bg-white p-3 rounded-full shadow-md hover:bg-gray-50 transition">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <h2 className="text-2xl font-cute font-bold text-text-main flex items-center gap-2">
            <BookOpen className="text-cute-purple" />
            我的单词本
            <span className="text-sm bg-cute-purple text-white px-2 py-1 rounded-full">{words.length}</span>
        </h2>
      </div>

      <div className="text-xs text-gray-400 mb-4 px-2 flex items-center gap-1">
          <AlertCircle size={12} />
          <span>排序规则：错误次数越多越靠前</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-24 overflow-y-auto">
        {words.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
            <BookOpen size={64} className="text-gray-200 mb-4" />
            <p>单词本还是空的哦，快去练习吧！</p>
          </div>
        ) : (
          words.map((word) => (
            <div 
              key={word.id}
              className={`
                relative bg-white p-4 rounded-2xl shadow-sm border-b-4 border-gray-100 
                hover:border-cute-blue hover:shadow-md hover:-translate-y-1 transition-all duration-300
                flex flex-col group overflow-hidden
                ${confirmDeleteId === word.id ? 'ring-2 ring-red-400 bg-red-50' : ''}
              `}
              onClick={() => confirmDeleteId === word.id ? setConfirmDeleteId(null) : null}
            >
              {/* Error Badge */}
              {word.errorCount > 0 && (
                <div className="absolute top-0 left-0 bg-red-100 text-red-500 text-xs font-bold px-3 py-1 rounded-br-xl flex items-center gap-1">
                   <AlertCircle size={12} />
                   记错 {word.errorCount} 次
                </div>
              )}

              <div className="flex justify-between items-start mt-4 mb-2 pl-1">
                  <div>
                    <div className="text-2xl font-bold text-text-main tracking-wide">{word.english}</div>
                    <div className="text-base text-gray-500 font-medium">{word.chinese}</div>
                  </div>
                  
                  <button 
                    onClick={(e) => playWord(word.english, e)}
                    className="bg-cute-blue/10 p-3 rounded-full hover:bg-cute-blue group-hover:bg-cute-blue/20 transition-colors"
                  >
                     <Volume2 size={24} className="text-cute-blue group-hover:scale-110 transition-transform" />
                  </button>
              </div>

              {/* Action Bar (Delete) */}
              <div className="mt-2 pt-3 border-t border-gray-100 flex justify-end">
                  {confirmDeleteId === word.id ? (
                      <div className="flex items-center gap-2 animate-fade-in">
                          <span className="text-xs text-red-500 font-bold">确定删除？</span>
                          <button 
                             onClick={confirmDelete}
                             className="bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-red-600 font-bold"
                          >
                             是
                          </button>
                          <button 
                             onClick={cancelDelete}
                             className="bg-gray-200 text-gray-600 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-300 font-bold"
                          >
                             否
                          </button>
                      </div>
                  ) : (
                      <button 
                        onClick={(e) => handleDeleteClick(word.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 p-1"
                        title="删除单词"
                      >
                          <Trash2 size={18} />
                      </button>
                  )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WordBook;