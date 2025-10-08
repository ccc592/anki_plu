import { z } from 'zod';
import {
  CaptureRequestSchema,
  CaptureResponseSchema,
  CandidateCardSchema,
  SubmissionRequestSchema,
  SubmissionResponseSchema,
  SyncStatusSchema
} from './schemas';

export const CaptureStartMessageSchema = z.object({
  type: z.literal('capture:start'),
  payload: CaptureRequestSchema
});

export const CaptureReadyMessageSchema = z.object({
  type: z.literal('capture:ready'),
  payload: CaptureResponseSchema
});

export const QueueSubmissionMessageSchema = z.object({
  type: z.literal('submission:queue'),
  payload: z.object({
    captureId: z.string().uuid(),
    cards: z.array(CandidateCardSchema),
    request: SubmissionRequestSchema
  })
});

export const SubmissionResultMessageSchema = z.object({
  type: z.literal('submission:result'),
  payload: SubmissionResponseSchema
});

export const RetryCardMessageSchema = z.object({
  type: z.literal('submission:card-retry'),
  payload: z.object({
    captureId: z.string().uuid(),
    card: CandidateCardSchema
  })
});

export const CardStatusUpdateMessageSchema = z.object({
  type: z.literal('submission:card-status'),
  payload: z.object({
    captureId: z.string().uuid(),
    cardId: z.string().uuid(),
    status: CandidateCardSchema.shape.status,
    errorDetails: z.string().optional().nullable()
  })
});

export const SyncStatusMessageSchema = z.object({
  type: z.literal('sync:status'),
  payload: SyncStatusSchema
});

export const RuntimeMessageSchema = z.discriminatedUnion('type', [
  CaptureStartMessageSchema,
  CaptureReadyMessageSchema,
  QueueSubmissionMessageSchema,
  SubmissionResultMessageSchema,
  RetryCardMessageSchema,
  CardStatusUpdateMessageSchema,
  SyncStatusMessageSchema
]);

export type RuntimeMessage = z.infer<typeof RuntimeMessageSchema>;
export type RetryCardMessage = z.infer<typeof RetryCardMessageSchema>;

export const parseRuntimeMessage = (message: unknown): RuntimeMessage =>
  RuntimeMessageSchema.parse(message);

export const serializeRuntimeMessage = (message: RuntimeMessage): RuntimeMessage => message;
