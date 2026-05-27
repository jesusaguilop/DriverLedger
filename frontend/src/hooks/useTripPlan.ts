import { useState, useCallback } from 'react';
import { TripPlan, TripFormData } from '../types/trip';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export function useTripPlan() {
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planTrip = useCallback(async (data: TripFormData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/plan-trip/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${res.status}`);
      }
      const result: TripPlan = await res.json();
      setTripPlan(result);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to plan trip';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setTripPlan(null);
    setError(null);
  }, []);

  return { tripPlan, loading, error, planTrip, reset };
}
