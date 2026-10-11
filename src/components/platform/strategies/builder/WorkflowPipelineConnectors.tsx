'use client';

interface PipelineVerticalConnectorProps {
  readonly label?: string;
  readonly height?: string;
}

export function PipelineVerticalConnector({
  label = 'Flow from Data to Calculations',
  height = 'h-5 sm:h-6',
}: PipelineVerticalConnectorProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`flex w-full items-center justify-center ${height}`}
    >
      <svg className="h-full w-3 overflow-visible" viewBox="0 0 12 24" fill="none">
        <line
          x1="6"
          y1="0"
          x2="6"
          y2="24"
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
      </svg>
    </div>
  );
}

interface PipelineForkConnectorProps {
  readonly label?: string;
}

export function PipelineForkConnector({
  label = 'Flow from Setup to Execution',
}: PipelineForkConnectorProps) {
  return (
    <div role="img" aria-label={label} className="w-full">
      {/* Desktop 1-to-3 Trunk & Rounded Branching Fork */}
      <div className="relative hidden h-7 w-full sm:h-8 lg:block">
        <svg
          className="h-full w-full overflow-visible"
          viewBox="0 0 1000 32"
          fill="none"
          preserveAspectRatio="none"
        >
          {/* Central incoming trunk from Calculations bottom port */}
          <path
            d="M 500,0 L 500,12"
            stroke="rgba(255, 255, 255, 0.35)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* Central feeder line down to center card (While Trade Is Open) */}
          <path
            d="M 500,12 L 500,32"
            stroke="rgba(255, 255, 255, 0.35)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* Left orthogonal rounded branch to left card (Buy Logic) */}
          <path
            d="M 500,12 Q 500,18 492,18 L 175,18 Q 167,18 167,24 L 167,32"
            stroke="rgba(255, 255, 255, 0.35)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* Right orthogonal rounded branch to right card (Sell Logic) */}
          <path
            d="M 500,12 Q 500,18 508,18 L 825,18 Q 833,18 833,24 L 833,32"
            stroke="rgba(255, 255, 255, 0.35)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* Center junction dot */}
          <circle cx="500" cy="12" r="2.5" fill="#ffffff" />
        </svg>
      </div>

      {/* Mobile/Tablet Fallback: Clean vertical transition between tiers */}
      <div className="flex h-5 w-full items-center justify-center lg:hidden">
        <svg className="h-full w-3 overflow-visible" viewBox="0 0 12 20" fill="none">
          <line
            x1="6"
            y1="0"
            x2="6"
            y2="20"
            stroke="rgba(255, 255, 255, 0.35)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        </svg>
      </div>
    </div>
  );
}

export function PipelineSplitConnector({
  label = 'Flow from Data to Rules',
}: PipelineForkConnectorProps) {
  return (
    <div role="img" aria-label={label} className="w-full">
      {/* Desktop 1-to-2 Trunk & Rounded Branching Fork */}
      <div className="relative hidden h-7 w-full sm:h-8 md:block">
        <svg
          className="h-full w-full overflow-visible"
          viewBox="0 0 1000 32"
          fill="none"
          preserveAspectRatio="none"
        >
          {/* Central incoming trunk from Data & Indicators bottom port */}
          <path
            d="M 500,0 L 500,12"
            stroke="rgba(255, 255, 255, 0.35)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* Left orthogonal rounded branch to left card (Buy Rules center ~250) */}
          <path
            d="M 500,12 Q 500,18 492,18 L 258,18 Q 250,18 250,24 L 250,32"
            stroke="rgba(255, 255, 255, 0.35)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* Right orthogonal rounded branch to right card (Sell Rules center ~750) */}
          <path
            d="M 500,12 Q 500,18 508,18 L 742,18 Q 750,18 750,24 L 750,32"
            stroke="rgba(255, 255, 255, 0.35)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* Center junction dot */}
          <circle cx="500" cy="12" r="2.5" fill="#ffffff" />
        </svg>
      </div>

      {/* Mobile/Tablet Fallback: Clean vertical transition between tiers */}
      <div className="flex h-5 w-full items-center justify-center md:hidden">
        <svg className="h-full w-3 overflow-visible" viewBox="0 0 12 20" fill="none">
          <line
            x1="6"
            y1="0"
            x2="6"
            y2="20"
            stroke="rgba(255, 255, 255, 0.35)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        </svg>
      </div>
    </div>
  );
}
