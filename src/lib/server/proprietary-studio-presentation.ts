import { TYPHON_BLUEPRINT_NODES, type AdvancedStrategyNode } from '@/components/platform/strategies/builder/advanced-strategy-model';
import { STRATEGY_PROFILES, STRATEGY_PROFILE_ARABIC, type StrategyProfile } from '@/components/platform/strategies/builder/strategy-builder-fixtures';

export interface ProprietaryStudioProfile extends StrategyProfile {
  readonly nameAr: string;
}

export interface ProprietaryStudioPresentation {
  readonly profiles: readonly ProprietaryStudioProfile[];
  readonly typhonNodes: readonly AdvancedStrategyNode[];
}

const profiles: readonly ProprietaryStudioProfile[] = STRATEGY_PROFILES.map((profile) => ({
  ...profile,
  nameAr: STRATEGY_PROFILE_ARABIC[profile.id].name,
}));

export function getProprietaryStudioPresentation(canView: boolean): ProprietaryStudioPresentation {
  return canView
    ? { profiles, typhonNodes: TYPHON_BLUEPRINT_NODES }
    : { profiles: [], typhonNodes: [] };
}
