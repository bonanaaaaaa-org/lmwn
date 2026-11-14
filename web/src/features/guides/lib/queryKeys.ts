export const guideKeys = {
  all: ["guides"] as const,
  details: () => [...guideKeys.all, "detail"] as const,
  detail: (guideId: string) => [...guideKeys.details(), guideId] as const,
};
