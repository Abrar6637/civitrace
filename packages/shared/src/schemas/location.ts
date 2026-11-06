import { z } from 'zod';

export const SETTLEMENT_TYPES = ['city', 'town', 'village'] as const;
export type SettlementType = (typeof SETTLEMENT_TYPES)[number];

// Exact GPS point. Public API mein yeh kabhi poora nahi dikhaya jayega.
export const geoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().nonnegative().optional(),
});

// UC ka number ya naam, kam az kam ek zaroori
export const unionCouncilSchema = z
  .object({
    number: z.string().trim().optional(),
    name: z.string().trim().optional(),
  })
  .refine((uc) => !!uc.number || !!uc.name, {
    message: 'Enter the Union Council number or name',
  });

// Shehar, qasba ya gaon
export const settlementSchema = z.object({
  type: z.enum(SETTLEMENT_TYPES),
  name: z.string().trim().min(2, 'Enter the city or village name'),
});

// Country > Province > District > Tehsil > Union Council > City/Village
export const locationRefSchema = z.object({
  country: z.string().default('PK'),
  province: z.string().min(1, 'Choose a province'),
  district: z.string().min(1, 'Choose a district'),
  tehsil: z.string().min(1, 'Choose a tehsil'),
  unionCouncil: unionCouncilSchema,
  settlement: settlementSchema,
  address: z.string().trim().max(200).optional(), // gali, mohalla, nishani
});

export type GeoPoint = z.infer<typeof geoPointSchema>;
export type UnionCouncil = z.infer<typeof unionCouncilSchema>;
export type Settlement = z.infer<typeof settlementSchema>;
export type LocationRef = z.infer<typeof locationRefSchema>;