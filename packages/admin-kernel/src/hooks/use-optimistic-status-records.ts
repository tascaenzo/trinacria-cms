import { useOptimistic } from "react";

interface StatusRecord {
  id: string;
  status: string;
}

interface OptimisticStatusUpdate<TStatus extends string> {
  id: string;
  status: TStatus;
}

/**
 * Many admin resources only mutate lifecycle status. This hook keeps that
 * optimistic update logic in one place instead of repeating array mappers.
 */
export function useOptimisticStatusRecords<TRecord extends StatusRecord>(
  records: readonly TRecord[]
) {
  return useOptimistic(
    records,
    (currentRecords, update: OptimisticStatusUpdate<TRecord["status"]>): readonly TRecord[] =>
      currentRecords.map((record) =>
        record.id === update.id ? { ...record, status: update.status } : record
      )
  );
}
