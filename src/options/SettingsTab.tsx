import { useEffect, useState } from 'react';
import { getSettings, updateSettings, type Settings } from '../shared/storage/settings';

export function SettingsTab() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);

  if (!settings) return <p>Loading...</p>;

  const change = (patch: Parameters<typeof updateSettings>[0]) => {
    void updateSettings(patch).then(setSettings);
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Settings</h2>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={settings.autoStartOnHiringCafeTabs}
          onChange={(event) => change({ autoStartOnHiringCafeTabs: event.target.checked })}
        />
        Start automatically on tabs opened from HiringCafe
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={settings.autoAttachResume}
          onChange={(event) => change({ autoAttachResume: event.target.checked })}
        />
        Attach my resume automatically
      </label>
      <label className="block text-sm">
        Delay between fields, in milliseconds
        <input
          type="number"
          min={0}
          max={2000}
          step={50}
          className="mt-1 block w-32 rounded border border-gray-400 px-2 py-1"
          value={settings.fieldDelayMs}
          onChange={(event) => {
            const delay = event.target.valueAsNumber;
            if (Number.isFinite(delay)) change({ fieldDelayMs: delay });
          }}
        />
        <span className="mt-1 block text-gray-600">Gives slow pages time to keep up.</span>
      </label>
    </section>
  );
}
