import React from 'react';

const PanicButton = ({ onActivate, fullWidth = true }) => {
  return (
    <button
      type="button"
      onClick={onActivate}
      className={`panic-help-btn ${fullWidth ? 'w-full' : ''}`}
      aria-label="Activate panic help mode"
    >
      <span className="text-2xl md:text-3xl">PANIC HELP</span>
      <span className="panic-help-subtext">Tap now for immediate calming support</span>
    </button>
  );
};

export default PanicButton;
