import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { QRCodeSVG } from 'qrcode.react';
import './Login.css';

type LoginStep = 'CREDENTIALS' | 'SIGN_UP' | 'SETUP_2FA' | 'CHALLENGE_2FA' | 'PENDING_APPROVAL';

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
  const [step, setStep] = useState<LoginStep>('CREDENTIALS');
  
  const navigate = useNavigate();
  const { session, isInitialized, profile } = useAuthStore();
  
  useEffect(() => {
    if (isInitialized && session) {
      checkMfaStatus();
    }
  }, [isInitialized, session, profile]);

  const checkMfaStatus = async () => {
    const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) {
      console.error(aalError);
      return;
    }

    if (aalData.currentLevel === 'aal2') {
      navigate('/');
      return;
    }

    // 0. Check if account is active
    if (profile && profile.is_active === false) {
      setStep('PENDING_APPROVAL');
      return;
    }

    // If MFA is not enabled in profile, just let them in with AAL1
    if (!profile || !profile.mfa_enabled) {
      navigate('/');
      return;
    }

    // List factors to correctly determine path
    const factors = await supabase.auth.mfa.listFactors();
    const allFactors = factors.data?.all || [];
    const totpFactors = allFactors.filter((f: any) => f.factor_type === 'totp');
    
    const verified = totpFactors.find((f: any) => f.status === 'verified');
    const unverifiedFactors = totpFactors.filter((f: any) => f.status !== 'verified');

    if (verified) {
      setFactorId(verified.id);
      setStep('CHALLENGE_2FA');
    } else {
      // Cleanup all incomplete enrollments
      if (unverifiedFactors.length > 0) {
        for (const factor of unverifiedFactors) {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }
      start2FASetup();
    }
  };

  const start2FASetup = async () => {
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
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError('Credenciales inválidas');
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
    
    alert('¡Registro exitoso! Ya puedes iniciar sesión.');
    setStep('CREDENTIALS');
    setLoading(false);
  };

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
      setError('Código incorrecto');
      setLoading(false);
      return;
    }

    // Success
    navigate('/');
  };

  return (
    <div className="login-container">
      <div className="login-box glass-panel">
        <div className="login-header">
          <h2>Punto Diseño</h2>
          <p>{step === 'SIGN_UP' ? 'Crea tu cuenta' : 'Acceso al CRM'}</p>
        </div>

        {error && <div className="alert-danger">{error}</div>}

        {step === 'CREDENTIALS' && (
          <>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input 
                  type="email" 
                  className="input-base" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input 
                  type="password" 
                  className="input-base" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? 'Ingresando...' : 'Iniciar Sesión'}
              </button>
            </form>
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <p className="text-sm text-secondary">
                ¿No tienes cuenta? <button className="text-link" onClick={() => setStep('SIGN_UP')} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 600 }}>Regístrate aquí</button>
              </p>
            </div>
          </>
        )}

        {step === 'SIGN_UP' && (
          <>
            <form onSubmit={handleSignUp}>
              <div className="form-group">
                <label className="form-label">Nombre Completo</label>
                <input 
                  type="text" 
                  className="input-base" 
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)} 
                  required 
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input 
                  type="email" 
                  className="input-base" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input 
                  type="password" 
                  className="input-base" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  minLength={6}
                />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? 'Registrando...' : 'Crear Cuenta'}
              </button>
            </form>
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <p className="text-sm text-secondary">
                ¿Ya tienes cuenta? <button className="text-link" onClick={() => setStep('CREDENTIALS')} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 600 }}>Inicia sesión</button>
              </p>
            </div>
          </>
        )}

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
