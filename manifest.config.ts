import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'younimploid',
  version: '0.0.1',
  description: 'Job browser with review-first autofill.',
  action: { default_title: 'Open younimploid' },
  background: { service_worker: 'src/background/index.ts', type: 'module' },
});
