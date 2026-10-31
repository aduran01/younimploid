import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'younimploid',
  version: '0.0.1',
  description: 'Side-panel autofill companion to hiring.cafe.',
  permissions: ['storage'],
  action: { default_title: 'Open younimploid' },
  background: { service_worker: 'src/background/index.ts', type: 'module' },
});
