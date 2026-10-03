import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, getCurrentUser, logAuditEvent } from '@/lib/db';
import { generateId, generateRandomPassword } from '@/lib/utils';
import { User, Role } from '@/types/crm';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = getCurrentUser(userId);
  const db = readDb();
  const searchParams = request.nextUrl.searchParams;
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  // Lọc danh sách users & teams theo phân quyền bảo mật chặt chẽ:
  // - ADMIN: Xem toàn bộ nhân sự công ty và toàn bộ teams.
  // - LEADER: CHỈ xem được số và thông tin (tên, gmail, sđt,...) của các thành viên trong Team của mình.
  //           TUYỆT ĐỐI KHÔNG xem ở các team khác và KHÔNG THỂ XEM giám đốc (ADMIN).
  // - SALE / STAFF: Chỉ xem thông tin của chính mình.
  let allowedUsers = db.users;
  let allowedTeams = db.teams;

  if (user.role === 'LEADER') {
    const leaderTeamId = user.teamId || db.teams.find(t => t.leaderId === user.id)?.id;
    allowedUsers = db.users.filter(u =>
      (u.teamId === leaderTeamId || u.id === user.id) && u.role !== 'ADMIN'
    );
    allowedTeams = db.teams.filter(t => t.id === leaderTeamId);
  } else if (user.role === 'SALE' || user.role === 'STAFF') {
    allowedUsers = db.users.filter(u => u.id === user.id);
    allowedTeams = db.teams.filter(t => t.id === user.teamId);
  }

  // Compute performance metrics for allowed users
  const userPerformance = allowedUsers.map(u => {
    let userDeals = db.deals.filter(d => d.assignedSaleId === u.id);
    let userLeads = db.leads.filter(l => l.assignedSaleId === u.id);

    if (dateFrom) {
      const start = new Date(dateFrom);
      userDeals = userDeals.filter(d => {
        const dTime = new Date(d.closedAt || d.stageUpdatedAt || d.createdAt).getTime();
        return dTime >= start.getTime();
      });
      userLeads = userLeads.filter(l => new Date(l.createdAt).getTime() >= start.getTime());
    }

    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      userDeals = userDeals.filter(d => {
        const dTime = new Date(d.closedAt || d.stageUpdatedAt || d.createdAt).getTime();
        return dTime <= end.getTime();
      });
      userLeads = userLeads.filter(l => new Date(l.createdAt).getTime() <= end.getTime());
    }

    const wonDeals = userDeals.filter(d => {
      const pipeline = db.pipelines.find(p => p.id === d.pipelineId);
      const stage = pipeline?.stages.find(s => s.id === d.stageId);
      return stage?.isWon;
    });

    const activeLeads = userLeads.filter(
      l => l.status !== 'WON' && l.status !== 'LOST'
    ).length;

    const actualRevenue = wonDeals.reduce((sum, d) => sum + d.value, 0);
    const kpiProgress = u.targetRevenue > 0 ? Math.round((actualRevenue / u.targetRevenue) * 100) : 0;

    return {
      ...u,
      activeLeads,
      wonDealsCount: wonDeals.length,
      actualRevenue,
      kpiProgress,
      password: u.password || '123456',
    };
  });

  return NextResponse.json({
    users: userPerformance,
    teams: allowedTeams,
  });
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = getCurrentUser(userId);

  if (user.role !== 'ADMIN' && user.role !== 'LEADER') {
    return NextResponse.json({ error: 'Chỉ Giám đốc và Quản lý mới có quyền tạo người dùng' }, { status: 403 });
  }

  const db = readDb();
  const body = await request.json();
  let { name, email, role = 'SALE', teamId, phone, targetRevenue = 150000000, targetDeals = 8, password } = body;

  if (!name || !email) {
    return NextResponse.json({ error: 'Họ tên và Email/Gmail là bắt buộc' }, { status: 400 });
  }

  // Quản lý (LEADER) chỉ có thể tạo tài khoản nhân viên SALE hoặc STAFF
  if (user.role === 'LEADER') {
    if (role === 'ADMIN' || role === 'LEADER') {
      role = 'SALE';
    }
    // Tự động gán vào Team của Quản lý nếu chưa chọn
    if (!teamId && user.teamId) {
      teamId = user.teamId;
    }
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = db.users.find(u => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return NextResponse.json(
      { error: 'Địa chỉ Gmail/Email này đã được cấp quyền trước đó trong hệ thống' },
      { status: 400 }
    );
  }

  const team = db.teams.find(t => t.id === teamId);

  // Mật khẩu: sử dụng mật khẩu được truyền vào (chữ và số ngẫu nhiên) hoặc tự sinh mã ngẫu nhiên
  const finalPassword = password && password.trim() ? password.trim() : generateRandomPassword(8);

  const newUser: User = {
    id: generateId('usr'),
    name: name.trim(),
    email: cleanEmail,
    role: role as Role,
    teamId: team?.id,
    teamName: team?.name,
    phone: phone || '',
    isLocked: false,
    password: finalPassword,
    targetRevenue: Number(targetRevenue) || 0,
    targetDeals: Number(targetDeals) || 0,
  };

  db.users.push(newUser);
  writeDb(db);

  logAuditEvent(
    user.id,
    user.name,
    'CREATE',
    'USER',
    newUser.id,
    `Cấp quyền truy cập CRM cho Gmail: ${newUser.email} (${newUser.name}) - Vai trò: ${newUser.role} - Mật khẩu cấp: ${newUser.password}`
  );

  return NextResponse.json({ user: newUser }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = getCurrentUser(userId);

  if (user.role !== 'ADMIN' && user.role !== 'LEADER') {
    return NextResponse.json({ error: 'Bạn không có quyền chỉnh sửa thông tin người dùng' }, { status: 403 });
  }

  const db = readDb();
  const body = await request.json();
  const { id, isLocked, targetRevenue, targetDeals, teamId, role, phone, name, password } = body;

  const uIndex = db.users.findIndex(u => u.id === id);
  if (uIndex === -1) {
    return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
  }

  const targetUser = db.users[uIndex];

  // Quản lý (LEADER) chỉ có quyền chỉnh sửa nhân sự trong đội nhóm của mình
  if (user.role === 'LEADER') {
    const leaderTeamId = user.teamId || db.teams.find(t => t.leaderId === user.id)?.id;
    if (targetUser.role === 'ADMIN' || (targetUser.teamId !== leaderTeamId && targetUser.id !== user.id)) {
      return NextResponse.json(
        { error: 'Quản lý chỉ có quyền chỉnh sửa nhân viên trong đội nhóm của mình' },
        { status: 403 }
      );
    }
  }

  if (name !== undefined) targetUser.name = name;
  if (phone !== undefined) targetUser.phone = phone;
  if (isLocked !== undefined && user.role === 'ADMIN') targetUser.isLocked = isLocked;
  if (role !== undefined && user.role === 'ADMIN') targetUser.role = role;
  if (password !== undefined && user.role === 'ADMIN' && password.trim()) {
    targetUser.password = password.trim();
  }
  if (targetRevenue !== undefined) targetUser.targetRevenue = Number(targetRevenue);
  if (targetDeals !== undefined) targetUser.targetDeals = Number(targetDeals);

  if (teamId !== undefined && user.role === 'ADMIN') {
    const team = db.teams.find(t => t.id === teamId);
    targetUser.teamId = team?.id;
    targetUser.teamName = team?.name;
  }

  writeDb(db);

  logAuditEvent(
    user.id,
    user.name,
    'UPDATE',
    'USER',
    id,
    `Cập nhật tài khoản/quyền hạn nhân viên: ${targetUser.name}`
  );

  return NextResponse.json({ user: targetUser });
}

export async function DELETE(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = getCurrentUser(userId);

  if (user.role !== 'ADMIN' && user.role !== 'LEADER') {
    return NextResponse.json({ error: 'Bạn không có quyền gỡ bỏ người dùng' }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Thiếu ID người dùng' }, { status: 400 });
  }

  if (id === user.id) {
    return NextResponse.json({ error: 'Không thể xóa tài khoản của chính bạn' }, { status: 400 });
  }

  const db = readDb();
  const targetIndex = db.users.findIndex(u => u.id === id);
  if (targetIndex === -1) {
    return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
  }

  const deletedUser = db.users[targetIndex];

  // Quản lý không được xóa Giám đốc, Quản lý khác hoặc nhân sự ngoài team của mình
  if (user.role === 'LEADER') {
    const leaderTeamId = user.teamId || db.teams.find(t => t.leaderId === user.id)?.id;
    if (deletedUser.role === 'ADMIN' || deletedUser.role === 'LEADER' || deletedUser.teamId !== leaderTeamId) {
      return NextResponse.json(
        { error: 'Quản lý chỉ có quyền gỡ nhân viên trong đội nhóm của mình và không thể gỡ Giám đốc hoặc Quản lý khác' },
        { status: 403 }
      );
    }
  }

  db.users.splice(targetIndex, 1);
  writeDb(db);

  logAuditEvent(
    user.id,
    user.name,
    'DELETE',
    'USER',
    id,
    `Gỡ bỏ quyền truy cập hệ thống của: ${deletedUser.name} (${deletedUser.email})`
  );

  return NextResponse.json({ success: true, message: 'Đã gỡ quyền truy cập thành công' });
}
