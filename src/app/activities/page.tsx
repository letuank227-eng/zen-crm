'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  CalendarCheck,
  Plus,
  Clock,
  Phone,
  Users,
  FileText,
  Video,
  Mail,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Search,
  Check,
  X,
} from 'lucide-react';
import { Task, TaskType, TaskStatus, Lead, Deal } from '@/types/crm';
import { formatDateTime, formatDate } from '@/lib/utils';
import { useDateFilter } from '@/context/DateFilterContext';
import DatePeriodFilter from '@/components/common/DatePeriodFilter';

function ActivitiesContent() {
  const searchParams = useSearchParams();
  const { fetchWithAuth, currentUser } = useAuth();
  const { dateFrom, dateTo } = useDateFilter();

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [saleFilter, setSaleFilter] = useState('ALL');

  // New Task Modal
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('action') === 'create_task');
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('CALL');
  const [relatedLeadId, setRelatedLeadId] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 16));
  const [assignedSaleId, setAssignedSaleId] = useState(currentUser?.id || '');
  const [notes, setNotes] = useState('');

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      if (saleFilter !== 'ALL') params.set('saleId', saleFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const [actRes, leadsRes, dealsRes] = await Promise.all([
        fetchWithAuth(`/api/activities?${params.toString()}`),
        fetchWithAuth('/api/leads'),
        fetchWithAuth('/api/deals'),
      ]);

      if (actRes.ok) {
        const data = await actRes.json();
        setTasks(data.tasks || []);
        setSales(data.sales || []);
      }
      if (leadsRes.ok) {
        const lData = await leadsRes.json();
        setLeads(lData.leads || []);
      }
      if (dealsRes.ok) {
        const dData = await dealsRes.json();
        setDeals(dData.deals || []);
      }
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchActivities();
    }
  }, [currentUser, statusFilter, typeFilter, saleFilter, dateFrom, dateTo]);

  const handleToggleComplete = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await fetchWithAuth('/api/activities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, status: newStatus }),
      });
      fetchActivities();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    try {
      const res = await fetchWithAuth('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          type: taskType,
          leadId: relatedLeadId || undefined,
          dueDate: new Date(dueDate).toISOString(),
          assignedSaleId: assignedSaleId || currentUser?.id,
          notes: notes.trim(),
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setTitle('');
        setNotes('');
        fetchActivities();
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const getTypeIcon = (type: TaskType) => {
    switch (type) {
      case 'CALL': return <Phone className="w-3.5 h-3.5 text-blue-600" />;
      case 'MEETING': return <Users className="w-3.5 h-3.5 text-purple-600" />;
      case 'SEND_QUOTE': return <FileText className="w-3.5 h-3.5 text-emerald-600" />;
      case 'DEMO': return <Video className="w-3.5 h-3.5 text-amber-600" />;
      case 'EMAIL': return <Mail className="w-3.5 h-3.5 text-indigo-600" />;
      default: return <Clock className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const getTypeLabel = (type: TaskType) => {
    switch (type) {
      case 'CALL': return 'Gọi điện thoại';
      case 'MEETING': return 'Gặp trực tiếp';
      case 'SEND_QUOTE': return 'Gửi báo giá';
      case 'DEMO': return 'Demo giải pháp';
      case 'EMAIL': return 'Gửi Email';
      default: return 'Khác';
    }
  };

  // Calendar days generator (current month)
  const currentMonthDate = new Date();
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 flex-shrink-0" />
            <span>Quản Lý Hoạt Động &amp; Lịch Hẹn</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Switch View Mode */}
          <div className="flex rounded-xl bg-white p-1 border border-slate-200 shadow-xs text-xs">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Danh sách Task
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === 'calendar'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lịch (Calendar)
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm Task</span>
          </button>
        </div>
      </div>

      {/* Bộ lọc thời gian: Ngày, Tuần, Tháng, Quý, Năm */}
      <DatePeriodFilter />

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {['ALL', 'PENDING', 'OVERDUE', 'COMPLETED'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {st === 'ALL' ? 'Tất cả' : st === 'PENDING' ? 'Chưa làm' : st === 'OVERDUE' ? 'Quá hạn' : 'Đã xong'}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium text-slate-700"
          >
            <option value="ALL">-- Tất cả loại việc --</option>
            <option value="CALL">Cuộc gọi</option>
            <option value="MEETING">Gặp mặt</option>
            <option value="SEND_QUOTE">Gửi báo giá</option>
            <option value="DEMO">Demo giải pháp</option>
            <option value="EMAIL">Gửi Email</option>
          </select>

          {/* Sale Filter */}
          <select
            value={saleFilter}
            onChange={e => setSaleFilter(e.target.value)}
            disabled={currentUser?.role === 'SALE' || currentUser?.role === 'STAFF'}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium text-slate-700 disabled:opacity-60"
          >
            <option value="ALL">-- Tất cả Sale --</option>
            {sales.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="text-[11px] text-slate-500">
          Tổng số: <strong>{tasks.length}</strong> công việc
        </div>
      </div>

      {/* VIEW 1: LIST MODE */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100">
          {tasks.map(task => {
            const isDone = task.status === 'COMPLETED';
            const isOverdue = task.status === 'OVERDUE';

            return (
              <div
                key={task.id}
                className={`p-4 flex items-start justify-between gap-4 transition-colors hover:bg-slate-50 ${
                  isDone ? 'opacity-60 bg-slate-50/50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Complete checkbox */}
                  <button
                    onClick={() => handleToggleComplete(task)}
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      isDone
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 hover:border-emerald-600 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {getTypeIcon(task.type)}
                        <span>{getTypeLabel(task.type)}</span>
                      </span>
                      <span className={`font-bold text-xs ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {task.title}
                      </span>
                      {isOverdue && (
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                          Quá hạn
                        </span>
                      )}
                    </div>

                    {task.customerName && (
                      <div className="text-[11px] text-slate-500">
                        Khách hàng: <strong className="text-slate-700">{task.customerName}</strong>
                      </div>
                    )}

                    {task.notes && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {task.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right space-y-1 flex-shrink-0 text-xs">
                  <div className={`font-semibold flex items-center justify-end gap-1 ${
                    isOverdue ? 'text-rose-600' : 'text-slate-600'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDateTime(task.dueDate)}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Phụ trách: {task.assignedSaleName}
                  </div>
                </div>
              </div>
            );
          })}

          {tasks.length === 0 && !isLoading && (
            <div className="py-16 text-center text-slate-400 text-xs">
              <CalendarCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <div>Không có công việc nào trong danh sách.</div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3.5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <span className="font-bold text-sm text-slate-800">
              Tháng {month + 1} / {year}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500">
              Lịch biểu trực quan các cuộc hẹn &amp; tương tác (cuộn ngang nếu xem trên điện thoại)
            </span>
          </div>

          <div className="overflow-x-auto -mx-1 sm:mx-0 pb-1">
            <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden text-xs min-w-[560px]">
              {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
                <div key={d} className="bg-slate-100 p-2 text-center font-bold text-slate-600">
                  {d}
                </div>
              ))}

            {/* Empty boxes for days before 1st */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-slate-50 min-h-[90px] p-1.5" />
            ))}

            {/* Month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayTasks = tasks.filter(t => t.dueDate.startsWith(dateStr));
              const isToday = dayNum === new Date().getDate() && month === new Date().getMonth();

              return (
                <div
                  key={dayNum}
                  className={`bg-white min-h-[90px] p-1.5 transition-colors hover:bg-slate-50/80 ${
                    isToday ? 'ring-2 ring-emerald-500 ring-inset' : ''
                  }`}
                >
                  <div className="flex items-center justify-between pb-1">
                    <span className={`font-bold text-xs ${isToday ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {dayNum}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded font-semibold">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 max-h-16 overflow-y-auto">
                    {dayTasks.map(t => (
                      <div
                        key={t.id}
                        title={`${t.title} - ${t.assignedSaleName}`}
                        className={`p-1 rounded text-[10px] font-semibold truncate border ${
                          t.status === 'OVERDUE'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : t.status === 'COMPLETED'
                            ? 'bg-slate-100 text-slate-400 line-through border-slate-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {t.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-800">Lên Lịch Hẹn / Công Việc Mới</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Tiêu đề công việc *:</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="VD: Gọi điện chốt hợp đồng với anh Nam..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Hình thức:</label>
                  <select
                    value={taskType}
                    onChange={e => setTaskType(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  >
                    <option value="CALL">Gọi điện thoại</option>
                    <option value="MEETING">Gặp trực tiếp</option>
                    <option value="SEND_QUOTE">Gửi báo giá</option>
                    <option value="DEMO">Demo giải pháp</option>
                    <option value="EMAIL">Gửi Email</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Thời gian hẹn *:</label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Gắn với Khách hàng:</label>
                <select
                  value={relatedLeadId}
                  onChange={e => setRelatedLeadId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                >
                  <option value="">-- Không gắn khách hàng --</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.fullName} ({l.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Sale phụ trách:</label>
                <select
                  value={assignedSaleId}
                  onChange={e => setAssignedSaleId(e.target.value)}
                  disabled={currentUser?.role === 'SALE' || currentUser?.role === 'STAFF'}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none disabled:opacity-60"
                >
                  {sales.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Ghi chú chi tiết:</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ghi chú nội dung cần chuẩn bị trước cuộc hẹn..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm"
                >
                  Lưu lịch hẹn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ActivitiesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Đang tải lịch hẹn & task...</div>}>
      <ActivitiesContent />
    </Suspense>
  );
}
