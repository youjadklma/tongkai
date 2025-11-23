import React from 'react';
import { WordItem } from '../types';
import { Volume2, ArrowLeft, BookOpen } from 'lucide-react';
import { getWordAudio, playAudioBuffer } from '../services/geminiService';

interface WordBookProps {
  words: WordItem[];
  onBack: () => void;
}

const WordBook: React.FC<WordBookProps> = ({ words, onBack }) => {

  const playWord = async (word: string) => {
    // Quick TTS for the book
    const buffer = await getWordAudio(word);
    if (buffer) {
        playAudioBuffer(buffer);
    } else {
        const msg = new SpeechSynthesisUtterance(word);
        window.speechSynthesis.speak(msg);
    }
  };

  return (
    <div className="w-full h-full p-4 flex flex-col animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="bg-white p-2 rounded-full shadow-md hover:bg-gray-50">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <h2 className="text-2xl font-cute font-bold text-text-main flex items-center gap-2">
            <BookOpen className="text-cute-purple" />
            我的单词本 ({words.length})
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 overflow-y-auto">
        {words.length === 0 ? (
          <div className="col-span-full text-center text-gray-400 py-20">
            单词本还是空的哦，快去练习吧！
          </div>
        ) : (
          words.map((word) => (
            <div 
              key={word.id}
              onClick={() => playWord(word.english)}
              className="bg-white p-4 rounded-2xl shadow-sm border-2 border-transparent hover:border-cute-blue hover:shadow-md transition cursor-pointer group flex justify-between items-center"
            >
              <div>
                <div className="text-xl font-bold text-text-main">{word.english}</div>
                <div className="text-sm text-gray-500 mt-1">{word.chinese}</div>
              </div>
              <div className="bg-cute-blue/20 p-2 rounded-full group-hover:bg-cute-blue transition">
                 <Volume2 size={20} className="text-cute-blue group-hover:text-white" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WordBook;