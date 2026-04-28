import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Factor } from '@supabase/supabase-js';
import { useAuthStore } from '../store/authStore';
import { QRCodeSVG } from 'qrcode.react';
import './Login.css';

type LoginStep = 'CREDENTIALS' | 'SIGN_UP' | 'SETUP_2FA' | 'CHALLENGE_2FA' | 'PENDING_APPROVAL';

// Ícono oficial de Google (SVG inline)
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.705A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.705V4.963H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.037l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.963L3.964 6.295C4.672 4.169 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>('CREDENTIALS');
  
  const navigate = useNavigate();
  const { session, isInitialized, profile, clientProfile } = useAuthStore();

  const start2FASetup = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.enroll({ 
      factorType: 'totp',
      friendlyName: 'Punto Diseño ' + new Date().getTime()
    });
    if (error) {
      setError('Error al configurar 2FA: ' + error.message);
      setLoading(false);
      return;
    }
    
    setFactorId(data.id);
    setQrCode(data.totp.uri || data.totp.qr_code);
    setSecret(data.totp.secret);
    setStep('SETUP_2FA');
    setLoading(false);
  }, []);

  const checkMfaStatus = useCallback(async () => {
    // Si es cliente, no requiere MFA por ahora, va directo al portal
    if (clientProfile) {
      navigate('/portal');
      return;
    }

    const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) {
      console.error(aalError);
      return;
    }

    if (aalData.currentLevel === 'aal2') {
      navigate('/');
      return;
    }

    // Verificar si la cuenta está activa (aprobada por admin)
    if (profile && profile.is_active === false) {
      setStep('PENDING_APPROVAL');
      return;
    }

    // Si no tiene MFA habilitado, dejar pasar con AAL1
    if (!profile || !profile.mfa_enabled) {
      navigate('/');
      return;
    }

    // Determinar si ya tiene factor TOTP registrado
    const factors = await supabase.auth.mfa.listFactors();
    const allFactors = factors.data?.all || [];
    const totpFactors = allFactors.filter((f: Factor) => f.factor_type === 'totp');
    
    const verified = totpFactors.find((f: Factor) => f.status === 'verified');
    const unverifiedFactors = totpFactors.filter((f: Factor) => f.status !== 'verified');

    if (verified) {
      setFactorId(verified.id);
      setStep('CHALLENGE_2FA');
    } else {
      if (unverifiedFactors.length > 0) {
        for (const factor of unverifiedFactors) {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }
      start2FASetup();
    }
  }, [navigate, profile, clientProfile, start2FASetup]);
  
  useEffect(() => {
    if (isInitialized && session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      checkMfaStatus();
    }
  }, [isInitialized, session, checkMfaStatus]);

  // ── Handlers de email/password ──────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError('Credenciales inválidas. Verificá tu email y contraseña.');
      setLoading(false);
      return;
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }
    
    // El trigger de DB crea el perfil automáticamente con is_active=false
    setStep('PENDING_APPROVAL');
    setLoading(false);
  };

  // ── Handler de Google OAuth ─────────────────────────────────────────────────

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/login',
      },
    });

    if (oauthError) {
      setError('Error al conectar con Google. Intentá de nuevo.');
      setGoogleLoading(false);
    }
    // Si tiene éxito, redirige automáticamente a Google y vuelve al callback.
    // El trigger de DB crea el perfil y checkMfaStatus() maneja el resto.
  };

  // ── Handler de 2FA ──────────────────────────────────────────────────────────

  const verify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) {
      setError('Error en el desafío de seguridad: ' + challenge.error.message);
      setLoading(false);
      return;
    }

    const verify = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code,
    });

    if (verify.error) {
      setError('Código incorrecto. Revisá tu app autenticadora.');
      setLoading(false);
      return;
    }

    navigate('/');
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="login-container">
      <div className="login-box glass-panel">
        <div className="login-header">
          <h2>Punto Diseño</h2>
          <p>{step === 'SIGN_UP' ? 'Crear cuenta' : 'Acceso al CRM'}</p>
        </div>

        {error && <div className="alert-danger">{error}</div>}

        {/* ── Step: CREDENTIALS ── */}
        {step === 'CREDENTIALS' && (
          <>
            {/* Botón Google */}
            <button
              id="btn-google-login"
              type="button"
              className="btn btn-google w-full"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
            >
              {googleLoading ? (
                <span className="login-spinner" />
              ) : (
                <GoogleIcon />
              )}
              Continuar con Google
            </button>

            <div className="login-divider">
              <span>o con email</span>
            </div>

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  id="input-email-login"
                  type="email"
                  className="input-base"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input
                  id="input-password-login"
                  type="password"
                  className="input-base"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <button
                id="btn-email-login"
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading || googleLoading}
              >
                {loading ? <><span className="login-spinner" /> Ingresando...</> : 'Iniciar Sesión'}
              </button>
            </form>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <p className="text-sm text-secondary">
                ¿No tienes cuenta?{' '}
                <button
                  className="text-link"
                  onClick={() => { setStep('SIGN_UP'); setError(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Regístrate aquí
                </button>
              </p>
            </div>
          </>
        )}

        {/* ── Step: SIGN_UP ── */}
        {step === 'SIGN_UP' && (
          <>
            {/* Botón Google también disponible en registro */}
            <button
              id="btn-google-signup"
              type="button"
              className="btn btn-google w-full"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
            >
              {googleLoading ? (
                <span className="login-spinner" />
              ) : (
                <GoogleIcon />
              )}
              Registrarse con Google
            </button>

            <div className="login-divider">
              <span>o con email</span>
            </div>

            <form onSubmit={handleSignUp}>
              <div className="form-group">
                <label className="form-label">Nombre Completo</label>
                <input
                  id="input-fullname-signup"
                  type="text"
                  className="input-base"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  placeholder="Ej: Juan Pérez"
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  id="input-email-signup"
                  type="email"
                  className="input-base"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input
                  id="input-password-signup"
                  type="password"
                  className="input-base"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
              <button
                id="btn-email-signup"
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading || googleLoading}
              >
                {loading ? <><span className="login-spinner" /> Registrando...</> : 'Crear Cuenta'}
              </button>
            </form>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <p className="text-sm text-secondary">
                ¿Ya tienes cuenta?{' '}
                <button
                  className="text-link"
                  onClick={() => { setStep('CREDENTIALS'); setError(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Inicia sesión
                </button>
              </p>
            </div>
          </>
        )}

        {/* ── Step: SETUP_2FA ── */}
        {step === 'SETUP_2FA' && (
           <div className="setup-2fa">
             <h3>Configurar Autenticador</h3>
             <p className="text-sm text-secondary mb-4">Escanea este código con Google Authenticator o Authy.</p>
             <div className="qr-container mb-4">
               {qrCode && <QRCodeSVG value={qrCode} size={200} />}
             </div>
             <p className="text-sm mb-4">O ingresa el código manual: <code>{secret}</code></p>
             <form onSubmit={verify2FA}>
               <div className="form-group">
                 <label className="form-label">Código del Autenticador</label>
                 <input 
                  type="text" 
                  className="input-base text-center" 
                  placeholder="000000"
                  maxLength={6}
                  value={code} 
                  onChange={e => setCode(e.target.value)} 
                  required 
                />
               </div>
               <button type="submit" className="btn btn-primary w-full" disabled={loading}>Verificar y Activar 2FA</button>
             </form>
           </div>
        )}

        {/* ── Step: CHALLENGE_2FA ── */}
        {step === 'CHALLENGE_2FA' && (
           <div className="challenge-2fa">
             <h3>Verificación de 2 Pasos</h3>
             <p className="text-sm text-secondary mb-4">Ingresa el código generado por tu aplicación autenticadora.</p>
             <form onSubmit={verify2FA}>
               <div className="form-group">
                 <input 
                  type="text" 
                  className="input-base text-center text-lg" 
                  placeholder="000000"
                  maxLength={6}
                  value={code} 
                  onChange={e => setCode(e.target.value)} 
                  required 
                  autoFocus
                />
               </div>
               <button type="submit" className="btn btn-primary w-full" disabled={loading}>Verificar</button>
             </form>
           </div>
        )}

        {/* ── Step: PENDING_APPROVAL ── */}
        {step === 'PENDING_APPROVAL' && (
           <div className="pending-approval text-center">
             <div className="mb-4" style={{ color: 'var(--primary-color)' }}>
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '64px', height: '64px' }}>
                 <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
               </svg>
             </div>
             <h3>Cuenta Pendiente</h3>
             <p className="text-secondary mb-6">Tu cuenta ha sido creada exitosamente, pero debe ser aprobada por un administrador antes de que puedas acceder al CRM.</p>
             <button 
               className="btn btn-outline w-full" 
               onClick={async () => {
                 await supabase.auth.signOut();
                 window.location.reload();
               }}
             >
               Cerrar Sesión
             </button>
           </div>
        )}
      </div>
    </div>
  );
}
