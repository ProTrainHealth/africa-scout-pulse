import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock useAuth directly
const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock supabase
const mockFrom = vi.fn();
const mockChannel = vi.fn(() => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (_table: string) => mockFrom(),
    channel: (_name: string) => mockChannel(),
    removeChannel: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

describe('useSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
  });

  it('returns no subscription when user is not authenticated', async () => {
    const { useSubscription } = await import('@/hooks/useSubscription');
    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.subscription).toBeNull();
    expect(result.current.isActive).toBe(false);
    expect(result.current.plan).toBeNull();
  });

  it('returns no subscription when user is authenticated but no subscription exists', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-123' }, loading: false });

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));

    const { useSubscription } = await import('@/hooks/useSubscription');
    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.subscription).toBeNull();
    expect(result.current.isActive).toBe(false);
  });

  it('returns active subscription for paid users with valid period', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-123' }, loading: false });

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const mockSub = {
      id: 'sub-1',
      user_id: 'user-123',
      plan: 'analyst',
      status: 'active',
      payment_provider: 'paypal',
      provider_subscription_id: 'I-ABC123',
      provider_customer_id: null,
      current_period_end: futureDate.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockSub, error: null }),
    }));

    const { useSubscription } = await import('@/hooks/useSubscription');
    const { result } = renderHook(() => useSubscription());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.subscription).not.toBeNull();
    expect(result.current.isActive).toBe(true);
    expect(result.current.plan).toBe('analyst');
  });
});

describe('useWatchlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
  });

  it('returns empty watchlist for unauthenticated users', async () => {
    const { useWatchlist } = await import('@/hooks/useWatchlist');
    const { result } = renderHook(() => useWatchlist());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it('fetches watchlist items for authenticated users', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-123' }, loading: false });

    const mockItems = [
      { id: 'wl-1', user_id: 'user-123', company_id: 'comp-1', created_at: new Date().toISOString() },
    ];

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
    }));

    const { useWatchlist } = await import('@/hooks/useWatchlist');
    const { result } = renderHook(() => useWatchlist());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.isTracked('comp-1')).toBe(true);
    expect(result.current.isTracked('comp-2')).toBe(false);
  });
});