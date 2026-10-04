import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, getCurrentUser, logAuditEvent } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);
  const db = await readDb();
  const deal = db.deals.find(d => d.id === params.id);

  if (!deal) {
    return NextResponse.json({ error: 'Không tìm thấy Deal' }, { status: 404 });
  }

  // Phân quyền: LEADER chỉ xem deal của team mình
  if (user.role === 'LEADER') {
    const leaderTeamId = user.teamId || db.teams.find(t => t.leaderId === user.id)?.id;
    const assignedSale = db.users.find(u => u.id === deal.assignedSaleId);
    if (deal.assignedSaleId && deal.assignedSaleId !== user.id && assignedSale?.teamId !== leaderTeamId) {
      return NextResponse.json({ error: 'Quản lý không có quyền xem cơ hội của đội nhóm khác' }, { status: 403 });
    }
  } else if (user.role === 'SALE' && deal.assignedSaleId !== user.id) {
    return NextResponse.json({ error: 'Bạn chỉ có quyền xem cơ hội của chính mình' }, { status: 403 });
  }

  const pipeline = db.pipelines.find(p => p.id === deal.pipelineId) || db.pipelines[0];
  const notes = db.notes.filter(n => n.dealId === deal.id);
  const auditLogs = db.auditLogs.filter(a => a.entityId === deal.id);

  let allowedSales = db.users.filter(u => u.role === 'SALE' && !u.isLocked);
  if (user.role === 'LEADER') {
    const leaderTeamId = user.teamId || db.teams.find(t => t.leaderId === user.id)?.id;
    allowedSales = allowedSales.filter(u => u.teamId === leaderTeamId || u.id === user.id);
  } else if (user.role === 'SALE') {
    allowedSales = allowedSales.filter(u => u.id === user.id);
  }

  return NextResponse.json({
    deal,
    pipeline,
    notes,
    auditLogs,
    products: db.products,
    sales: allowedSales,
  });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);
  const db = await readDb();
  const dealIndex = db.deals.findIndex(d => d.id === params.id);

  if (dealIndex === -1) {
    return NextResponse.json({ error: 'Không tìm thấy Deal' }, { status: 404 });
  }

  const currentDeal = db.deals[dealIndex];

  // Phân quyền: LEADER chỉ chỉnh sửa deal của team mình
  if (user.role === 'LEADER') {
    const leaderTeamId = user.teamId || db.teams.find(t => t.leaderId === user.id)?.id;
    const assignedSale = db.users.find(u => u.id === currentDeal.assignedSaleId);
    if (currentDeal.assignedSaleId && currentDeal.assignedSaleId !== user.id && assignedSale?.teamId !== leaderTeamId) {
      return NextResponse.json({ error: 'Quản lý không có quyền chỉnh sửa cơ hội của đội nhóm khác' }, { status: 403 });
    }
  } else if (user.role === 'SALE' && currentDeal.assignedSaleId !== user.id) {
    return NextResponse.json({ error: 'Bạn chỉ có quyền chỉnh sửa cơ hội của chính mình' }, { status: 403 });
  }
  const body = await request.json();

  const now = new Date().toISOString();
  const stageChanged = body.stageId && body.stageId !== currentDeal.stageId;

  let oldStageName = currentDeal.stageId;
  let newStageName = body.stageId;

  const currentPipeline = db.pipelines.find(p => p.id === (body.pipelineId || currentDeal.pipelineId)) || db.pipelines[0];
  if (stageChanged && currentPipeline) {
    const sOld = currentPipeline.stages.find(s => s.id === currentDeal.stageId);
    const sNew = currentPipeline.stages.find(s => s.id === body.stageId);
    if (sOld) oldStageName = sOld.name;
    if (sNew) newStageName = sNew.name;
  }

  const updatedDeal = {
    ...currentDeal,
    ...body,
    stageUpdatedAt: stageChanged ? now : currentDeal.stageUpdatedAt,
    closedAt: body.isWon ? now : currentDeal.closedAt,
    updatedAt: now,
  };

  db.deals[dealIndex] = updatedDeal;
  await writeDb(db);

  if (stageChanged) {
    await logAuditEvent(
      user.id,
      user.name,
      'STAGE_CHANGE',
      'DEAL',
      updatedDeal.id,
      `Chuyển deal "${updatedDeal.title}" từ giai đoạn [${oldStageName}] sang [${newStageName}]`,
      {
        previousValue: oldStageName,
        newValue: newStageName,
        reason: body.closeReason || undefined,
      }
    );
  } else {
    await logAuditEvent(
      user.id,
      user.name,
      'UPDATE',
      'DEAL',
      updatedDeal.id,
      `Cập nhật cơ hội bán hàng: ${updatedDeal.title}`
    );
  }

  return NextResponse.json({ deal: updatedDeal });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);
  const db = await readDb();

  if (user.role === 'SALE' || user.role === 'STAFF') {
    return NextResponse.json({ error: 'Chỉ Quản lý hoặc Giám đốc mới có quyền xóa Deal' }, { status: 403 });
  }

  const dealIndex = db.deals.findIndex(d => d.id === params.id);
  if (dealIndex === -1) {
    return NextResponse.json({ error: 'Không tìm thấy Deal' }, { status: 404 });
  }

  const deal = db.deals[dealIndex];

  if (user.role === 'LEADER') {
    const leaderTeamId = user.teamId || db.teams.find(t => t.leaderId === user.id)?.id;
    const assignedSale = db.users.find(u => u.id === deal.assignedSaleId);
    if (deal.assignedSaleId && deal.assignedSaleId !== user.id && assignedSale?.teamId !== leaderTeamId) {
      return NextResponse.json({ error: 'Quản lý không có quyền xóa cơ hội của đội nhóm khác' }, { status: 403 });
    }
  }

  db.deals.splice(dealIndex, 1);
  await writeDb(db);

  await logAuditEvent(
    user.id,
    user.name,
    'DELETE',
    'DEAL',
    params.id,
    `Xóa cơ hội bán hàng: ${deal.title}`
  );

  return NextResponse.json({ success: true });
}
