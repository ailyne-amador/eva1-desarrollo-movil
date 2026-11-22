const listeners = new Set<(state: { isConnected: boolean }) => void>();
let isConnected = true;

export default {
  fetch: jest.fn(() => Promise.resolve({ isConnected })),
  addEventListener: jest.fn((listener: (state: { isConnected: boolean }) => void) => {
    listeners.add(listener);
    listener({ isConnected });
    return () => listeners.delete(listener);
  }),
  __setConnected: (value: boolean) => {
    isConnected = value;
    listeners.forEach((listener) => listener({ isConnected }));
  },
};
