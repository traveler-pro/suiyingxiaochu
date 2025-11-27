import React, { useState } from 'react';
import ImageEditor from './components/ImageEditor';
import CompareView from './components/CompareView';
import { UploadIcon, LoaderIcon } from './components/Icons';
import { removeWatermark } from './services/geminiService';

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingText, setLoadingText] = useState("处理中...");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setOriginalImage(event.target.result as string);
          setProcessedImage(null); // Reset prev state
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async (maskBase64: string) => {
    if (!originalImage) return;

    setIsProcessing(true);
    setLoadingText("小刘正在卖力擦除中...");

    try {
      const result = await removeWatermark(originalImage, maskBase64);
      setProcessedImage(result);
    } catch (error) {
      console.error("Failed to process image:", error);
      alert("处理失败，请稍后重试或检查网络设置。");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (processedImage) {
      setOriginalImage(processedImage);
      setProcessedImage(null);
    }
  };

  const handleDownload = () => {
    if (processedImage) {
      const link = document.createElement('a');
      link.href = processedImage;
      link.download = 'removed_watermark.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCancel = () => {
    setProcessedImage(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="w-full mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">自修室去水印 <span className="text-blue-600">V1.0</span></h1>
          <p className="text-slate-500 text-sm mt-1">简单涂抹，智能消除，还你清爽画面</p>
        </div>
        {originalImage && (
          <label className="cursor-pointer text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100">
             <UploadIcon />
             <span>更换图片</span>
             <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full flex flex-col bg-white rounded-xl shadow-xl overflow-hidden min-h-[600px] border border-slate-100 relative">
        
        {/* State: No Image */}
        {!originalImage && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 border-2 border-dashed border-slate-300 m-4 rounded-xl hover:border-blue-400 hover:bg-slate-100 transition-all">
             <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
                <UploadIcon />
             </div>
             <h2 className="text-xl font-semibold text-slate-700 mb-2">上传需要处理的图片</h2>
             <p className="text-slate-500 mb-8 max-w-xs text-center">支持 JPG, PNG, WEBP 等常见格式。图片将上传至本地浏览器进行预览。</p>
             <label className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:shadow-blue-600/40 active:translate-y-0.5 transition-all cursor-pointer">
                选择图片
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
             </label>
          </div>
        )}

        {/* State: Editing */}
        {originalImage && !processedImage && (
          <ImageEditor 
            imageSrc={originalImage} 
            onGenerate={handleGenerate}
            isProcessing={isProcessing}
          />
        )}

        {/* State: Comparison */}
        {originalImage && processedImage && (
          <CompareView 
            originalImage={originalImage} 
            processedImage={processedImage}
            onApply={handleApply}
            onDownload={handleDownload}
            onCancel={handleCancel}
          />
        )}

        {/* Loading Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center border border-slate-100">
              <div className="text-blue-600 w-12 h-12 mb-4">
                 <LoaderIcon />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">{loadingText}</h3>
              <p className="text-slate-500 text-sm mt-2">AI 正在分析并重绘图像细节...</p>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 text-slate-400 text-xs">
        &copy; 2024 自修室去水印 Powered by Gemini 2.5 Flash Image
      </footer>
    </div>
  );
};

export default App;