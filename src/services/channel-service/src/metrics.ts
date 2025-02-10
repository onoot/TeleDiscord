import { Registry, Counter, Gauge, Histogram } from 'prom-client';

// Создаем реестр метрик
export const register = new Registry();

// Метрики для каналов
export const activeChannelsGauge = new Gauge({
  name: 'active_channels_total',
  help: 'Total number of active channels',
  registers: [register]
});

export const channelMembersGauge = new Gauge({
  name: 'channel_members_total',
  help: 'Total number of members in channels',
  labelNames: ['channel_id'],
  registers: [register]
});

export const channelMessagesCounter = new Counter({
  name: 'channel_messages_total',
  help: 'Total number of messages sent in channels',
  labelNames: ['channel_id'],
  registers: [register]
});

export const channelOperationDuration = new Histogram({
  name: 'channel_operation_duration_seconds',
  help: 'Duration of channel operations',
  labelNames: ['operation'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

export const channelErrorsCounter = new Counter({
  name: 'channel_errors_total',
  help: 'Total number of errors in channel operations',
  labelNames: ['operation', 'error_type'],
  registers: [register]
});

// Метрики для групп
export const activeGroupsGauge = new Gauge({
  name: 'active_groups_total',
  help: 'Total number of active groups',
  registers: [register]
});

export const groupMembersGauge = new Gauge({
  name: 'group_members_total',
  help: 'Total number of members in groups',
  labelNames: ['group_id'],
  registers: [register]
});

export const groupMessagesCounter = new Counter({
  name: 'group_messages_total',
  help: 'Total number of messages sent in groups',
  labelNames: ['group_id'],
  registers: [register]
});

export const groupOperationDuration = new Histogram({
  name: 'group_operation_duration_seconds',
  help: 'Duration of group operations',
  labelNames: ['operation'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
}); 