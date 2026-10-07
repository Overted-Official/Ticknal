import type {
  BacklogStatus,
  DataRequirementCode,
  DeliveryStage,
  ProgramEntry,
  ProgramState,
  ProgramView,
} from '../types';

export type ProgramEntryTuple = readonly [
  backlogId: ProgramEntry['backlogId'],
  canonicalId: string | null,
  name: string,
  explanation: string,
  outputsAndParameters: string,
  view: ProgramView | null,
  assetsAndData: string,
  dataRequirements: readonly DataRequirementCode[],
  stage: DeliveryStage,
  status: BacklogStatus,
  state: ProgramState,
];

export function defineProgramCategory(
  category: string,
  rows: readonly ProgramEntryTuple[],
  integratedCanonicalIds?: readonly (string | null)[],
): readonly ProgramEntry[] {
  if (integratedCanonicalIds !== undefined && integratedCanonicalIds.length !== rows.length) {
    throw new Error(`Integrated canonical ID count mismatch for ${category}`);
  }
  return Object.freeze(
    rows.map(
      ([
        backlogId,
        canonicalId,
        name,
        explanation,
        outputsAndParameters,
        view,
        assetsAndData,
        dataRequirements,
        stage,
        status,
        state,
      ], index) =>
        Object.freeze({
          backlogId,
          canonicalId: integratedCanonicalIds?.[index] ?? canonicalId,
          category,
          name,
          explanation,
          outputsAndParameters,
          view,
          assetsAndData,
          dataRequirements: Object.freeze([...dataRequirements]),
          stage,
          status,
          state: integratedCanonicalIds === undefined || integratedCanonicalIds[index] === null ? state : 'integrated',
        }),
    ),
  );
}
