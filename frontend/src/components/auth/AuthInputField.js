import React from 'react';

const AuthInputField = ({
  id,
  name,
  type = 'text',
  label,
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
  rightElement = null,
  className = '',
}) => {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={type}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          className={`w-full rounded-xl border px-4 py-3 outline-none transition ${
            rightElement ? 'pr-11' : ''
          } ${
            error
              ? 'border-rose-300 focus:ring-2 focus:ring-rose-200'
              : 'border-slate-300 focus:ring-2 focus:ring-cyan-200 focus:border-cyan-400'
          }`}
          placeholder={placeholder}
        />
        {rightElement ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
        ) : null}
      </div>
      {error ? <p className="text-rose-600 text-xs mt-1">{error}</p> : null}
    </div>
  );
};

export default AuthInputField;
