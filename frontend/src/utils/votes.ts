/** Vrai seulement si un seul candidat a le score maximal (pas d'égalité en tête). */
export function isUniqueVoteLeader(candidateVotes: number, allVotes: number[]): boolean {
  if (candidateVotes <= 0) return false;
  const max = Math.max(...allVotes, 0);
  if (candidateVotes !== max) return false;
  return allVotes.filter((v) => v === max).length === 1;
}
