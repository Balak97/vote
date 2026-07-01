type CandidatePhotoProps = {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const SIZES = {
  sm: 40,
  md: 56,
  lg: 72,
  xl: 96,
};

export default function CandidatePhoto({
  firstName,
  lastName,
  photoUrl,
  size = "md",
  className = "",
}: CandidatePhotoProps) {
  const px = SIZES[size];
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={`${firstName} ${lastName}`}
        className={`candidate-photo candidate-photo--${size} ${className}`.trim()}
        width={px}
        height={px}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`candidate-photo candidate-photo--placeholder candidate-photo--${size} ${className}`.trim()}
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
