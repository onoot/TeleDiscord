import { Registry, Counter, Gauge, Histogram } from 'prom-client';

// Создаем реестр метрик
export const register = new Registry();

// Метрики для звонков
export const callsTotal = new Counter({
  name: 'calls_total',
  help: 'Total number of calls',
  labelNames: ['type', 'status']
});

export const activeCallsGauge = new Gauge({
  name: 'active_calls',
  help: 'Number of currently active calls'
});

export const callDurationHistogram = new Counter({
  name: 'call_duration_seconds',
  help: 'Duration of calls in seconds',
  labelNames: ['type']
});

export const callSetupTimeHistogram = new Histogram({
  name: 'call_setup_time_seconds',
  help: 'Time taken to establish a call',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

export const failedCallsCounter = new Counter({
  name: 'failed_calls_total',
  help: 'Total number of failed calls',
  registers: [register]
});

export const webrtcErrorsCounter = new Counter({
  name: 'webrtc_errors_total',
  help: 'Total number of WebRTC errors',
  labelNames: ['error_type'],
  registers: [register]
});

// Метрики для системных ресурсов
export const mediaProcessingGauge = new Gauge({
  name: 'media_processing_current',
  help: 'Number of currently processing media streams',
  registers: [register]
});

export const mediaProcessingDurationHistogram = new Histogram({
  name: 'media_processing_duration_seconds',
  help: 'Duration of media processing operations',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

// Регистрируем метрики
register.registerMetric(callsTotal);
register.registerMetric(activeCallsGauge);
register.registerMetric(callDurationHistogram); 