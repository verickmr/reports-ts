import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('api'),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const loginInputSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(128),
});

export const authUserSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  name: z.string(),
  role: z.enum(['REQUESTER', 'AGENT']),
});

export const authResponseSchema = z.object({ user: authUserSchema });

export type LoginInput = z.infer<typeof loginInputSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const googleAuthAvailabilitySchema = z.object({ enabled: z.boolean() });
export type GoogleAuthAvailability = z.infer<
  typeof googleAuthAvailabilitySchema
>;

export const categorySchema = z.object({
  id: z.number().int().positive(),
  slug: z.string(),
  name: z.string(),
});

export const categoriesResponseSchema = z.array(categorySchema);

export type Category = z.infer<typeof categorySchema>;
export type CategoriesResponse = z.infer<typeof categoriesResponseSchema>;

export const createRequestInputSchema = z.strictObject({
  title: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1),
  categoryId: z.number().int().positive(),
});

export const requestStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED']);

export const requestSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  byStatus: z.object({
    OPEN: z.number().int().nonnegative(),
    IN_PROGRESS: z.number().int().nonnegative(),
    COMPLETED: z.number().int().nonnegative(),
  }),
});

export type RequestSummary = z.infer<typeof requestSummarySchema>;

export const createdRequestSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  description: z.string(),
  categoryId: z.number().int().positive(),
  requesterId: z.uuid(),
  status: requestStatusSchema,
  createdAt: z.iso.datetime(),
});

export type CreateRequestInput = z.infer<typeof createRequestInputSchema>;
export type CreatedRequest = z.infer<typeof createdRequestSchema>;

export const updateRequestInputSchema = createRequestInputSchema;
export type UpdateRequestInput = z.infer<typeof updateRequestInputSchema>;

export const listedRequestSchema = createdRequestSchema
  .pick({ id: true, title: true, status: true, createdAt: true })
  .extend({
    category: categorySchema.pick({ id: true, name: true }),
    requester: z.object({ id: z.uuid(), name: z.string() }),
  });

export const listedRequestsSchema = z.array(listedRequestSchema);
export type ListedRequests = z.infer<typeof listedRequestsSchema>;

export const listRequestsQuerySchema = z
  .strictObject({
    title: z.string().trim().min(1).max(150).optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    status: requestStatusSchema.optional(),
    createdFrom: z.iso.datetime().optional(),
    createdBefore: z.iso.datetime().optional(),
  })
  .refine(
    ({ createdFrom, createdBefore }) =>
      !createdFrom ||
      !createdBefore ||
      Date.parse(createdFrom) < Date.parse(createdBefore),
    { path: ['createdBefore'], message: 'O fim deve ser após o início.' },
  );

export type ListRequestsQuery = z.infer<typeof listRequestsQuerySchema>;

export const requestIdSchema = z
  .string()
  .regex(/^[1-9]\d*$/)
  .transform(Number)
  .pipe(z.number().int().positive());

export const requestDetailSchema = listedRequestSchema.extend({
  description: z.string(),
  updatedAt: z.iso.datetime(),
});

export type RequestDetail = z.infer<typeof requestDetailSchema>;

export const updateRequestStatusSchema = z.strictObject({
  status: requestStatusSchema,
});

export type UpdateRequestStatusInput = z.infer<
  typeof updateRequestStatusSchema
>;
