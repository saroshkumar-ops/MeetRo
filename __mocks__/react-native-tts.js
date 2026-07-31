// Manual Jest mock — this package requires a real native module, unavailable under Jest.

module.exports = {
  getInitStatus: jest.fn(() => Promise.resolve('success')),
  requestInstallEngine: jest.fn(() => Promise.resolve('success')),
  setDucking: jest.fn(() => Promise.resolve('success')),
  setDefaultRate: jest.fn(() => Promise.resolve('success')),
  setDefaultPitch: jest.fn(() => Promise.resolve('success')),
  setDefaultLanguage: jest.fn(() => Promise.resolve('success')),
  speak: jest.fn(() => 'utterance-id'),
  stop: jest.fn(() => Promise.resolve(true)),
  pause: jest.fn(() => Promise.resolve(true)),
  resume: jest.fn(() => Promise.resolve(true)),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  voices: jest.fn(() => Promise.resolve([])),
};
