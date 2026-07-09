import { formatHttpError, getErrorMessage, parseErrorResponse } from "../utils/errors";
import { getApiBase } from "../utils/apiBase";

const API_BASE = getApiBase();

export type TokenResponse = { access_token: string; token_type: string };

export type Voter = {
  id: number;
  email: string;
  phone: string;
  last_name: string;
  first_name: string;
  has_voted: boolean;
  is_active: boolean;
};

export type Election = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  results_published?: boolean;
};

export type Candidate = {
  id: number;
  election_id: number;
  last_name: string;
  first_name: string;
  description: string | null;
  position: string | null;
  photo_url: string | null;
};

export type CandidateLiveStats = {
  id: number;
  first_name: string;
  last_name: string;
  position: string | null;
  description: string | null;
  photo_url: string | null;
  votes: number;
  percentage: number;
};

export type ElectionLiveDashboard = {
  election_id: number;
  title: string;
  description: string | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  total_votes: number;
  candidates: CandidateLiveStats[];
  updated_at: string;
};

export type VoterParticipationStats = {
  total_electors: number;
  voted_count: number;
  pending_count: number;
  participation_rate: number;
};

export type LiveDashboardResponse = {
  voter_stats: VoterParticipationStats;
  elections: ElectionLiveDashboard[];
};

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }

  if (!response.ok) {
    const payload = await parseErrorResponse(response);
    throw new Error(formatHttpError(response.status, payload));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  try {
    return await response.json();
  } catch {
    throw new Error(
      response.headers.get("content-type")?.includes("text/html")
        ? "Le proxy API ne répond pas (page HTML reçue). Vérifiez que api-proxy.php et .htaccess sont bien uploadés sur vote.cantic-mali.com."
        : "Réponse du serveur illisible. Réessayez.",
    );
  }
}

export const api = {
  adminLogin: (username: string, password: string) =>
    request<TokenResponse>("/admin/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  importVoters: (file: File, token: string) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ imported: number; skipped: string[] }>(
      "/admin/voters/import",
      { method: "POST", body: form },
      token,
    );
  },

  listVoters: (token: string) => request<Voter[]>("/admin/voters", {}, token),

  createElection: (
    title: string,
    description: string | null,
    startsAt: string,
    endsAt: string,
    token: string,
  ) =>
    request<Election>("/admin/elections", {
      method: "POST",
      body: JSON.stringify({ title, description, starts_at: startsAt, ends_at: endsAt }),
    }, token),

  updateElection: (
    id: number,
    data: {
      title?: string;
      description?: string | null;
      starts_at?: string;
      ends_at?: string;
    },
    token: string,
  ) =>
    request<Election>(`/admin/elections/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }, token),

  listElections: (token: string) => request<Election[]>("/admin/elections", {}, token),

  activateElection: (id: number, token: string) =>
    request<Election>(`/admin/elections/${id}/activate`, { method: "POST" }, token),

  closeElection: (id: number, token: string) =>
    request<Election>(`/admin/elections/${id}/close`, { method: "POST" }, token),

  publishElectionResults: (id: number, published: boolean, token: string) =>
    request<Election>(`/admin/elections/${id}/publish-results`, {
      method: "POST",
      body: JSON.stringify({ published }),
    }, token),

  createCandidate: (
    data: {
      election_id: number;
      last_name: string;
      first_name: string;
      description?: string;
      position?: string;
    },
    token: string,
    photo?: File | null,
  ) => {
    const form = new FormData();
    form.append("election_id", String(data.election_id));
    form.append("last_name", data.last_name);
    form.append("first_name", data.first_name);
    if (data.description) form.append("description", data.description);
    if (data.position) form.append("position", data.position);
    if (photo) form.append("photo", photo);
    return request<Candidate>("/admin/candidates", { method: "POST", body: form }, token);
  },

  uploadCandidatePhoto: (candidateId: number, photo: File, token: string) => {
    const form = new FormData();
    form.append("photo", photo);
    return request<Candidate>(`/admin/candidates/${candidateId}/photo`, { method: "POST", body: form }, token);
  },

  listCandidatesAdmin: (electionId: number, token: string) =>
    request<Candidate[]>(`/admin/elections/${electionId}/candidates`, {}, token),

  requestOtp: (identifier: string) =>
    request<{ message: string; email_hint: string; dev_code?: string | null }>(
      "/vote/otp/request",
      {
        method: "POST",
        body: JSON.stringify({ identifier }),
      },
    ),

  verifyOtp: (identifier: string, code: string) =>
    request<TokenResponse>("/vote/otp/verify", {
      method: "POST",
      body: JSON.stringify({ identifier, code }),
    }),

  getMe: (token: string) => request<Voter>("/vote/me", {}, token),

  listActiveElections: () => request<Election[]>("/vote/elections/active"),

  getLiveDashboard: async (): Promise<LiveDashboardResponse> => {
    const data = await request<LiveDashboardResponse | ElectionLiveDashboard[]>(
      "/vote/live-dashboard",
    );
    if (Array.isArray(data)) {
      const totalVotes = data.reduce((sum, e) => sum + e.total_votes, 0);
      return {
        elections: data,
        voter_stats: {
          total_electors: 0,
          voted_count: totalVotes,
          pending_count: 0,
          participation_rate: 0,
        },
      };
    }
    return {
      elections: data.elections ?? [],
      voter_stats: data.voter_stats ?? {
        total_electors: 0,
        voted_count: 0,
        pending_count: 0,
        participation_rate: 0,
      },
    };
  },

  listCandidates: (electionId: number) =>
    request<Candidate[]>(`/vote/elections/${electionId}/candidates`),

  castVote: (electionId: number, candidateId: number, token: string) =>
    request<{ message: string }>("/vote/cast", {
      method: "POST",
      body: JSON.stringify({ election_id: electionId, candidate_id: candidateId }),
    }, token),

  getResults: (electionId: number) =>
    request<{ election_id: number; title: string; status: string; results: Record<number, number>; candidates: Candidate[] }>(
      `/vote/elections/${electionId}/results`,
    ),

  getCurrentResults: () =>
    request<{ election_id: number; title: string; status: string; results: Record<number, number>; candidates: Candidate[] }>(
      "/vote/elections/current/results",
    ),

  submitFeedback: (email: string, phone: string, message: string) =>
    request<{ message: string }>("/vote/feedback", {
      method: "POST",
      body: JSON.stringify({ email, phone, message }),
    }),

  checkRegistration: (email: string) =>
    request<{ registered: boolean; message: string }>("/vote/check-registration", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  updateVoter: (
    id: number,
    data: {
      email?: string;
      phone?: string;
      first_name?: string;
      last_name?: string;
      is_active?: boolean;
    },
    token: string,
  ) =>
    request<Voter>(`/admin/voters/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }, token),

  deleteVoter: (id: number, token: string) =>
    request<void>(`/admin/voters/${id}`, { method: "DELETE" }, token),

  broadcastMessage: (subject: string, message: string, token: string) =>
    request<{ sent: number; failed: number; message: string }>("/admin/voters/broadcast", {
      method: "POST",
      body: JSON.stringify({ subject, message }),
    }, token),
};
