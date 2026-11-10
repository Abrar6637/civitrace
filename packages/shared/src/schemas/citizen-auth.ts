import { z } from 'zod';
import { normalizePakistaniMobile } from '../utils/phone';

export const OTP_LENGTH = 6;
export const OTP_RESEND_SECONDS = 60;
export const OTP_EXPIRY_MINUTES = 5;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_REQUESTS_PER_10_MIN = 3;

export const otpRequestInputSchema = z.object({
  phone: z.string().refine((v) => normalizePakistaniMobile(v) !== null, {
    message: 'Enter a Pakistani mobile number, e.g. 03001234567',
  }),
});

export const otpVerifyInputSchema = z.object({
  phone: z.string(),
  code: z.string().regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `Enter the ${OTP_LENGTH}-digit code`),
});

export const citizenProfileInputSchema = z.object({
  name: z.string().trim().min(3, 'Enter your full name').max(80),
  displayName: z.string().trim().max(40).optional(), // shown publicly instead of the real name
  locale: z.enum(['en', 'ur']),
});

export type OtpRequestInput = z.infer<typeof otpRequestInputSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifyInputSchema>;
export type CitizenProfileInput = z.infer<typeof citizenProfileInputSchema>;