// Manual Jest mock for @notifee/react-native — this package requires a real
// native module (Android/iOS), which isn't available under Jest. Used so
// App.tsx and anything importing notifee can be unit/smoke-tested headlessly.

const notifee = {
  createChannel: jest.fn(() => Promise.resolve('mock-channel-id')),
  createChannelGroup: jest.fn(() => Promise.resolve('mock-channel-group-id')),
  displayNotification: jest.fn(() => Promise.resolve('mock-notification-id')),
  cancelNotification: jest.fn(() => Promise.resolve()),
  stopForegroundService: jest.fn(() => Promise.resolve()),
  registerForegroundService: jest.fn(),
  onForegroundEvent: jest.fn(() => () => {}),
  onBackgroundEvent: jest.fn(),
  getInitialNotification: jest.fn(() => Promise.resolve(null)),
  requestPermission: jest.fn(() => Promise.resolve({ authorizationStatus: 1 })),
};

module.exports = notifee;
module.exports.default = notifee;

module.exports.AndroidImportance = {
  NONE: 0,
  MIN: 1,
  LOW: 2,
  DEFAULT: 3,
  HIGH: 4,
};

module.exports.AndroidVisibility = {
  SECRET: -1,
  PRIVATE: 0,
  PUBLIC: 1,
};

module.exports.AndroidCategory = {
  ALARM: 'alarm',
  CALL: 'call',
  EMAIL: 'email',
  ERROR: 'error',
  EVENT: 'event',
  MESSAGE: 'msg',
  NAVIGATION: 'navigation',
  PROGRESS: 'progress',
  PROMO: 'promo',
  RECOMMENDATION: 'recommendation',
  REMINDER: 'reminder',
  SERVICE: 'service',
  SOCIAL: 'social',
  STATUS: 'status',
  SYSTEM: 'sys',
  TRANSPORT: 'transport',
};

module.exports.EventType = {
  UNKNOWN: -1,
  DISMISSED: 0,
  PRESS: 1,
  ACTION_PRESS: 2,
  DELIVERED: 3,
  APP_BLOCKED: 4,
  CHANNEL_BLOCKED: 5,
  CHANNEL_GROUP_BLOCKED: 6,
  TRIGGER_NOTIFICATION_CREATED: 7,
  FG_ALREADY_EXIST: 8,
};

module.exports.AndroidStyle = {
  BIGPICTURE: 0,
  BIGTEXT: 1,
  INBOX: 2,
  MESSAGING: 3,
};
