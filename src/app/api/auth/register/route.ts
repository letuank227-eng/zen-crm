import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, logAuditEvent } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { User, Role } from '@/types/crm';

const VALID_COMPANY_CODES = ['ZEN2026', 'ZENCRM', 'ZEN', 'ZEN123'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, password, role = 'SALE', companyCode, teamId } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập Họ và Tên' }, { status: 400 });
    }

    if (!email?.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập Email công việc' }, { status: 400 });
    }

    if (!password || password.trim().length < 6) {
      return NextResponse.json(
        { error: 'Mật khẩu phải có ít nhất 6 ký tự' },
        { status: 400 }
      );
    }

    // Verify company activation code
    const normalizedCode = (companyCode || '').trim().toUpperCase();
    if (!VALID_COMPANY_CODES.includes(normalizedCode)) {
      return NextResponse.json(
        {
          error:
            'Mã kích hoạt công ty cấp không đúng. Để bảo mật dữ liệu nội bộ, vui lòng nhập mã bảo mật được cấp bởi công ty (Mã mặc định: ZEN2026)',
        },
        { status: 403 }
      );
    }

    const db = readDb();
    const cleanEmail = email.trim().toLowerCase();

    // Check email uniqueness
    const existing = db.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return NextResponse.json(
        { error: 'Email này đã được đăng ký trong hệ thống. Vui lòng dùng email khác hoặc đăng nhập.' },
        { status: 409 }
      );
    }

    const assignedRole: Role = ['SALE', 'STAFF', 'LEADER'].includes(role) ? role : 'SALE';
    const targetRevenue = assignedRole === 'SALE' ? 120000000 : assignedRole === 'LEADER' ? 300000000 : 0;
    const targetDeals = assignedRole === 'SALE' ? 10 : assignedRole === 'LEADER' ? 20 : 0;

    let selectedTeam = db.teams.find(t => t.id === teamId);
    if (!selectedTeam && db.teams.length > 0) {
      selectedTeam = db.teams[0];
    }

    const newUser: User = {
      id: generateId('usr'),
      name: name.trim(),
      email: cleanEmail,
      phone: phone?.trim() || '',
      role: assignedRole,
      password: password,
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80`,
      teamId: selectedTeam?.id,
      teamName: selectedTeam?.name,
      isLocked: false,
      targetRevenue,
      targetDeals,
    };

    db.users.push(newUser);
    writeDb(db);

    // Audit log
    logAuditEvent(
      newUser.id,
      newUser.name,
      'CREATE',
      'USER',
      newUser.id,
      `Đăng ký tài khoản nhân viên mới thành công: ${newUser.name} (${newUser.email}) - Vai trò: ${newUser.role} - Mã kích hoạt: ${normalizedCode}`
    );

    const safeUser = { ...newUser };
    delete safeUser.password;

    const response = NextResponse.json({
      success: true,
      message: 'Đăng ký tài khoản thành công',
      user: safeUser,
      token: `zen_sess_${newUser.id}_${Date.now()}`,
    }, { status: 201 });

    response.cookies.set('zen_crm_user_id', newUser.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi tạo tài khoản' },
      { status: 500 }
    );
  }
}
