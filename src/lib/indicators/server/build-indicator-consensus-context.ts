import {
  createIndicatorInputBundle,
  type IndicatorOutputFrame,
} from '@ticknal/quant-engine/canonical';

export interface IndicatorConsensusContextRequest {
  readonly consensusIndicatorId: string;
  readonly selectedIndicatorIds: readonly string[];
  readonly frames: readonly IndicatorOutputFrame[];
  readonly minimumCoverage: number;
  readonly minimumInputs: number;
  readonly dependenciesByIndicatorId?: Readonly<Record<string, readonly string[]>>;
}

function assertAcyclic(
  root: string,
  selected: readonly string[],
  dependencies: Readonly<Record<string, readonly string[]>>,
): void {
  if (selected.includes(root)) throw new Error('Indicator consensus cycle detected');
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (id === root || visiting.has(id)) throw new Error('Indicator consensus cycle detected');
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of dependencies[id] ?? []) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of selected) visit(id);
}

export function buildIndicatorConsensusContext(
  request: IndicatorConsensusContextRequest,
): Readonly<Record<string, IndicatorOutputFrame>> {
  assertAcyclic(
    request.consensusIndicatorId,
    request.selectedIndicatorIds,
    request.dependenciesByIndicatorId ?? {},
  );
  const framesById = new Map(request.frames.map((frame) => [frame.indicatorId, frame]));
  const accepted: Record<string, IndicatorOutputFrame> = {};
  for (const indicatorId of request.selectedIndicatorIds) {
    const frame = framesById.get(indicatorId);
    if (frame === undefined) continue;
    const score = frame.outputs.normalizedScore;
    const coverage = score === undefined || score.length === 0
      ? 0
      : score.filter((value) => typeof value === 'number' && Number.isFinite(value)).length / score.length;
    if (coverage >= request.minimumCoverage) accepted[indicatorId] = frame;
  }
  if (Object.keys(accepted).length < request.minimumInputs) {
    throw new Error('Indicator consensus coverage is below the required minimum');
  }
  return createIndicatorInputBundle({ indicatorOutputsById: accepted }).indicatorOutputsById;
}
