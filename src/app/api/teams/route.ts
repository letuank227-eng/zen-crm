import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, getCurrentUser, logAuditEvent } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { Team } from '@/types/crm';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);
  const db = await readDb();

  let targetTeams = db.teams;
  if (user.role === 'LEADER') {
    const leaderTeamId = user.teamId || db.teams.find(t => t.leaderId === user.id)?.id;
    targetTeams = db.teams.filter(t => t.id === leaderTeamId);
  } else if (user.role === 'SALE' || user.role === 'STAFF') {
    targetTeams = db.teams.filter(t => t.id === user.teamId);
  }

  const enrichedTeams = targetTeams.map(t => {
    const leader = db.users.find(u => u.id === t.leaderId && u.role !== 'ADMIN');
    const members = db.users.filter(u => u.teamId === t.id && u.role !== 'ADMIN');
    return {
      ...t,
      leaderName: leader?.name || 'Chưa gán',
      leaderEmail: leader?.email || '',
      membersCount: members.length,
      members: members.map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
      })),
    };
  });

  return NextResponse.json({ teams: enrichedTeams });
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);

  if (user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Chỉ Giám đốc (Admin) mới có quyền tạo nhóm sale mới' },
      { status: 403 }
    );
  }

  const db = await readDb();
  const body = await request.json();
  const { name, leaderId, targetRevenue = 300000000 } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Tên nhóm sale là bắt buộc' }, { status: 400 });
  }

  const cleanName = name.trim();
  const existing = db.teams.find(t => t.name.toLowerCase() === cleanName.toLowerCase());
  if (existing) {
    return NextResponse.json(
      { error: 'Tên nhóm này đã tồn tại trong hệ thống' },
      { status: 400 }
    );
  }

  const newTeamId = generateId('team');
  const newTeam: Team = {
    id: newTeamId,
    name: cleanName,
    leaderId: leaderId || '',
    targetRevenue: Number(targetRevenue) || 0,
  };

  // Nếu đã chọn leader, cập nhật teamId, teamName và nâng role lên LEADER nếu đang là SALE
  if (leaderId) {
    const leaderUser = db.users.find(u => u.id === leaderId);
    if (leaderUser) {
      leaderUser.teamId = newTeamId;
      leaderUser.teamName = cleanName;
      if (leaderUser.role === 'SALE') {
        leaderUser.role = 'LEADER';
      }
    }
  }

  db.teams.push(newTeam);
  await writeDb(db);

  await logAuditEvent(
    user.id,
    user.name,
    'CREATE',
    'USER',
    newTeamId,
    `Tạo nhóm kinh doanh mới: ${newTeam.name} - Quản lý: ${leaderId || 'Chưa gán'} - Chỉ tiêu: ${newTeam.targetRevenue} ₫`
  );

  return NextResponse.json({ team: newTeam }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);

  if (user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Chỉ Giám đốc (Admin) mới có quyền chỉnh sửa nhóm kinh doanh' },
      { status: 403 }
    );
  }

  const db = await readDb();
  const body = await request.json();
  const { id, name, leaderId, targetRevenue } = body;

  if (!id) {
    return NextResponse.json({ error: 'Thiếu ID nhóm' }, { status: 400 });
  }

  const teamIndex = db.teams.findIndex(t => t.id === id);
  if (teamIndex === -1) {
    return NextResponse.json({ error: 'Không tìm thấy nhóm' }, { status: 404 });
  }

  const team = db.teams[teamIndex];
  const oldName = team.name;

  if (name && name.trim()) {
    team.name = name.trim();
    // Cập nhật tên team cho toàn bộ thành viên đang ở nhóm này
    db.users.forEach(u => {
      if (u.teamId === id) {
        u.teamName = team.name;
      }
    });
  }

  if (leaderId !== undefined) {
    team.leaderId = leaderId;
    if (leaderId) {
      const leaderUser = db.users.find(u => u.id === leaderId);
      if (leaderUser) {
        leaderUser.teamId = id;
        leaderUser.teamName = team.name;
        if (leaderUser.role === 'SALE') {
          leaderUser.role = 'LEADER';
        }
      }
    }
  }

  if (targetRevenue !== undefined) {
    team.targetRevenue = Number(targetRevenue) || 0;
  }

  await writeDb(db);

  await logAuditEvent(
    user.id,
    user.name,
    'UPDATE',
    'USER',
    id,
    `Cập nhật nhóm kinh doanh: ${team.name} (Tên cũ: ${oldName})`
  );

  return NextResponse.json({ team });
}

export async function DELETE(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || undefined;
  const user = await getCurrentUser(userId);

  if (user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Chỉ Giám đốc (Admin) mới có quyền xóa nhóm kinh doanh' },
      { status: 403 }
    );
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Thiếu ID nhóm cần xóa' }, { status: 400 });
  }

  const db = await readDb();
  const teamIndex = db.teams.findIndex(t => t.id === id);
  if (teamIndex === -1) {
    return NextResponse.json({ error: 'Không tìm thấy nhóm' }, { status: 404 });
  }

  const deletedTeam = db.teams[teamIndex];

  // Gỡ liên kết team khỏi các user thuộc nhóm này
  db.users.forEach(u => {
    if (u.teamId === id) {
      u.teamId = undefined;
      u.teamName = undefined;
    }
  });

  db.teams.splice(teamIndex, 1);
  await writeDb(db);

  await logAuditEvent(
    user.id,
    user.name,
    'DELETE',
    'USER',
    id,
    `Xóa nhóm kinh doanh: ${deletedTeam.name}`
  );

  return NextResponse.json({ success: true, message: 'Đã xóa nhóm kinh doanh thành công' });
}
