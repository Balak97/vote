import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Alert from "../components/Alert";
import { getErrorMessage } from "../utils/errors";
import CandidatePhoto from "../components/CandidatePhoto";
import PageHero from "../components/PageHero";
import { api, Candidate } from "../api/client";
import { isUniqueVoteLeader } from "../utils/votes";

type ElectionResults = {
  election_id: number;
  title: string;
  status: string;
  results: Record<number, number>;
  candidates: Candidate[];
};

export default function ResultsPage() {
  const { electionId } = useParams<{ electionId?: string }>();
  const [data, setData] = useState<ElectionResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [electionId]);

  async function loadResults() {
    setError(null);
    setLoading(true);
    try {
      const parsedId = electionId ? Number(electionId) : NaN;
      const result = Number.isFinite(parsedId) && parsedId > 0
        ? await api.getResults(parsedId)
        : await api.getCurrentResults();
      setData(result);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(
        msg.toLowerCase().includes("aucun") || msg.includes("404")
          ? "Aucun résultat n'est publié pour le moment. L'administrateur doit cocher « Afficher les résultats au public »."
          : msg,
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const candidates = data?.candidates ?? [];
  const results = data?.results ?? {};
  const total = Object.values(results).reduce((a, b) => a + b, 0);
  const maxVotes = Math.max(...Object.values(results), 0);
  const isActive = data?.status === "active";
  const shareUrl = data
    ? `${window.location.origin}/results/${data.election_id}`
    : null;

  const sorted = [...candidates].sort(
    (a, b) => (results[b.id] ?? 0) - (results[a.id] ?? 0),
  );
  const allVoteCounts = Object.values(results);

  return (
    <>
      <PageHero
        eyebrow="Transparence électorale"
        title="Résultats du scrutin"
        subtitle={
          isActive
            ? "Dépouillement en cours pour l'élection ouverte — les chiffres évoluent en temps réel."
            : "Résultats officiels de l'élection clôturée."
        }
      />

      {loading && (
        <div className="card card--elevated">
          <div className="live-dashboard__loading">
            <div className="spinner" aria-hidden="true" />
            <p>Chargement des résultats…</p>
          </div>
        </div>
      )}

      {error && !loading && <Alert type="error">{error}</Alert>}

      {!loading && data && candidates.length > 0 && (
        <div className="card card--elevated">
          <div className="card__header">
            <div>
              <h2 className="card__title">{data.title}</h2>
              <p className="card__desc">
                {isActive ? "Scrutin en cours · répartition provisoire des voix" : "Répartition finale des voix par candidat"}
              </p>
              {!isActive && shareUrl && (
                <p className="card__desc" style={{ marginTop: "0.5rem" }}>
                  Lien à partager : <a href={shareUrl}>{shareUrl}</a>
                </p>
              )}
            </div>
            {isActive && <span className="badge active">En direct</span>}
            {!isActive && <span className="badge closed">Clôturé</span>}
          </div>

          <div className="result-bar-list">
            {sorted.map((c) => {
              const votes = results[c.id] ?? 0;
              const pct = total ? (votes / total) * 100 : 0;
              const barWidth = maxVotes ? (votes / maxVotes) * 100 : 0;
              const isLeader = isUniqueVoteLeader(votes, allVoteCounts);
              return (
                <div
                  key={c.id}
                  className={`result-bar-item${isLeader ? " result-bar-item--leader" : ""}`}
                >
                  <div className="result-bar-item__header">
                    <span className="result-bar-item__name" style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                      <CandidatePhoto
                        firstName={c.first_name}
                        lastName={c.last_name}
                        photoUrl={c.photo_url}
                        size="sm"
                      />
                      <span>
                        {isLeader && "🏆 "}
                        {c.first_name} {c.last_name}
                        {c.position && (
                          <span style={{ fontWeight: 400, color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                            {" "}— {c.position}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="result-bar-item__stats">
                      <strong>{votes}</strong> voix · {pct.toFixed(1)} %
                    </span>
                  </div>
                  <div className="result-bar">
                    <div
                      className="result-bar__fill"
                      style={{ width: `${barWidth}%` }}
                      role="progressbar"
                      aria-valuenow={votes}
                      aria-valuemin={0}
                      aria-valuemax={maxVotes}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="result-total">
            <span>Total des suffrages exprimés</span>
            <strong>{total} vote{total !== 1 ? "s" : ""}</strong>
          </div>
        </div>
      )}

      {!loading && data && candidates.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__icon">📭</div>
          <p>Aucun candidat inscrit pour cette élection.</p>
        </div>
      )}
    </>
  );
}
