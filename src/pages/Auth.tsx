import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Check } from 'lucide-react';
import heroImage from '@/assets/hero-africa.jpg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const TRUST_SIGNALS = [
  'Zero trading positions. Radical transparency.',
  'Scout Scores updated weekly on 50 companies.',
  'Boardroom tier: 50 seats only.',
];

const Auth = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sign in
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign up
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirm, setSignUpConfirm] = useState('');

  const redirectAfterAuth = () => {
    const returnTo = sessionStorage.getItem('return_to');
    if (returnTo) {
      sessionStorage.removeItem('return_to');
      navigate(returnTo);
    } else {
      navigate('/dashboard');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: signInEmail,
      password: signInPassword,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    redirectAfterAuth();
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (signUpPassword !== signUpConfirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: signUpEmail,
      password: signUpPassword,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      redirectAfterAuth();
    } else {
      setError('Check your email to confirm your account before signing in.');
      setTab('signin');
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2 bg-background">
      {/* LEFT PANEL */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-card p-12">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15"
          style={{ backgroundImage: `url(${heroImage})` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/40 via-transparent to-background/80" aria-hidden />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 glow-brand">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            <span className="text-gradient-brand">OMNI-SCOUT</span> AFRICA
          </span>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="font-display text-4xl font-bold leading-tight">
              Unbiased Intelligence for{' '}
              <span className="text-gradient-brand">Africa's Next 50</span>
            </h2>
          </div>

          <ul className="space-y-4">
            {TRUST_SIGNALS.map((s) => (
              <li key={s} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Check className="h-4 w-4 text-primary" />
                </span>
                <span className="text-sm text-foreground/90">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-muted-foreground">
          © 2026 Omni-Scout Africa. Radical transparency.
        </p>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 glow-brand">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <h1 className="font-display text-xl font-bold">
              <span className="text-gradient-brand">Omni-Scout</span> Africa
            </h1>
          </div>

          <div className="glass-card rounded-xl p-6 sm:p-8">
            <Tabs value={tab} onValueChange={(v) => { setTab(v as 'signin' | 'signup'); setError(null); }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-6">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      required
                      maxLength={255}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      required
                      minLength={6}
                      maxLength={128}
                      autoComplete="current-password"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-destructive" role="alert">{error}</p>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={loading}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      required
                      maxLength={255}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      required
                      minLength={6}
                      maxLength={128}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="Re-enter password"
                      value={signUpConfirm}
                      onChange={(e) => setSignUpConfirm(e.target.value)}
                      required
                      minLength={6}
                      maxLength={128}
                      autoComplete="new-password"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-destructive" role="alert">{error}</p>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={loading}
                  >
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              By continuing you agree to our Terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
