// components/common/DocumentIcon.jsx
export default function DocumentIcon({ className = "w-[640px] h-[640px]" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 300 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M60 20 C60 10 60 10 75 10 L195 10 L240 40 L240 220 C240 230 240 230 225 230 L75 230 C60 230 60 230 60 220 Z"
        fill="white"
        stroke="#8b95a8"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M195 10 L195 30 C195 40 195 40 210 40 L240 40"
        fill="#e8ecf1"
        stroke="#8b95a8"
        strokeWidth="4"
        strokeLinejoin="round"
      />

      <path
        d="M84 66 L84 56 C84 54 84 54 86 54 L105 54 L111 60 L147 60 C149 60 149 60 149 62 L149 84 C149 86 149 86 147 86 L86 86 C84 86 84 86 84 84 Z"
        fill="none"
        stroke="#8b95a8"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <line x1="84" y1="108" x2="216" y2="108" stroke="#8b95a8" strokeWidth="3" strokeLinecap="round" />
      <line x1="84" y1="128" x2="216" y2="128" stroke="#8b95a8" strokeWidth="3" strokeLinecap="round" />
      <line x1="84" y1="148" x2="216" y2="148" stroke="#8b95a8" strokeWidth="3" strokeLinecap="round" />
      <line x1="84" y1="168" x2="174" y2="168" stroke="#8b95a8" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
