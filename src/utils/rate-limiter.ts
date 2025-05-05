export class RateLimiter {
  private requests: number[] = [];
  private requestsPerMinute: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(requestsPerMinute: number) {
    this.requestsPerMinute = requestsPerMinute;
    // Clean up old requests every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove requests older than 1 minute
    this.requests = this.requests.filter(time => time > oneMinuteAgo);

    // If we're under the limit, allow immediately
    if (this.requests.length < this.requestsPerMinute) {
      this.requests.push(now);
      return;
    }

    // Otherwise, calculate how long to wait
    const oldestRequest = this.requests[0];
    const timeToWait = oneMinuteAgo - oldestRequest + 1000; // Add 1s buffer

    if (timeToWait > 0) {
      await new Promise(resolve => setTimeout(resolve, timeToWait));
      return this.acquire(); // Try again after waiting
    }
  }

  private cleanup() {
    const oneMinuteAgo = Date.now() - 60000;
    this.requests = this.requests.filter(time => time > oneMinuteAgo);
  }

  destroy() {
    clearInterval(this.cleanupInterval);
  }
}
