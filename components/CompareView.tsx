import React, { useState, useRef, useEffect } from 'react';
import { DownloadIcon, CheckIcon, RefreshIcon } from './Icons';

interface CompareViewProps {
  originalImage: string;
  processedImage: string;
  onApply: () => void;
  onDownload: () => void;
  onCancel: () => void;
}

const CompareView: React.FC<CompareViewProps> = ({ originalImage, processedImage, onApply, onDownload, onCancel }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = () => setIsResizing(true);
  const handleTouchStart = () => setIsResizing(true);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isResizing) return;
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isResizing) return;
    handleMove(e.touches[0].clientX);
  };

  const handleStop = () => setIsResizing(false);

  useEffect(() => {
    document.addEventListener('mouseup', handleStop);
    document.addEventListener('touchend', handleStop);
    return () => {
      document.removeEventListener('mouseup', handleStop);
      document.removeEventListener('touchend', handleStop);
    };
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-slate-100 rounded-lg overflow-hidden shadow-sm border border-slate-200">
      
      {/* Compare Area */}
      <div 
        className="flex-1 relative bg-slate-800 flex items-center justify-center overflow-hidden select-none"
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
      >
        <div 
          ref={containerRef}
          className="relative max-w-full max-h-full aspect-auto"
          style={{ height: '100%', width: '100%' }}
        >
          {/* Background Image (After - Full) */}
          <img 
            src={processedImage} 
            alt="Processed" 
            className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none" 
          />

          {/* Foreground Image (Before - Clipped) */}
          <div 
            className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          >
            <img 
              src={originalImage} 
              alt="Original" 
              className="absolute top-0 left-0 w-full h-full object-contain" 
            />
            {/* Labels */}
            <div className="absolute top-4 left-4 bg-black/60 text-white px-2 py-1 text-xs rounded">原图</div>
          </div>
          
           <div className="absolute top-4 right-4 bg-blue-600/80 text-white px-2 py-1 text-xs rounded pointer-events-none">去水印后</div>

          {/* Slider Handle */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10"
            style={{ left: `${sliderPosition}%` }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-slate-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18-6-6 6-6"/>
                <path d="m15 6 6 6-6 6"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-t border-slate-200 p-4 shrink-0">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-500 font-medium">
             拖拽滑块对比效果
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <RefreshIcon />
              <span>重新涂抹</span>
            </button>
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
            >
              <DownloadIcon />
              <span>下载图片</span>
            </button>
            <button
              onClick={onApply}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg transition-all"
            >
              <CheckIcon />
              <span>应用当前效果</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompareView;