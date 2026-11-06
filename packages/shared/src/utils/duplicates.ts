import {
  DUPLICATE_RADIUS_M,
  DUPLICATE_WINDOW_DAYS,
  OPEN_COMPLAINT_STATUSES,
} from '../constants/complaint';
import type { Complaint } from '../schemas/complaint';
import type { DuplicateCandidate } from '../types/api';
import { distanceInMeters } from './location';

const DAY = 86_400_000;

// Open complaints in the same district that likely describe the same problem
export function findDuplicateCandidates(target: Complaint, all: Complaint[], limit = 5): DuplicateCandidate[] {
  if (target.mergedIntoId || !OPEN_COMPLAINT_STATUSES.includes(target.status)) return [];

  const targetTime = new Date(target.createdAt).getTime();

  return all
    .filter(
      (c) =>
        c.id !== target.id &&
        !c.mergedIntoId &&
        OPEN_COMPLAINT_STATUSES.includes(c.status) &&
        c.location.district === target.location.district
    )
    .map((c) => ({
      ...c,
      distanceM: target.point && c.point ? distanceInMeters(target.point, c.point) : null,
      sameAsset: !!target.assetId && target.assetId === c.assetId,
      sameCategory: c.category === target.category,
    }))
    .filter((c) => {
      const days = Math.abs(new Date(c.createdAt).getTime() - targetTime) / DAY;
      const near = c.distanceM !== null && c.distanceM <= DUPLICATE_RADIUS_M;
      return days <= DUPLICATE_WINDOW_DAYS && c.sameCategory && (near || c.sameAsset);
    })
    .sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity))
    .slice(0, limit);
}