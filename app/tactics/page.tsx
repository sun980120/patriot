import { redirect } from 'next/navigation';
import { SiteNav } from '@/components/site-nav';
import { TacticsEditor } from '@/components/tactics/tactics-editor';
import { loadCurrentProfile } from '@/lib/profile-data';

export default async function TacticsPage() {
  const profileData = await loadCurrentProfile();

  if (profileData.mode === 'guest') {
    redirect('/login');
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SiteNav showLogout profile={profileData.profile} />
      <TacticsEditor userName={profileData.profile.full_name} />
    </main>
  );
}
