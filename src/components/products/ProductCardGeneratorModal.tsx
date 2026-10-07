'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Sparkles,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  ShieldCheck,
  Sliders,
  DollarSign,
  FileText,
  Palette,
} from 'lucide-react';
import { Product } from '@/types/crm';
import { formatCurrency } from '@/lib/utils';

interface ProductCardGeneratorModalProps {
  product: Product;
  onClose: () => void;
  onSaveProduct?: (updatedProduct: Product) => void;
}

export default function ProductCardGeneratorModal({
  product,
  onClose,
  onSaveProduct,
}: ProductCardGeneratorModalProps) {
  // 1. Ảnh sản phẩm (Upload từ máy tính hoặc dùng ảnh có sẵn)
  const [imageSrc, setImageSrc] = useState(
    product.imageUrl || 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=600&auto=format&fit=crop&q=80'
  );

  // 2. Tên sản phẩm
  const [productName, setProductName] = useState(product.name);

  // 3. Giá bán (1 mức giá duy nhất)
  const [price, setPrice] = useState<number>(product.price ?? product.retailPrice ?? 85000);
  const [unit, setUnit] = useState(product.unit || 'Chậu');

  // 4. Nội dung ghi chú
  const [notes, setNotes] = useState(
    product.notes ||
      product.description ||
      '• Ánh sáng: Yếu - Vừa (0.5W/L)\n• CO2: Không bắt buộc, có CO2 lá căng mướt\n• Bảo hành 1 đổi 1 trong 48h nếu dập úng khi ship tỉnh xa'
  );

  // Brand header & hotline
  const [brandText, setBrandText] = useState('ZEN AQUATIC • CÂY THỦY SINH');
  const [hotline, setHotline] = useState('Hotline/Zalo: 0988.123.456');

  // Theme styling
  const [theme, setTheme] = useState<'zen-emerald' | 'studio-dark' | 'clean-white' | 'warm-biotope'>('zen-emerald');

  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle local file upload (FileReader -> Base64)
  const processUploadedFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = event => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processUploadedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processUploadedFile(file);
  };

  // Draw Card on Canvas for high-res PNG export (NO SKU, NO CATEGORY, SINGLE PRICE)
  const drawCardToCanvas = async (): Promise<HTMLCanvasElement> => {
    const width = 800;
    const height = 1050;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');

    // 1. Background
    if (theme === 'zen-emerald') {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#064e3b'); // emerald 900
      grad.addColorStop(0.3, '#022c22'); // emerald 950
      grad.addColorStop(1, '#0f172a'); // slate 900
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (theme === 'studio-dark') {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#1e293b'); // slate 800
      grad.addColorStop(1, '#090d16');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (theme === 'clean-white') {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);
    } else {
      // warm-biotope
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#451a03'); // amber 950
      grad.addColorStop(1, '#1c1917'); // stone 900
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    const isLight = theme === 'clean-white';
    const textColor = isLight ? '#0f172a' : '#ffffff';
    const subTextColor = isLight ? '#475569' : '#94a3b8';
    const cardBgColor = isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.05)';
    const cardBorderColor = isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)';
    const priceColor = isLight ? '#059669' : '#34d399';

    // Header Brand Bar
    ctx.fillStyle = isLight ? '#059669' : '#10b981';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(brandText, width / 2, 48);

    // Inner Card Container with rounded corners
    const cardX = 40;
    const cardY = 75;
    const cardW = width - 80;
    const cardH = height - 140;
    const radius = 24;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    ctx.fillStyle = cardBgColor;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = cardBorderColor;
    ctx.stroke();
    ctx.restore();

    // 2. [ BỐ CỤC 1: ẢNH SẢN PHẨM - KHÔNG CÓ SKU, KHÔNG CÓ DANH MỤC ]
    const imgX = cardX + 24;
    const imgY = cardY + 24;
    const imgW = cardW - 48;
    const imgH = 440;
    const imgRadius = 18;

    // Load and draw image
    await new Promise<void>(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(imgX, imgY, imgW, imgH, imgRadius);
        ctx.clip();

        // Aspect cover
        const hRatio = imgW / img.width;
        const vRatio = imgH / img.height;
        const ratio = Math.max(hRatio, vRatio);
        const centerShiftX = (imgW - img.width * ratio) / 2;
        const centerShiftY = (imgH - img.height * ratio) / 2;

        ctx.drawImage(
          img,
          0,
          0,
          img.width,
          img.height,
          imgX + centerShiftX,
          imgY + centerShiftY,
          img.width * ratio,
          img.height * ratio
        );
        ctx.restore();

        // Border around image
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(imgX, imgY, imgW, imgH, imgRadius);
        ctx.strokeStyle = isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        resolve();
      };
      img.onerror = () => {
        // Fallback placeholder
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(imgX, imgY, imgW, imgH, imgRadius);
        ctx.fillStyle = isLight ? '#e2e8f0' : '#1e293b';
        ctx.fill();
        ctx.fillStyle = subTextColor;
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('[ Ảnh Cây Thủy Sinh ]', imgX + imgW / 2, imgY + imgH / 2);
        ctx.restore();
        resolve();
      };
      img.src = imageSrc;
    });

    // 3. [ BỐ CỤC 2: TÊN SẢN PHẨM ]
    let currentY = imgY + imgH + 45;
    ctx.textAlign = 'left';
    ctx.fillStyle = textColor;
    ctx.font = 'bold 32px sans-serif';

    // Wrap product name if too long
    const maxTextWidth = cardW - 50;
    const words = productName.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxTextWidth && n > 0) {
        ctx.fillText(line, cardX + 26, currentY);
        line = words[n] + ' ';
        currentY += 40;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, cardX + 26, currentY);

    // 4. [ BỐ CỤC 3: GIÁ BÁN - 1 MỨC GIÁ DUY NHẤT ]
    currentY += 45;

    // Price container pill
    ctx.save();
    const pricePillW = 320;
    const pricePillH = 52;
    ctx.beginPath();
    ctx.roundRect(cardX + 26, currentY - 36, pricePillW, pricePillH, 14);
    ctx.fillStyle = isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.18)';
    ctx.fill();
    ctx.strokeStyle = isLight ? '#a7f3d0' : 'rgba(52, 211, 153, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label: Giá bán
    ctx.fillStyle = isLight ? '#047857' : '#6ee7b7';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Giá bán:', cardX + 42, currentY - 4);

    // Price formatted
    ctx.fillStyle = priceColor;
    ctx.font = '900 28px sans-serif';
    const priceText = `${formatCurrency(price)}`;
    ctx.fillText(priceText, cardX + 120, currentY - 2);

    // Unit
    if (unit) {
      ctx.fillStyle = subTextColor;
      ctx.font = '16px sans-serif';
      ctx.fillText(`/${unit}`, cardX + 126 + ctx.measureText(priceText).width, currentY - 4);
    }
    ctx.restore();

    // 5. [ BỐ CỤC 4: NỘI DUNG GHI CHÚ ]
    currentY += 55;

    // Header for notes
    ctx.fillStyle = isLight ? '#64748b' : '#94a3b8';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('Nội dung ghi chú:', cardX + 28, currentY);

    currentY += 26;
    // Multi-line notes
    ctx.fillStyle = isLight ? '#334155' : '#cbd5e1';
    ctx.font = '17px sans-serif';
    const noteLines = notes.split('\n');
    for (const noteLine of noteLines) {
      if (currentY > cardY + cardH - 30) break;
      ctx.fillText(noteLine, cardX + 28, currentY);
      currentY += 28;
    }

    // Bottom Footer
    ctx.fillStyle = isLight ? '#64748b' : '#64748b';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(hotline, width / 2, height - 26);

    return canvas;
  };

  // Download PNG file
  const handleDownloadImage = async () => {
    try {
      setIsExporting(true);
      const canvas = await drawCardToCanvas();
      const dataUrl = canvas.toDataURL('image/png');

      const a = document.createElement('a');
      const safeName = productName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      a.href = dataUrl;
      a.download = `san_pham_${safeName || 'zen_crm'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to export image:', err);
      alert('Có lỗi khi tạo ảnh sản phẩm. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  };

  // Copy Image to Clipboard
  const handleCopyImage = async () => {
    try {
      setIsExporting(true);
      const canvas = await drawCardToCanvas();
      canvas.toBlob(async blob => {
        if (!blob) return;
        try {
          // @ts-ignore
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        } catch (clipErr) {
          handleDownloadImage();
        }
      });
    } catch (err) {
      console.error('Copy failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Save changes back to CRM Product
  const handleSaveToCrm = () => {
    if (onSaveProduct) {
      onSaveProduct({
        ...product,
        name: productName,
        price,
        retailPrice: price,
        wholesalePrice: price,
        vipPrice: price,
        unit,
        imageUrl: imageSrc,
        notes,
      });
    }
  };

  return (
    <div 
      className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-6 text-xs text-slate-200 animate-in zoom-in-95 my-auto max-h-[95vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 flex-shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 flex-wrap">
                <span>Tạo Ảnh Thẻ Sản Phẩm</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Bố Cục 4 Phần
                </span>
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                Bố cục chuẩn: <strong>1. Ảnh → 2. Tên → 3. Giá bán → 4. Ghi chú</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Left is Live Preview, Right is Customizer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: LIVE PREVIEW CARD (5 COLS) */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                Xem Trước Thẻ Ảnh:
              </span>
              <span className="text-[10px] text-slate-500">Độ phân giải: 800 x 1050 px (HD)</span>
            </div>

            {/* PREVIEW CONTAINER: 1. ẢNH -> 2. TÊN -> 3. GIÁ BÁN -> 4. GHI CHÚ */}
            <div
              className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl transition-all duration-300 space-y-4 ${
                theme === 'zen-emerald'
                  ? 'bg-gradient-to-b from-emerald-950/90 via-emerald-950/60 to-slate-950 border-emerald-800/50 text-white'
                  : theme === 'studio-dark'
                  ? 'bg-gradient-to-b from-slate-800 via-slate-900 to-black border-slate-700 text-white'
                  : theme === 'clean-white'
                  ? 'bg-white border-slate-200 text-slate-900 shadow-lg'
                  : 'bg-gradient-to-b from-amber-950/90 via-stone-900 to-black border-amber-900/50 text-white'
              }`}
            >
              {/* Brand Top Bar */}
              <div
                className={`text-center font-bold tracking-wider text-[11px] uppercase pb-1 border-b ${
                  theme === 'clean-white'
                    ? 'text-emerald-700 border-slate-100'
                    : 'text-emerald-400 border-white/10'
                }`}
              >
                {brandText}
              </div>

              {/* [ 1. ẢNH SẢN PHẨM - UPLOAD TỪ MÁY TÍNH ] */}
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-950/40 border border-white/10 shadow-inner group">
                <img
                  src={imageSrc}
                  alt={productName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={e => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              {/* [ 2. TÊN SẢN PHẨM ] */}
              <div>
                <h3
                  className={`text-lg font-extrabold leading-snug ${
                    theme === 'clean-white' ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  {productName}
                </h3>
              </div>

              {/* [ 3. GIÁ BÁN - 1 GIÁ DUY NHẤT ] */}
              <div
                className={`p-3 rounded-2xl border flex items-center justify-between ${
                  theme === 'clean-white'
                    ? 'bg-emerald-50 border-emerald-200 text-slate-800'
                    : 'bg-emerald-950/40 border-emerald-800/40 text-white'
                }`}
              >
                <div>
                  <div
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      theme === 'clean-white' ? 'text-emerald-700' : 'text-emerald-400'
                    }`}
                  >
                    Giá bán:
                  </div>
                  <div className="text-xl font-black text-emerald-500 leading-tight">
                    {formatCurrency(price)}
                  </div>
                </div>
                {unit && (
                  <div className="text-right">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${
                        theme === 'clean-white'
                          ? 'bg-white text-slate-600 border border-slate-200'
                          : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      ĐVT: <strong>{unit}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* [ 4. NỘI DUNG GHI CHÚ ] */}
              <div
                className={`p-3 rounded-2xl border space-y-1.5 ${
                  theme === 'clean-white'
                    ? 'bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-white/5 border-white/10 text-slate-300'
                }`}
              >
                <div
                  className={`font-bold text-[10px] uppercase tracking-wider ${
                    theme === 'clean-white' ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Nội dung ghi chú:
                </div>
                <p className="text-[11px] whitespace-pre-line leading-relaxed">{notes}</p>
              </div>

              {/* Hotline footer */}
              <div
                className={`text-center font-medium text-[10px] pt-1 ${
                  theme === 'clean-white' ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {hotline}
              </div>
            </div>

            {/* Quick Export Actions below card */}
            <div className="w-full max-w-sm mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={handleDownloadImage}
                disabled={isExporting}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>{downloadSuccess ? 'Đã Tải Xong!' : 'Tải Ảnh PNG (HD)'}</span>
              </button>

              <button
                onClick={handleCopyImage}
                disabled={isExporting}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Đã Copy Ảnh!' : 'Copy Ảnh (Zalo)'}</span>
              </button>
            </div>
          </div>

          {/* RIGHT: CUSTOMIZER PANEL (7 COLS) */}
          <div className="lg:col-span-6 space-y-4 bg-slate-950/60 p-5 rounded-3xl border border-slate-800">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Chỉnh Sửa Thông Tin Thẻ Ảnh</span>
            </h3>

            {/* Theme Selector */}
            <div>
              <label className="font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-emerald-400" />
                <span>Màu Nền Thẻ:</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'zen-emerald', label: 'Zen Xanh Mát', bg: 'bg-emerald-900 border-emerald-500' },
                  { id: 'studio-dark', label: 'Studio Đen', bg: 'bg-slate-900 border-slate-600' },
                  { id: 'clean-white', label: 'Trắng Tinh Tế', bg: 'bg-slate-100 text-slate-800 border-slate-300' },
                  { id: 'warm-biotope', label: 'Biotope Ấm', bg: 'bg-amber-950 border-amber-600' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id as any)}
                    className={`py-2 px-2 rounded-xl text-[10px] font-bold border transition-all text-center ${t.bg} ${
                      theme === t.id ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* [ 1. ẢNH SẢN PHẨM - UPLOAD FILE TRỰC TIẾP TỪ THIẾT BỊ ] */}
            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2.5">
              <label className="font-bold text-slate-200 block text-[11px] flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] flex items-center justify-center font-bold">1</span>
                <span>Ảnh Sản Phẩm (Tải từ máy tính):</span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Upload Drop Zone / Click to upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-emerald-400 bg-emerald-950/30'
                    : 'border-slate-700 bg-slate-950/60 hover:border-emerald-500 hover:bg-slate-950'
                }`}
              >
                <Upload className="w-6 h-6 text-emerald-400 mb-1.5" />
                <div className="font-semibold text-white text-xs">
                  Bấm để chọn ảnh hoặc kéo thả ảnh vào đây
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Hỗ trợ định dạng JPG, PNG, WEBP từ điện thoại hoặc máy tính
                </div>
              </div>

              {/* URL fallback option */}
              <div className="flex gap-2 items-center pt-1">
                <input
                  type="text"
                  value={imageSrc.startsWith('data:') ? 'Ảnh đã tải từ máy tính' : imageSrc}
                  onChange={e => {
                    if (!e.target.value.startsWith('Ảnh đã')) {
                      setImageSrc(e.target.value);
                    }
                  }}
                  placeholder="Hoặc dán đường dẫn ảnh (URL)..."
                  className="flex-1 p-1.5 bg-slate-950 border border-slate-700 rounded-lg outline-none text-slate-300 text-[11px]"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg font-semibold text-[11px] whitespace-nowrap"
                >
                  Đổi ảnh khác
                </button>
              </div>
            </div>

            {/* [ 2. TÊN SẢN PHẨM ] */}
            <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
              <label className="font-bold text-slate-200 block text-[11px] flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] flex items-center justify-center font-bold">2</span>
                Tên Sản Phẩm:
              </label>
              <input
                type="text"
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder="Nhập tên cây / sản phẩm..."
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl outline-none focus:border-emerald-500 text-slate-100 font-semibold text-xs"
              />
            </div>

            {/* [ 3. GIÁ BÁN - 1 MỨC GIÁ DUY NHẤT ] */}
            <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2.5">
              <label className="font-bold text-slate-200 block text-[11px] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] flex items-center justify-center font-bold">3</span>
                  Giá Bán (VND):
                </span>
                <span className="text-emerald-400 font-bold text-sm">
                  {formatCurrency(price)}
                </span>
              </label>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <input
                    type="number"
                    step="1000"
                    value={price}
                    onChange={e => setPrice(Number(e.target.value))}
                    placeholder="Nhập giá bán..."
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl outline-none focus:border-emerald-500 text-emerald-400 font-extrabold text-sm"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    placeholder="ĐVT (Chậu, Bụi...)"
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl outline-none text-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* [ 4. NỘI DUNG GHI CHÚ ] */}
            <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
              <label className="font-bold text-slate-200 block text-[11px] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] flex items-center justify-center font-bold">4</span>
                  Nội Dung Ghi Chú:
                </span>
                <span className="text-slate-400 text-[10px]">Xuống dòng để tạo ý mới</span>
              </label>

              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Ghi chú về ánh sáng, CO2, thông số hồ, chính sách bảo hành dập úng..."
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl outline-none focus:border-emerald-500 text-slate-200 text-xs leading-relaxed"
              />
            </div>

            {/* Footer info (Brand & Hotline) */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Tiêu đề thương hiệu (Header):</label>
                <input
                  type="text"
                  value={brandText}
                  onChange={e => setBrandText(e.target.value)}
                  className="w-full p-1.5 bg-slate-950 border border-slate-700 rounded-lg outline-none text-slate-300 text-[11px]"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Hotline / Zalo (Chân thẻ):</label>
                <input
                  type="text"
                  value={hotline}
                  onChange={e => setHotline(e.target.value)}
                  className="w-full p-1.5 bg-slate-950 border border-slate-700 rounded-lg outline-none text-slate-300 text-[11px]"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <button
                type="button"
                onClick={handleSaveToCrm}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold transition-colors flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Lưu Vào Sản Phẩm CRM</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
                >
                  <Download className="w-4 h-4" />
                  <span>Xuất Ảnh PNG</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
