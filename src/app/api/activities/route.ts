import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, getCurrentUser, filterTasksByRole, logAuditEvent } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { Task, TaskType, TaskStatus } from '@/types/crm';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = getCurrentUser(userId);
  const db = readDb();

  // Auto update overdue tasks
  const nowTime = Date.now();
  let modified = false;
  db.tasks.forEach(t => {
    if (t.status === 'PENDING' && new Date(t.dueDate).getTime() < nowTime) {
      t.status = 'OVERDUE';
      modified = true;
    }
  });
  if (modified) writeDb(db);

  let tasks = filterTasksByRole(db.tasks, user, db);

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const saleId = searchParams.get('saleId');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  if (status && status !== 'ALL') {
    tasks = tasks.filter(t => t.status === status);
  }
  if (type && type !== 'ALL') {
    tasks = tasks.filter(t => t.type === type);
  }
  if (saleId && saleId !== 'ALL') {
    tasks = tasks.filter(t => t.assignedSaleId === saleId);
  }
  if (dateFrom) {
    tasks = tasks.filter(t => new Date(t.dueDate) >= new Date(dateFrom));
  }
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    tasks = tasks.filter(t => new Date(t.dueDate) <= end);
  }

  // Sort by dueDate ascending
  tasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  let allowedSales = db.users.filter(u => u.role === 'SALE' && !u.isLocked);
  if (user.role === 'LEADER') {
    const leaderTeamId = user.teamId || db.teams.find(t => t.leaderId === user.id)?.id;
    allowedSales = allowedSales.filter(u => u.teamId === leaderTeamId || u.id === user.id);
  } else if (user.role === 'SALE') {
    allowedSales = allowedSales.filter(u => u.id === user.id);
  }

  return NextResponse.json({
    tasks,
    total: tasks.length,
    counts: {
      pending: tasks.filter(t => t.status === 'PENDING').length,
      overdue: tasks.filter(t => t.status === 'OVERDUE').length,
      completed: tasks.filter(t => t.status === 'COMPLETED').length,
    },
    sales: allowedSales,
  });
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = getCurrentUser(userId);
  const db = readDb();
  const body = await request.json();

  const {
    title,
    type = 'CALL',
    leadId,
    dealId,
    dueDate,
    assignedSaleId,
    notes,
  } = body;

  if (!title || !dueDate) {
    return NextResponse.json({ error: 'Tiêu đề và Thời gian hẹn là bắt buộc' }, { status: 400 });
  }

  let customerName = '';
  if (leadId) {
    const lead = db.leads.find(l => l.id === leadId);
    if (lead) customerName = lead.fullName;
  } else if (dealId) {
    const deal = db.deals.find(d => d.id === dealId);
    if (deal) customerName = deal.customerName;
  }

  let finalSaleId = assignedSaleId || user.id;
  let finalSaleName = user.name;
  if (assignedSaleId) {
    const sale = db.users.find(u => u.id === assignedSaleId);
    if (user.role === 'LEADER') {
      const leaderTeamId = user.teamId || db.teams.find(t => t.leaderId === user.id)?.id;
      if (sale && sale.teamId !== leaderTeamId && sale.id !== user.id) {
        return NextResponse.json({ error: 'Quản lý chỉ được phân công công việc cho nhân viên trong đội nhóm của mình' }, { status: 403 });
      }
    }
    if (sale) finalSaleName = sale.name;
  }

  const isOverdue = new Date(dueDate).getTime() < Date.now();
  const newTask: Task = {
    id: generateId('tsk'),
    title,
    type: type as TaskType,
    leadId: leadId || undefined,
    dealId: dealId || undefined,
    customerName: customerName || undefined,
    assignedSaleId: finalSaleId,
    assignedSaleName: finalSaleName,
    dueDate,
    status: isOverdue ? 'OVERDUE' : 'PENDING',
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  db.tasks.unshift(newTask);
  writeDb(db);

  logAuditEvent(
    user.id,
    user.name,
    'CREATE',
    'TASK',
    newTask.id,
    `Tạo lịch hẹn/công việc: ${newTask.title} (Hạn: ${new Date(dueDate).toLocaleString('vi-VN')})`
  );

  return NextResponse.json({ task: newTask }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = getCurrentUser(userId);
  const db = readDb();
  const body = await request.json();
  const { id, status, notes, dueDate } = body;

  const tIndex = db.tasks.findIndex(t => t.id === id);
  if (tIndex === -1) {
    return NextResponse.json({ error: 'Không tìm thấy công việc' }, { status: 404 });
  }

  const currentTask = db.tasks[tIndex];
  if (status) currentTask.status = status as TaskStatus;
  if (notes !== undefined) currentTask.notes = notes;
  if (dueDate) currentTask.dueDate = dueDate;

  writeDb(db);

  logAuditEvent(
    user.id,
    user.name,
    'UPDATE',
    'TASK',
    id,
    `Cập nhật trạng thái công việc "${currentTask.title}" sang: ${currentTask.status}`
  );

  return NextResponse.json({ task: currentTask });
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const db = readDb();

  const tIndex = db.tasks.findIndex(t => t.id === id);
  if (tIndex === -1) {
    return NextResponse.json({ error: 'Không tìm thấy công việc' }, { status: 404 });
  }

  const task = db.tasks[tIndex];
  db.tasks.splice(tIndex, 1);
  writeDb(db);

  return NextResponse.json({ success: true });
}
