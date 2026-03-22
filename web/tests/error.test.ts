import { describe, expect, it } from 'vitest'
import { extractErrorMessage } from '~/app/utils/error'

describe('extractErrorMessage', () => {
  it('extracts statusMessage from fetch error', () => {
    const error = { data: { statusMessage: 'Unauthorized' } }
    expect(extractErrorMessage(error, 'fallback')).toBe('Unauthorized')
  })

  it('extracts message from fetch error', () => {
    const error = { data: { message: 'Not found' } }
    expect(extractErrorMessage(error, 'fallback')).toBe('Not found')
  })

  it('prefers statusMessage over message', () => {
    const error = { data: { statusMessage: 'Status', message: 'Message' } }
    expect(extractErrorMessage(error, 'fallback')).toBe('Status')
  })

  it('returns fallback for null error', () => {
    expect(extractErrorMessage(null, 'Something went wrong')).toBe('Something went wrong')
  })

  it('returns fallback for undefined error', () => {
    expect(extractErrorMessage(undefined, 'Failed')).toBe('Failed')
  })

  it('returns fallback for error without data', () => {
    expect(extractErrorMessage({}, 'Oops')).toBe('Oops')
  })

  it('returns fallback for error with empty data', () => {
    expect(extractErrorMessage({ data: {} }, 'Nope')).toBe('Nope')
  })

  it('returns fallback for plain Error object', () => {
    expect(extractErrorMessage(new Error('boom'), 'Failed')).toBe('Failed')
  })
})
