import { describe, expect, it, vi, afterEach } from 'vitest';
import { apiClient } from '../lib/api/client';

describe('auth flows', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the reset password request to the backend reset endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);

    await apiClient.resetPassword('token-hash', 'NewPassword123!');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/auth/reset-password'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token_hash: 'token-hash', password: 'NewPassword123!' }),
      }),
    );
  });
});
