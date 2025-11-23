import React from 'react';
import { Play } from 'lucide-react';

interface WelcomeProps {
  onStart: () => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center animate-fade-in">
      <div className="mb-12 relative group cursor-default">
        <div className="absolute -inset-4 bg-gradient-to-r from-cute-pink via-cute-purple to-cute-blue rounded-full blur-xl opacity-50 group-hover:opacity-80 transition duration-1000 animate-pulse"></div>
        <h1 className="relative text-6xl md:text-8xl font-cute font-bold text-transparent bg-clip-text bg-gradient-to-br from-blue-500 to-purple-600 drop-shadow-sm transform group-hover:scale-110 transition duration-300">
          童凯哥哥
        </h1>
        <div className="absolute -right-4 -top-4 text-4xl animate-bounce delay-100">✨</div>
        <div className="absolute -left-4 -bottom-2 text-4xl animate-bounce delay-700">🎈</div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-lg max-w-md relative mb-12 border-4 border-cute-blue wiggle mx-4">
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[15px] border-b-white"></div>
        <h2 className="text-2xl font-cute font-bold text-text-main mb-2">
          童琴予同学准备好今天的单词练习了吗？
        </h2>
        <p className="text-lg text-gray-600 font-cute">
          让我们开始吧！
        </p>
      </div>

      <button 
        onClick={onStart}
        className="bg-gradient-to-r from-cute-blue to-blue-400 text-white font-bold py-4 px-12 rounded-full shadow-xl transform transition hover:scale-110 active:scale-95 flex items-center gap-3 text-2xl"
      >
        <Play size={28} fill="currentColor" />
        出发！
      </button>
    </div>
  );
};

export default Welcome;