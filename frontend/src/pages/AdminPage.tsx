import { FormEvent, useEffect, useState } from "react";
import Alert from "../components/Alert";
import CandidatePhoto from "../components/CandidatePhoto";
import PageHero from "../components/PageHero";
import { api, Candidate, Election, Voter } from "../api/client";
import {
  defaultElectionEndsAt,
  defaultElectionStartsAt,
  formatDateTimeFr,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "../utils/datetime";

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("admin_token"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [voters, setVoters] = useState<Voter[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const [electionTitle, setElectionTitle] = useState("");
  const [electionDesc, setElectionDesc] = useState("");
  const [electionStartsAt, setElectionStartsAt] = useState(() => defaultElectionStartsAt());
  const [electionEndsAt, setElectionEndsAt] = useState(() => defaultElectionEndsAt());
  const [editingElectionId, setEditingElectionId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");
  const [candidateFirst, setCandidateFirst] = useState("");
  const [candidateLast, setCandidateLast] = useState("");
  const [candidatePosition, setCandidatePosition] = useState("");
  const [candidatePhoto, setCandidatePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      refreshData(token);
    }
  }, [token]);

  async function refreshData(authToken: string) {
    const [v, e] = await Promise.all([
      api.listVoters(authToken),
      api.listElections(authToken),
    ]);
    setVoters(v);
    setElections(e);
    if (selectedElection) {
      const c = await api.listCandidatesAdmin(selectedElection, authToken);
      setCandidates(c);
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.adminLogin(username, password);
      localStorage.setItem("admin_token", res.access_token);
      setToken(res.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handleImport(file: File) {
    if (!token) return;
    setError(null);
    setMessage(null);
    try {
      const res = await api.importVoters(file, token);
      setMessage(`${res.imported} électeur(s) importé(s). ${res.skipped.length} ignoré(s).`);
      await refreshData(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handleCreateElection(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    try {
      await api.createElection(
        electionTitle,
        electionDesc || null,
        fromDatetimeLocalValue(electionStartsAt),
        fromDatetimeLocalValue(electionEndsAt),
        token,
      );
      setElectionTitle("");
      setElectionDesc("");
      setElectionStartsAt(defaultElectionStartsAt());
      setElectionEndsAt(defaultElectionEndsAt());
      await refreshData(token);
      setMessage("Élection créée avec succès.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handleCreateCandidate(e: FormEvent) {
    e.preventDefault();
    if (!token || !selectedElection) return;
    setError(null);
    try {
      await api.createCandidate(
        {
          election_id: selectedElection,
          first_name: candidateFirst,
          last_name: candidateLast,
          position: candidatePosition || undefined,
        },
        token,
        candidatePhoto,
      );
      setCandidateFirst("");
      setCandidateLast("");
      setCandidatePosition("");
      setCandidatePhoto(null);
      setPhotoPreview(null);
      await refreshData(token);
      setMessage("Candidat ajouté.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handleActivate(id: number) {
    if (!token) return;
    try {
      await api.activateElection(id, token);
      await refreshData(token);
      setMessage("Le vote est maintenant ouvert.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handleClose(id: number) {
    if (!token) return;
    try {
      await api.closeElection(id, token);
      await refreshData(token);
      setMessage("Élection clôturée. Les résultats sont disponibles.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  function startEditElection(e: Election) {
    setEditingElectionId(e.id);
    setEditTitle(e.title);
    setEditDesc(e.description ?? "");
    setEditStartsAt(toDatetimeLocalValue(e.starts_at));
    setEditEndsAt(toDatetimeLocalValue(e.ends_at));
  }

  function cancelEditElection() {
    setEditingElectionId(null);
  }

  async function handleUpdateElection(ev: FormEvent, election: Election) {
    ev.preventDefault();
    if (!token) return;
    setError(null);
    try {
      const payload: {
        title: string;
        description: string | null;
        starts_at?: string;
        ends_at: string;
      } = {
        title: editTitle,
        description: editDesc || null,
        ends_at: fromDatetimeLocalValue(editEndsAt),
      };
      if (election.status !== "active") {
        payload.starts_at = fromDatetimeLocalValue(editStartsAt);
      }
      await api.updateElection(election.id, payload, token);
      setEditingElectionId(null);
      await refreshData(token);
      setMessage("Élection mise à jour.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handlePhotoUpdate(candidateId: number, file: File) {
    if (!token) return;
    setError(null);
    try {
      await api.uploadCandidatePhoto(candidateId, file, token);
      await refreshData(token);
      setMessage("Photo mise à jour.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  function handlePhotoSelect(file: File | undefined) {
    if (!file) {
      setCandidatePhoto(null);
      setPhotoPreview(null);
      return;
    }
    setCandidatePhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function logout() {
    localStorage.removeItem("admin_token");
    setToken(null);
  }

  const votedCount = voters.filter((v) => v.has_voted).length;
  const activeElections = elections.filter((e) => e.status === "active").length;

  if (!token) {
    return (
      <div className="login-card">
        <div className="card card--elevated">
          <div className="login-card__logo">
            <span aria-hidden="true">⚙️</span>
          </div>
          <PageHero
            title="Administration"
            subtitle="Connectez-vous pour gérer les électeurs, candidats et scrutins."
          />
          {error && <Alert type="error">{error}</Alert>}
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="username">Identifiant</label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Mot de passe</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <button type="submit" className="btn--block btn--lg">Se connecter</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="admin-header">
        <PageHero
          eyebrow="Console administrateur"
          title="Gestion du scrutin"
          subtitle="Importez les électeurs, configurez les candidats et pilotez le déroulement du vote."
        />
        <button className="secondary" onClick={logout}>Déconnexion</button>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-card__value">{voters.length}</span>
          <span className="stat-card__label">Électeurs inscrits</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{votedCount}</span>
          <span className="stat-card__label">Ont déjà voté</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{elections.length}</span>
          <span className="stat-card__label">Élections</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{activeElections}</span>
          <span className="stat-card__label">En cours</span>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <div>
            <h2 className="card__title">Import des électeurs</h2>
            <p className="card__desc">Fichier Excel (.xlsx) avec les colonnes requises</p>
          </div>
        </div>
        <div className="file-upload">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
            aria-label="Importer un fichier Excel"
          />
          <div className="file-upload__icon" aria-hidden="true">📁</div>
          <p className="file-upload__title">Glissez ou cliquez pour importer</p>
          <p className="file-upload__hint">
            Colonnes : <code>email</code> · <code>telephone</code> · <code>nom</code> · <code>prenom</code>
          </p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card__header">
            <h2 className="card__title">Nouvelle élection</h2>
          </div>
          <form onSubmit={handleCreateElection}>
            <div className="form-group">
              <label htmlFor="title">Titre du scrutin</label>
              <input
                id="title"
                value={electionTitle}
                onChange={(e) => setElectionTitle(e.target.value)}
                placeholder="Ex. Élection du délégué 2026"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="desc">Description</label>
              <textarea
                id="desc"
                value={electionDesc}
                onChange={(e) => setElectionDesc(e.target.value)}
                placeholder="Informations complémentaires (optionnel)"
                rows={3}
              />
            </div>
            <div className="form-group">
              <label htmlFor="starts-at">Date et heure d&apos;ouverture</label>
              <input
                id="starts-at"
                type="datetime-local"
                value={electionStartsAt}
                onChange={(e) => setElectionStartsAt(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="ends-at">Date et heure de fermeture</label>
              <input
                id="ends-at"
                type="datetime-local"
                value={electionEndsAt}
                onChange={(e) => setElectionEndsAt(e.target.value)}
                required
              />
              <p className="form-hint">La fermeture sera automatique à cette date (page d&apos;accueil).</p>
            </div>
            <button type="submit">Créer l&apos;élection</button>
          </form>
        </div>

        <div className="card">
          <div className="card__header">
            <h2 className="card__title">Ajouter un candidat</h2>
          </div>
          <form onSubmit={handleCreateCandidate}>
            <div className="form-group">
              <label htmlFor="sel-election">Élection</label>
              <select
                id="sel-election"
                value={selectedElection ?? ""}
                onChange={async (e) => {
                  const id = Number(e.target.value);
                  setSelectedElection(id || null);
                  if (id && token) {
                    setCandidates(await api.listCandidatesAdmin(id, token));
                  }
                }}
                required
              >
                <option value="">— Choisir —</option>
                {elections.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="c-first">Prénom</label>
              <input id="c-first" value={candidateFirst} onChange={(e) => setCandidateFirst(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="c-last">Nom</label>
              <input id="c-last" value={candidateLast} onChange={(e) => setCandidateLast(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="c-pos">Poste / fonction</label>
              <input id="c-pos" value={candidatePosition} onChange={(e) => setCandidatePosition(e.target.value)} placeholder="Optionnel" />
            </div>
            <div className="form-group">
              <label htmlFor="c-photo">Photo du candidat</label>
              <input
                id="c-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handlePhotoSelect(e.target.files?.[0])}
              />
              <p className="form-hint">JPG, PNG ou WebP — max 5 Mo</p>
              {photoPreview && (
                <div className="photo-preview">
                  <img src={photoPreview} alt="Aperçu" />
                  <span>Aperçu de la photo</span>
                </div>
              )}
            </div>
            <button type="submit">Ajouter le candidat</button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <h2 className="card__title">Liste des électeurs</h2>
        </div>
        {voters.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">👥</div>
            <p>Aucun électeur importé. Commencez par importer un fichier Excel.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {voters.map((v) => (
                  <tr key={v.id}>
                    <td><strong>{v.first_name} {v.last_name}</strong></td>
                    <td>{v.email}</td>
                    <td>{v.phone}</td>
                    <td>
                      <span className={`status-dot status-dot--${v.has_voted ? "yes" : "no"}`} />
                      {v.has_voted ? "A voté" : "En attente"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card__header">
          <h2 className="card__title">Élections</h2>
        </div>
        {elections.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">🗳️</div>
            <p>Aucune élection créée pour le moment.</p>
          </div>
        ) : (
          elections.map((e) => (
            <article key={e.id} className="election-item">
              {editingElectionId === e.id ? (
                <form onSubmit={(ev) => handleUpdateElection(ev, e)}>
                  <div className="form-group">
                    <label htmlFor={`edit-title-${e.id}`}>Titre</label>
                    <input
                      id={`edit-title-${e.id}`}
                      value={editTitle}
                      onChange={(ev) => setEditTitle(ev.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor={`edit-desc-${e.id}`}>Description</label>
                    <textarea
                      id={`edit-desc-${e.id}`}
                      value={editDesc}
                      onChange={(ev) => setEditDesc(ev.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor={`edit-starts-${e.id}`}>Ouverture</label>
                    <input
                      id={`edit-starts-${e.id}`}
                      type="datetime-local"
                      value={editStartsAt}
                      onChange={(ev) => setEditStartsAt(ev.target.value)}
                      required
                      disabled={e.status === "active"}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor={`edit-ends-${e.id}`}>Fermeture</label>
                    <input
                      id={`edit-ends-${e.id}`}
                      type="datetime-local"
                      value={editEndsAt}
                      onChange={(ev) => setEditEndsAt(ev.target.value)}
                      required
                    />
                  </div>
                  <div className="btn-row">
                    <button type="submit">Enregistrer</button>
                    <button type="button" className="secondary" onClick={cancelEditElection}>
                      Annuler
                    </button>
                  </div>
                </form>
              ) : (
                <>
              <div className="election-item__head">
                <span className="election-item__title">{e.title}</span>
                <span className={`badge ${e.status}`}>
                  {e.status === "draft" ? "Brouillon" : e.status === "active" ? "En cours" : "Clôturée"}
                </span>
              </div>
              {e.description && (
                <p style={{ margin: "0 0 0.75rem", fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
                  {e.description}
                </p>
              )}
              {(e.starts_at || e.ends_at) && (
                <div className="election-item__schedule">
                  <span>Ouverture : <strong>{formatDateTimeFr(e.starts_at)}</strong></span>
                  <span>Fermeture : <strong>{formatDateTimeFr(e.ends_at)}</strong></span>
                </div>
              )}
              <div className="btn-row">
                {e.status !== "closed" && (
                  <button type="button" className="secondary" onClick={() => startEditElection(e)}>
                    Modifier
                  </button>
                )}
                {e.status === "draft" && (
                  <button onClick={() => handleActivate(e.id)}>Ouvrir le vote</button>
                )}
                {e.status === "active" && (
                  <button className="danger" onClick={() => handleClose(e.id)}>Clôturer le scrutin</button>
                )}
                <button
                  className="secondary"
                  onClick={async () => {
                    setSelectedElection(e.id);
                    if (token) {
                      setCandidates(await api.listCandidatesAdmin(e.id, token));
                    }
                  }}
                >
                  Voir les candidats
                </button>
              </div>
                </>
              )}
              {selectedElection === e.id && candidates.length > 0 && (
                <ul className="election-item__candidates" style={{ listStyle: "none", padding: 0 }}>
                  {candidates.map((c) => (
                    <li key={c.id} className="candidate-list-item">
                      <CandidatePhoto
                        firstName={c.first_name}
                        lastName={c.last_name}
                        photoUrl={c.photo_url}
                        size="md"
                      />
                      <div className="candidate-list-item__info">
                        <strong>{c.first_name} {c.last_name}</strong>
                        {c.position && <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>{c.position}</div>}
                      </div>
                      <div className="candidate-list-item__actions">
                        <label htmlFor={`photo-${c.id}`}>Changer photo</label>
                        <input
                          id={`photo-${c.id}`}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(ev) => {
                            const file = ev.target.files?.[0];
                            if (file) handlePhotoUpdate(c.id, file);
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))
        )}
      </div>
    </>
  );
}
