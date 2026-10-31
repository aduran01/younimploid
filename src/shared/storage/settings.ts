import {
  KEYS,
  asBoolean,
  asFiniteNumber,
  asOneOf,
  asString,
  isRecord,
  read,
  serialized,
  write,
} from './core';

const AI_PROVIDERS = ['anthropic', 'openai'] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const DEFAULT_FIELD_DELAY_MS = 100;
const MAX_FIELD_DELAY_MS = 2000;

export interface PromptSettings {
  tone: string;
  length: string;
  instructions: string;
}

export interface Settings {
  autoStartOnHiringCafeTabs: boolean;
  autoAttachResume: boolean;
  // A single fixed delay for page stability, never randomized (D-020).
  fieldDelayMs: number;
  // Typed as false so nothing can enable it until a later session changes this deliberately.
  autoSubmit: false;
  aiProvider: AiProvider | null;
  aiApiKey: string;
  prompts: PromptSettings;
}

export type SettingsPatch = Partial<Omit<Settings, 'autoSubmit'>>;

export function normalizeSettings(raw: unknown): Settings {
  const source = isRecord(raw) ? raw : {};
  const prompts = isRecord(source.prompts) ? source.prompts : {};
  const delay = asFiniteNumber(source.fieldDelayMs) ?? DEFAULT_FIELD_DELAY_MS;
  return {
    autoStartOnHiringCafeTabs: asBoolean(source.autoStartOnHiringCafeTabs, true),
    autoAttachResume: asBoolean(source.autoAttachResume, true),
    fieldDelayMs: Math.min(Math.max(delay, 0), MAX_FIELD_DELAY_MS),
    autoSubmit: false,
    aiProvider: asOneOf(source.aiProvider, AI_PROVIDERS),
    aiApiKey: asString(source.aiApiKey),
    prompts: {
      tone: asString(prompts.tone),
      length: asString(prompts.length),
      instructions: asString(prompts.instructions),
    },
  };
}

export function defaultSettings(): Settings {
  return normalizeSettings(undefined);
}

export async function getSettings(): Promise<Settings> {
  return normalizeSettings(await read('local', KEYS.settings));
}

export function updateSettings(patch: SettingsPatch): Promise<Settings> {
  return serialized(KEYS.settings, async () => {
    const next = normalizeSettings({ ...(await getSettings()), ...patch });
    await write('local', KEYS.settings, next);
    return next;
  });
}
