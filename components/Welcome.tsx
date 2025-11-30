import React from 'react';
import { Play, RotateCw, Book } from 'lucide-react';

interface WelcomeProps {
  onStart: () => void;
  onReview: () => void;
  onWordBook: () => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onStart, onReview, onWordBook }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] p-6 text-center animate-fade-in relative">
      
      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 text-4xl animate-bounce delay-700 opacity-60">🦄</div>
      <div className="absolute top-20 right-10 text-4xl animate-bounce delay-100 opacity-60">🍭</div>
      <div className="absolute bottom-32 left-8 text-4xl animate-wiggle opacity-60">🎧</div>

      <div className="mb-8 relative group cursor-default z-10">
        <div className="absolute -inset-6 bg-gradient-to-r from-cute-pink via-white to-cute-blue rounded-full blur-2xl opacity-60 group-hover:opacity-90 transition duration-1000 animate-pulse"></div>
        <h1 className="relative text-5xl md:text-7xl font-cute font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-500 to-blue-500 drop-shadow-sm transform group-hover:scale-105 transition duration-300 tracking-wider">
          凯哥来听写
        </h1>
      </div>

      <div className="bg-white/90 backdrop-blur-sm p-6 rounded-[2rem] shadow-xl max-w-md relative mb-10 border-b-8 border-cute-blue wiggle mx-4 z-10">
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[18px] border-b-white/90"></div>
        <h2 className="text-xl md:text-2xl font-cute font-bold text-text-main mb-3 leading-relaxed">
          童琴予同学<br/>准备好今天的单词练习了吗？
        </h2>
        <p className="text-lg text-gray-500 font-cute">
          加油！今天也要棒棒的！💪
        </p>
      </div>

      <div className="flex flex-col gap-5 w-full max-w-xs z-10">
        <button 
          onClick={onStart}
          className="relative w-full overflow-hidden bg-gradient-to-r from-cute-blue to-blue-400 text-white font-bold py-4 rounded-full shadow-xl transform transition hover:scale-105 active:scale-95 group"
        >
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition duration-300"></div>
          <div className="flex items-center justify-center gap-3 text-xl">
              <Play size={28} fill="currentColor" className="group-hover:translate-x-1 transition-transform" />
              开始今日听写
          </div>
        </button>

        <button 
          onClick={onReview}
          className="relative w-full overflow-hidden bg-gradient-to-r from-cute-purple to-purple-400 text-white font-bold py-4 rounded-full shadow-xl transform transition hover:scale-105 active:scale-95 group"
        >
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition duration-300"></div>
          <div className="flex items-center justify-center gap-3 text-xl">
              <RotateCw size={28} className="group-hover:-rotate-180 transition-transform duration-500" />
              复习错题/单词
          </div>
        </button>

        <button 
          onClick={onWordBook}
          className="relative w-full overflow-hidden bg-gradient-to-r from-orange-300 to-orange-400 text-white font-bold py-4 rounded-full shadow-xl transform transition hover:scale-105 active:scale-95 group"
        >
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition duration-300"></div>
          <div className="flex items-center justify-center gap-3 text-xl">
              <Book size={28} className="group-hover:scale-110 transition-transform" />
              我的单词本
          </div>
        </button>
      </div>
    </div>
  );
};

export default Welcome;