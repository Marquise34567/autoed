export function Logo() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-10 h-10"
    >
      {/* Background */}
      <rect width="40" height="40" rx="8" fill="url(#grad)" />

      {/* Play button shape with cutting lines */}
      <g>
        {/* Left cutting line */}
        <line
          x1="10"
          y1="12"
          x2="10"
          y2="28"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Play triangle */}
        <path
          d="M 15 10 L 15 30 L 28 20 Z"
          fill="white"
          opacity="0.9"
        />
        {/* Right cutting line */}
        <line
          x1="30"
          y1="12"
          x2="30"
          y2="28"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* Gradient definition */}
      <defs>
        <linearGradient
          id="grad"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
      </defs>
    </svg>
  );
}
