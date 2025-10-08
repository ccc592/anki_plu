import { z } from 'zod';

export const HeuristicTogglesSchema = z.object({
  explicitMarkers: z.boolean(),
  structureHints: z.boolean(),
  questionMarks: z.boolean(),
  listTable: z.boolean()
});

export const MediaPolicySchema = z.object({
  downloadExternal: z.boolean(),
  convertWebP: z.boolean(),
  concurrency: z.number().int().min(1).max(6),
  retryLimit: z.number().int().min(0).max(5),
  maxSizeMB: z.number().min(0).default(0)
});

export const HtmlAllowlistSchema = z.object({
  tags: z.array(z.string()),
  styles: z.array(z.string())
});

export const UserPreferencesSchema = z.object({
  defaultDeck: z.string().optional().nullable(),
  defaultModel: z.string().min(1),
  tagTemplate: z.string().min(1),
  heuristics: HeuristicTogglesSchema,
  htmlAllowlist: HtmlAllowlistSchema,
  mediaPolicy: MediaPolicySchema,
  shortcut: z.string().min(1),
  clipboardEnabled: z.boolean(),
  siteAllowlist: z.array(z.string()),
  siteBlocklist: z.array(z.string()),
  defaultImportMode: z.enum(['quick', 'full']).optional().default('quick'),
  quickImportPosition: z.enum(['bottom-right', 'bottom-left', 'top-right', 'top-left']).optional().default('bottom-right')
});

export const MediaAssetSchema = z.object({
  mediaId: z.string().min(1),
  sourceUrl: z.string().min(1),
  filename: z.string().optional(),
  state: z.enum(['pending', 'downloading', 'stored', 'failed']),
  failureReason: z.string().optional().nullable(),
  retries: z.number().int().min(0).default(0),
  contentType: z.string().optional(),
  sizeBytes: z.number().int().min(0).optional()
});

export const CandidateCardSchema = z.object({
  cardId: z.string().uuid(),
  frontHtml: z.string().min(1),
  backHtml: z.string().min(1),
  confidence: z.number().min(0).max(1),
  status: z.enum([
    'draft',
    'queued',
    'added',
    'duplicate',
    'failed:image',
    'failed:anki',
    'skipped:user'
  ]),
  selected: z.boolean().default(true),
  deckId: z.string().min(1).optional().nullable(),
  modelId: z.string().min(1).optional().nullable(),
  tags: z.array(z.string()),
  hash: z.string().regex(/^[a-f0-9]{12}$/),
  errorDetails: z.string().optional().nullable()
});

export const MediaAssetRefSchema = z.object({
  mediaId: z.string().min(1),
  tagName: z.string().min(1),
  attribute: z.string().min(1),
  original: z.string().min(1)
});

export const UserPreferencesSnapshotSchema = UserPreferencesSchema.extend({
  availableDecks: z.array(z.string()).optional(),
  availableModels: z.array(z.string()).optional()
});

export const SelectionCaptureSchema = z.object({
  captureId: z.string().uuid(),
  sourceUrl: z.string().url(),
  sourceTitle: z.string().max(256).optional().nullable(),
  capturedAt: z.string(),
  rawHtml: z.string(),
  textDigest: z.string().min(1),
  mediaManifest: z.array(MediaAssetRefSchema).optional(),
  configSnapshot: UserPreferencesSnapshotSchema
});

export const CaptureRequestSchema = z.object({
  sourceUrl: z.string().url(),
  pageTitle: z.string().max(256).optional().nullable(),
  htmlFragment: z.string().min(1),
  cards: z.array(CandidateCardSchema).optional(),
  heuristics: HeuristicTogglesSchema,
  configSnapshot: UserPreferencesSnapshotSchema
});

export const CaptureResponseSchema = z.object({
  captureId: z.string().uuid(),
  cards: z.array(CandidateCardSchema),
  media: z.array(MediaAssetSchema),
  configSnapshot: UserPreferencesSnapshotSchema.optional(),
  sourceHtml: z.string().optional()
});

export const SubmissionRequestSchema = z.object({
  captureId: z.string().uuid().optional(),
  selectedCardIds: z.array(z.string().uuid()),
  dedupeStrategy: z.enum(['respect', 'bypass']).default('respect'),
  mediaPolicy: MediaPolicySchema.optional()
});

export const SubmissionResponseSchema = z.object({
  captureId: z.string().uuid(),
  queuedCardIds: z.array(z.string().uuid()),
  summary: z.object({
    queued: z.number().int().min(0),
    duplicates: z.number().int().min(0),
    failures: z.number().int().min(0)
  })
});

export const SyncStatusSchema = z.object({
  availability: z.enum(['reachable', 'unreachable', 'unauthorized', 'timeout']),
  version: z.string().optional().nullable(),
  lastChecked: z.string(),
  whitelistMissing: z.boolean().optional(),
  retrySchedule: z
    .object({
      nextRetryAt: z.string(),
      exponent: z.number().int().min(0)
    })
    .optional(),
  recentErrors: z
    .array(
      z.object({
        timestamp: z.string(),
        message: z.string(),
        context: z.string().optional()
      })
    )
    .optional()
});

export type HeuristicToggles = z.infer<typeof HeuristicTogglesSchema>;
export type MediaPolicy = z.infer<typeof MediaPolicySchema>;
export type HtmlAllowlist = z.infer<typeof HtmlAllowlistSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type MediaAsset = z.infer<typeof MediaAssetSchema>;
export type CandidateCard = z.infer<typeof CandidateCardSchema>;
export type MediaAssetRef = z.infer<typeof MediaAssetRefSchema>;
export type UserPreferencesSnapshot = z.infer<typeof UserPreferencesSnapshotSchema>;
export type SelectionCapture = z.infer<typeof SelectionCaptureSchema>;
export type CaptureRequest = z.infer<typeof CaptureRequestSchema>;
export type CaptureResponse = z.infer<typeof CaptureResponseSchema>;
export type SubmissionRequest = z.infer<typeof SubmissionRequestSchema>;
export type SubmissionResponse = z.infer<typeof SubmissionResponseSchema>;
export type SyncStatus = z.infer<typeof SyncStatusSchema>;
