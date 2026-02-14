type ProgressStepperProps = {
  steps: string[];
  currentStep: number;
};

export default function ProgressStepper({
  steps,
  currentStep,
}: ProgressStepperProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
      {steps.map((step, index) => {
        const isActive = index <= currentStep;
        return (
          <div key={step} className="flex items-center gap-3">
            <div className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-sm font-semibold transition-all ${isActive ? 'bg-gradient-to-r from-pink-500 to-yellow-400 text-white shadow-[0_6px_20px_rgba(250,207,114,0.08)]' : 'bg-slate-800 border border-white/6 text-white/40'}`}>
              {index + 1}
            </div>
            <span className={`whitespace-nowrap ${isActive ? 'text-white font-medium' : 'text-white/40'}`}>
              {step}
            </span>
            {index !== steps.length - 1 && (
              <div className="hidden sm:block h-px w-6 bg-white/6" />
            )}
          </div>
        )
      })}
    </div>
  );
}
