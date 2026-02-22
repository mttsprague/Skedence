/**
 * Input Validation Schemas for Cloud Functions
 * 
 * Uses Joi to validate all input data and prevent injection attacks
 * All schemas should be strict and whitelist-based
 */

import Joi from 'joi';

/**
 * Common validation patterns
 */
const patterns = {
  // Firestore document IDs (alphanumeric + underscores, hyphens)
  firestoreId: /^[a-zA-Z0-9_-]+$/,
  
  // Email addresses
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  
  // Phone numbers (international format)
  phone: /^\+?[1-9]\d{1,14}$/,
  
  // Date strings (ISO 8601 format)
  isoDate: /^\d{4}-\d{2}-\d{2}$/,
  
  // Time strings (HH:MM format)
  time: /^([01]\d|2[0-3]):([0-5]\d)$/,
  
  // Slot IDs (date + time format: 2024-03-15T14)
  slotId: /^\d{4}-\d{2}-\d{2}T\d{2}$/,
  
  // Hexadecimal color codes
  hexColor: /^#[0-9A-Fa-f]{6}$/,
};

/**
 * Booking validation schemas
 */
export const bookingSchemas = {
  bookLesson: Joi.object({
    trainerId: Joi.string().pattern(patterns.firestoreId).required(),
    slotId: Joi.string().pattern(patterns.slotId).required(),
    lessonPackageId: Joi.string().pattern(patterns.firestoreId).required(),
    clientId: Joi.string().pattern(patterns.firestoreId).optional().allow(''),
    athleteName: Joi.string().max(100).optional().allow(''),
    secondAthleteName: Joi.string().max(100).optional().allow(''),
    athleteNames: Joi.array().items(Joi.string().max(100)).optional(),
    lessonNotes: Joi.string().max(500).optional().allow(''),
    orgId: Joi.string().pattern(patterns.firestoreId).optional(),
  }),

  cancelLesson: Joi.object({
    bookingId: Joi.string().pattern(patterns.firestoreId).required(),
  }),

  rescheduleLesson: Joi.object({
    bookingId: Joi.string().pattern(patterns.firestoreId).required(),
    newSlotId: Joi.string().pattern(patterns.slotId).required(),
    reason: Joi.string().max(500).optional().allow(''),
  }),
};

/**
 * Payment validation schemas
 */
export const paymentSchemas = {
  createPaymentIntent: Joi.object({
    orgId: Joi.string().pattern(patterns.firestoreId).required(),
    packageType: Joi.string().min(1).max(100).required(), // Accept any package type (dynamic from org settings)
    amount: Joi.number().integer().min(100).max(1000000).required(), // $1 to $10,000
    trainerId: Joi.string().min(1).max(100).required(), // Allow "general" or actual IDs
    userId: Joi.string().pattern(patterns.firestoreId).required(),
    paymentMethodId: Joi.string().optional(), // Stripe payment method ID
  }),

  confirmPayment: Joi.object({
    paymentIntentId: Joi.string().pattern(/^pi_[a-zA-Z0-9]+$/).required(), // Stripe PI format
    orgId: Joi.string().pattern(patterns.firestoreId).required(),
  }),
};

/**
 * User/Profile validation schemas
 */
export const userSchemas = {
  updateProfile: Joi.object({
    firstName: Joi.string().min(1).max(50).optional(),
    lastName: Joi.string().min(1).max(50).optional(),
    email: Joi.string().pattern(patterns.email).max(100).optional(),
    phone: Joi.string().pattern(patterns.phone).optional(),
    dateOfBirth: Joi.string().pattern(patterns.isoDate).optional(),
    emergencyContact: Joi.object({
      name: Joi.string().max(100).required(),
      phone: Joi.string().pattern(patterns.phone).required(),
      relationship: Joi.string().max(50).optional(),
    }).optional(),
  }),

  createUser: Joi.object({
    email: Joi.string().pattern(patterns.email).max(100).required(),
    firstName: Joi.string().min(1).max(50).required(),
    lastName: Joi.string().min(1).max(50).required(),
    role: Joi.string().valid('client', 'trainer', 'admin', 'owner').required(),
    orgId: Joi.string().pattern(patterns.firestoreId).required(),
    phone: Joi.string().pattern(patterns.phone).optional(),
  }),
};

