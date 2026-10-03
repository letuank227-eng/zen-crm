'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDateFilter } from '@/context/DateFilterContext';
import { DatePeriod } from '@/lib/dateUtils';
import {
  Calendar,
  ChevronDown,
  CalendarDays,
  RotateCcw,
  Check,
  Search,
  SlidersHorizontal,
  X,
  Clock,
} from 'lucide-react';

interface DatePeriodFilterProps {
  compact?: boolean;
  className?: string;
}

export default function DatePeriodFilter({ compact = false, className = '' }: DatePeriodFilterProps) {
  const {
    period,
    dateFrom,
    dateTo,
    label,
    formattedRange,
    setPeriod,
    setCustomRange,
    resetFilter,
  } = useDateFilter();

  const [showDropdown, setShowDropdown] = useState(false);
  const [tempFrom, setTempFrom] = useState(dateFrom || '');
  const [tempTo, setTempTo] = useState(dateTo || '');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync temp dates when context dates change
  useEffect(() => {
    setTempFrom(dateFrom || '');
    setTempTo(dateTo || '');
  }, [dateFrom, dateTo]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const periods: { id: DatePeriod; label: string; desc: string }[] = [
    { id: 'ALL', label: 'Tất cả thời gian', desc: 'Toàn bộ dữ liệu' },
    { id: 'DAY', label: 'Hôm nay (Ngày)', desc: 'Dữ liệu trong ngày hôm nay' },
    { id: 'WEEK', label: 'Tuần này', desc: 'Từ Thứ 2 đến Chủ nhật' },
    { id: 'MONTH', label: 'Tháng này', desc: 'Trong tháng hiện tại' },
    { id: 'QUARTER', label: 'Quý này', desc: '3 tháng trong quý hiện tại' },
    { id: 'YEAR', label: 'Năm nay', desc: 'Cả năm dương lịch' },
  ];

  const currentPeriodObj = periods.find(p => p.id === period);
  const currentDisplayLabel =
    period === 'CUSTOM'
      ? 'Tùy chọn ngày'
      : currentPeriodObj?.label || 'Chọn kỳ thời gian';

  const handleSelectPeriod = (pId: DatePeriod) => {
    setPeriod(pId);
    setShowDropdown(false);
  };

  const handleSearchDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempFrom || tempTo) {
      setCustomRange(tempFrom, tempTo);
    }
  };

  const handleClearCustomDates = () => {
    setTempFrom('');
    setTempTo('');
    resetFilter();
  };

  // Compact mode for Header
  if (compact) {
    return (
      <div className={`relative inline-flex items-center ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-semibold border border-slate-200 shadow-2xs transition-colors"
        >
          <Calendar className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span>{currentDisplayLabel}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showDropdown && (
          <div className="absolute left-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 text-xs">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
              Chọn mốc thời gian xem
            </div>
            {periods.map(p => {
              const isActive = period === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPeriod(p.id)}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{p.label}</span>
                  </div>
                  {isActive && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Full unified bar: 1. Dropdown Sổ Xuống Kỳ + 2. Tìm Kiếm Khoảng Ngày + 3. Badge & Bỏ Lọc
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-3 sm:p-3.5 shadow-2xs space-y-3 ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* LEFT: 1. DROPDOWN SỔ XUỐNG KỲ THỜI GIAN & 2. TÌM KIẾM NGÀY */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 flex-1">
          {/* [PHẦN 1]: DROPDOWN SỔ XUỐNG (NGÀY, THÁNG, QUÝ, NĂM, TẤT CẢ) */}
          <div className="relative flex-shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full sm:w-auto flex items-center justify-between gap-2.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-800 transition-colors shadow-2xs focus:ring-2 focus:ring-emerald-500/20"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{currentDisplayLabel}</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  showDropdown ? 'rotate-180 text-emerald-600' : ''
                }`}
              />
            </button>

            {/* SỔ XUỐNG CÁC MỐC THỜI GIAN KHI CLICK */}
            {showDropdown && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 text-xs">
                <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                  <span>Mốc thời gian định sẵn</span>
                  <SlidersHorizontal className="w-3 h-3 text-slate-400" />
                </div>

                <div className="p-1 space-y-0.5">
                  {periods.map(p => {
                    const isActive = period === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPeriod(p.id)}
                        className={`w-full px-3 py-2 rounded-xl text-left flex items-center justify-between transition-colors ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/70 shadow-2xs'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <div>
                          <div className="leading-tight">{p.label}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{p.desc}</div>
                        </div>
                        {isActive && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* [PHẦN 2]: MỤC TÌM KIẾM NGÀY (TỪ NGÀY -> ĐẾN NGÀY) */}
          <form
            onSubmit={handleSearchDateSubmit}
            className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-slate-50/80 p-1.5 rounded-xl border border-slate-200/80 flex-1 max-w-xl text-xs"
          >
            <div className="flex items-center gap-1.5 flex-1 min-w-[130px]">
              <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap pl-1">Từ:</span>
              <input
                type="date"
                value={tempFrom}
                onChange={e => setTempFrom(e.target.value)}
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                title="Chọn ngày bắt đầu tìm kiếm"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-1 min-w-[130px]">
              <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">Đến:</span>
              <input
                type="date"
                value={tempTo}
                onChange={e => setTempTo(e.target.value)}
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                title="Chọn ngày kết thúc tìm kiếm"
              />
            </div>

            <button
              type="submit"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-1 shadow-2xs whitespace-nowrap flex-shrink-0"
              title="Tìm kiếm dữ liệu theo khoảng ngày đã chọn"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Tìm ngày</span>
            </button>
          </form>
        </div>

        {/* RIGHT: HUY HIỆU ĐANG XEM & NÚT BỎ LỌC */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-1 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50/80 text-emerald-800 border border-emerald-200 shadow-2xs">
            <CalendarDays className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span className="truncate max-w-[200px] sm:max-w-xs">{label}</span>
            {period !== 'ALL' && (
              <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold ml-1">
                {formattedRange}
              </span>
            )}
          </div>

          {/* NÚT BỎ LỌC NẾU ĐANG LỌC */}
          {period !== 'ALL' && (
            <button
              type="button"
              onClick={handleClearCustomDates}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50"
              title="Đặt lại về toàn bộ thời gian"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Bỏ lọc</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
