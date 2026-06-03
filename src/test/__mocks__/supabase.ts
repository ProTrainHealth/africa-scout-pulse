import { vi } from 'vitest';

/**
 * Shared mock for `@/integrations/supabase/client`.
 *
 * The query builder is chainable: every filter/modifier returns `this`, and
 * terminal methods (`single`, `maybeSingle`, `then`) resolve to `{ data, error }`.
 * Override per-test with `mockSupabase.from.mockImplementationOnce(...)`.
 */

const makeQueryBuilder = (resolved: { data: unknown; error: unknown } = { data: null, error: null }) => {
  const builder: Record<string, any> = {};
  const chain = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'like', 'ilike', 'is', 'in', 'contains', 'containedBy',
    'rangeGt', 'rangeGte', 'rangeLt', 'rangeLte', 'rangeAdjacent', 'overlaps',
    'textSearch', 'match', 'not', 'or', 'filter',
    'order', 'limit', 'range', 'abortSignal', 'returns', 'csv', 'geojson', 'explain',
  ];
  for (const m of chain) builder[m] = vi.fn().mockReturnValue(builder);

  builder.single = vi.fn().mockResolvedValue(resolved);
  builder.maybeSingle = vi.fn().mockResolvedValue(resolved);
  builder.then = (onFulfilled: any, onRejected: any) =>
    Promise.resolve(resolved).then(onFulfilled, onRejected);

  return builder;
};

const mockFrom = vi.fn(() => makeQueryBuilder());

const mockChannel = vi.fn(() => {
  const ch: Record<string, any> = {};
  ch.on = vi.fn().mockReturnValue(ch);
  ch.subscribe = vi.fn().mockReturnValue(ch);
  ch.unsubscribe = vi.fn().mockResolvedValue('ok');
  ch.send = vi.fn().mockResolvedValue('ok');
  ch.track = vi.fn().mockResolvedValue('ok');
  return ch;
});

const mockStorageBucket = () => ({
  upload: vi.fn().mockResolvedValue({ data: { path: 'mock/path' }, error: null }),
  download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
  remove: vi.fn().mockResolvedValue({ data: [], error: null }),
  list: vi.fn().mockResolvedValue({ data: [], error: null }),
  createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.example' }, error: null }),
  createSignedUrls: vi.fn().mockResolvedValue({ data: [], error: null }),
  getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://public.example' } })),
  move: vi.fn().mockResolvedValue({ data: null, error: null }),
  copy: vi.fn().mockResolvedValue({ data: null, error: null }),
});

export const mockSupabase = {
  from: mockFrom,
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  channel: mockChannel,
  removeChannel: vi.fn().mockResolvedValue('ok'),
  removeAllChannels: vi.fn().mockResolvedValue('ok'),
  getChannels: vi.fn(() => []),
  auth: {
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({ data: { provider: 'google', url: '' }, error: null }),
    signInWithOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
    updateUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    refreshSession: vi.fn().mockResolvedValue({ data: { session: null, user: null }, error: null }),
  },
  storage: {
    from: vi.fn(() => mockStorageBucket()),
    listBuckets: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
  functions: {
    invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
};

// Test helpers
export const resetSupabaseMocks = () => {
  vi.clearAllMocks();
  mockFrom.mockImplementation(() => makeQueryBuilder());
};

export { makeQueryBuilder };

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));
