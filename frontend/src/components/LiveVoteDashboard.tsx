import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "../utils/errors";
import { Link } from "react-router-dom";
import { api, CandidateLiveStats, ElectionLiveDashboard, VoterParticipationStats } from "../api/client";
import CandidatePhoto from "./CandidatePhoto";
import VoterStatsPanel from "./VoterStatsPanel";
import ElectionTimer from "./ElectionTimer";
import { isUniqueVoteLeader } from "../utils/votes";

const POLL_INTERVAL_MS = 4000;
const CHART_COLORS = ["#1a3a5c", "#2d5a87", "#c4a035", "#0d7a55", "#6b4c9a", "#c45c3e"];

function buildDataSnapshot(data: {
  voter_stats?: VoterParticipationStats | null;
  elections?: ElectionLiveDashboard[];
}): string {
  return JSON.stringify({
    voter_stats: data.voter_stats,
    elections: (data.elections ?? []).map((e) => ({
      id: e.election_id,
      status: e.status,
      total: e.total_votes,
      candidates: e.candidates.map((c) => ({ id: c.id, votes: c.votes, pct: c.percentage })),
    })),
  });
}

type BarChartProps = {
  candidates: CandidateLiveStats[];
  total: number;
  animate: boolean;
};

function BarChart({ candidates, total, animate }: BarChartProps) {
  const maxVotes = Math.max(...candidates.map((c) => c.votes), 1);

  return (
    <div className="live-chart" role="img" aria-label="Graphique des votes par candidat">
      <div className="live-chart__bars">
        {candidates.map((c, index) => {
          const heightPct = (c.votes / maxVotes) * 100;
          const color = CHART_COLORS[index % CHART_COLORS.length];
          return (
            <div key={c.id} className="live-chart__column">
              <div className="live-chart__avatar">
                <CandidatePhoto
                  firstName={c.first_name}
                  lastName={c.last_name}
                  photoUrl={c.photo_url}
                  size="sm"
                />
              </div>
              <div className="live-chart__value">{c.votes}</div>
              <div className="live-chart__bar-track">
                <div
                  className={`live-chart__bar${animate ? " live-chart__bar--pulse" : ""}`}
                  style={{
                    height: `${heightPct}%`,
                    background: `linear-gradient(180deg, ${color}, ${color}cc)`,
                  }}
                  title={`${c.first_name} ${c.last_name} : ${c.votes} vote(s)`}
                />
              </div>
              <div className="live-chart__label">
                <span className="live-chart__name">{c.first_name}</span>
                <span className="live-chart__pct">{c.percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="live-chart__legend">
        Total : <strong>{total}</strong> vote{total !== 1 ? "s" : ""} enregistré{total !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

type DashboardBlockProps = {
  dashboard: ElectionLiveDashboard;
  animate: boolean;
};

function DashboardBlock({ dashboard, animate }: DashboardBlockProps) {
  const allVotes = dashboard.candidates.map((c) => c.votes);

  return (
    <div className="live-dashboard__block">
      <div className="live-dashboard__block-header">
        <div>
          <h3 className="live-dashboard__election-title">{dashboard.title}</h3>
          {dashboard.description && (
            <p className="live-dashboard__election-desc">{dashboard.description}</p>
          )}
        </div>
        <span className={`badge ${dashboard.status === "active" ? "active" : "closed"}`}>
          {dashboard.status === "active" ? "En direct" : "Clôturé"}
        </span>
      </div>

      <ElectionTimer
        startsAt={dashboard.starts_at}
        endsAt={dashboard.ends_at}
        status={dashboard.status}
      />

      <div className="live-dashboard__layout">
        <BarChart
          candidates={dashboard.candidates}
          total={dashboard.total_votes}
          animate={animate}
        />

        <div className="live-candidates">
          {dashboard.candidates.map((c) => {
            const isLeader = isUniqueVoteLeader(c.votes, allVotes);
            return (
            <article
              key={c.id}
              className={`live-candidate-card${isLeader ? " live-candidate-card--leader" : ""}`}
            >
              <CandidatePhoto
                firstName={c.first_name}
                lastName={c.last_name}
                photoUrl={c.photo_url}
                size="md"
              />
              <div className="live-candidate-card__body">
                <strong>{c.first_name} {c.last_name}</strong>
                {c.position && <span className="live-candidate-card__position">{c.position}</span>}
                {c.description && <p className="live-candidate-card__desc">{c.description}</p>}
              </div>
              <div className="live-candidate-card__votes">
                <span className={`live-candidate-card__count${animate ? " live-candidate-card__count--pulse" : ""}`}>
                  {c.votes}
                </span>
                <span className="live-candidate-card__pct">{c.percentage} %</span>
              </div>
            </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function LiveVoteDashboard() {
  const [dashboards, setDashboards] = useState<ElectionLiveDashboard[]>([]);
  const [voterStats, setVoterStats] = useState<VoterParticipationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animate, setAnimate] = useState(false);
  const lastSnapshotRef = useRef<string | null>(null);

  const fetchLive = useCallback(async (isInitial = false) => {
    try {
      const data = await api.getLiveDashboard();
      const snapshot = buildDataSnapshot(data);
      const hasChanged = snapshot !== lastSnapshotRef.current;
      lastSnapshotRef.current = snapshot;

      if (isInitial || hasChanged) {
        setDashboards(data.elections ?? []);
        setVoterStats(data.voter_stats ?? null);
      }

      setError(null);

      if (!isInitial && hasChanged) {
        setAnimate(true);
        setTimeout(() => setAnimate(false), 600);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLive(true);
    const interval = setInterval(() => fetchLive(false), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchLive]);

  return (
    <section className="live-dashboard">
      <div className="live-dashboard__header">
        <div>
          <p className="live-dashboard__eyebrow">Suivi en temps réel</p>
          <h2 className="live-dashboard__title">Candidats & votes en direct</h2>
        </div>
      </div>

      {loading && (
        <div className="live-dashboard__loading card">
          <div className="spinner" aria-hidden="true" />
          <p>Chargement des résultats en direct…</p>
        </div>
      )}

      {error && !loading && (
        <div className="alert alert--error">{error}</div>
      )}

      {!loading && voterStats && (
        <VoterStatsPanel stats={voterStats} animate={animate} />
      )}

      {!loading && !error && dashboards.length === 0 && (
        <div className="card live-dashboard__empty">
          <div className="empty-state">
            <div className="empty-state__icon">🗳️</div>
            <h3>Résultats indisponibles</h3>
            <p>Les résultats du scrutin ne sont pas disponibles pour le moment.</p>
            <Link to="/results" className="btn btn--ghost" style={{ marginTop: "1rem" }}>
              Page des résultats
            </Link>
          </div>
        </div>
      )}

      {!loading && dashboards.length > 0 && dashboards.map((dashboard) => (
        <DashboardBlock key={dashboard.election_id} dashboard={dashboard} animate={animate} />
      ))}
    </section>
  );
}
