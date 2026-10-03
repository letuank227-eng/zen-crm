import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, getCurrentUser, filterDealsByRole, logAuditEvent } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { Deal } from '@/types/crm';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = getCurrentUser(userId);
  const db = readDb();

  let deals = filterDealsByRole(db.deals, user, db);

  const searchParams = request.nextUrl.searchParams;
  const pipelineId = searchParams.get('pipelineId');
  const stageId = searchParams.get('stageId');
  const search = searchParams.get('search')?.toLowerCase().trim();
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  if (pipelineId) {
    deals = deals.filter(d => d.pipelineId === pipelineId);
  } else {
    // Default pipeline
    const defaultPipeline = db.pipelines.find(p => p.isDefault) || db.pipelines[0];
    if (defaultPipeline) {
      deals = deals.filter(d => d.pipelineId === defaultPipeline.id);
    }
  }

  if (stageId && stageId !== 'ALL') {
    deals = deals.filter(d => d.stageId === stageId);
  }

  if (search) {
    deals = deals.filter(d =>
      d.title.toLowerCase().includes(search) ||
      d.customerName.toLowerCase().includes(search) ||
      d.customerPhone.includes(search)
    );
  }

  if (dateFrom) {
    const start = new Date(dateFrom);
    deals = deals.filter(d => {
      const dTime = new Date(d.closedAt || d.stageUpdatedAt || d.createdAt).getTime();
      return dTime >= start.getTime();
    });
  }

  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    deals = deals.filter(d => {
      const dTime = new Date(d.closedAt || d.stageUpdatedAt || d.createdAt).getTime();
      return dTime <= end.getTime();
    });
  }

  let allowedSales = db.users.filter(u => u.role === 'SALE' && !u.isLocked);
  if (user.role === 'LEADER') {
    const leaderTeamId = user.teamId || db.teams.find(t => t.leaderId === user.id)?.id;
    allowedSales = allowedSales.filter(u => u.teamId === leaderTeamId || u.id === user.id);
  } else if (user.role === 'SALE') {
    allowedSales = allowedSales.filter(u => u.id === user.id);
  }

  return NextResponse.json({
    deals,
    pipelines: db.pipelines,
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
    leadId,
    pipelineId,
    stageId,
    value = 0,
    winProbability,
    expectedCloseDate,
    assignedSaleId,
    products = [],
  } = body;

  if (!title) {
    return NextResponse.json({ error: 'Tiêu đề Deal không được để trống' }, { status: 400 });
  }

  const targetPipeline = db.pipelines.find(p => p.id === pipelineId) || db.pipelines[0];
  const targetStage = targetPipeline.stages.find(s => s.id === stageId) || targetPipeline.stages[0];

  let customerName = 'Khách vãng lai';
  let customerPhone = '';
  if (leadId) {
    const lead = db.leads.find(l => l.id === leadId);
    if (lead) {
      customerName = lead.fullName;
      customerPhone = lead.phone;
    }
  }

  let finalSaleId = assignedSaleId || user.id;
  let finalSaleName = user.name;
  if (assignedSaleId) {
    const sale = db.users.find(u => u.id === assignedSaleId);
    if (user.role === 'LEADER') {
      const leaderTeamId = user.teamId || db.teams.find(t => t.leaderId === user.id)?.id;
      if (sale && sale.teamId !== leaderTeamId && sale.id !== user.id) {
        return NextResponse.json({ error: 'Quản lý chỉ được phân công cơ hội cho nhân viên trong đội nhóm của mình' }, { status: 403 });
      }
    }
    if (sale) finalSaleName = sale.name;
  }

  const now = new Date().toISOString();
  const newDeal: Deal = {
    id: generateId('deal'),
    title,
    leadId: leadId || '',
    customerName,
    customerPhone,
    pipelineId: targetPipeline.id,
    stageId: targetStage.id,
    value: Number(value) || 0,
    winProbability: typeof winProbability === 'number' ? winProbability : targetStage.defaultProbability,
    expectedCloseDate: expectedCloseDate || now,
    assignedSaleId: finalSaleId,
    assignedSaleName: finalSaleName,
    products: Array.isArray(products) ? products : [],
    contracts: [],
    stageUpdatedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  db.deals.unshift(newDeal);
  writeDb(db);

  logAuditEvent(
    user.id,
    user.name,
    'CREATE',
    'DEAL',
    newDeal.id,
    `Tạo cơ hội bán hàng mới: ${newDeal.title} (${new Intl.NumberFormat('vi-VN').format(newDeal.value)} ₫)`
  );

  return NextResponse.json({ deal: newDeal }, { status: 201 });
}
