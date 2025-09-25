import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import AuthManager from '../src/auth.js'

// Mock console methods to reduce test output noise
const consoleMock = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}

vi.stubGlobal('console', consoleMock)

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    })
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock
})

// Mock the OnlyWorlds SDK
vi.mock('@onlyworlds/sdk', () => ({
  OnlyWorldsClient: vi.fn().mockImplementation(() => ({
    worlds: {
      list: vi.fn().mockResolvedValue([{
        id: 'test-world-123',
        name: 'Test World',
        description: 'A test world',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }])
    }
  }))
}))

describe('AuthManager', () => {
  let authManager: AuthManager

  beforeEach(() => {
    authManager = new AuthManager()
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    authManager.clearCredentials()
  })

  describe('Authentication', () => {
    it('should reject empty credentials', async () => {
      await expect(authManager.authenticate('', ''))
        .rejects.toThrow('API Key and PIN are required')
    })

    it('should authenticate with valid credentials', async () => {
      const result = await authManager.authenticate('1234567890', '1234')

      expect(result).toBe(true)
      expect(authManager.checkAuth()).toBe(true)
    })

    it('should generate proper API headers after authentication', async () => {
      await authManager.authenticate('1234567890', '1234')

      const headers = authManager.getHeaders()
      expect(headers).toEqual({
        'API-Key': '1234567890',
        'API-Pin': '1234',
        'Content-Type': 'application/json'
      })
    })
  })

  describe('Credential Storage', () => {
    it('should save and encode credentials in localStorage', async () => {
      await authManager.authenticate('1234567890', '1234')

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ow_auth_credentials',
        expect.stringContaining('"apiKey"')
      )

      // Verify credentials are encoded
      const storedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      expect(storedData.apiKey).toBe(btoa('1234567890'))
      expect(storedData.apiPin).toBe(btoa('1234'))
    })

    it('should clear stored credentials', () => {
      authManager.clearCredentials()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('ow_auth_credentials')
      expect(authManager.checkAuth()).toBe(false)
    })
  })

  describe('Auto-Authentication', () => {
    it('should auto-authenticate with stored credentials', async () => {
      // Store valid credentials
      const credentials = {
        apiKey: btoa('1234567890'),
        apiPin: btoa('1234'),
        timestamp: Date.now()
      }
      localStorageMock.setItem('ow_auth_credentials', JSON.stringify(credentials))

      const result = await authManager.tryAutoAuthenticate()

      expect(result).toBe(true)
      expect(authManager.checkAuth()).toBe(true)
    })

    it('should fail auto-authentication without stored credentials', async () => {
      const result = await authManager.tryAutoAuthenticate()

      expect(result).toBe(false)
      expect(authManager.checkAuth()).toBe(false)
    })
  })
})