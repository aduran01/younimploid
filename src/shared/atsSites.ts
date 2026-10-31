export type AdapterStatus = 'planned' | 'verified';

interface AtsSite {
  source: string;
  status: AdapterStatus;
  hosts: string[];
  // Domains whose subdomains also count, such as acme.myworkdayjobs.com.
  domains: string[];
}

// The registry seed from docs/SPEC.md. Each entry is verified when its adapter is built.
const SITES: Omit<AtsSite, 'status'>[] = [
  {
    source: 'greenhouse',
    hosts: ['boards.greenhouse.io', 'job-boards.greenhouse.io'],
    domains: [],
  },
  { source: 'lever', hosts: ['jobs.lever.co'], domains: [] },
  { source: 'ashby', hosts: ['jobs.ashbyhq.com'], domains: [] },
  { source: 'workday', hosts: [], domains: ['myworkdayjobs.com'] },
  { source: 'smartrecruiters', hosts: ['jobs.smartrecruiters.com'], domains: [] },
  { source: 'icims', hosts: [], domains: ['icims.com'] },
  { source: 'taleo', hosts: [], domains: ['taleo.net'] },
  { source: 'brassring', hosts: ['sjobs.brassring.com'], domains: [] },
  { source: 'jazzhr', hosts: [], domains: ['applytojob.com'] },
  { source: 'ultipro', hosts: [], domains: ['ultipro.com'] },
  { source: 'dayforce', hosts: [], domains: ['dayforcehcm.com'] },
  { source: 'eightfold', hosts: [], domains: ['eightfold.ai'] },
  { source: 'dover', hosts: ['app.dover.com'], domains: [] },
  { source: 'adp', hosts: ['workforcenow.adp.com', 'myjobs.adp.com'], domains: [] },
  { source: 'rippling', hosts: ['ats.rippling.com'], domains: [] },
  { source: 'jobvite', hosts: ['jobs.jobvite.com'], domains: [] },
];

// A site stays planned until its adapter's fixture tests pass.
const VERIFIED = new Set(['greenhouse', 'lever']);

export const ATS_SITES: AtsSite[] = SITES.map((site) => ({
  ...site,
  status: VERIFIED.has(site.source) ? 'verified' : 'planned',
}));

// The optional host permissions asked for from Settings (D-028).
export const ATS_HOST_PATTERNS: string[] = ATS_SITES.flatMap(({ hosts, domains }) => [
  ...hosts.map((host) => `https://${host}/*`),
  ...domains.map((domain) => `https://*.${domain}/*`),
]);

function findSite(url: string): AtsSite | null {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return null;
  }
  return (
    ATS_SITES.find(
      ({ hosts, domains }) =>
        hosts.includes(hostname) || domains.some((domain) => hostname.endsWith(`.${domain}`)),
    ) ?? null
  );
}

export function findAtsSource(url: string): string | null {
  return findSite(url)?.source ?? null;
}

export function isSupportedSite(url: string): boolean {
  return findSite(url)?.status === 'verified';
}
