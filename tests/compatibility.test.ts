import { describe, it, expect } from 'vitest'
import { ONLYWORLDS, getFieldType, isRelationshipField } from '../src/compatibility.js'

describe('OnlyWorlds Compatibility Layer', () => {

  describe('Constants', () => {
    it('should provide element types and labels', () => {
      expect(Array.isArray(ONLYWORLDS.ELEMENT_TYPES)).toBe(true)
      expect(ONLYWORLDS.ELEMENT_TYPES).toContain('character')
      expect(ONLYWORLDS.ELEMENT_TYPES).toContain('location')

      expect(typeof ONLYWORLDS.ELEMENT_LABELS).toBe('object')
      expect(typeof ONLYWORLDS.ELEMENT_SINGULAR).toBe('object')
    })
  })

  describe('Field Type Detection', () => {
    it('should detect basic field types', () => {
      expect(getFieldType('name').type).toBe('string')
      expect(getFieldType('created_at').type).toBe('date')
      expect(getFieldType('world').type).toBe('uuid')
    })

    it('should infer types from sample values', () => {
      // UUID detection
      const uuidValue = '01234567-89ab-4def-8123-456789abcdef'
      expect(getFieldType('relation', uuidValue).type).toBe('uuid')

      // Boolean detection
      expect(getFieldType('active', true).type).toBe('boolean')

      // Number detection
      expect(getFieldType('count', 42).type).toBe('number')

      // Date string detection
      expect(getFieldType('timestamp', '2024-01-01T00:00:00Z').type).toBe('date')

      // Long text detection
      const longText = 'A'.repeat(250)
      expect(getFieldType('content', longText).type).toBe('longtext')
    })
  })

  describe('Relationship Detection', () => {
    it('should identify relationship fields', () => {
      expect(isRelationshipField('world')).toBe(true)
      expect(isRelationshipField('name')).toBe(false)
      expect(isRelationshipField('description')).toBe(false)
    })
  })
})