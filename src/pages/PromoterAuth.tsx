import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type AuthMode = 'login' | 'signup' | 'upgrade';

const industryRoles = [
  { value: 'promoter', label: 'Event Promoter' },
  { value: 'venue_manager', label: 'Venue Manager' },
  { value: 'artist_manager', label: 'Artist Manager' },
  { value: 'booking_agent', label: 'Booking Agent' },
  { value: 'musician', label: 'Musician / Band Member' },
  { value: 'other', label: 'Other' },
];

export default function PromoterAuth() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isLoading: authLoading, isPromoter, signInWithEmail } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  
  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Professional info fields (for signup and upgrade)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [industryRole, setIndustryRole] = useState('');
  const [managedEntity, setManagedEntity] = useState('');

  // Determine mode based on auth state
  useEffect(() => {
    if (!authLoading) {
      if (user && isPromoter) {
        // Already a promoter, redirect to create page
        navigate('/promoters/create');
      } else if (user && !isPromoter) {
        // Logged in but not a promoter, show upgrade form
        setMode('upgrade');
      }
    }
  }, [user, isPromoter, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await signInWithEmail(email, password);
      if (error) {
        toast.error(error.message);
      }
      // Auth state change will handle redirect
    } catch (err) {
      toast.error('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName || !lastName || !city || !industryRole || !managedEntity) {
      toast.error('Please fill in all professional information');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('promoter-signup', {
        body: {
          email,
          password,
          firstName,
          lastName,
          city,
          industryRole,
          managedEntity,
        },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success('Account created! Please check your email to confirm.');
      setMode('login');
    } catch (err: any) {
      toast.error(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName || !lastName || !city || !industryRole || !managedEntity) {
      toast.error('Please fill in all professional information');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('promoter-signup', {
        body: {
          upgrade: true,
          firstName,
          lastName,
          city,
          industryRole,
          managedEntity,
        },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success('Welcome to laiive Pro!');
      // Refresh the page to update auth state
      window.location.href = '/promoters/create';
    } catch (err: any) {
      toast.error(err.message || 'Upgrade failed');
    } finally {
      setIsLoading(false);
    }
  };

  const ProfessionalInfoFields = () => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
            required
            className="bg-background/50 border-cyan-500/30 focus:border-cyan-500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
            required
            className="bg-background/50 border-cyan-500/30 focus:border-cyan-500"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="city">City</Label>
        <Input
          id="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Barcelona"
          required
          className="bg-background/50 border-cyan-500/30 focus:border-cyan-500"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="industryRole">Your Role in the Industry</Label>
        <Select value={industryRole} onValueChange={setIndustryRole}>
          <SelectTrigger className="bg-background/50 border-cyan-500/30 focus:border-cyan-500">
            <SelectValue placeholder="Select your role" />
          </SelectTrigger>
          <SelectContent>
            {industryRoles.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="managedEntity">What do you manage?</Label>
        <Input
          id="managedEntity"
          value={managedEntity}
          onChange={(e) => setManagedEntity(e.target.value)}
          placeholder="Venue name, band name, event series..."
          required
          className="bg-background/50 border-cyan-500/30 focus:border-cyan-500"
        />
      </div>
    </>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-cyan-500/20">
        <button
          onClick={() => navigate('/promoters')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-foreground">laiive</span>
          <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30">
            PRO
          </span>
        </div>
        <div className="w-16" /> {/* Spacer for centering */}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-background/50 border-cyan-500/30">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {mode === 'login' && 'Promoter Login'}
              {mode === 'signup' && 'Become a Promoter'}
              {mode === 'upgrade' && 'Upgrade to Pro'}
            </CardTitle>
            <CardDescription>
              {mode === 'login' && 'Sign in to your promoter account'}
              {mode === 'signup' && 'Create your promoter account with professional info'}
              {mode === 'upgrade' && 'Complete your profile to start publishing events'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="bg-background/50 border-cyan-500/30 focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="bg-background/50 border-cyan-500/30 focus:border-cyan-500"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-cyan-400 hover:underline"
                  >
                    Sign up as a promoter
                  </button>
                </p>
              </form>
            )}

            {mode === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="bg-background/50 border-cyan-500/30 focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="bg-background/50 border-cyan-500/30 focus:border-cyan-500"
                  />
                </div>
                
                <div className="border-t border-cyan-500/20 pt-4 mt-4">
                  <p className="text-sm text-muted-foreground mb-4">Professional Information</p>
                  <div className="space-y-4">
                    <ProfessionalInfoFields />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Promoter Account'}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-cyan-400 hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </form>
            )}

            {mode === 'upgrade' && (
              <form onSubmit={handleUpgrade} className="space-y-4">
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 mb-4">
                  <p className="text-sm text-cyan-400">
                    You're signed in as <strong>{user?.email}</strong>. Complete your profile below to become a promoter.
                  </p>
                </div>
                
                <ProfessionalInfoFields />
                
                <Button 
                  type="submit" 
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upgrade to Pro'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
