import React from 'react';

const Loading = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center h-96">
      {/* Animated Sand Clock (Hourglass) */}
      <div className="relative w-24 h-32">
        {/* Hourglass container with flip animation */}
        <div className="hourglass-container">
          <svg
            className="w-24 h-32"
            viewBox="0 0 120 160"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Hourglass frame */}
            <g className="hourglass-frame">
              {/* Top frame */}
              <path
                d="M 20 10 L 100 10 L 100 20 L 90 20 L 60 50 L 30 20 L 20 20 Z"
                fill="none"
                stroke="#4f46e5"
                strokeWidth="3"
                className="hourglass-top"
              />

              {/* Bottom frame */}
              <path
                d="M 20 150 L 100 150 L 100 140 L 90 140 L 60 110 L 30 140 L 20 140 Z"
                fill="none"
                stroke="#4f46e5"
                strokeWidth="3"
                className="hourglass-bottom"
              />

              {/* Middle connection */}
              <line x1="60" y1="50" x2="60" y2="110" stroke="#4f46e5" strokeWidth="2" />
            </g>

            {/* Top sand (decreasing) */}
            <g className="sand-top">
              <path
                d="M 30 20 L 90 20 L 60 50 Z"
                fill="#6366f1"
                opacity="0.8"
                className="animate-sand-fall"
              />
            </g>

            {/* Falling sand particles */}
            <g className="sand-particles">
              <circle cx="60" cy="70" r="1.5" fill="#818cf8" className="animate-sand-drop" style={{ animationDelay: '0s' }} />
              <circle cx="60" cy="75" r="1.5" fill="#818cf8" className="animate-sand-drop" style={{ animationDelay: '0.3s' }} />
              <circle cx="60" cy="80" r="1.5" fill="#818cf8" className="animate-sand-drop" style={{ animationDelay: '0.6s' }} />
            </g>

            {/* Bottom sand (increasing) */}
            <g className="sand-bottom">
              <path
                d="M 30 140 L 90 140 L 60 110 Z"
                fill="#4f46e5"
                opacity="0.9"
                className="animate-sand-fill"
              />
            </g>
          </svg>
        </div>
      </div>

      {/* Loading text with dots animation */}
      <div className="mt-8 flex items-center space-x-1">
        <span className="text-gray-400 text-sm font-medium">{message}</span>
        <div className="flex space-x-1">
          <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        .hourglass-container {
          animation: flip-hourglass 3s ease-in-out infinite;
        }

        @keyframes flip-hourglass {
          0%, 40% {
            transform: rotate(0deg);
          }
          50%, 90% {
            transform: rotate(180deg);
          }
          100% {
            transform: rotate(180deg);
          }
        }

        .animate-sand-fall {
          animation: sand-fall 3s ease-in-out infinite;
        }

        @keyframes sand-fall {
          0% {
            opacity: 0.8;
            transform: scaleY(1);
          }
          40% {
            opacity: 0.3;
            transform: scaleY(0.2);
          }
          50%, 100% {
            opacity: 0;
            transform: scaleY(0);
          }
        }

        .animate-sand-fill {
          animation: sand-fill 3s ease-in-out infinite;
        }

        @keyframes sand-fill {
          0% {
            opacity: 0;
            transform: scaleY(0);
          }
          40% {
            opacity: 0.9;
            transform: scaleY(1);
          }
          50% {
            opacity: 0;
            transform: scaleY(0);
          }
          90%, 100% {
            opacity: 0.9;
            transform: scaleY(1);
          }
        }

        .animate-sand-drop {
          animation: sand-drop 1s ease-in infinite;
        }

        @keyframes sand-drop {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(10px);
          }
        }
      `}</style>
    </div>
  );
};

export default Loading;

