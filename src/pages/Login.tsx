import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { QRCodeSVG } from 'qrcode.react';
import './Login.css';

type LoginStep = 'CREDENTIALS' | 'SETUP_2FA' | 'CHALLENGE_2FA';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>('CREDENTIALS');
  
  const navigate = useNavigate();
  const { session, isInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized && session) {
      checkMfaStatus();
    }
  }, [isInitialized, session]);

  const checkMfaStatus = async () => {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) {
      console.error(error);
      return;
    }

    if (data.currentLevel === 'aal2') {
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
      setError(error.message);
      setLoading(false);
      return;
    }
    
    setFactorId(data.id);
    
    // Sometimes totp.qr_code may contain raw SVG or just text depending on Supabase JS version. 
    // totp.uri is the standard standard otpauth uri that is always safe to pass to a QR generator.
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
    
    // Auth context will update, and useEffect will trigger checkMfaStatus
    setLoading(false);
  };

  const verify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) {
      setError(challenge.error.message);
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
          <p>Acceso al CRM</p>
        </div>

        {error && <div className="alert-danger">{error}</div>}

        {step === 'CREDENTIALS' && (
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
      </div>
    </div>
  );
}
