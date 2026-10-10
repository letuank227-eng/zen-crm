import { NextRequest, NextResponse } from 'next/server';
import { readDb, getCurrentUser } from '@/lib/db';
import { parseDateBoundary } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);

  if (!user) {
    return NextResponse.json(
      { error: 'Yêu cầu đăng nhập để truy cập số liệu phân tích.' },
      { status: 401 }
    );
  }

  if (user.role !== 'ADMIN' && user.role !== 'LEADER' && user.role !== 'SALE') {
    return NextResponse.json(
      { error: 'Chỉ Giám Đốc, Trưởng Phòng và Chuyên viên Sale mới có quyền truy cập.' },
      { status: 403 }
    );
  }

  const db = await readDb();

  const searchParams = request.nextUrl.searchParams;
  const period = (searchParams.get('period') || 'MONTH').toUpperCase();
  const refDateParam = searchParams.get('refDate');

  // Stages won
  const wonStages = new Set(db.pipelines.flatMap(p => p.stages.filter(s => s.isWon).map(s => s.id)));

  // Phân quyền chặt chẽ theo vai trò:
  // - ADMIN: Xem toàn bộ deals của công ty
  // - LEADER: CHỈ xem các deal của các thành viên trong Team của mình (và chính mình), tuyệt đối không xem deal team khác hoặc của Giám Đốc.
  // - SALE: Chỉ xem deal do chính mình phụ trách.
  const leaderTeamId = user.teamId || db.teams.find(t => t.leaderId === user.id)?.id;
  const teamMemberIds = new Set(
    db.users
      .filter(u => (u.teamId === leaderTeamId || u.id === user.id) && u.role !== 'ADMIN')
      .map(u => u.id)
  );

  let allowedDeals = db.deals;
  if (user.role === 'LEADER') {
    allowedDeals = db.deals.filter(d => d.assignedSaleId && teamMemberIds.has(d.assignedSaleId));
  } else if (user.role === 'SALE') {
    allowedDeals = db.deals.filter(d => d.assignedSaleId === user.id);
  }

  const allWonDeals = allowedDeals.filter(d => wonStages.has(d.stageId));

  const maxDealTime = allWonDeals.length > 0
    ? Math.max(...allWonDeals.map(d => new Date(d.closedAt || d.stageUpdatedAt || d.createdAt).getTime()))
    : Date.now();

  const now = new Date();
  const hasWonThisMonth = allWonDeals.some(d => {
    const t = new Date(d.closedAt || d.stageUpdatedAt || d.createdAt);
    return t.getFullYear() === now.getFullYear() && t.getMonth() === now.getMonth();
  });

  const refDate = refDateParam
    ? new Date(refDateParam)
    : (hasWonThisMonth ? now : new Date(maxDealTime));

  const pad = (n: number) => String(n).padStart(2, '0');
  const formatYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  let currStart: Date;
  let currEnd: Date;
  let prevStart: Date;
  let prevEnd: Date;
  let periodLabel = 'Tháng này vs Tháng trước';
  let currLabel = `Tháng ${refDate.getMonth() + 1}/${refDate.getFullYear()}`;
  let prevLabel = `Tháng ${refDate.getMonth() || 12}/${refDate.getMonth() === 0 ? refDate.getFullYear() - 1 : refDate.getFullYear()}`;

  switch (period) {
    case 'DAY': {
      currStart = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 0, 0, 0, 0);
      currEnd = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate(), 23, 59, 59, 999);
      prevStart = new Date(currStart.getTime() - 24 * 60 * 60 * 1000);
      prevEnd = new Date(currEnd.getTime() - 24 * 60 * 60 * 1000);
      periodLabel = 'Hôm nay vs Hôm qua';
      currLabel = `Hôm nay (${pad(refDate.getDate())}/${pad(refDate.getMonth() + 1)})`;
      prevLabel = `Hôm qua (${pad(prevStart.getDate())}/${pad(prevStart.getMonth() + 1)})`;
      break;
    }
    case 'WEEK': {
      const day = refDate.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      currStart = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() + diffToMonday, 0, 0, 0, 0);
      currEnd = new Date(currStart.getFullYear(), currStart.getMonth(), currStart.getDate() + 6, 23, 59, 59, 999);
      prevStart = new Date(currStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevEnd = new Date(currEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
      periodLabel = 'Tuần này vs Tuần trước';
      currLabel = `Tuần này (${pad(currStart.getDate())}/${pad(currStart.getMonth() + 1)} - ${pad(currEnd.getDate())}/${pad(currEnd.getMonth() + 1)})`;
      prevLabel = `Tuần trước (${pad(prevStart.getDate())}/${pad(prevStart.getMonth() + 1)} - ${pad(prevEnd.getDate())}/${pad(prevEnd.getMonth() + 1)})`;
      break;
    }
    case 'QUARTER': {
      const q = Math.floor(refDate.getMonth() / 3);
      currStart = new Date(refDate.getFullYear(), q * 3, 1, 0, 0, 0, 0);
      currEnd = new Date(refDate.getFullYear(), (q + 1) * 3, 0, 23, 59, 59, 999);
      prevStart = new Date(refDate.getFullYear(), (q - 1) * 3, 1, 0, 0, 0, 0);
      prevEnd = new Date(refDate.getFullYear(), q * 3, 0, 23, 59, 59, 999);
      periodLabel = 'Quý này vs Quý trước';
      currLabel = `Quý ${q + 1}/${refDate.getFullYear()}`;
      prevLabel = `Quý ${q === 0 ? 4 : q}/${q === 0 ? refDate.getFullYear() - 1 : refDate.getFullYear()}`;
      break;
    }
    case 'YEAR': {
      currStart = new Date(refDate.getFullYear(), 0, 1, 0, 0, 0, 0);
      currEnd = new Date(refDate.getFullYear(), 11, 31, 23, 59, 59, 999);
      prevStart = new Date(refDate.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      prevEnd = new Date(refDate.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      periodLabel = 'Năm nay vs Năm trước';
      currLabel = `Năm ${refDate.getFullYear()}`;
      prevLabel = `Năm ${refDate.getFullYear() - 1}`;
      break;
    }
    default: {
      // MONTH
      currStart = new Date(refDate.getFullYear(), refDate.getMonth(), 1, 0, 0, 0, 0);
      currEnd = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59, 999);
      prevStart = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1, 0, 0, 0, 0);
      prevEnd = new Date(refDate.getFullYear(), refDate.getMonth(), 0, 23, 59, 59, 999);
      periodLabel = 'Tháng này vs Tháng trước';
      currLabel = `Tháng ${refDate.getMonth() + 1}/${refDate.getFullYear()}`;
      const prevMonthNum = refDate.getMonth() === 0 ? 12 : refDate.getMonth();
      const prevYearNum = refDate.getMonth() === 0 ? refDate.getFullYear() - 1 : refDate.getFullYear();
      prevLabel = `Tháng ${prevMonthNum}/${prevYearNum}`;
      break;
    }
  }

  const currWonDeals = allWonDeals.filter(d => {
    const t = new Date(d.closedAt || d.stageUpdatedAt || d.createdAt).getTime();
    return t >= currStart.getTime() && t <= currEnd.getTime();
  });

  const prevWonDeals = allWonDeals.filter(d => {
    const t = new Date(d.closedAt || d.stageUpdatedAt || d.createdAt).getTime();
    return t >= prevStart.getTime() && t <= prevEnd.getTime();
  });

  const currRevenue = currWonDeals.reduce((sum, d) => sum + d.value, 0);
  const prevRevenue = prevWonDeals.reduce((sum, d) => sum + d.value, 0);

  const revenueGrowth = prevRevenue > 0
    ? Math.round(((currRevenue - prevRevenue) / prevRevenue) * 1000) / 10
    : (currRevenue > 0 ? 100 : 0);

  const wonCountGrowth = prevWonDeals.length > 0
    ? Math.round(((currWonDeals.length - prevWonDeals.length) / prevWonDeals.length) * 1000) / 10
    : (currWonDeals.length > 0 ? 100 : 0);

  // 1. REVENUE COMPARISON TIMELINE (Biểu đồ so sánh doanh thu)
  let trendData: any[] = [];
  if (period === 'DAY') {
    // Breakdown by 4-hour slots
    const slots = [
      { label: '00h - 06h', startH: 0, endH: 6 },
      { label: '06h - 12h (Sáng)', startH: 6, endH: 12 },
      { label: '12h - 18h (Chiều)', startH: 12, endH: 18 },
      { label: '18h - 24h (Tối)', startH: 18, endH: 24 },
    ];
    trendData = slots.map(slot => {
      const cRev = currWonDeals
        .filter(d => {
          const h = new Date(d.closedAt || d.stageUpdatedAt || d.createdAt).getHours();
          return h >= slot.startH && h < slot.endH;
        })
        .reduce((sum, d) => sum + d.value, 0);

      const pRev = prevWonDeals
        .filter(d => {
          const h = new Date(d.closedAt || d.stageUpdatedAt || d.createdAt).getHours();
          return h >= slot.startH && h < slot.endH;
        })
        .reduce((sum, d) => sum + d.value, 0);

      return {
        timeKey: slot.label,
        currentRevenue: cRev,
        previousRevenue: pRev,
        growth: pRev > 0 ? Math.round(((cRev - pRev) / pRev) * 100) : (cRev > 0 ? 100 : 0),
      };
    });
  } else if (period === 'WEEK') {
    const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
    trendData = days.map((dayName, idx) => {
      const cTarget = new Date(currStart.getTime() + idx * 24 * 60 * 60 * 1000);
      const pTarget = new Date(prevStart.getTime() + idx * 24 * 60 * 60 * 1000);

      const cRev = currWonDeals
        .filter(d => {
          const dt = new Date(d.closedAt || d.stageUpdatedAt || d.createdAt);
          return dt.getDate() === cTarget.getDate() && dt.getMonth() === cTarget.getMonth();
        })
        .reduce((sum, d) => sum + d.value, 0);

      const pRev = prevWonDeals
        .filter(d => {
          const dt = new Date(d.closedAt || d.stageUpdatedAt || d.createdAt);
          return dt.getDate() === pTarget.getDate() && dt.getMonth() === pTarget.getMonth();
        })
        .reduce((sum, d) => sum + d.value, 0);

      return {
        timeKey: `${dayName} (${pad(cTarget.getDate())}/${pad(cTarget.getMonth() + 1)})`,
        currentRevenue: cRev,
        previousRevenue: pRev,
        growth: pRev > 0 ? Math.round(((cRev - pRev) / pRev) * 100) : (cRev > 0 ? 100 : 0),
      };
    });
  } else {
    // Group into 5-day intervals or months
    const totalDays = Math.ceil((currEnd.getTime() - currStart.getTime()) / (24 * 60 * 60 * 1000));
    const step = Math.max(1, Math.floor(totalDays / 6));

    const intervals = [];
    for (let i = 0; i < totalDays; i += step) {
      const dStart = new Date(currStart.getTime() + i * 24 * 60 * 60 * 1000);
      const dEnd = new Date(Math.min(currEnd.getTime(), currStart.getTime() + (i + step - 1) * 24 * 60 * 60 * 1000));
      intervals.push({ dStart, dEnd, label: `${pad(dStart.getDate())}/${pad(dStart.getMonth() + 1)}` });
    }

    trendData = intervals.map(iv => {
      const cRev = currWonDeals
        .filter(d => {
          const t = new Date(d.closedAt || d.stageUpdatedAt || d.createdAt).getTime();
          return t >= iv.dStart.getTime() && t <= iv.dEnd.getTime() + 86400000;
        })
        .reduce((sum, d) => sum + d.value, 0);

      const pOffset = currStart.getTime() - prevStart.getTime();
      const pStartIv = new Date(iv.dStart.getTime() - pOffset);
      const pEndIv = new Date(iv.dEnd.getTime() - pOffset);

      const pRev = prevWonDeals
        .filter(d => {
          const t = new Date(d.closedAt || d.stageUpdatedAt || d.createdAt).getTime();
          return t >= pStartIv.getTime() && t <= pEndIv.getTime() + 86400000;
        })
        .reduce((sum, d) => sum + d.value, 0);

      return {
        timeKey: iv.label,
        currentRevenue: cRev,
        previousRevenue: pRev,
        growth: pRev > 0 ? Math.round(((cRev - pRev) / pRev) * 100) : (cRev > 0 ? 100 : 0),
      };
    });
  }

  // 2. SALE PERFORMANCE DONUT CHART (Bản đồ tròn Sale)
  let salesUsers = db.users.filter(u => u.role === 'SALE' || u.role === 'LEADER');

  // Phân quyền xem danh sách nhân sự:
  // - ADMIN: Xem toàn bộ sale công ty.
  // - LEADER: Chỉ xem các thành viên thuộc đội nhóm của mình (và bản thân leader), tuyệt đối không xem sale team khác và không xem Giám Đốc.
  // - SALE: Chỉ xem duy nhất bản thân mình.
  if (user.role === 'SALE') {
    salesUsers = salesUsers.filter(u => u.id === user.id);
  } else if (user.role === 'LEADER') {
    salesUsers = salesUsers.filter(u => u.teamId === leaderTeamId || u.id === user.id);
  }
  const palette = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  const saleDonut = salesUsers.map((s, idx) => {
    const sCurrWon = currWonDeals.filter(d => d.assignedSaleId === s.id);
    const sPrevWon = prevWonDeals.filter(d => d.assignedSaleId === s.id);
    const sCurrRev = sCurrWon.reduce((sum, d) => sum + d.value, 0);
    const sPrevRev = sPrevWon.reduce((sum, d) => sum + d.value, 0);

    const sGrowth = sPrevRev > 0
      ? Math.round(((sCurrRev - sPrevRev) / sPrevRev) * 1000) / 10
      : (sCurrRev > 0 ? 100 : 0);

    const percentage = currRevenue > 0 ? Math.round((sCurrRev / currRevenue) * 1000) / 10 : 0;

    return {
      userId: s.id,
      name: s.name,
      email: s.email,
      avatar: s.avatar,
      teamName: s.teamName || 'Team Kinh Doanh',
      currentRevenue: sCurrRev,
      previousRevenue: sPrevRev,
      growthPercent: sGrowth,
      percentage,
      wonCount: sCurrWon.length,
      color: palette[idx % palette.length],
    };
  }).sort((a, b) => b.currentRevenue - a.currentRevenue);

  // 3. TOP SELLING PRODUCTS WITH COMPARISON (Sản phẩm bán chạy)
  const productStatsMap = new Map<string, {
    productId: string;
    name: string;
    category: string;
    currentQty: number;
    currentRevenue: number;
    previousQty: number;
    previousRevenue: number;
  }>();

  db.products.forEach(p => {
    productStatsMap.set(p.id, {
      productId: p.id,
      name: p.name,
      category: p.category || 'Cây Thủy Sinh',
      currentQty: 0,
      currentRevenue: 0,
      previousQty: 0,
      previousRevenue: 0,
    });
  });

  currWonDeals.forEach(d => {
    d.products?.forEach(p => {
      const item = productStatsMap.get(p.productId) || {
        productId: p.productId,
        name: p.productName || 'Sản phẩm',
        category: 'Thủy sinh',
        currentQty: 0,
        currentRevenue: 0,
        previousQty: 0,
        previousRevenue: 0,
      };
      item.currentQty += p.quantity;
      item.currentRevenue += p.total;
      productStatsMap.set(p.productId, item);
    });
  });

  prevWonDeals.forEach(d => {
    d.products?.forEach(p => {
      const item = productStatsMap.get(p.productId);
      if (item) {
        item.previousQty += p.quantity;
        item.previousRevenue += p.total;
      }
    });
  });

  const productTop = Array.from(productStatsMap.values())
    .filter(p => p.currentQty > 0 || p.currentRevenue > 0 || p.previousRevenue > 0)
    .map(p => {
      const growthPercent = p.previousRevenue > 0
        ? Math.round(((p.currentRevenue - p.previousRevenue) / p.previousRevenue) * 1000) / 10
        : (p.currentRevenue > 0 ? 100 : 0);
      return {
        ...p,
        growthPercent,
      };
    })
    .sort((a, b) => b.currentRevenue - a.currentRevenue)
    .slice(0, 6);

  // 4. CUSTOMER RETENTION: KHÁCH CŨ VS KHÁCH MỚI (Tên & SĐT)
  const customerMap = new Map<string, {
    key: string;
    name: string;
    phone: string;
    firstPurchaseDate: Date;
    allDeals: typeof db.deals;
  }>();

  allWonDeals.forEach(d => {
    const normPhone = (d.customerPhone || '').replace(/\D/g, '');
    const normName = (d.customerName || '').toLowerCase().trim();
    const key = `${normPhone}_${normName}`;
    const dTime = new Date(d.closedAt || d.stageUpdatedAt || d.createdAt).getTime();

    if (!customerMap.has(key)) {
      customerMap.set(key, {
        key,
        name: d.customerName,
        phone: d.customerPhone,
        firstPurchaseDate: new Date(dTime),
        allDeals: [],
      });
    }

    const cust = customerMap.get(key)!;
    if (dTime < cust.firstPurchaseDate.getTime()) {
      cust.firstPurchaseDate = new Date(dTime);
    }
    cust.allDeals.push(d);
  });

  let newCustomersCount = 0;
  let returningCustomersCount = 0;
  let newCustomerRevenue = 0;
  let returningCustomerRevenue = 0;
  const customerList: any[] = [];

  customerMap.forEach(cust => {
    const periodDeals = cust.allDeals.filter(d => {
      const t = new Date(d.closedAt || d.stageUpdatedAt || d.createdAt).getTime();
      return t >= currStart.getTime() && t <= currEnd.getTime();
    });

    if (periodDeals.length > 0) {
      const periodRev = periodDeals.reduce((sum, d) => sum + d.value, 0);
      const isReturning = cust.firstPurchaseDate.getTime() < currStart.getTime();

      if (isReturning) {
        returningCustomersCount++;
        returningCustomerRevenue += periodRev;
      } else {
        newCustomersCount++;
        newCustomerRevenue += periodRev;
      }

      customerList.push({
        name: cust.name,
        phone: cust.phone,
        type: isReturning ? 'RETURNING' : 'NEW',
        typeLabel: isReturning ? 'Khách Cũ Quay Lại' : 'Khách Mới',
        firstPurchaseDate: formatYMD(cust.firstPurchaseDate),
        periodOrdersCount: periodDeals.length,
        periodRevenue: periodRev,
      });
    }
  });

  const totalPeriodCustomers = newCustomersCount + returningCustomersCount;
  const newCustomerPercent = totalPeriodCustomers > 0 ? Math.round((newCustomersCount / totalPeriodCustomers) * 100) : 0;
  const returningCustomerPercent = totalPeriodCustomers > 0 ? Math.round((returningCustomersCount / totalPeriodCustomers) * 100) : 0;
  const repeatPurchaseRate = totalPeriodCustomers > 0 ? Math.round((returningCustomersCount / totalPeriodCustomers) * 1000) / 10 : 0;

  const customerRetention = {
    explanation: 'Hệ thống tự động đối soát dựa trên Họ Tên và Số Điện Thoại: Khách hàng có ngày mua hàng đầu tiên trước kỳ đang xét là Khách Cũ Quay Lại; khách hàng có ngày mua đầu tiên phát sinh trong kỳ là Khách Mới.',
    totalCustomers: totalPeriodCustomers,
    newCustomersCount,
    returningCustomersCount,
    newCustomerPercent,
    returningCustomerPercent,
    newCustomerRevenue,
    returningCustomerRevenue,
    newCustomerAov: newCustomersCount > 0 ? Math.round(newCustomerRevenue / newCustomersCount) : 0,
    returningCustomerAov: returningCustomersCount > 0 ? Math.round(returningCustomerRevenue / returningCustomersCount) : 0,
    repeatPurchaseRate,
    customerList: customerList.sort((a, b) => b.periodRevenue - a.periodRevenue),
  };

  // 5. SALE DRILLDOWN: TỪNG BẠN SALE & BIỂU ĐỒ SÓNG NĂNG SUẤT (Wave timeline)
  // 5. SALE DRILLDOWN: TỪNG BẠN SALE & BIỂU ĐỒ SÓNG NĂNG SUẤT HÀNG NGÀY (Continuous day-by-day wave)
  const saleDrilldowns: Record<string, any> = {};

  salesUsers.forEach(s => {
    const sDeals = currWonDeals.filter(d => d.assignedSaleId === s.id);
    const sPrevDeals = prevWonDeals.filter(d => d.assignedSaleId === s.id);

    const sCurrRevenue = sDeals.reduce((sum, d) => sum + d.value, 0);
    const sPrevRevenue = sPrevDeals.reduce((sum, d) => sum + d.value, 0);
    const sGrowthPercent = sPrevRevenue > 0
      ? Math.round(((sCurrRevenue - sPrevRevenue) / sPrevRevenue) * 1000) / 10
      : (sCurrRevenue > 0 ? 100 : 0);

    // Build continuous timeline across the period for true day-by-day fluctuation curve
    const dayMap = new Map<string, {
      date: string;
      displayDate: string;
      dayOfWeek: string;
      dealsCount: number;
      revenue: number;
      dealsList: any[];
    }>();

    const dayOfWeekNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    if (period === 'DAY') {
      const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
      hours.forEach(h => {
        dayMap.set(h, {
          date: `${formatYMD(currStart)} ${h}`,
          displayDate: h,
          dayOfWeek: 'Hôm nay',
          dealsCount: 0,
          revenue: 0,
          dealsList: [],
        });
      });
      sDeals.forEach(d => {
        const dt = new Date(d.closedAt || d.stageUpdatedAt || d.createdAt);
        const hr = dt.getHours();
        let bin = '08:00';
        if (hr >= 19) bin = '20:00';
        else if (hr >= 17) bin = '18:00';
        else if (hr >= 15) bin = '16:00';
        else if (hr >= 13) bin = '14:00';
        else if (hr >= 11) bin = '12:00';
        else if (hr >= 9) bin = '10:00';
        const entry = dayMap.get(bin)!;
        entry.dealsCount++;
        entry.revenue += d.value;
        entry.dealsList.push({
          id: d.id,
          title: d.title,
          customerName: d.customerName,
          customerPhone: d.customerPhone,
          value: d.value,
          closedAt: d.closedAt || d.stageUpdatedAt || d.createdAt,
          products: (d.products || []).map(p => `${p.productName || 'Sản phẩm'} (x${p.quantity || 1})`),
        });
      });
    } else if (period === 'YEAR') {
      for (let m = 0; m < 12; m++) {
        const mKey = `T${m + 1}`;
        dayMap.set(mKey, {
          date: `2026-${pad(m + 1)}`,
          displayDate: mKey,
          dayOfWeek: 'Tháng',
          dealsCount: 0,
          revenue: 0,
          dealsList: [],
        });
      }
      sDeals.forEach(d => {
        const dt = new Date(d.closedAt || d.stageUpdatedAt || d.createdAt);
        const mKey = `T${dt.getMonth() + 1}`;
        if (dayMap.has(mKey)) {
          const entry = dayMap.get(mKey)!;
          entry.dealsCount++;
          entry.revenue += d.value;
          entry.dealsList.push({
            id: d.id,
            title: d.title,
            customerName: d.customerName,
            customerPhone: d.customerPhone,
            value: d.value,
            closedAt: d.closedAt || d.stageUpdatedAt || d.createdAt,
            products: (d.products || []).map(p => `${p.productName || 'Sản phẩm'} (x${p.quantity || 1})`),
          });
        }
      });
    } else {
      // WEEK, MONTH, QUARTER: Every single day in the period
      const dCursor = new Date(currStart);
      while (dCursor <= currEnd) {
        const dKey = formatYMD(dCursor);
        const displayDate = `${pad(dCursor.getDate())}/${pad(dCursor.getMonth() + 1)}`;
        const dayOfWeek = dayOfWeekNames[dCursor.getDay()];
        dayMap.set(dKey, {
          date: dKey,
          displayDate,
          dayOfWeek,
          dealsCount: 0,
          revenue: 0,
          dealsList: [],
        });
        dCursor.setDate(dCursor.getDate() + 1);
      }
      sDeals.forEach(d => {
        const dt = new Date(d.closedAt || d.stageUpdatedAt || d.createdAt);
        const dKey = formatYMD(dt);
        if (dayMap.has(dKey)) {
          const entry = dayMap.get(dKey)!;
          entry.dealsCount++;
          entry.revenue += d.value;
          entry.dealsList.push({
            id: d.id,
            title: d.title,
            customerName: d.customerName,
            customerPhone: d.customerPhone,
            value: d.value,
            closedAt: d.closedAt || d.stageUpdatedAt || d.createdAt,
            products: (d.products || []).map(p => `${p.productName || 'Sản phẩm'} (x${p.quantity || 1})`),
          });
        }
      });
    }

    const timeline = Array.from(dayMap.values());

    // Calculate peak day
    let peakDay = 'Chưa có';
    let maxRev = 0;
    timeline.forEach(t => {
      if (t.revenue > maxRev) {
        maxRev = t.revenue;
        peakDay = `${t.displayDate} (${t.dayOfWeek})`;
      }
    });

    // 1. Doanh thu & số đơn tháng hiện tại của bạn này
    const monthStart = new Date(refDate.getFullYear(), refDate.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const sMonthDeals = allWonDeals.filter(d => {
      if (d.assignedSaleId !== s.id) return false;
      const t = new Date(d.closedAt || d.stageUpdatedAt || d.createdAt).getTime();
      return t >= monthStart.getTime() && t <= monthEnd.getTime();
    });
    const monthRevenue = sMonthDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const monthDealsCount = sMonthDeals.length;

    // Helper tính hoa hồng sản phẩm
    const calcProductComm = (p: any) => {
      const dbProd = db.products.find(prod => prod.id === p.productId || prod.name === p.productName);
      const qty = Number(p.quantity) || 1;
      const lineTotal = Number(p.total) || ((Number(p.unitPrice) || Number((p as any).price) || 0) * qty);
      if (dbProd?.commissionAmount && dbProd.commissionAmount > 0) {
        return dbProd.commissionAmount * qty;
      }
      const rate = dbProd?.commissionRate ?? 8;
      return Math.round(lineTotal * (rate / 100));
    };

    const calcDealComm = (d: any) => {
      if (d.products && d.products.length > 0) {
        return d.products.reduce((sum: number, p: any) => sum + calcProductComm(p), 0);
      }
      return Math.round((d.value || 0) * 0.08); // Fallback 8%
    };

    // 2. Tính hoa hồng của bạn Sale
    const totalCommission = sDeals.reduce((sum, d) => sum + calcDealComm(d), 0);
    const monthCommission = sMonthDeals.reduce((sum, d) => sum + calcDealComm(d), 0);
    const commissionAvgRate = sCurrRevenue > 0
      ? Math.round((totalCommission / sCurrRevenue) * 1000) / 10
      : 8;

    // 3. Phân tích Khách cũ vs Khách mới của bạn Sale này
    const sAllWonEver = allWonDeals.filter(d => d.assignedSaleId === s.id);
    const saleCustMap = new Map<string, {
      name: string;
      phone: string;
      firstWonTime: number;
      periodDeals: any[];
      allDealsCount: number;
      allDealsRevenue: number;
      lastWonTime: number;
    }>();

    sAllWonEver.forEach(d => {
      const normPhone = (d.customerPhone || '').replace(/\D/g, '');
      const normName = (d.customerName || '').toLowerCase().trim();
      const key = normPhone || normName || d.id;
      const dTime = new Date(d.closedAt || d.stageUpdatedAt || d.createdAt).getTime();

      if (!saleCustMap.has(key)) {
        saleCustMap.set(key, {
          name: d.customerName || 'Khách hàng',
          phone: d.customerPhone || '---',
          firstWonTime: dTime,
          periodDeals: [],
          allDealsCount: 0,
          allDealsRevenue: 0,
          lastWonTime: dTime,
        });
      }

      const cEntry = saleCustMap.get(key)!;
      if (dTime < cEntry.firstWonTime) cEntry.firstWonTime = dTime;
      if (dTime > cEntry.lastWonTime) cEntry.lastWonTime = dTime;
      cEntry.allDealsCount += 1;
      cEntry.allDealsRevenue += (d.value || 0);

      if (dTime >= currStart.getTime() && dTime <= currEnd.getTime()) {
        cEntry.periodDeals.push(d);
      }
    });

    let sNewCustomersCount = 0;
    let sReturningCustomersCount = 0;
    let sNewCustomerRevenue = 0;
    let sReturningCustomerRevenue = 0;

    saleCustMap.forEach(c => {
      if (c.periodDeals.length > 0) {
        const pRev = c.periodDeals.reduce((sum, d) => sum + (d.value || 0), 0);
        const isRet = c.firstWonTime < currStart.getTime() || c.allDealsCount > c.periodDeals.length;
        if (isRet) {
          sReturningCustomersCount++;
          sReturningCustomerRevenue += pRev;
        } else {
          sNewCustomersCount++;
          sNewCustomerRevenue += pRev;
        }
      }
    });

    const totalSaleCustInPeriod = sNewCustomersCount + sReturningCustomersCount;
    const sRetentionRate = totalSaleCustInPeriod > 0
      ? Math.round((sReturningCustomersCount / totalSaleCustInPeriod) * 1000) / 10
      : 0;

    // 4. Top khách mua hàng hoặc quay lại mua hàng nhiều nhất của bạn này
    const topCustomers = Array.from(saleCustMap.values())
      .map(c => {
        const isReturning = c.firstWonTime < currStart.getTime() || c.allDealsCount > 1;
        const periodRevenue = c.periodDeals.reduce((sum, d) => sum + (d.value || 0), 0);
        return {
          name: c.name,
          phone: c.phone,
          isReturning,
          typeLabel: isReturning ? 'Khách Cũ / Thân Thiết' : 'Khách Mới',
          totalOrders: c.allDealsCount,
          periodOrders: c.periodDeals.length,
          totalRevenue: c.allDealsRevenue,
          periodRevenue,
          lastOrderDate: formatYMD(new Date(c.lastWonTime)),
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue || b.totalOrders - a.totalOrders)
      .slice(0, 8);

    // 5. Calculate top products sold by this specific sale rep with commission
    const productMap = new Map<string, {
      productId: string;
      productName: string;
      category?: string;
      quantity: number;
      revenue: number;
      commissionEarned: number;
      dealsCount: number;
      percentage: number;
    }>();

    sDeals.forEach(d => {
      (d.products || []).forEach(p => {
        const pId = p.productId || p.productName || 'unknown';
        const pName = p.productName || 'Sản phẩm thủy sinh';
        const qty = Number(p.quantity) || 1;
        const rev = Number(p.total) || (Number(p.unitPrice) || Number((p as any).price) || 0) * qty || 0;
        const comm = calcProductComm(p);

        if (!productMap.has(pId)) {
          productMap.set(pId, {
            productId: pId,
            productName: pName,
            category: 'Cây Thủy Sinh & Phụ Kiện',
            quantity: 0,
            revenue: 0,
            commissionEarned: 0,
            dealsCount: 0,
            percentage: 0,
          });
        }
        const pEntry = productMap.get(pId)!;
        pEntry.quantity += qty;
        pEntry.revenue += rev;
        pEntry.commissionEarned += comm;
        pEntry.dealsCount += 1;
      });
    });

    const topProducts = Array.from(productMap.values())
      .map(p => ({
        ...p,
        percentage: sCurrRevenue > 0 ? Math.round((p.revenue / sCurrRevenue) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity);

    saleDrilldowns[s.id] = {
      user: {
        id: s.id,
        name: s.name,
        avatar: s.avatar,
        email: s.email,
        phone: s.phone,
        teamId: s.teamId,
        teamName: s.teamName || 'Team Kinh Doanh Cây & Phụ Kiện',
      },
      monthRevenue,
      monthDealsCount,
      totalDeals: sDeals.length,
      totalRevenue: sCurrRevenue,
      previousRevenue: sPrevRevenue,
      growthPercent: sGrowthPercent,
      avgRevenuePerDeal: sDeals.length > 0 ? Math.round(sCurrRevenue / sDeals.length) : 0,
      peakDay,
      customerStats: {
        totalCustomers: totalSaleCustInPeriod,
        newCustomersCount: sNewCustomersCount,
        returningCustomersCount: sReturningCustomersCount,
        newCustomerRevenue: sNewCustomerRevenue,
        returningCustomerRevenue: sReturningCustomerRevenue,
        retentionRate: sRetentionRate,
      },
      topCustomers,
      commission: {
        totalCommission,
        monthCommission,
        avgRate: commissionAvgRate,
      },
      topProducts,
      timeline,
      allDeals: sDeals.map(d => ({
        id: d.id,
        title: d.title,
        customerName: d.customerName,
        customerPhone: d.customerPhone,
        value: d.value,
        commission: calcDealComm(d),
        date: formatYMD(new Date(d.closedAt || d.stageUpdatedAt || d.createdAt)),
        products: (d.products || []).map(p => `${p.productName || 'Cây'} (x${p.quantity || 1})`),
      })),
    };
  });

  return NextResponse.json({
    period,
    comparison: {
      periodLabel,
      current: {
        label: currLabel,
        revenue: currRevenue,
        wonCount: currWonDeals.length,
        avgDealSize: currWonDeals.length > 0 ? Math.round(currRevenue / currWonDeals.length) : 0,
        startDate: formatYMD(currStart),
        endDate: formatYMD(currEnd),
      },
      previous: {
        label: prevLabel,
        revenue: prevRevenue,
        wonCount: prevWonDeals.length,
        avgDealSize: prevWonDeals.length > 0 ? Math.round(prevRevenue / prevWonDeals.length) : 0,
        startDate: formatYMD(prevStart),
        endDate: formatYMD(prevEnd),
      },
      diff: {
        revenueDiff: currRevenue - prevRevenue,
        revenueGrowth,
        wonCountDiff: currWonDeals.length - prevWonDeals.length,
        wonCountGrowth,
      },
      trendData,
    },
    saleDonut,
    productTop,
    customerRetention,
    saleDrilldowns,
  });
}
