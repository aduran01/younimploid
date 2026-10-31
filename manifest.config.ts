import { defineManifest } from '@crxjs/vite-plugin';
import { ATS_HOST_PATTERNS } from './src/shared/atsSites.ts';

export default defineManifest({
  manifest_version: 3,
  name: 'younimploid',
  version: '0.0.1',
  description: 'Side-panel autofill companion to hiring.cafe.',
  permissions: ['storage', 'sidePanel', 'webNavigation', 'scripting'],
  // ATS sites are granted from Settings, and any other site on the fill button (D-026, D-028).
  optional_host_permissions: [...ATS_HOST_PATTERNS, 'https://*/*'],
  action: { default_title: 'Open younimploid' },
  background: { service_worker: 'src/background/index.ts', type: 'module' },
  options_page: 'src/options/index.html',
  side_panel: { default_path: 'src/sidepanel/index.html' },
  content_scripts: [
    {
      // Keep in step with src/shared/hiringCafe.ts.
      matches: [
        'https://hiring.cafe/*',
        'https://www.hiring.cafe/*',
        'https://hiringcafe.com/*',
        'https://www.hiringcafe.com/*',
      ],
      js: ['src/content/hiringcafe.ts'],
      run_at: 'document_idle',
    },
  ],
});
