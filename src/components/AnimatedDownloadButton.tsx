import { useState, useCallback } from "react";
import "./AnimatedDownloadButton.css";

interface AnimatedDownloadButtonProps {
  onClick: () => void;
  className?: string;
}

const AnimatedDownloadButton = ({ onClick, className = "" }: AnimatedDownloadButtonProps) => {
  const [checked, setChecked] = useState(false);

  const handleChange = useCallback(() => {
    if (checked) return;
    setChecked(true);
    onClick();
    // Reset after animation completes (~4s)
    setTimeout(() => setChecked(false), 4200);
  }, [checked, onClick]);

  return (
    <div className={`animated-dl-container ${className}`}>
      <label className="animated-dl-label">
        <input
          type="checkbox"
          className="animated-dl-input"
          checked={checked}
          onChange={handleChange}
        />
        <span className="animated-dl-circle">
          <svg
            className="animated-dl-icon"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M12 19V5m0 14-4-4m4 4 4-4"
            />
          </svg>
          <div className="animated-dl-square" />
        </span>
        <p className="animated-dl-title">Download</p>
        <p className="animated-dl-title">Open</p>
      </label>
    </div>
  );
};

export default AnimatedDownloadButton;
