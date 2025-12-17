import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const WEEKLY_LIMIT = 5;

// Get Monday of current week (UTC)
function getWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff));
  return monday.toISOString().split('T')[0];
}

export function QueryCounter() {
  const { user, isPromoter } = useAuth();
  const [queryCount, setQueryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || isPromoter) {
      setIsLoading(false);
      return;
    }

    const fetchUsage = async () => {
      const weekStart = getWeekStart();
      const { data } = await supabase
        .from('user_query_usage')
        .select('query_count')
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
        .maybeSingle();
      
      setQueryCount(data?.query_count ?? 0);
      setIsLoading(false);
    };

    fetchUsage();
  }, [user, isPromoter]);

  // Don't show for promoters (unlimited)
  if (isPromoter || isLoading) {
    return null;
  }

  const remaining = Math.max(0, WEEKLY_LIMIT - queryCount);
  const isLow = remaining <= 2;
  const isExhausted = remaining === 0;

  return (
    <div className={`text-xs px-2 py-1 rounded-full border ${
      isExhausted 
        ? 'bg-destructive/10 border-destructive/30 text-destructive' 
        : isLow 
          ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'
          : 'bg-card border-border/50 text-muted-foreground'
    }`}>
      {remaining}/{WEEKLY_LIMIT} queries
    </div>
  );
}

export function useQueryLimit() {
  const { user, isPromoter } = useAuth();
  const [queryCount, setQueryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchUsage = async () => {
      const weekStart = getWeekStart();
      const { data } = await supabase
        .from('user_query_usage')
        .select('query_count')
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
        .maybeSingle();
      
      setQueryCount(data?.query_count ?? 0);
      setIsLoading(false);
    };

    fetchUsage();
  }, [user]);

  const canQuery = isPromoter || queryCount < WEEKLY_LIMIT;
  const remaining = Math.max(0, WEEKLY_LIMIT - queryCount);

  const incrementCount = () => {
    if (!isPromoter) {
      setQueryCount(prev => prev + 1);
    }
  };

  return { canQuery, remaining, isLoading, incrementCount, isPromoter };
}
