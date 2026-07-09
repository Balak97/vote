import { useEffect, useState } from "react";
import { formatCountdown, formatDateTimeFr, parseUtcIso } from "../utils/datetime";

type ElectionTimerProps = {
  startsAt: string | null;
  endsAt: string | null;
  status: string;
};

export default function ElectionTimer({ startsAt, endsAt, status }: ElectionTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!startsAt || !endsAt) {
    return null;
  }

  const startMs = parseUtcIso(startsAt).getTime();
  const endMs = parseUtcIso(endsAt).getTime();

  if (status === "closed" || now >= endMs) {
    return (
      <div className="election-timer election-timer--closed">
        <span className="election-timer__label">Scrutin clôturé</span>
        <span className="election-timer__dates">
          Ouverture : {formatDateTimeFr(startsAt)} · Fermeture : {formatDateTimeFr(endsAt)}
        </span>
      </div>
    );
  }

  if (now < startMs) {
    return (
      <div className="election-timer election-timer--pending">
        <span className="election-timer__label">Ouverture dans</span>
        <span className="election-timer__countdown">{formatCountdown(startMs - now)}</span>
        <span className="election-timer__dates">
          Ouverture : {formatDateTimeFr(startsAt)} · Fermeture : {formatDateTimeFr(endsAt)}
        </span>
      </div>
    );
  }

  return (
    <div className="election-timer election-timer--active">
      <span className="election-timer__label">Fermeture dans</span>
      <span className="election-timer__countdown">{formatCountdown(endMs - now)}</span>
      <span className="election-timer__dates">
        Ouverture : {formatDateTimeFr(startsAt)} · Fermeture : {formatDateTimeFr(endsAt)}
      </span>
    </div>
  );
}

