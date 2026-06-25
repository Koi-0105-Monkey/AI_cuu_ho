const { z } = require('zod');

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().min(9, 'Phone number must be at least 9 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    emergencyContacts: z.array(
      z.object({
        name: z.string().min(2, 'Contact name must be at least 2 characters'),
        phone: z.string().min(9, 'Contact phone must be at least 9 characters'),
        relation: z.string().min(1, 'Relation is required')
      })
    ).min(1, 'At least one emergency contact is required')
  })
});

const loginSchema = z.object({
  body: z.object({
    phone: z.string().min(9, 'Phone number must be at least 9 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters')
  })
});

const startTripSchema = z.object({
  body: z.object({
    routeName: z.string().min(1, 'Route name is required'),
    expectedReturn: z.string().datetime('Expected return must be a valid ISO date'),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    battery: z.number().optional()
  })
});

const updateBatterySchema = z.object({
  body: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    battery: z.number().min(0).max(100)
  })
});

const gpsBatchSchema = z.object({
  body: z.array(
    z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      altitude: z.number().optional(),
      speed: z.number().optional(),
      heading: z.number().optional(),
      battery: z.number().optional(),
      recordedAt: z.string().datetime().optional()
    })
  )
});

const createIncidentSchema = z.object({
  body: z.object({
    type: z.enum(['CRASH', 'LOST', 'FIRE', 'MED', 'VEH', 'MANUAL']),
    severity: z.number().min(1).max(5),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    message: z.string().optional(),
    batteryAtTime: z.number().optional()
  })
});

module.exports = {
  registerSchema,
  loginSchema,
  startTripSchema,
  updateBatterySchema,
  gpsBatchSchema,
  createIncidentSchema
};
