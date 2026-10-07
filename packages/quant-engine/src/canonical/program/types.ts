export const PROGRAM_STATES = [
  'unimplemented',
  'formula-review',
  'implementation',
  'data-gated',
  'verified',
  'integrated',
  'retired',
] as const;

export const DELIVERY_STAGES = ['T0', 'T1', 'T2', 'T3', 'R'] as const;

export const DATA_REQUIREMENT_CODES = ['P', 'V', 'T', 'B', 'BM', 'OB', 'FND', 'M'] as const;

export const PROGRAM_VIEWS = ['Overlay', 'Pane', 'Market', 'Card', 'Pane or Overlay'] as const;

export const BACKLOG_STATUSES = [
  'Builder template',
  'Data and compliance gated',
  'Data-gated',
  'Existing adjacent data',
  'Existing adjacent feature',
  'Existing adjacent integrity logic',
  'Existing adjacent logic',
  'Existing adjacent metric',
  'Existing chart',
  'Existing component',
  'Existing partial logic',
  'Existing strategy',
  'Existing strategy metric',
  'Internal component',
  'Internal only',
  'Internal service',
  'New',
  'New builder output',
  'New builder primitive',
  'New composite',
  'New data-quality primitive',
  'New platform primitive',
  'New primitive',
  'New primitive, delayed',
  'New with caveat',
  'New with strong warning',
  'New, anchor dependent',
  'New, confirmed delay',
  'New, repaint-aware',
  'Research',
  'Research composite',
  'Research, endpoint sensitivity',
  'Research, subjective definition',
] as const;

export type ProgramState = (typeof PROGRAM_STATES)[number];
export type DeliveryStage = (typeof DELIVERY_STAGES)[number];
export type DataRequirementCode = (typeof DATA_REQUIREMENT_CODES)[number];
export type ProgramView = (typeof PROGRAM_VIEWS)[number];
export type BacklogStatus = (typeof BACKLOG_STATUSES)[number];

export interface ProgramEntry {
  readonly backlogId: `${Uppercase<string>}-${number}`;
  readonly canonicalId: string | null;
  readonly category: string;
  readonly name: string;
  readonly explanation: string;
  readonly outputsAndParameters: string;
  readonly view: ProgramView | null;
  readonly assetsAndData: string;
  readonly dataRequirements: readonly DataRequirementCode[];
  readonly stage: DeliveryStage;
  readonly status: BacklogStatus;
  readonly state: ProgramState;
}
