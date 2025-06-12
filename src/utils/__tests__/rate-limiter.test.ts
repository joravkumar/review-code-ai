import { RateLimiter } from '../rate-limiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('throttles when the limit is exceeded', async () => {
    const limiter = new RateLimiter(2);

    const start = Date.now();
    await limiter.acquire();
    await limiter.acquire();

    const acquirePromise = limiter.acquire();

    // Fast forward time to allow the queued request to proceed
    jest.advanceTimersByTime(61000);
    await acquirePromise;
    const end = Date.now();

    expect(end - start).toBeGreaterThanOrEqual(61000);
    // After cleanup the queue should contain only the last request
    expect((limiter as any).requests.length).toBe(1);

    limiter.destroy();
  });
});
