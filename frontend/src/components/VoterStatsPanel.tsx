import { VoterParticipationStats } from "../api/client";

type VoterStatsPanelProps = {
  stats: VoterParticipationStats;
  animate?: boolean;
};

export default function VoterStatsPanel({ stats, animate = false }: VoterStatsPanelProps) {
  return (
    <div className="voter-stats-panel">
      <div className="voter-stats-grid">
        <article className={`voter-stat-card voter-stat-card--total${animate ? " voter-stat-card--pulse" : ""}`}>
          <span className="voter-stat-card__value">{stats.total_electors}</span>
          <span className="voter-stat-card__label">Électeurs inscrits</span>
        </article>
        <article className={`voter-stat-card voter-stat-card--voted${animate ? " voter-stat-card--pulse" : ""}`}>
          <span className="voter-stat-card__value">{stats.voted_count}</span>
          <span className="voter-stat-card__label">Ont voté</span>
        </article>
        <article className={`voter-stat-card voter-stat-card--pending${animate ? " voter-stat-card--pulse" : ""}`}>
          <span className="voter-stat-card__value">{stats.pending_count}</span>
          <span className="voter-stat-card__label">En attente de vote</span>
        </article>
      </div>

      <div className="participation-bar">
        <div className="participation-bar__header">
          <span>Taux de participation</span>
          <strong>{stats.participation_rate} %</strong>
        </div>
        <div className="participation-bar__track">
          <div
            className={`participation-bar__fill${animate ? " participation-bar__fill--pulse" : ""}`}
            style={{ width: `${Math.min(stats.participation_rate, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
