import React from 'react';
import { Link } from 'react-router-dom';

const BrandMark = ({
  className = '',
  iconClassName = 'w-10 h-10',
  textClassName = 'text-slate-900 font-bold text-lg',
  subtitleClassName = 'text-[11px] text-slate-500 -mt-0.5',
  subtitle = null,
  linkTo = '/',
}) => {
  const content = (
    <>
      <img
        src="/icon.gif"
        alt="MindHealix logo"
        className={`${iconClassName} rounded-xl object-cover border border-cyan-100 shadow-sm`}
      />
      <div>
        <div className={textClassName}>MindHealix</div>
        {subtitle ? <div className={subtitleClassName}>{subtitle}</div> : null}
      </div>
    </>
  );

  if (!linkTo) {
    return <div className={`flex items-center gap-3 ${className}`}>{content}</div>;
  }

  return (
    <Link to={linkTo} className={`flex items-center gap-3 ${className}`}>
      {content}
    </Link>
  );
};

export default BrandMark;
