import { FormEvent, useEffect, useState } from "react";

import Alert from "../components/Alert";

import CandidatePhoto from "../components/CandidatePhoto";

import PageHero from "../components/PageHero";

import StepProgress from "../components/StepProgress";

import { api, Candidate, Election, Voter } from "../api/client";
import { getErrorMessage } from "../utils/errors";

type Step = "identify" | "otp" | "vote" | "done";



const STEPS = [

  { id: "identify", label: "Identification" },

  { id: "otp", label: "Vérification" },

  { id: "vote", label: "Vote" },

  { id: "done", label: "Terminé" },

];



export default function VotePage() {

  const [step, setStep] = useState<Step>("identify");

  const [identifier, setIdentifier] = useState("");

  const [code, setCode] = useState("");

  const [token, setToken] = useState<string | null>(localStorage.getItem("voter_token"));

  const [voter, setVoter] = useState<Voter | null>(null);

  const [currentElection, setCurrentElection] = useState<Election | null>(null);

  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);

  const [devCode, setDevCode] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);



  useEffect(() => {

    if (token) {

      loadVoterSession(token);

    }

  }, []);



  async function loadActiveElection() {

    const active = await api.listActiveElections();

    const election = active[0] ?? null;

    setCurrentElection(election);

    setSelectedCandidate(null);

    if (election) {

      setCandidates(await api.listCandidates(election.id));

    } else {

      setCandidates([]);

    }

  }



  async function loadVoterSession(authToken: string) {

    try {

      const me = await api.getMe(authToken);

      setVoter(me);

      if (me.has_voted) {

        setStep("done");

        setMessage("Vous avez déjà participé à ce scrutin.");

        return;

      }

      await loadActiveElection();

      setStep("vote");

    } catch {

      localStorage.removeItem("voter_token");

      setToken(null);

    }

  }



  async function handleRequestOtp(e: FormEvent) {

    e.preventDefault();

    setError(null);

    setMessage(null);

    setLoading(true);

    try {

      const res = await api.requestOtp(identifier.trim());

      const otpDevCode = res.dev_code?.trim() || null;

      setDevCode(otpDevCode);

      if (otpDevCode) {

        setCode(otpDevCode);

        setMessage(`Code OTP (mode dev) : ${otpDevCode} — envoyé à ${res.email_hint}`);

      } else {

        setMessage(`${res.message} Vérifiez ${res.email_hint}.`);

      }

      setStep("otp");

    } catch (err) {

      setError(getErrorMessage(err));

    } finally {

      setLoading(false);

    }

  }



  async function handleVerifyOtp(e: FormEvent) {

    e.preventDefault();

    setError(null);

    setMessage(null);

    setLoading(true);

    try {

      const res = await api.verifyOtp(identifier.trim(), code.trim());

      localStorage.setItem("voter_token", res.access_token);

      setToken(res.access_token);

      await loadVoterSession(res.access_token);

    } catch (err) {

      setError(getErrorMessage(err));

    } finally {

      setLoading(false);

    }

  }



  async function handleCastVote() {

    if (!token || !currentElection || !selectedCandidate) return;

    setError(null);

    setLoading(true);

    try {

      await api.castVote(currentElection.id, selectedCandidate, token);

      setMessage(null);

      setStep("done");

    } catch (err) {

      setError(getErrorMessage(err));

    } finally {

      setLoading(false);

    }

  }



  function logout() {

    localStorage.removeItem("voter_token");

    setToken(null);

    setStep("identify");

    setVoter(null);

    setCurrentElection(null);

    setCandidates([]);

    setSelectedCandidate(null);

    setError(null);

    setMessage(null);

    setDevCode(null);

    setIdentifier("");

    setCode("");

  }



  const initials = voter

    ? `${voter.first_name[0] ?? ""}${voter.last_name[0] ?? ""}`.toUpperCase()

    : "";



  return (

    <div className="vote-panel">

      <PageHero

        eyebrow="Espace électeur"

        title="Exprimez votre voix"

        subtitle="Identifiez-vous avec votre email ou téléphone. Le code de vérification sera envoyé uniquement sur votre adresse email."

      />



      <StepProgress steps={STEPS} current={step} />



      {error && <Alert type="error">{error}</Alert>}

      {devCode && step === "otp" && (

        <div className="dev-otp-banner" role="status" aria-live="polite">

          <div className="dev-otp-banner__label">Mode développement</div>

          <div className="dev-otp-banner__code">{devCode}</div>

          <div className="dev-otp-banner__hint">Code prérempli ci-dessous — cliquez « Valider le code »</div>

        </div>

      )}

      {message && step !== "done" && !devCode && <Alert type="info">{message}</Alert>}

      {message && step !== "done" && devCode && step !== "otp" && <Alert type="info">{message}</Alert>}



      {step === "identify" && (

        <div className="card card--elevated">

          <div className="card__header">

            <div>

              <h2 className="card__title">Identification</h2>

              <p className="card__desc">Saisissez vos coordonnées enregistrées dans la liste électorale.</p>

            </div>

          </div>

          <form onSubmit={handleRequestOtp}>

            <div className="form-group">

              <label htmlFor="identifier">Email ou téléphone</label>

              <input

                id="identifier"

                value={identifier}

                onChange={(e) => setIdentifier(e.target.value)}

                placeholder="balako@mail.ru ou +79123456789"

                required

              />

              <p className="form-hint">

                Email ou téléphone russe (+7…). Le code sera envoyé uniquement à l&apos;adresse email enregistrée. Validité : 5 minutes.

              </p>

            </div>

            <button type="submit" className="btn--block btn--lg" disabled={loading}>

              {loading ? "Envoi en cours…" : "Recevoir le code OTP"}

            </button>

          </form>

        </div>

      )}



      {step === "otp" && (

        <div className="card card--elevated">

          <div className="card__header">

            <div>

              <h2 className="card__title">Vérification OTP</h2>

              <p className="card__desc">Entrez le code reçu par email. Il expire 5 minutes après l&apos;envoi.</p>

            </div>

          </div>

          {devCode && (

            <div className="dev-otp-inline">

              Code OTP : <strong>{devCode}</strong>

            </div>

          )}

          <form onSubmit={handleVerifyOtp}>

            <div className="form-group">

              <label htmlFor="code">Code à 6 chiffres</label>

              <input

                id="code"

                className="otp-input"

                value={code}

                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}

                maxLength={6}

                inputMode="numeric"

                placeholder="• • • • • •"

                required

              />

            </div>

            <div className="btn-row">

              <button type="submit" className="btn--lg" disabled={loading || code.length < 6}>

                {loading ? "Vérification…" : "Valider le code"}

              </button>

              <button type="button" className="secondary" onClick={() => { setStep("identify"); setDevCode(null); setCode(""); }}>

                Retour

              </button>

            </div>

          </form>

        </div>

      )}



      {step === "vote" && voter && (

        <div className="card card--elevated">

          <div className="voter-greeting">

            <div className="voter-greeting__avatar" aria-hidden="true">{initials}</div>

            <div>

              <div className="voter-greeting__name">{voter.first_name} {voter.last_name}</div>

              <div className="voter-greeting__meta">Électeur authentifié · {voter.email}</div>

            </div>

          </div>



          {!currentElection && (

            <div className="empty-state">

              <div className="empty-state__icon">🗳️</div>

              <p>Aucune élection ouverte pour le moment.</p>

            </div>

          )}



          {currentElection && (

            <>

              <div className="vote-election-header">

                <h3 className="vote-election-header__title">{currentElection.title}</h3>

                {currentElection.description && (

                  <p className="vote-election-header__desc">{currentElection.description}</p>

                )}

              </div>



              {candidates.length === 0 ? (

                <div className="empty-state">

                  <div className="empty-state__icon">👤</div>

                  <p>Aucun candidat inscrit pour cette élection.</p>

                </div>

              ) : (

                <>

                  <h3 className="vote-candidates-heading">Choisissez votre candidat</h3>

                  <div className="candidate-grid" role="radiogroup" aria-label="Candidats">

                    {candidates.map((c) => (

                      <div

                        key={c.id}

                        role="radio"

                        aria-checked={selectedCandidate === c.id}

                        tabIndex={0}

                        className={`candidate-card${selectedCandidate === c.id ? " selected" : ""}`}

                        onClick={() => setSelectedCandidate(c.id)}

                        onKeyDown={(e) => e.key === "Enter" && setSelectedCandidate(c.id)}

                      >

                        <CandidatePhoto

                          firstName={c.first_name}

                          lastName={c.last_name}

                          photoUrl={c.photo_url}

                          size="lg"

                        />

                        <div className="candidate-card__body">

                          <strong>{c.first_name} {c.last_name}</strong>

                          {c.position && <div className="candidate-card__position">{c.position}</div>}

                          {c.description && <p className="candidate-card__desc">{c.description}</p>}

                        </div>

                        <div className="candidate-card__radio" aria-hidden="true" />

                      </div>

                    ))}

                  </div>

                  <button

                    className="accent btn--block btn--lg"

                    onClick={handleCastVote}

                    disabled={!selectedCandidate || loading}

                  >

                    {loading ? "Enregistrement…" : "Confirmer mon vote"}

                  </button>

                </>

              )}

            </>

          )}



          <div className="btn-row" style={{ marginTop: "1.25rem" }}>

            <button type="button" className="secondary" onClick={logout}>

              Se déconnecter

            </button>

          </div>

        </div>

      )}



      {step === "done" && (

        <div className="card card--elevated">

          <div className="done-state">

            <div className="done-state__icon" aria-hidden="true">✓</div>

            <h2>Merci pour votre participation</h2>

            <p>

              {message || "Votre vote a été enregistré de manière sécurisée. Les résultats seront publiés après la clôture du scrutin."}

            </p>

            <button className="secondary" onClick={logout}>Terminer la session</button>

          </div>

        </div>

      )}

    </div>

  );

}


