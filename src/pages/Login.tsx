import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../lib/supabase';
import type { Factor } from '@supabase/supabase-js';
import { useAuthStore } from '../store/authStore';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Loader2, ShieldCheck, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import { loginSchema, signUpSchema, type LoginInput, type SignUpInput } from '../lib/schemas';

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
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>('CREDENTIALS');

  const { register: registerLogin, handleSubmit: handleSubmitLogin, formState: { errors: loginErrors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema)
  });

  const { register: registerSignUp, handleSubmit: handleSubmitSignUp, formState: { errors: signUpErrors }, watch: watchSignUp } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema)
  });

  const signUpPassword = watchSignUp('password', '');
  
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
    setStep('SETUP_2FA');
    setLoading(false);
  }, []);

  const checkMfaStatus = useCallback(async () => {
    if (clientProfile) {
      navigate('/portal');
      return;
    }

    const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) return;

    if (aalData.currentLevel === 'aal2') {
      navigate('/admin');
      return;
    }

    if (profile && profile.is_active === false) {
      setStep('PENDING_APPROVAL');
      return;
    }

    if (!profile || !profile.mfa_enabled) {
      navigate('/admin');
      return;
    }

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
      checkMfaStatus();
    }
  }, [isInitialized, session, checkMfaStatus]);

  const handleLogin = async (data: LoginInput) => {
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (signInError) {
      setError('Credenciales inválidas. Verificá tu email y contraseña.');
      setLoading(false);
      return;
    }
  };

  const handleSignUp = async (data: SignUpInput) => {
    setLoading(true);
    setError('');

    const { error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.fullName }
      }
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }
    
    setStep('PENDING_APPROVAL');
    setLoading(false);
  };

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
      setError('Código incorrecto. Revisá tu app autenticadora.');
      setLoading(false);
      return;
    }

    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-industrial-cyan/30">
      
      {/* Background Accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-industrial-cyan/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-industrial-magenta/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Back Link */}
        <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors mb-12">
          <ArrowLeft size={14} /> Volver al Inicio
        </Link>

        {/* Card */}
        <div className="bg-white/[0.02] border border-white/5 backdrop-blur-xl rounded-[2.5rem] p-10 md:p-14 shadow-2xl">
          
          <div className="text-center mb-12">
            <h1 className="text-2xl font-bold tracking-tighter mb-2">
              PUNTO<span className="text-industrial-cyan ml-1">DISEÑO</span>
            </h1>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.25em]">
              {step === 'SIGN_UP' ? 'Crear nueva cuenta' : step === 'CREDENTIALS' ? 'Acceso Plataforma' : 'Seguridad'}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl mb-8 flex items-start gap-3 text-sm">
              <AlertCircle className="shrink-0 w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Step: CREDENTIALS ── */}
          {step === 'CREDENTIALS' && (
            <div className="space-y-8">
              <button
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
                className="w-full flex items-center justify-center gap-4 bg-white/[0.04] border border-white/10 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white/[0.08] transition-all disabled:opacity-50"
              >
                {googleLoading ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
                Continuar con Google
              </button>

              <div className="flex items-center gap-4 text-gray-700">
                <div className="h-px flex-grow bg-white/5"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest">o con email</span>
                <div className="h-px flex-grow bg-white/5"></div>
              </div>

              <form onSubmit={handleSubmitLogin(handleLogin)} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-2">Email</label>
                  <input
                    type="email"
                    {...registerLogin('email')}
                    className={`w-full bg-white/[0.04] border ${loginErrors.email ? 'border-red-500/50' : 'border-white/10'} rounded-2xl px-6 py-4 focus:border-industrial-cyan focus:outline-none transition-all text-sm font-light`}
                    placeholder="tu@email.com"
                  />
                  {loginErrors.email && <p className="text-[10px] text-red-500 ml-2">{loginErrors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-2">Contraseña</label>
                  <input
                    type="password"
                    {...registerLogin('password')}
                    className={`w-full bg-white/[0.04] border ${loginErrors.password ? 'border-red-500/50' : 'border-white/10'} rounded-2xl px-6 py-4 focus:border-industrial-cyan focus:outline-none transition-all text-sm font-light`}
                    placeholder="••••••••"
                  />
                  {loginErrors.password && <p className="text-[10px] text-red-500 ml-2">{loginErrors.password.message}</p>}
                </div>
                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full py-5 bg-white text-black rounded-full font-bold text-xs uppercase tracking-widest hover:bg-industrial-cyan transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <LogIn size={18} />}
                  Ingresar
                </button>
              </form>

              <div className="text-center pt-4">
                <button
                  onClick={() => { setStep('SIGN_UP'); setError(''); }}
                  className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-industrial-cyan transition-colors"
                >
                  ¿No tienes cuenta? <span className="text-white">Regístrate</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Step: SIGN_UP ── */}
          {step === 'SIGN_UP' && (
            <div className="space-y-8">
              <form onSubmit={handleSubmitSignUp(handleSignUp)} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-2">Nombre Completo</label>
                  <input
                    type="text"
                    {...registerSignUp('fullName')}
                    className={`w-full bg-white/[0.04] border ${signUpErrors.fullName ? 'border-red-500/50' : 'border-white/10'} rounded-2xl px-6 py-4 focus:border-industrial-cyan focus:outline-none transition-all text-sm font-light`}
                    placeholder="Nombre y Apellido"
                  />
                  {signUpErrors.fullName && <p className="text-[10px] text-red-500 ml-2">{signUpErrors.fullName.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-2">Email</label>
                  <input
                    type="email"
                    {...registerSignUp('email')}
                    className={`w-full bg-white/[0.04] border ${signUpErrors.email ? 'border-red-500/50' : 'border-white/10'} rounded-2xl px-6 py-4 focus:border-industrial-cyan focus:outline-none transition-all text-sm font-light`}
                    placeholder="tu@email.com"
                  />
                  {signUpErrors.email && <p className="text-[10px] text-red-500 ml-2">{signUpErrors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Contraseña</label>
                    <span className="text-[9px] text-gray-600 font-medium">Requiere: A-z, 0-9, #!$</span>
                  </div>
                  <input
                    type="password"
                    {...registerSignUp('password')}
                    className={`w-full bg-white/[0.04] border ${signUpErrors.password ? 'border-red-500/50' : 'border-white/10'} rounded-2xl px-6 py-4 focus:border-industrial-cyan focus:outline-none transition-all text-sm font-light`}
                    placeholder="Mínimo 8 caracteres"
                  />
                  {signUpErrors.password && <p className="text-[10px] text-red-500 ml-2">{signUpErrors.password.message}</p>}
                  <div className="grid grid-cols-4 gap-1 px-1">
                    <div className={`h-1 rounded-full transition-colors ${signUpPassword.length >= 8 ? 'bg-industrial-cyan' : 'bg-white/10'}`}></div>
                    <div className={`h-1 rounded-full transition-colors ${/[A-Z]/.test(signUpPassword) && /[a-z]/.test(signUpPassword) ? 'bg-industrial-cyan' : 'bg-white/10'}`}></div>
                    <div className={`h-1 rounded-full transition-colors ${/\d/.test(signUpPassword) ? 'bg-industrial-cyan' : 'bg-white/10'}`}></div>
                    <div className={`h-1 rounded-full transition-colors ${/[@$!%*?&]/.test(signUpPassword) ? 'bg-industrial-cyan' : 'bg-white/10'}`}></div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 bg-white text-black rounded-full font-bold text-xs uppercase tracking-widest hover:bg-industrial-cyan transition-all flex items-center justify-center gap-3"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <UserPlus size={18} />}
                  Crear Cuenta
                </button>
              </form>

              <div className="text-center pt-4">
                <button
                  onClick={() => { setStep('CREDENTIALS'); setError(''); }}
                  className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-industrial-cyan transition-colors"
                >
                  ¿Ya tienes cuenta? <span className="text-white">Inicia Sesión</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Step: SETUP_2FA ── */}
          {step === 'SETUP_2FA' && (
             <div className="text-center space-y-8">
               <h3 className="text-xl font-bold tracking-tight">Activar Seguridad 2FA</h3>
               <div className="bg-white p-6 rounded-3xl inline-block shadow-inner">
                 {qrCode && <QRCodeSVG value={qrCode} size={180} />}
               </div>
               <p className="text-gray-500 text-xs leading-relaxed px-4">
                 Escanea el código con Google Authenticator o Authy para proteger tu cuenta.
               </p>
               <form onSubmit={verify2FA} className="space-y-6">
                 <input 
                  type="text" 
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-6 py-4 text-center text-xl font-bold tracking-[0.5em] focus:border-industrial-cyan focus:outline-none" 
                  placeholder="000000"
                  maxLength={6}
                  value={code} 
                  onChange={e => setCode(e.target.value)} 
                  required 
                />
                <button type="submit" className="w-full py-5 bg-industrial-cyan text-black rounded-full font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3">
                  {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={18} />}
                  Verificar y Activar
                </button>
               </form>
             </div>
          )}

          {/* ── Step: CHALLENGE_2FA ── */}
          {step === 'CHALLENGE_2FA' && (
             <div className="text-center space-y-8">
               <h3 className="text-xl font-bold tracking-tight">Verificación en 2 Pasos</h3>
               <div className="w-20 h-20 bg-industrial-cyan/10 text-industrial-cyan rounded-full flex items-center justify-center mx-auto mb-8">
                  <ShieldCheck size={40} />
               </div>
               <p className="text-gray-500 text-xs">Ingresa el código de seguridad de tu app autenticadora.</p>
               <form onSubmit={verify2FA} className="space-y-6">
                 <input 
                  type="text" 
                  className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-6 py-4 text-center text-xl font-bold tracking-[0.5em] focus:border-industrial-cyan focus:outline-none" 
                  placeholder="000000"
                  maxLength={6}
                  value={code} 
                  onChange={e => setCode(e.target.value)} 
                  required 
                  autoFocus
                />
                <button type="submit" className="w-full py-5 bg-white text-black rounded-full font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-industrial-cyan transition-all">
                  {loading ? <Loader2 className="animate-spin" /> : 'Verificar'}
                </button>
               </form>
             </div>
          )}

          {/* ── Step: PENDING_APPROVAL ── */}
          {step === 'PENDING_APPROVAL' && (
             <div className="text-center space-y-8">
               <div className="w-20 h-20 bg-industrial-magenta/10 text-industrial-magenta rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                  <AlertCircle size={40} />
               </div>
               <h3 className="text-2xl font-bold tracking-tight">Cuenta Pendiente</h3>
               <p className="text-gray-400 text-sm leading-relaxed">
                 Tu cuenta ha sido creada exitosamente, pero debe ser aprobada por un administrador antes de que puedas acceder al CRM.
               </p>
               <button 
                 className="w-full py-4 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all" 
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

        {/* Footer info */}
        <div className="mt-12 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-700">
            © 2026 PUNTO DISEÑO · CRM INTERNO
          </p>
        </div>
      </div>
    </div>
  );
}
