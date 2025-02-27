require('dotenv').config({ path: '.env.test' }); // Файл зі змінними оточення для тестів
const { signHMAC, sha256, controlDevice } = require('../utils/deviceUtils'); // Шлях до файлу з функціями
const crypto = require('crypto');
const fetch = require('node-fetch');

jest.mock('node-fetch', () => jest.fn());

describe('Device Utils Tests', () => {
  describe('signHMAC', () => {
    it('returns a valid HMAC-SHA256 signature', () => {
      const message = 'test_message';
      const secretKey = 'secret_key';
      const expectedSignature = crypto.createHmac('sha256', secretKey).update(message).digest('hex');

      const result = signHMAC(message, secretKey);
      expect(result).toBe(expectedSignature);
    });
  });

  describe('sha256', () => {
    it('returns a valid SHA256 hash', () => {
      const message = 'test_message';
      const expectedHash = crypto.createHash('sha256').update(message).digest('hex');

      const result = sha256(message);
      expect(result).toBe(expectedHash);
    });
  });

  describe('controlDevice', () => {
    const mockResponse = {
      json: jest.fn().mockResolvedValue({
        result: {
          access_token: 'fake_access_token'
        }
      }),
      ok: true,
    };

    beforeEach(() => {
      fetch.mockImplementation(() => Promise.resolve(mockResponse));
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('successfully receives an access token and sends a command to the device', async () => {
      const deviceResponse = {
        result: { success: true }
      };

      fetch.mockImplementationOnce(() => Promise.resolve({
        json: jest.fn().mockResolvedValue({
          result: {
            access_token: 'fake_access_token'
          }
        }),
        ok: true
      }))
      .mockImplementationOnce(() => Promise.resolve({
        json: jest.fn().mockResolvedValue(deviceResponse),
        ok: true
      }));

      const logSpy = jest.spyOn(console, 'log');
      await controlDevice(true);

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(logSpy).toHaveBeenCalledWith('Device control response:', deviceResponse);
      logSpy.mockRestore();
    });

    it('displays an error if an access token cannot be obtained', async () => {
      fetch.mockImplementationOnce(() => Promise.resolve({
        json: jest.fn().mockResolvedValue({ result: null }),
        ok: false
      }));

      const consoleSpy = jest.spyOn(console, 'error');
      await controlDevice(true);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error during device control:'));
      consoleSpy.mockRestore();
    });

    it('displays an error if the device control request fails', async () => {
      fetch
        .mockImplementationOnce(() => Promise.resolve({
          json: jest.fn().mockResolvedValue({
            result: {
              access_token: 'fake_access_token'
            }
          }),
          ok: true
        }))
        .mockImplementationOnce(() => Promise.resolve({
          json: jest.fn().mockResolvedValue({}),
          ok: false
        }));

      const consoleSpy = jest.spyOn(console, 'error');
      await controlDevice(true);

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error during device control:'));
      consoleSpy.mockRestore();
    });
  });
});
console.log("Рекомендуем установить расширение для прогона jest тестов.");
