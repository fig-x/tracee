import React from 'react';
import { guidedStartAPI } from '../../../services/api';
import type { GuidedStartCatalog, GuidedStartRole } from '../../../types/guidedStart';

import iconAnalyzer from '../../../assets/icon-analyzer.svg';
import iconCoder from '../../../assets/icon-coder.svg';
import iconExtractor from '../../../assets/icon-extractor.svg';
import iconOrchestrator from '../../../assets/icon-orchestrator.svg';
import iconPlanner from '../../../assets/icon-planner.svg';
import iconReviewer from '../../../assets/icon-reviewer.svg';
import iconRouter from '../../../assets/icon-router.svg';
import iconSynthesizer from '../../../assets/icon-synthesizer.svg';

const ROLE_ICONS: Record<string, string> = {
  analyst: iconAnalyzer,
  coder: iconCoder,
  extractor: iconExtractor,
  orchestrator: iconOrchestrator,
  planner: iconPlanner,
  reviewer: iconReviewer,
  router: iconRouter,
  synthesizer: iconSynthesizer,
};

interface Props {
  onSelectRole: (role: GuidedStartRole, analysisPromptCount: number) => void;
  onClose: () => void;
}

const GuidedPromptStart: React.FC<Props> = ({ onSelectRole, onClose }) => {
  const [catalog, setCatalog] = React.useState<GuidedStartCatalog | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    guidedStartAPI.getCatalog()
      .then((response) => {
        if (!response.roles || !Array.isArray(response.roles)) {
          setError('Guided start catalog has an unexpected format. The server may need a restart.');
          return;
        }
        setCatalog(response);
        setError(null);
      })
      .catch(() => setError('Failed to load guided start catalog.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="field__hint">Loading guided start...</div>;
  }

  if (error || !catalog) {
    return (
      <div className="guided-start guided-start--fallback">
        <div className="create-run__panel-note">
          {error ?? 'Guided start is unavailable right now.'}
        </div>
        <div className="guided-start__actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => {
              setLoading(true);
              guidedStartAPI.getCatalog()
                .then((response) => {
                  if (!response.roles || !Array.isArray(response.roles)) {
                    setError('Guided start catalog has an unexpected format.');
                    return;
                  }
                  setCatalog(response);
                  setError(null);
                })
                .catch(() => setError('Failed to load guided start catalog.'))
                .finally(() => setLoading(false));
            }}
          >
            Try again
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Start from blank prompt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="guided-start">
      <div className="guided-start__step-header">
        <span className="field__label">Choose an agent role</span>
        <span className="field__hint">
          Pick a common role to prefill your prompt with components based on real-world patterns.
        </span>
      </div>

      <div className="guided-start__role-grid">
        {catalog.roles.map((role) => {
          const icon = ROLE_ICONS[role.role_id];
          return (
            <button
              key={role.role_id}
              type="button"
              className="guided-start__role-card"
              onClick={() => onSelectRole(role, catalog.analysis_prompt_count)}
            >
              {icon && (
                <span
                  className="guided-start__role-icon"
                  style={{
                    WebkitMaskImage: `url("${icon}")`,
                    maskImage: `url("${icon}")`,
                  }}
                  aria-hidden
                />
              )}
              <span className="guided-start__role-title">{role.name}</span>
              <span className="guided-start__role-summary">{role.summary}</span>
              <span className="guided-start__role-meta">
                Based on {role.sample_size} agents
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GuidedPromptStart;
