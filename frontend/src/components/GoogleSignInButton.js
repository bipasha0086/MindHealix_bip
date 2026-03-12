import React, { useEffect, useRef } from 'react';

const GoogleSignInButton = ({
  clientId,
  onCredential,
  disabled = false,
  text = 'continue_with',
}) => {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!clientId || !buttonRef.current || disabled) {
      return undefined;
    }

    const setupGoogleButton = () => {
      if (!window.google?.accounts?.id || !buttonRef.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response?.credential) {
            onCredential(response.credential);
          }
        },
      });

      buttonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        width: 320,
        text,
      });
    };

    const waitForGoogle = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(waitForGoogle);
        setupGoogleButton();
      }
    }, 200);

    setupGoogleButton();

    return () => {
      clearInterval(waitForGoogle);
    };
  }, [clientId, onCredential, disabled, text]);

  if (!clientId) {
    return (
      <p className="text-xs text-rose-600 text-center">
        Google Sign-In is unavailable. Missing client ID.
      </p>
    );
  }

  return (
    <div className="w-full flex justify-center" aria-label="Google sign in button wrapper">
      <div ref={buttonRef} />
    </div>
  );
};

export default GoogleSignInButton;
