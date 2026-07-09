import { FormEvent, useState } from "react";
import Alert from "./Alert";
import { api } from "../api/client";
import { getErrorMessage } from "../utils/errors";

export default function HomeContactSection() {
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackPhone, setFeedbackPhone] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const [checkEmail, setCheckEmail] = useState("");
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);

  async function handleFeedbackSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedbackError(null);
    setFeedbackStatus(null);
    setFeedbackLoading(true);
    try {
      const res = await api.submitFeedback(feedbackEmail, feedbackPhone, feedbackMessage);
      setFeedbackStatus(res.message);
      setFeedbackEmail("");
      setFeedbackPhone("");
      setFeedbackMessage("");
    } catch (err) {
      setFeedbackError(getErrorMessage(err));
    } finally {
      setFeedbackLoading(false);
    }
  }

  async function handleCheckRegistration(e: FormEvent) {
    e.preventDefault();
    setCheckError(null);
    setCheckResult(null);
    setCheckLoading(true);
    try {
      const res = await api.checkRegistration(checkEmail);
      setCheckResult(res.message);
    } catch (err) {
      setCheckError(getErrorMessage(err));
    } finally {
      setCheckLoading(false);
    }
  }

  return (
    <section className="home-contact" style={{ marginTop: "2.5rem" }}>
      <h2 className="home-contact__title">Assistance électorale</h2>
      <div className="grid-2">
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Plainte ou observation</h3>
            <p className="card__desc">Signalez un problème ou partagez une remarque sur le scrutin.</p>
          </div>
          {feedbackError && <Alert type="error">{feedbackError}</Alert>}
          {feedbackStatus && <Alert type="success">{feedbackStatus}</Alert>}
          <form onSubmit={handleFeedbackSubmit}>
            <div className="form-group">
              <label htmlFor="feedback-email">Email</label>
              <input
                id="feedback-email"
                type="email"
                value={feedbackEmail}
                onChange={(e) => setFeedbackEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="feedback-phone">Téléphone</label>
              <input
                id="feedback-phone"
                value={feedbackPhone}
                onChange={(e) => setFeedbackPhone(e.target.value)}
                placeholder="+7…"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="feedback-message">Message</label>
              <textarea
                id="feedback-message"
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                rows={4}
                required
              />
            </div>
            <button type="submit" className="btn--block" disabled={feedbackLoading}>
              {feedbackLoading ? "Envoi…" : "Envoyer"}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Vérifier mon inscription</h3>
            <p className="card__desc">Contrôlez si votre email figure sur la liste électorale.</p>
          </div>
          {checkError && <Alert type="error">{checkError}</Alert>}
          {checkResult && (
            <Alert type={checkResult.includes("bien inscrite") ? "success" : "info"}>
              {checkResult}
            </Alert>
          )}
          <form onSubmit={handleCheckRegistration}>
            <div className="form-group">
              <label htmlFor="check-email">Email</label>
              <input
                id="check-email"
                type="email"
                value={checkEmail}
                onChange={(e) => setCheckEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn--block secondary" disabled={checkLoading}>
              {checkLoading ? "Vérification…" : "Vérifier"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
