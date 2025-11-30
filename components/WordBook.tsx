import React, { useState } from 'react';
import { WordItem } from '../types';
import { Volume2, ArrowLeft, BookOpen, Trash2, AlertCircle, CheckCircle, Circle, Play } from 'lucide-react';

interface WordBookProps {
  words: WordItem[];
  onBack: () => void;
  onDelete: (id: string) => void;
  onPlayAudio: (word: string) => void;
  onStartReview?: (selectedWords: WordItem[]) => void;
}

const WordBook: React.FC<WordBookProps> = ({ words, onBack, onDelete, onPlayAudio, onStartReview }) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isSelectionMode = !!onStartReview;
  const selectedCount = selectedIds.size;
  const isMaxSelected = selectedCount >= 20;

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      if (newSet.size < 20) {
        newSet.add(id);
      }
    }
    setSelectedIds(newSet);
  };

  const handleStart = () => {
    if (onStartReview && selectedCount > 0) {
      const selected = words.filter(w => selectedIds.has(w.id));
      onStartReview(selected);
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
          // Also remove from selection if deleted
          if (selectedIds.has(confirmDeleteId)) {
             const newSet = new Set(selectedIds);
             newSet.delete(confirmDeleteId);
             setSelectedIds(newSet);
          }
      }
  };

  const cancelDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      setConfirmDeleteId(null);
  }

  // If in selection mode, handle row click as toggle
  const handleRowClick = (id: string, e: React.MouseEvent) => {
      if (isSelectionMode) {
          toggleSelection(id, e);
      } else {
         if (confirmDeleteId === id) setConfirmDeleteId(null);
      }
  };

  return (
    <div className="w-full h-full flex flex-col animate-fade-in relative">
      <div className="p-4 flex-none bg-gradient-to-b from-[#FFF0F5] to-transparent z-10 sticky top-0">
        <div className="flex items-center gap-4 mb-2">
            <button onClick={onBack} className="bg-white p-3 rounded-full shadow-md hover:bg-gray-50 transition">
            <ArrowLeft size={24} className="text-gray-600" />
            </button>
            
            <div className="flex flex-col">
                <h2 className="text-2xl font-cute font-bold text-text-main flex items-center gap-2">
                    {isSelectionMode ? (
                        <>
                        <CheckCircle className="text-cute-blue" />
                        选择复习单词
                        </>
                    ) : (
                        <>
                        <BookOpen className="text-cute-purple" />
                        我的单词本
                        </>
                    )}
                </h2>
                {isSelectionMode && (
                    <span className="text-sm text-gray-500 font-bold ml-1">
                        已选: <span className="text-cute-blue text-lg">{selectedCount}</span> / 20
                    </span>
                )}
            </div>
        </div>

        {!isSelectionMode && (
             <div className="text-xs text-gray-400 px-2 flex items-center gap-1">
                <AlertCircle size={12} />
                <span>排序规则：错误次数越多越靠前</span>
            </div>
        )}
        {isSelectionMode && (
             <div className="text-xs text-cute-blue px-2 flex items-center gap-1 font-bold">
                <AlertCircle size={12} />
                <span>请选择1-20个单词开始听写</span>
            </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {words.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
            <BookOpen size={64} className="text-gray-200 mb-4" />
            <p>单词本还是空的哦，快去练习吧！</p>
          </div>
        ) : (
          words.map((word) => {
            const isSelected = selectedIds.has(word.id);
            return (
            <div 
              key={word.id}
              onClick={(e) => handleRowClick(word.id, e)}
              className={`
                relative bg-white p-4 rounded-2xl shadow-sm border-2 
                transition-all duration-300 flex flex-col group overflow-hidden cursor-pointer
                ${confirmDeleteId === word.id ? 'ring-2 ring-red-400 bg-red-50 border-red-200' : ''}
                ${isSelected 
                    ? 'border-cute-blue bg-blue-50/30 shadow-md scale-[1.02]' 
                    : 'border-transparent hover:border-gray-200 hover:shadow-md'
                }
              `}
            >
              {/* Selection Checkbox (Visible in Selection Mode) */}
              {isSelectionMode && (
                  <div className="absolute top-4 right-4 transition-transform duration-200">
                      {isSelected ? (
                          <CheckCircle className="text-cute-blue fill-white" size={24} />
                      ) : (
                          <Circle className={`text-gray-300 ${isMaxSelected ? 'opacity-50' : 'group-hover:text-gray-400'}`} size={24} />
                      )}
                  </div>
              )}

              {/* Error Badge */}
              {word.errorCount > 0 && (
                <div className="absolute top-0 left-0 bg-red-100 text-red-500 text-xs font-bold px-3 py-1 rounded-br-xl flex items-center gap-1">
                   <AlertCircle size={12} />
                   记错 {word.errorCount} 次
                </div>
              )}

              <div className="flex justify-between items-start mt-4 mb-2 pl-1">
                  <div className="pr-10"> {/* Padding for checkbox/speaker */}
                    <div className={`text-2xl font-bold tracking-wide ${isSelected ? 'text-cute-blue' : 'text-text-main'}`}>{word.english}</div>
                    <div className="text-base text-gray-500 font-medium">{word.chinese}</div>
                  </div>
              </div>

              {/* Action Bar */}
              <div className="mt-2 pt-3 border-t border-gray-100 flex justify-between items-center h-8">
                  {/* Play Button - Always available */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); onPlayAudio(word.english); }}
                    className="flex items-center gap-1 text-gray-400 hover:text-cute-blue transition-colors px-2 py-1 rounded-full hover:bg-gray-100"
                  >
                     <Volume2 size={18} />
                     <span className="text-xs font-bold">听发音</span>
                  </button>

                  {/* Delete Button (Only in View Mode) */}
                  {!isSelectionMode && (
                      confirmDeleteId === word.id ? (
                        <div className="flex items-center gap-2 animate-fade-in" onClick={e => e.stopPropagation()}>
                            <button 
                                onClick={confirmDelete}
                                className="bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600 font-bold"
                            >
                                确认
                            </button>
                            <button 
                                onClick={cancelDelete}
                                className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded hover:bg-gray-300 font-bold"
                            >
                                取消
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={(e) => handleDeleteClick(word.id, e)}
                            className="text-gray-300 hover:text-red-400 transition-colors p-1"
                            title="删除"
                        >
                            <Trash2 size={18} />
                        </button>
                    )
                  )}
              </div>
            </div>
          )})
        )}
        </div>
      </div>

      {/* Floating Action Bar for Selection Mode */}
      {isSelectionMode && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-gray-200 shadow-lg flex justify-center animate-slide-up z-20">
              <button
                onClick={handleStart}
                disabled={selectedCount === 0}
                className={`
                    flex items-center gap-2 text-white font-bold py-3 px-10 rounded-full shadow-xl transition-all
                    ${selectedCount > 0 
                        ? 'bg-gradient-to-r from-cute-blue to-blue-400 hover:scale-105 active:scale-95' 
                        : 'bg-gray-300 cursor-not-allowed'
                    }
                `}
              >
                  <Play size={24} fill="currentColor" />
                  <span className="text-xl">开始听写 ({selectedCount})</span>
              </button>
          </div>
      )}
    </div>
  );
};

export default WordBook;