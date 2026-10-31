import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { api, subscribeToLiveUpdates } from '../lib/api';
import {
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Loader2,
  ArrowLeft,
  KeyRound,
  Check,
  Laptop,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Inbox
} from 'lucide-react';

interface AuthModalProps {
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  // Mode: 'login' | 'register' | 'forgot' | 'pc_verify'
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'pc_verify'>('login');

  // Register step: 1 (Form inputs) | 2 (6-digit email code verification)
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);

  // Form inputs
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reactivatedBanner, setReactivatedBanner] = useState(false);

  // Email delivery & 6-digit Code verification state
  const [isRealSmtp, setIsRealSmtp] = useState<boolean>(true);
  const [devFallbackCode, setDevFallbackCode] = useState<string | null>(null);
  const [showDevCodeHelper, setShowDevCodeHelper] = useState<boolean>(false);
  const [codeDigits, setCodeDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [codeCountdown, setCodeCountdown] = useState(0);
  const [codeSentMessage, setCodeSentMessage] = useState<string | null>(null);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotDigits, setForgotDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotNotice, setForgotNotice] = useState<string | null>(null);
  const forgotDigitRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cross-device PC login states
  const [pcSessionId, setPcSessionId] = useState<string | null>(null);
  const [pcCountdown, setPcCountdown] = useState<number>(600);
  const [pcDigits, setPcDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [pcVerifying, setPcVerifying] = useState<boolean>(false);
  const [pcApprovedNotice, setPcApprovedNotice] = useState<string | null>(null);
  const pcDigitRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend code countdown timer
  useEffect(() => {
    let timer: any;
    if (codeCountdown > 0) {
      timer = setInterval(() => setCodeCountdown((c) => Math.max(0, c - 1)), 1000);
    }
    return () => clearInterval(timer);
  }, [codeCountdown]);

  // Timer for PC validation countdown
  useEffect(() => {
    let timer: any;
    if (authMode === 'pc_verify' && pcCountdown > 0) {
      timer = setInterval(() => setPcCountdown((c) => Math.max(0, c - 1)), 1000);
    }
    return () => clearInterval(timer);
  }, [authMode, pcCountdown]);

  // Real-time listener for cross-device PC approval
  useEffect(() => {
    if (authMode !== 'pc_verify' || !pcSessionId) return;

    const unsubscribe = subscribeToLiveUpdates((event, payload) => {
      if (event === 'PC_LOGIN_APPROVED' && payload.sessionId === pcSessionId) {
        setPcApprovedNotice('Connexion approuvée ! Redirection...');
        setTimeout(() => {
          onSuccess(payload.user);
        }, 800);
      } else if (event === 'PC_LOGIN_REJECTED' && payload.sessionId === pcSessionId) {
        setError('La tentative de connexion a été refusée.');
      }
    });

    return () => unsubscribe();
  }, [authMode, pcSessionId, onSuccess]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Veuillez renseigner votre email et votre mot de passe.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.login({
        email: email.trim(),
        password,
      });

      if (res.requirePcValidation) {
        setPcSessionId(res.sessionId!);
        setPcCountdown(res.expiresInSeconds || 600);
        setAuthMode('pc_verify');
        setError(null);
        return;
      }

      if ((res as any).reactivated) {
        setReactivatedBanner(true);
        setTimeout(() => {
          onSuccess(res.user!);
        }, 1000);
      } else {
        onSuccess(res.user!);
      }
    } catch (err: any) {
      setError(err.message || 'Email ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  // Register: Step 1 -> Step 2 (Send real email with 6-digit code)
  const handleStartRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Veuillez renseigner votre prénom et nom.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Veuillez entrer une adresse email valide.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.sendVerificationCode({
        email: email.trim(),
        purpose: 'register',
      });

      setIsRealSmtp(res.isRealSmtp ?? false);
      setDevFallbackCode(res.devCode || null);
      setShowDevCodeHelper(false);

      setRegisterStep(2);
      setCodeDigits(['', '', '', '', '', '']);
      setCodeCountdown(60);
      setCodeSentMessage(res.message);
      setTimeout(() => {
        digitInputRefs.current[0]?.focus();
      }, 200);
    } catch (err: any) {
      setError(err.message || "Échec de l'envoi du code de vérification.");
    } finally {
      setLoading(false);
    }
  };

  // Resend 6-digit email code
  const handleResendCode = async () => {
    if (codeCountdown > 0 || loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth.sendVerificationCode({
        email: email.trim(),
        purpose: 'register',
      });
      setIsRealSmtp(res.isRealSmtp ?? false);
      setDevFallbackCode(res.devCode || null);
      setCodeCountdown(60);
      setCodeSentMessage(res.message);
    } catch (err: any) {
      setError(err.message || 'Échec du renvoi du code.');
    } finally {
      setLoading(false);
    }
  };

  // Handle 6-digit Code input change
  const handleDigitChange = (index: number, val: string) => {
    if (val.length > 1) {
      const sanitized = val.replace(/\D/g, '').slice(0, 6);
      if (sanitized.length > 0) {
        const next = [...codeDigits];
        for (let i = 0; i < 6; i++) {
          next[i] = sanitized[i] || '';
        }
        setCodeDigits(next);
        const nextFocus = Math.min(sanitized.length, 5);
        digitInputRefs.current[nextFocus]?.focus();
        if (sanitized.length === 6) {
          handleCompleteRegister(sanitized);
        }
      }
      return;
    }

    const digit = val.slice(-1).replace(/\D/g, '');
    const next = [...codeDigits];
    next[index] = digit;
    setCodeDigits(next);

    if (digit && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }

    if (next.every((d) => d !== '')) {
      handleCompleteRegister(next.join(''));
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    }
  };

  // Complete Registration after entering the code received by email
  const handleCompleteRegister = async (typedCode?: string) => {
    const finalCode = (typedCode || codeDigits.join('')).trim();
    if (finalCode.length < 6) {
      setError('Veuillez saisir les 6 chiffres du code reçu par email.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const parts = fullName.trim().split(' ');
      const prenom = parts[0] || 'Utilisateur';
      const nom = parts.slice(1).join(' ') || 'Membre';

      const res = await api.auth.register({
        nom,
        prenom,
        email: email.trim(),
        password,
        promo: 'Membre',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName.trim())}`,
        verificationCode: finalCode,
      });

      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Le code saisi est incorrect ou a expiré.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot password: Step 1 -> Send code to email
  const handleForgotSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!forgotEmail.trim()) {
      setError('Veuillez saisir votre adresse email.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.sendVerificationCode({
        email: forgotEmail.trim(),
        purpose: 'reset',
      });
      setIsRealSmtp(res.isRealSmtp ?? false);
      setDevFallbackCode(res.devCode || null);
      setShowDevCodeHelper(false);
      setForgotStep(2);
      setForgotNotice(`Un code de réinitialisation a été envoyé à : ${forgotEmail.trim()}`);
      setTimeout(() => {
        forgotDigitRefs.current[0]?.focus();
      }, 200);
    } catch (err: any) {
      setError(err.message || "Échec de l'envoi du code de réinitialisation.");
    } finally {
      setLoading(false);
    }
  };

  // Handle forgot password digit change
  const handleForgotDigitChange = (index: number, val: string) => {
    if (val.length > 1) {
      const sanitized = val.replace(/\D/g, '').slice(0, 6);
      if (sanitized.length > 0) {
        const next = [...forgotDigits];
        for (let i = 0; i < 6; i++) {
          next[i] = sanitized[i] || '';
        }
        setForgotDigits(next);
        const nextFocus = Math.min(sanitized.length, 5);
        forgotDigitRefs.current[nextFocus]?.focus();
      }
      return;
    }

    const digit = val.slice(-1).replace(/\D/g, '');
    const next = [...forgotDigits];
    next[index] = digit;
    setForgotDigits(next);

    if (digit && index < 5) {
      forgotDigitRefs.current[index + 1]?.focus();
    }
  };

  // Forgot password: Step 2 -> Reset password with code
  const handleForgotResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const code = forgotDigits.join('').trim();
    if (code.length < 6) {
      setError('Veuillez saisir les 6 chiffres du code reçu par email.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setLoading(true);
    try {
      await api.auth.resetPassword({
        email: forgotEmail.trim(),
        code,
        newPassword,
      });

      alert('Mot de passe mis à jour avec succès ! Vous pouvez maintenant vous connecter.');
      setAuthMode('login');
      setEmail(forgotEmail);
      setPassword('');
      setForgotStep(1);
    } catch (err: any) {
      setError(err.message || 'Code invalide ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  // Verify PC validation code
  const handleVerifyPcDigits = async (typedCode?: string) => {
    const finalCode = (typedCode || pcDigits.join('')).trim();
    if (finalCode.length < 6 || !pcSessionId) return;

    setPcVerifying(true);
    setError(null);
    try {
      const res = await api.auth.verifyPcLogin({
        sessionId: pcSessionId,
        code: finalCode,
      });
      setPcApprovedNotice('Code validé avec succès ! Connexion en cours...');
      setTimeout(() => {
        onSuccess(res.user);
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Code de validation incorrect.');
    } finally {
      setPcVerifying(false);
    }
  };

  const handlePcDigitChange = (index: number, val: string) => {
    if (val.length > 1) {
      const sanitized = val.replace(/\D/g, '').slice(0, 6);
      if (sanitized.length > 0) {
        const next = [...pcDigits];
        for (let i = 0; i < 6; i++) {
          next[i] = sanitized[i] || '';
        }
        setPcDigits(next);
        const nextFocus = Math.min(sanitized.length, 5);
        pcDigitRefs.current[nextFocus]?.focus();
        if (sanitized.length === 6) {
          handleVerifyPcDigits(sanitized);
        }
      }
      return;
    }

    const digit = val.slice(-1).replace(/\D/g, '');
    const next = [...pcDigits];
    next[index] = digit;
    setPcDigits(next);

    if (digit && index < 5) {
      pcDigitRefs.current[index + 1]?.focus();
    }

    if (next.every((d) => d !== '')) {
      handleVerifyPcDigits(next.join(''));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      {/* Radiant ambient glow orbs for brighter, lively atmosphere */}
      <div className="absolute w-[620px] h-[620px] rounded-full bg-gradient-to-tr from-sky-500/25 via-blue-600/20 to-indigo-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-72 h-72 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

      {/* Main Luminous Luxury Card */}
      <div className="w-full max-w-[460px] bg-gradient-to-b from-[#14234d] via-[#101c40] to-[#0d1633] border border-sky-400/40 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_-10px_rgba(30,58,138,0.7),0_0_35px_rgba(56,189,248,0.25)] relative z-10 text-slate-100 overflow-hidden">
        {/* Top luminous cyan accent highlight line */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

        {/* Brand Header with Royal Crown Medallion */}
        <div className="text-center mb-6">
          <div className="relative w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-600 shadow-[0_0_28px_rgba(251,191,36,0.5)] mx-auto mb-3 flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-gradient-to-b from-[#172a5a] via-[#0f1d40] to-[#091124] flex flex-col items-center justify-center relative overflow-hidden">
              <span className="text-[11px] text-amber-300 drop-shadow-md leading-none font-black">
                👑
              </span>
              <span className="text-base font-black tracking-widest text-white font-['Plus_Jakarta_Sans'] leading-none mt-1">
                MK
              </span>
            </div>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Wavegram</h1>
          <p className="text-xs font-semibold text-sky-300 tracking-wide mt-1">
            Connecte-toi · Partage · Explore
          </p>
        </div>

        {/* Error notification banner */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center space-x-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="leading-relaxed font-medium">{error}</span>
          </div>
        )}

        {/* Account reactivation notice banner */}
        {reactivatedBanner && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center space-x-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="font-medium">Compte réactivé avec succès ! Bienvenue de retour.</span>
          </div>
        )}

        {/* =========================================================================
            MODE 1: CONNEXION (LOGIN)
        ========================================================================= */}
        {authMode === 'login' && (
          <div className="space-y-5">
            {/* Segmented Switcher */}
            <div className="bg-[#0a142e] p-1.5 rounded-2xl border border-sky-500/25 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                className="py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-[0_2px_12px_rgba(56,189,248,0.35)] transition cursor-pointer"
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setRegisterStep(1);
                  setError(null);
                }}
                className="py-2.5 rounded-xl font-medium text-xs text-slate-300 hover:text-white hover:bg-white/5 transition cursor-pointer"
              >
                Créer un compte
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200 block">
                  Adresse email
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-sky-300 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@exemple.com"
                    className="w-full bg-[#182c57]/90 hover:bg-[#1b3363]/90 border border-slate-500/60 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-400 outline-none transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200">
                    Mot de passe
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot');
                      setForgotStep(1);
                      setForgotEmail(email);
                      setError(null);
                    }}
                    className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 transition cursor-pointer"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-sky-300 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#182c57]/90 hover:bg-[#1b3363]/90 border border-slate-500/60 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 rounded-2xl py-3 pl-10 pr-10 text-sm text-white placeholder-slate-400 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded-md bg-[#182c57] border-slate-500 text-sky-500 focus:ring-sky-500/30"
                  />
                  <span className="text-xs text-slate-300">Se souvenir de moi</span>
                </label>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-black text-sm shadow-[0_4px_25px_rgba(56,189,248,0.5)] hover:shadow-[0_6px_30px_rgba(56,189,248,0.65)] flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                ) : (
                  <>
                    <span>Se connecter</span>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* =========================================================================
            MODE 2: CRÉATION DE COMPTE (REGISTER - STEP 1 & STEP 2)
        ========================================================================= */}
        {authMode === 'register' && (
          <div className="space-y-5">
            {/* Segmented Switcher */}
            <div className="bg-[#0a142e] p-1.5 rounded-2xl border border-sky-500/25 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setError(null);
                }}
                className="py-2.5 rounded-xl font-medium text-xs text-slate-300 hover:text-white hover:bg-white/5 transition cursor-pointer"
              >
                Connexion
              </button>
              <button
                type="button"
                className="py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-[0_2px_12px_rgba(56,189,248,0.35)] transition cursor-pointer"
              >
                Créer un compte
              </button>
            </div>

            {/* STEP 1: FORM INPUTS */}
            {registerStep === 1 && (
              <form onSubmit={handleStartRegister} className="space-y-4">
                {/* Nom & Prénom */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200 block">
                    Prénom & Nom
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-sky-300 pointer-events-none">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="ex. Rayen Mansouri"
                      className="w-full bg-[#182c57]/90 hover:bg-[#1b3363]/90 border border-slate-500/60 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-400 outline-none transition"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200 block">
                    Adresse email
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-sky-300 pointer-events-none">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nom@exemple.com"
                      className="w-full bg-[#182c57]/90 hover:bg-[#1b3363]/90 border border-slate-500/60 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-400 outline-none transition"
                    />
                  </div>
                  <p className="text-[11px] text-sky-300/80">
                    Un code de sécurité à 6 chiffres vous sera envoyé par email.
                  </p>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200 block">
                    Mot de passe
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-sky-300 pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Au moins 6 caractères"
                      className="w-full bg-[#182c57]/90 hover:bg-[#1b3363]/90 border border-slate-500/60 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 rounded-2xl py-3 pl-10 pr-10 text-sm text-white placeholder-slate-400 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Continue button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-black text-sm shadow-[0_4px_25px_rgba(56,189,248,0.5)] hover:shadow-[0_6px_30px_rgba(56,189,248,0.65)] flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                  ) : (
                    <>
                      <span>Recevoir mon code par email</span>
                      <Mail className="w-4 h-4 text-slate-950" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: 6-DIGIT EMAIL VERIFICATION CODE */}
            {registerStep === 2 && (
              <div className="space-y-5 animate-fadeIn">
                {/* Back to step 1 */}
                <button
                  type="button"
                  onClick={() => {
                    setRegisterStep(1);
                    setError(null);
                  }}
                  className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300 hover:text-sky-300 transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Modifier mes informations</span>
                </button>

                {/* Real Email Security Notice */}
                <div className="p-4 rounded-2xl bg-[#162854]/85 border border-sky-400/40 text-left space-y-2">
                  <div className="flex items-center space-x-2 text-sky-300 text-xs font-bold">
                    <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Vérification de sécurité par email</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    Un vrai code de confirmation à 6 chiffres a été envoyé à :
                  </p>
                  <div className="text-xs font-mono font-bold text-sky-300 break-all bg-[#0d1838] p-2.5 rounded-xl border border-sky-500/30 flex items-center justify-between">
                    <span>{email}</span>
                    <Inbox className="w-4 h-4 text-sky-400 shrink-0 ml-2" />
                  </div>
                  <p className="text-[11px] text-slate-300 pt-0.5 leading-normal">
                    {isRealSmtp ? (
                      <span className="text-emerald-300 font-medium">
                        ✅ Email envoyé directement à votre boîte de réception. Vérifiez vos emails (et dossier indésirables).
                      </span>
                    ) : (
                      <span>
                        📬 Code transmis avec succès. Vérifiez votre boîte de réception.
                      </span>
                    )}
                  </p>

                  {/* Dev fallback option helper if SMTP is not configured */}
                  {!isRealSmtp && devFallbackCode && (
                    <div className="pt-2 border-t border-sky-500/20">
                      <button
                        type="button"
                        onClick={() => setShowDevCodeHelper(!showDevCodeHelper)}
                        className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center space-x-1 underline cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>{showDevCodeHelper ? 'Masquer l’aide' : 'Vous ne recevez pas l’email sur votre boîte externe ?'}</span>
                      </button>

                      {showDevCodeHelper && (
                        <div className="mt-2 p-3 rounded-xl bg-[#0d1838]/90 border border-sky-400/30 text-xs space-y-2 animate-fadeIn">
                          <p className="text-slate-300 text-[11px] leading-relaxed">
                            Pour recevoir directement dans votre boîte Gmail sans relais de test, configurez <code className="text-amber-300 font-mono">GMAIL_APP_PASSWORD</code> dans votre fichier <code className="text-amber-300 font-mono">.env</code>.
                          </p>
                          <div className="flex items-center justify-between bg-sky-950/60 p-2 rounded-lg border border-sky-500/30">
                            <span className="text-slate-300 text-xs">Code généré :</span>
                            <span className="font-mono font-bold text-sky-300 text-base tracking-widest">{devFallbackCode}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setCodeDigits(devFallbackCode.split(''));
                                handleCompleteRegister(devFallbackCode);
                              }}
                              className="text-[11px] font-bold px-2 py-1 bg-sky-500/30 hover:bg-sky-500/50 text-white rounded-md transition"
                            >
                              Remplir
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 6 Digit Inputs */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-200 block text-center">
                    Entrez le code à 6 chiffres reçu
                  </label>
                  <div className="flex justify-center gap-2 sm:gap-2.5">
                    {codeDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          digitInputRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                        className="w-11 h-14 sm:w-12 sm:h-14 text-center font-mono text-2xl font-black text-sky-300 bg-[#182c57] border border-sky-400/40 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/40 rounded-xl outline-none shadow-inner transition"
                      />
                    ))}
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="button"
                  disabled={loading || codeDigits.some((d) => !d)}
                  onClick={() => handleCompleteRegister()}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-black text-sm shadow-[0_4px_25px_rgba(56,189,248,0.5)] hover:shadow-[0_6px_30px_rgba(56,189,248,0.65)] flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                  ) : (
                    <>
                      <span>Confirmer et créer mon compte</span>
                      <Check className="w-4 h-4 stroke-[3] text-slate-950" />
                    </>
                  )}
                </button>

                {/* Resend Code Button with countdown */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    disabled={codeCountdown > 0 || loading}
                    onClick={handleResendCode}
                    className="text-xs font-semibold text-slate-400 hover:text-sky-300 disabled:text-slate-600 transition cursor-pointer disabled:cursor-not-allowed"
                  >
                    {codeCountdown > 0 ? (
                      <span>Renvoyer un nouveau code dans {codeCountdown}s</span>
                    ) : (
                      <span className="text-sky-400 hover:underline">
                        Vous n'avez pas reçu l'email ? Renvoyer le code
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            MODE 3: MOT DE PASSE OUBLIÉ (FORGOT PASSWORD)
        ========================================================================= */}
        {authMode === 'forgot' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Back button */}
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setError(null);
              }}
              className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300 hover:text-sky-300 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour à la connexion</span>
            </button>

            <div className="text-center">
              <h2 className="text-lg font-black text-white">Réinitialisation du mot de passe</h2>
              <p className="text-xs text-slate-300 mt-1">
                {forgotStep === 1
                  ? 'Entrez votre adresse email pour recevoir un code de sécurité.'
                  : 'Saisissez le code reçu par email ainsi que votre nouveau mot de passe.'}
              </p>
            </div>

            {forgotNotice && (
              <div className="p-3.5 rounded-2xl bg-sky-500/20 border border-sky-400/40 text-sky-200 text-xs">
                {forgotNotice}
              </div>
            )}

            {forgotStep === 1 && (
              <form onSubmit={handleForgotSendCode} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200 block">
                    Adresse email de votre compte
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-sky-300 pointer-events-none">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="nom@exemple.com"
                      className="w-full bg-[#182c57]/90 hover:bg-[#1b3363]/90 border border-slate-500/60 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-400 outline-none transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-black text-sm shadow-[0_4px_25px_rgba(56,189,248,0.5)] hover:shadow-[0_6px_30px_rgba(56,189,248,0.65)] flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                  ) : (
                    <>
                      <span>Envoyer le code par email</span>
                      <Mail className="w-4 h-4 text-slate-950" />
                    </>
                  )}
                </button>
              </form>
            )}

            {forgotStep === 2 && (
              <form onSubmit={handleForgotResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-200 block text-center">
                    Code à 6 chiffres reçu par email
                  </label>
                  <div className="flex justify-center gap-2">
                    {forgotDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          forgotDigitRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleForgotDigitChange(idx, e.target.value)}
                        className="w-11 h-14 text-center font-mono text-2xl font-black text-sky-300 bg-[#182c57] border border-sky-400/40 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/40 rounded-xl outline-none"
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-semibold text-slate-200 block">
                    Nouveau mot de passe
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-sky-300 pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Au moins 6 caractères"
                      className="w-full bg-[#182c57]/90 hover:bg-[#1b3363]/90 border border-slate-500/60 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-400 outline-none transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || forgotDigits.some((d) => !d) || !newPassword}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-black text-sm shadow-[0_4px_25px_rgba(56,189,248,0.5)] hover:shadow-[0_6px_30px_rgba(56,189,248,0.65)] flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                  ) : (
                    <>
                      <span>Enregistrer le nouveau mot de passe</span>
                      <Check className="w-4 h-4 stroke-[3] text-slate-950" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* =========================================================================
            MODE 4: VÉRIFICATION PC CROSS-DEVICE
        ========================================================================= */}
        {authMode === 'pc_verify' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Header */}
            <div className="p-4 rounded-2xl bg-[#162854]/85 border border-sky-400/40 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center mx-auto shadow-inner">
                <Laptop className="w-6 h-6" />
              </div>
              <h2 className="text-base font-black text-white">Connexion PC Sécurisée</h2>
              <p className="text-xs text-slate-200 leading-relaxed">
                Un code de validation à 6 chiffres a été envoyé par email à votre adresse. Entrez ce code ci-dessous pour approuver la session.
              </p>
              <div className="text-[11px] text-sky-300 font-mono font-bold">
                Temps restant : {Math.floor(pcCountdown / 60)}:{(pcCountdown % 60).toString().padStart(2, '0')}
              </div>
            </div>

            {pcApprovedNotice && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs text-center flex items-center justify-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-medium">{pcApprovedNotice}</span>
              </div>
            )}

            {/* Digits Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-200 block text-center">
                Entrez le code à 6 chiffres
              </label>
              <div className="flex justify-center gap-2">
                {pcDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      pcDigitRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePcDigitChange(idx, e.target.value)}
                    className="w-11 h-14 text-center font-mono text-2xl font-black text-sky-300 bg-[#182c57] border border-sky-400/40 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/40 rounded-xl outline-none"
                  />
                ))}
              </div>
            </div>

            {/* Validate Button */}
            <button
              type="button"
              disabled={pcVerifying || pcDigits.some((d) => !d)}
              onClick={() => handleVerifyPcDigits()}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 font-black text-sm shadow-[0_4px_25px_rgba(56,189,248,0.5)] hover:shadow-[0_6px_30px_rgba(56,189,248,0.65)] flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              {pcVerifying ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
              ) : (
                <>
                  <span>Valider la session PC</span>
                  <Check className="w-4 h-4 stroke-[3] text-slate-950" />
                </>
              )}
            </button>

            {/* Back button */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setError(null);
                }}
                className="text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
              >
                ← Annuler et revenir à la connexion
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
