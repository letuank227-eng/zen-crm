import { NextRequest, NextResponse } from 'next/server';
import { readDb, getCurrentUser, filterDealsByRole, filterLeadsByRole } from '@/lib/db';
import { maskSaleName, parseDateBoundary } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);
  const db = await readDb({ includeProducts: false });

  const searchParams = request.nextUrl.searchParams;
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  let leads = filterLeadsByRole(db.leads, user, db);
  let deals = filterDealsByRole(db.deals, user, db);
  let allCompanyDeals = db.deals;
  const defaultPipeline = db.pipelines.find(p => p.isDefault) || db.pipelines[0];

  // Won & Lost stages tổng hợp từ toàn bộ pipelines (chuẩn và enterprise)
  const wonStages = new Set(db.pipelines.flatMap(p => p.stages.filter(s => s.isWon).map(s => s.id)));
  const lostStages = new Set(db.pipelines.flatMap(p => p.stages.filter(s => s.isLost).map(s => s.id)));

  // Lọc theo khoảng thời gian (Ngày, Tuần, Tháng, Quý, Năm hoặc Tùy chọn)
  if (dateFrom) {
    const start = parseDateBoundary(dateFrom, false);
    leads = leads.filter(l => new Date(l.createdAt).getTime() >= start.getTime());
    deals = deals.filter(d => {
      const dTime = new Date(d.closedAt || d.stageUpdatedAt || d.createdAt).getTime();
      return dTime >= start.getTime();
    });
    allCompanyDeals = allCompanyDeals.filter(d => {
      const dTime = new Date(d.closedAt || d.stageUpdatedAt || d.createdAt).getTime();
      return dTime >= start.getTime();
    });
  }
  if (dateTo) {
    const end = parseDateBoundary(dateTo, true);
    leads = leads.filter(l => new Date(l.createdAt).getTime() <= end.getTime());
    deals = deals.filter(d => {
      const dTime = new Date(d.closedAt || d.stageUpdatedAt || d.createdAt).getTime();
      return dTime <= end.getTime();
    });
    allCompanyDeals = allCompanyDeals.filter(d => {
      const dTime = new Date(d.closedAt || d.stageUpdatedAt || d.createdAt).getTime();
      return dTime <= end.getTime();
    });
  }

  const wonDeals = deals.filter(d => wonStages.has(d.stageId));
  const lostDeals = deals.filter(d => lostStages.has(d.stageId));
  const openDeals = deals.filter(d => !wonStages.has(d.stageId) && !lostStages.has(d.stageId));

  const totalRevenue = wonDeals.reduce((sum, d) => sum + d.value, 0);
  const totalOpenValue = openDeals.reduce((sum, d) => sum + d.value, 0);
  const weightedPipelineForecast = openDeals.reduce((sum, d) => sum + (d.value * (d.winProbability || 0)) / 100, 0);

  const totalClosedCount = wonDeals.length + lostDeals.length;
  const conversionRate = totalClosedCount > 0 ? Math.round((wonDeals.length / totalClosedCount) * 100) : (deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 100) : 0);
  const averageDealSize = wonDeals.length > 0 ? Math.round(totalRevenue / wonDeals.length) : 0;

  // Funnel data
  const funnelStages = defaultPipeline.stages.map(stage => {
    const count = deals.filter(d => d.stageId === stage.id).length;
    const value = deals.filter(d => d.stageId === stage.id).reduce((sum, d) => sum + d.value, 0);
    return {
      stageId: stage.id,
      stageName: stage.name,
      count,
      value,
      color: stage.color,
    };
  });

  // Source performance
  const sourceStats: Record<string, { leadsCount: number; wonCount: number; revenue: number }> = {};
  leads.forEach(l => {
    const src = l.source || 'Khác';
    if (!sourceStats[src]) sourceStats[src] = { leadsCount: 0, wonCount: 0, revenue: 0 };
    sourceStats[src].leadsCount++;
  });

  wonDeals.forEach(d => {
    const lead = db.leads.find(l => l.id === d.leadId);
    const src = lead?.source || 'Khác';
    if (!sourceStats[src]) sourceStats[src] = { leadsCount: 0, wonCount: 0, revenue: 0 };
    sourceStats[src].wonCount++;
    sourceStats[src].revenue += d.value;
  });

  const sourceReport = Object.entries(sourceStats).map(([source, stats]) => ({
    source,
    leadsCount: stats.leadsCount,
    wonCount: stats.wonCount,
    revenue: stats.revenue,
    conversionRate: stats.leadsCount > 0 ? Math.round((stats.wonCount / stats.leadsCount) * 100) : 0,
  }));

  // Sales rep performance & Top 3 Sale trong kỳ đã chọn
  const isSale = user.role === 'SALE';
  const isLeader = user.role === 'LEADER';
  const leaderTeamId = user.teamId || db.teams.find(t => t.leaderId === user.id)?.id;

  // 1. TÍNH TOÁN BẢNG XẾP HẠNG TOÀN CÔNG TY TRƯỚC HẾT (ĐỂ RANK CHUẨN XÁC 100% CỦA TOÀN CÔNG TY):
  const allCompanySalesRanked = db.users
    .filter(u => u.role === 'SALE')
    .map(s => {
      const sDeals = allCompanyDeals.filter(d => d.assignedSaleId === s.id);
      const sWon = sDeals.filter(d => wonStages.has(d.stageId));
      const sRevenue = sWon.reduce((sum, d) => sum + d.value, 0);
      const sClosedCount = sWon.length + sDeals.filter(d => lostStages.has(d.stageId)).length;
      const sWinRate = sClosedCount > 0 ? Math.round((sWon.length / sClosedCount) * 100) : 0;

      return {
        userId: s.id,
        fullName: s.name,
        name: isSale && s.id !== user.id ? maskSaleName(s.name) : s.name,
        maskedName: maskSaleName(s.name),
        isSelf: s.id === user.id,
        avatar: s.avatar,
        teamId: s.teamId,
        teamName: s.teamName || 'Kinh doanh',
        targetRevenue: s.targetRevenue,
        actualRevenue: sRevenue,
        wonCount: sWon.length,
        winRate: sWinRate,
        kpiProgress: s.targetRevenue > 0 ? Math.round((sRevenue / s.targetRevenue) * 100) : 0,
        rank: 0,
      };
    })
    .sort((a, b) => b.actualRevenue - a.actualRevenue);

  // Gán thứ hạng chính xác toàn công ty (rank: 1, 2, 3... Cty)
  allCompanySalesRanked.forEach((s, idx) => {
    s.rank = idx + 1;
  });

  // 2. PHÂN QUYỀN HIỂN THỊ:
  // - LEADER: Chỉ xem nhân sự trong đội nhóm của mình (không xem team khác, không xem Giám đốc)
  //   nhưng rank hiển thị vẫn giữ đúng thứ hạng thực tế của bạn đó trong toàn công ty!
  // - SALE: Xem toàn cty với họ tên lót được che bảo mật.
  // - ADMIN: Xem toàn bộ công ty.
  let visibleSales = allCompanySalesRanked;
  if (isLeader) {
    visibleSales = allCompanySalesRanked.filter(s => s.teamId === leaderTeamId || s.userId === user.id);
  }

  // Top 3 Sale xuất sắc:
  const top3Sales = isLeader
    ? visibleSales.slice(0, 3)
    : allCompanySalesRanked.slice(0, 3).map(s => ({
        ...s,
        displayName: isSale && !s.isSelf ? maskSaleName(s.fullName) : s.fullName,
        maskedName: maskSaleName(s.fullName),
      }));

  const salesLeaderboard = isSale
    ? visibleSales.map(s => ({
        ...s,
        name: s.isSelf ? `${s.fullName} (Bạn)` : maskSaleName(s.fullName),
      }))
    : visibleSales;

  // Product performance trong kỳ
  const productStats: Record<string, { name: string; quantity: number; revenue: number }> = {};
  wonDeals.forEach(d => {
    d.products?.forEach(p => {
      if (!productStats[p.productId]) {
        productStats[p.productId] = { name: p.productName, quantity: 0, revenue: 0 };
      }
      productStats[p.productId].quantity += p.quantity;
      productStats[p.productId].revenue += p.total;
    });
  });

  const productReport = Object.values(productStats).sort((a, b) => b.revenue - a.revenue);

  // Báo cáo hiệu suất theo từng Đội Nhóm Sale trong kỳ
  let teamsToReport = db.teams;
  if (user.role === 'LEADER') {
    teamsToReport = teamsToReport.filter(t => t.id === leaderTeamId);
  } else if (user.role === 'SALE') {
    teamsToReport = teamsToReport.filter(t => t.id === user.teamId);
  }

  const teamReports = teamsToReport.map(t => {
    const leader = db.users.find(u => u.id === t.leaderId && u.role !== 'ADMIN');
    const teamMembers = db.users.filter(u => u.teamId === t.id && u.role !== 'ADMIN');
    const memberIds = new Set(teamMembers.map(m => m.id));

    // Lọc các deal của nhóm trong kỳ đã chọn
    const teamDeals = allCompanyDeals.filter(d => d.assignedSaleId && memberIds.has(d.assignedSaleId));
    const teamWon = teamDeals.filter(d => wonStages.has(d.stageId));
    const teamLost = teamDeals.filter(d => lostStages.has(d.stageId));
    const teamOpen = teamDeals.filter(d => !wonStages.has(d.stageId) && !lostStages.has(d.stageId));

    const actualRevenue = teamWon.reduce((sum, d) => sum + d.value, 0);
    const openValue = teamOpen.reduce((sum, d) => sum + d.value, 0);
    const totalClosed = teamWon.length + teamLost.length;
    const winRate = totalClosed > 0 ? Math.round((teamWon.length / totalClosed) * 100) : 0;
    const kpiProgress = t.targetRevenue > 0 ? Math.round((actualRevenue / t.targetRevenue) * 100) : 0;

    // Leads của nhóm trong kỳ
    const teamLeads = leads.filter(l => l.assignedSaleId && memberIds.has(l.assignedSaleId));

    return {
      id: t.id,
      name: t.name,
      leaderId: t.leaderId,
      leaderName: leader?.name || 'Chưa gán',
      leaderEmail: leader?.email || '',
      membersCount: teamMembers.length,
      members: teamMembers.map(m => ({ id: m.id, name: m.name, role: m.role, email: m.email })),
      targetRevenue: t.targetRevenue,
      actualRevenue,
      openValue,
      wonDealsCount: teamWon.length,
      totalDealsCount: teamDeals.length,
      winRate,
      kpiProgress,
      leadsCount: teamLeads.length,
    };
  }).sort((a, b) => b.actualRevenue - a.actualRevenue);

  return NextResponse.json({
    metrics: {
      totalRevenue,
      openDealsCount: openDeals.length,
      wonDealsCount: wonDeals.length,
      totalOpenValue,
      weightedPipelineForecast,
      conversionRate,
      averageDealSize,
      totalLeads: leads.length,
    },
    funnelStages,
    sourceReport,
    top3Sales,
    salesLeaderboard,
    productReport,
    teamReports,
  });
}
