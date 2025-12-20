import { z } from 'zod';
import { insertInspectionSchema, insertCompanySchema, insertActionPlanSchema, insertInspectionPhotoSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  forbidden: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    user: {
      method: 'GET' as const,
      path: '/api/auth/user',
      responses: {
        200: z.object({
          id: z.string(),
          email: z.string().nullable(),
          firstName: z.string().nullable(),
          lastName: z.string().nullable(),
          profileImageUrl: z.string().nullable(),
        }),
        401: errorSchemas.notFound,
      },
    },
  },
  subscription: {
    current: {
      method: 'GET' as const,
      path: '/api/subscription',
      responses: {
        200: z.object({
          plan: z.object({
            id: z.number(),
            name: z.string(),
            slug: z.string(),
            monthlyLimit: z.number(),
            canUploadLogo: z.boolean(),
          }),
          usage: z.object({
            inspectionsThisMonth: z.number(),
            remaining: z.number(),
          }),
        }),
      },
    },
    plans: {
      method: 'GET' as const,
      path: '/api/subscription/plans',
      responses: {
        200: z.array(z.object({
          id: z.number(),
          name: z.string(),
          slug: z.string(),
          monthlyLimit: z.number(),
          canUploadLogo: z.boolean(),
          price: z.number(),
        })),
      },
    },
    checkout: {
      method: 'POST' as const,
      path: '/api/subscription/checkout',
      input: z.object({
        planSlug: z.string(),
      }),
      responses: {
        200: z.object({ url: z.string() }),
        400: errorSchemas.validation,
      },
    },
    portal: {
      method: 'POST' as const,
      path: '/api/subscription/portal',
      responses: {
        200: z.object({ url: z.string() }),
      },
    },
  },
  companies: {
    list: {
      method: 'GET' as const,
      path: '/api/companies',
      responses: {
        200: z.array(z.any()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/companies',
      input: insertCompanySchema,
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/companies/:id',
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/companies/:id',
      input: insertCompanySchema.partial(),
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
  },
  inspections: {
    list: {
      method: 'GET' as const,
      path: '/api/inspections',
      responses: {
        200: z.array(z.any()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/inspections',
      input: insertInspectionSchema,
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
        403: errorSchemas.forbidden,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/inspections/:id',
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/inspections/:id',
      input: insertInspectionSchema.partial(),
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/inspections/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    complete: {
      method: 'POST' as const,
      path: '/api/inspections/:id/complete',
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
    generatePdf: {
      method: 'GET' as const,
      path: '/api/inspections/:id/pdf',
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
  },
  photos: {
    list: {
      method: 'GET' as const,
      path: '/api/inspections/:inspectionId/photos',
      responses: {
        200: z.array(z.any()),
      },
    },
    upload: {
      method: 'POST' as const,
      path: '/api/inspections/:inspectionId/photos',
      input: insertInspectionPhotoSchema,
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/inspections/:inspectionId/photos/:photoId',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  actionPlans: {
    list: {
      method: 'GET' as const,
      path: '/api/inspections/:inspectionId/action-plans',
      responses: {
        200: z.array(z.any()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/inspections/:inspectionId/action-plans',
      input: insertActionPlanSchema,
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
      },
    },
    generateAI: {
      method: 'POST' as const,
      path: '/api/inspections/:inspectionId/action-plans/generate',
      responses: {
        200: z.array(z.any()),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/inspections/:inspectionId/action-plans/:planId',
      input: insertActionPlanSchema.partial(),
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
  },
  nrChecklists: {
    list: {
      method: 'GET' as const,
      path: '/api/nr-checklists',
      responses: {
        200: z.array(z.any()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/nr-checklists/:id',
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
  },
  stats: {
    dashboard: {
      method: 'GET' as const,
      path: '/api/stats/dashboard',
      responses: {
        200: z.object({
          totalInspections: z.number(),
          completedThisMonth: z.number(),
          pendingActionPlans: z.number(),
          averageScore: z.number(),
        }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type ValidationError = z.infer<typeof errorSchemas.validation>;
export type NotFoundError = z.infer<typeof errorSchemas.notFound>;