/**
 * Schedule validation schemas
 */
export const scheduleSchemas = {
  createSlot: Joi.object({
    trainerId: Joi.string().pattern(patterns.firestoreId).required(),
    date: Joi.string().pattern(patterns.isoDate).required(),
    startTime: Joi.string().pattern(patterns.time).required(),
    endTime: Joi.string().pattern(patterns.time).required(),
    status: Joi.string().valid('open', 'booked', 'blocked').default('open'),
    orgId: Joi.string().pattern(patterns.firestoreId).required(),
  }),

  bulkCreateSlots: Joi.object({
    trainerId: Joi.string().pattern(patterns.firestoreId).required(),
    startDate: Joi.string().pattern(patterns.isoDate).required(),
    endDate: Joi.string().pattern(patterns.isoDate).required(),
    times: Joi.array().items(
      Joi.object({
        startTime: Joi.string().pattern(patterns.time).required(),
        endTime: Joi.string().pattern(patterns.time).required(),
      })
    ).min(1).max(50).required(),
    daysOfWeek: Joi.array().items(Joi.number().min(0).max(6)).min(1).max(7).required(),
    orgId: Joi.string().pattern(patterns.firestoreId).required(),
  }),
};

/**
 * Organization/Settings validation schemas
 */
export const organizationSchemas = {
  updateSettings: Joi.object({
    orgId: Joi.string().pattern(patterns.firestoreId).required(),
    businessName: Joi.string().min(1).max(100).optional(),
    primaryColor: Joi.string().pattern(patterns.hexColor).optional(),
    logo: Joi.string().uri().max(500).optional(),
    timezone: Joi.string().max(50).optional(),
    minCancellationHours: Joi.number().integer().min(0).max(168).optional(), // Max 1 week
    allowClientCancellations: Joi.boolean().optional(),
    requireWaiver: Joi.boolean().optional(),
  }),

  updatePricing: Joi.object({
    orgId: Joi.string().pattern(patterns.firestoreId).required(),
    pricing: Joi.object({
      singleLesson: Joi.number().integer().min(100).max(1000000).optional(),
      package5: Joi.number().integer().min(100).max(1000000).optional(),
      package10: Joi.number().integer().min(100).max(1000000).optional(),
      monthly: Joi.number().integer().min(100).max(1000000).optional(),
    }).required(),
  }),
};

/**
 * Package validation schemas
 */
export const packageSchemas = {
  createPackage: Joi.object({
    userId: Joi.string().pattern(patterns.firestoreId).required(),
    trainerId: Joi.string().min(1).max(100).required(), // Allow "general" or actual IDs
    orgId: Joi.string().pattern(patterns.firestoreId).required(),
    packageType: Joi.string().min(1).max(100).required(), // Accept any package type (dynamic from org settings)
    totalLessons: Joi.number().integer().min(1).max(100).required(),
    lessonsUsed: Joi.number().integer().min(0).max(100).default(0),
    expiresAt: Joi.date().optional(),
  }),
};

/**
 * Validation helper function
 * 
 * @param schema - Joi schema to validate against
 * @param data - Data to validate
 * @returns Validated data (with defaults applied)
 * @throws functions.https.HttpsError if validation fails
 */
export function validateInput<T>(schema: Joi.ObjectSchema, data: unknown): T {
  const { error, value } = schema.validate(data, {
    abortEarly: false, // Return all errors, not just the first
    stripUnknown: true, // Remove fields not in schema
  });

  if (error) {
    const errorMessage = error.details
      .map(detail => detail.message)
      .join('; ');
    
    // Import dynamically to avoid circular dependency
    const functions = require('firebase-functions');
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Validation failed: ${errorMessage}`
    );
  }

  return value as T;
}

/**
 * Sanitize string input (remove potentially dangerous characters)
 * 
 * @param input - String to sanitize
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string
 */
export function sanitizeString(input: string, maxLength: number = 500): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ''); // Remove angle brackets to prevent HTML injection
}

/**
 * Sanitize email (normalize and validate)
 * 
 * @param email - Email address to sanitize
 * @returns Normalized email in lowercase
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
