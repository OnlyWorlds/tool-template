import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiService } from '../src/api.js'

// Mock console methods to reduce test output noise
const consoleMock = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}

vi.stubGlobal('console', consoleMock)

describe('OnlyWorlds API Service', () => {

  describe('UUID Generation', () => {
    it('should generate valid UUIDv7 format', () => {
      const uuid = apiService.generateId()

      // UUIDv7 format: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

      expect(uuid).toMatch(uuidRegex)
      expect(uuid.length).toBe(36)
      expect(uuid[14]).toBe('7') // Version 7 identifier
    })

    it('should generate unique UUIDs', () => {
      const uuid1 = apiService.generateId()
      const uuid2 = apiService.generateId()

      expect(uuid1).not.toBe(uuid2)
    })
  })

  describe('Element Type Management', () => {
    it('should provide valid element types as fallback', () => {
      // This test shows fallback behavior when not authenticated
      const elementTypes = apiService.getElementTypes()

      expect(Array.isArray(elementTypes)).toBe(true)
      expect(elementTypes.length).toBeGreaterThan(0)
      expect(elementTypes).toContain('character')
      expect(elementTypes).toContain('location')
    })
  })

  describe('Data Cleaning', () => {
    it('should clean element data for API submission', () => {
      const testElement = {
        id: 'test-id',
        name: 'Test Element',
        description: 'Test description',
        world: { id: 'world-123', name: 'Test World' },
        created_at: '2024-01-01T00:00:00Z', // Should be excluded
        updated_at: '2024-01-01T00:00:00Z', // Should be excluded
        relations: [
          { id: 'rel-1', name: 'Relation 1' },
          { id: 'rel-2', name: 'Relation 2' }
        ]
      }

      const cleanedData = apiService.cleanLinkFields(testElement)

      // Should preserve basic fields
      expect(cleanedData.name).toBe('Test Element')
      expect(cleanedData.description).toBe('Test description')

      // Should convert world object to ID
      expect(cleanedData.world).toBe('world-123')

      // Should convert array relationships to IDs
      expect(cleanedData.relations_ids).toEqual(['rel-1', 'rel-2'])

      // Should exclude timestamp fields
      expect(cleanedData.created_at).toBeUndefined()
      expect(cleanedData.updated_at).toBeUndefined()
    })
  })

  describe('Cache Management', () => {
    beforeEach(() => {
      apiService.clearCache()
    })

    it('should clear cache and world ID', async () => {
      apiService.clearCache()
      await expect(apiService.getWorldId()).resolves.toBeNull()
    })
  })
})