type Step = { id: string; label: string };

type StepProgressProps = {
  steps: Step[];
  current: string;
};

export default function StepProgress({ steps, current }: StepProgressProps) {
  const currentIndex = steps.findIndex((s) => s.id === current);

  return (
    <ol className="step-progress" aria-label="Étapes">
      {steps.map((step, index) => {
        const done = index < currentIndex;
        const active = step.id === current;
        return (
          <li
            key={step.id}
            className={`step-progress__item${done ? " is-done" : ""}${active ? " is-active" : ""}`}
          >
            <span className="step-progress__dot">{done ? "✓" : index + 1}</span>
            <span className="step-progress__label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
