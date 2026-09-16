import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getTeamMemberByEmail } from '@/lib/db/team-members';

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const member = await getTeamMemberByEmail(user.email);
  return NextResponse.json({ name: member?.name ?? null });
}
