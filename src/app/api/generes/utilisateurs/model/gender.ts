export const Gender = {
    Male: 'MALE',
    Female: 'FEMALE',
} as const;
export type Gender = typeof Gender[keyof typeof Gender];
