import { useState } from 'react';
import { BackupTab } from './BackupTab';
import { ProfileTab } from './ProfileTab';
import { ResumeTab } from './ResumeTab';
import { SettingsTab } from './SettingsTab';
import { TrackerTab } from './TrackerTab';

const TABS = ['Profile', 'Resume', 'Settings', 'Tracker', 'Backup'] as const;
type Tab = (typeof TABS)[number];

export function App() {
  const [tab, setTab] = useState<Tab>('Profile');

  return (
    <main className={`mx-auto p-8 ${tab === 'Tracker' ? 'max-w-6xl' : 'max-w-3xl'}`}>
      <h1 className="text-2xl font-bold">younimploid</h1>
      <nav className="mt-4 flex gap-1 border-b border-gray-300" aria-label="Sections">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            aria-current={tab === name ? 'page' : undefined}
            className={`px-3 py-2 text-sm ${tab === name ? 'border-b-2 border-blue-700 font-semibold' : 'text-gray-600'}`}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </nav>
      <div className="mt-6">
        {tab === 'Profile' && <ProfileTab />}
        {tab === 'Resume' && <ResumeTab />}
        {tab === 'Settings' && <SettingsTab />}
        {tab === 'Tracker' && <TrackerTab />}
        {tab === 'Backup' && <BackupTab />}
      </div>
    </main>
  );
}
