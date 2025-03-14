// Add this file to provide polyfills for missing browser features

// Polyfill for AbortSignal.timeout
if (!AbortSignal.timeout) {
  AbortSignal.timeout = (ms: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException('TimeoutError', 'Timeout')), ms);
    return controller.signal;
  };
} 