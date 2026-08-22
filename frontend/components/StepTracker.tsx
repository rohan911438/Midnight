'use client';

const STEPS = [
  { key: 'commit', label: 'Commit order' },
  { key: 'match', label: 'Match privately' },
  { key: 'settle', label: 'Settle' },
  { key: 'reveal', label: 'Reveal trade' },
] as const;

export type StepKey = (typeof STEPS)[number]['key'];

export function StepTracker({ current, done }: { current: StepKey; done: StepKey[] }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="steps">
      {STEPS.map((step, i) => {
        const isDone = done.includes(step.key);
        const isActive = !isDone && i === currentIndex;
        return (
          <div key={step.key} className={`step${isActive ? ' active' : ''}${isDone ? ' done' : ''}`}>
            <span className="step-num">Step {i + 1}</span>
            <span className="step-label">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}
