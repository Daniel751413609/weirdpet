"use client";

import { useState, useRef, useCallback } from "react";

const compressImage = (file: File, maxPx = 1024): Promise<File> =>
  new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const img = document.createElement("img");
    img.onload = () => {
      let { width, height } = img;
      if (Math.max(width, height) > maxPx) {
        if (width > height) {
          height = Math.round((height * maxPx) / width);
          width = maxPx;
        } else {
          width = Math.round((width * maxPx) / height);
          height = maxPx;
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name, { type: "image/jpeg" }) : file),
        "image/jpeg",
        0.88
      );
    };
    img.src = URL.createObjectURL(file);
  });

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("只接受圖片檔案！");
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setGeneratedUrl(null);
    setError(null);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleGenerate = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setError(null);
    try {
      const compressed = await compressImage(selectedFile);
      const formData = new FormData();
      formData.append("image", compressed);
      const res = await fetch("/api/generate", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失敗");
      setGeneratedUrl(data.imageUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "AI 召喚失敗，請再試一次");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedUrl) return;
    const res = await fetch(generatedUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weirdpet-${Date.now()}.webp`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setGeneratedUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <main className="min-h-screen bg-[#080810] text-white flex flex-col items-center px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
          怪獸工廠
        </h1>
        <p className="text-gray-400 text-base">
          上傳任何圖片，AI 幫你召喚一隻專屬的奇怪寵物 🐣
        </p>
      </div>

      <div className="w-full max-w-md space-y-5">
        {!generatedUrl && (
          <div
            className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
              isDragging ? "border-purple-400 bg-purple-900/20"
              : previewUrl ? "border-purple-600/40 bg-purple-950/20"
              : "border-gray-700 hover:border-purple-500 hover:bg-purple-950/20"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {previewUrl ? (
              <div className="space-y-2">
                <img src={previewUrl} alt="選擇的圖片" className="w-full max-h-60 object-contain rounded-xl mx-auto" />
                <p className="text-xs text-gray-600">點擊或拖曳可換圖</p>
              </div>
            ) : (
              <div className="space-y-3 py-6">
                <div className="text-5xl">📸</div>
                <div>
                  <p className="font-semibold text-gray-200">點擊上傳照片</p>
                  <p className="text-sm text-gray-500 mt-1">或把圖片拖曳進來</p>
                </div>
                <p className="text-xs text-gray-700">支援 JPG、PNG、HEIC 等格式</p>
              </div>
            )}
          </div>
        )}

        {generatedUrl && (
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden border border-purple-500/30 shadow-lg shadow-purple-900/30">
              <img src={generatedUrl} alt="你的電子寵物" className="w-full object-contain" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleDownload} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-sm transition-colors">
                ⬇️ 存到裝置
              </button>
              <button onClick={handleReset} className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-700 hover:border-gray-500 hover:bg-white/5 font-semibold text-sm transition-colors">
                🔄 再召喚一次
              </button>
            </div>
          </div>
        )}

        {!generatedUrl && (
          <button
            onClick={handleGenerate}
            disabled={!selectedFile || isLoading}
            className={`w-full py-4 rounded-2xl font-black text-lg tracking-wide transition-all duration-200 ${
              selectedFile && !isLoading
                ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-900/50 active:scale-[0.98]"
                : "bg-gray-800 text-gray-600 cursor-not-allowed"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-3">
                <span className="inline-block animate-spin">✨</span>
                AI 正在召喚中… 約 20 秒
              </span>
            ) : (
              "🐉 召喚寵物！"
            )}
          </button>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-900/20 border border-red-700/40 text-red-300 text-sm text-center">
            ⚠️ {error}
          </div>
        )}

        {!previewUrl && !generatedUrl && (
          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            {[
              { emoji: "📱", label: "上傳任何照片" },
              { emoji: "🧬", label: "AI 幫你突變" },
              { emoji: "🐾", label: "專屬怪物誕生" },
            ].map((s) => (
              <div key={s.label} className="space-y-2">
                <div className="text-3xl">{s.emoji}</div>
                <p className="text-xs text-gray-600">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-14 text-xs text-gray-800">
        每次召喚消耗少量 AI 費用（約 0.05 元台幣）
      </p>
    </main>
  );
}
