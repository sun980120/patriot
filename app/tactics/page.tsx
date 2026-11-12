import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { TacticsEditor } from '@/components/tactics/tactics-editor';
import { loadCurrentProfile } from '@/lib/profile-data';

export default async function TacticsPage() {
  const profileData = await loadCurrentProfile();

  if (profileData.mode === 'guest') {
    redirect('/login');
  }

  return (
    <AppShell sampleData={profileData.source === 'mock'} profile={profileData.profile} title="전술 보드">
      <TacticsEditor userName={profileData.profile.full_name} />
    </AppShell>
  );
}
