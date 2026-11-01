type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
};

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex h-8 items-center pointer-coarse:h-11"
    >
      <span
        className={`flex h-8 w-14 items-center rounded-full border-hard px-0.75 ${checked ? "bg-coral" : "bg-[#deded9]"}`}
      >
        <span
          className={`size-5.75 rounded-full border-hard bg-white transition-transform motion-reduce:transition-none ${checked ? "translate-x-6" : ""}`}
        />
      </span>
    </button>
  );
}
