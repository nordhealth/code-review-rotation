import { describe, expect, it, vi } from 'vitest'

// Mock useRuntimeConfig before importing the module
vi.stubGlobal('useRuntimeConfig', () => ({
  resendApiKey: '',
  emailFrom: 'test@example.com',
}))

const { sendConfirmationEmail, sendPasswordResetEmail, sendInviteEmail } = await import(
  '~/server/utils/email',
)

describe('email utilities (no Resend configured)', () => {
  it('sendConfirmationEmail logs to console when Resend is not configured', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await sendConfirmationEmail('test@nordhealth.com', 'Test', 'https://example.com/confirm?token=abc')
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Confirmation link for test@nordhealth.com'),
    )
    consoleSpy.mockRestore()
  })

  it('sendPasswordResetEmail logs to console when Resend is not configured', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await sendPasswordResetEmail('test@nordhealth.com', 'Test', 'https://example.com/reset?token=abc')
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Reset link for test@nordhealth.com'),
    )
    consoleSpy.mockRestore()
  })

  it('sendInviteEmail logs to console when Resend is not configured', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await sendInviteEmail('new@nordhealth.com', 'https://example.com/register?email=new@nordhealth.com')
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invite link for new@nordhealth.com'),
    )
    consoleSpy.mockRestore()
  })

  it('sendConfirmationEmail includes the URL in the log', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const url = 'https://example.com/confirm?token=test123'
    await sendConfirmationEmail('dev@provet.com', 'Dev', url)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(url),
    )
    consoleSpy.mockRestore()
  })

  it('sendPasswordResetEmail includes the URL in the log', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const url = 'https://example.com/reset?token=reset456'
    await sendPasswordResetEmail('dev@provet.com', 'Dev', url)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(url),
    )
    consoleSpy.mockRestore()
  })

  it('sendInviteEmail includes the URL in the log', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const url = 'https://example.com/register?email=test@nordhealth.com'
    await sendInviteEmail('test@nordhealth.com', url)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(url),
    )
    consoleSpy.mockRestore()
  })
})
