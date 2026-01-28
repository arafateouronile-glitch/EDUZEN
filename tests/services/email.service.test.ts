/**
 * Tests unitaires pour EmailService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EmailService } from '@/lib/services/email.service'

// Mock global fetch
global.fetch = vi.fn()

describe('EmailService', () => {
  let emailService: EmailService

  beforeEach(() => {
    emailService = new EmailService()
    vi.clearAllMocks()
  })

  describe('sendEmail', () => {
    it('devrait envoyer un email avec succès', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ message: 'Email envoyé avec succès' }),
      }

      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      })

      expect(result.success).toBe(true)
      expect(result.message).toBe('Email envoyé avec succès')
      expect(global.fetch).toHaveBeenCalledWith('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: expect.stringContaining('test@example.com'),
      })
    })

    it('devrait gérer les erreurs d\'envoi', async () => {
      const mockResponse = {
        ok: false,
        json: vi.fn().mockResolvedValue({ message: 'Erreur serveur' }),
      }

      ;(global.fetch as any).mockResolvedValue(mockResponse)

      await expect(
        emailService.sendEmail({
          to: 'test@example.com',
          subject: 'Test Subject',
        })
      ).rejects.toThrow('Erreur serveur')
    })

    it('devrait convertir un Blob en base64 pour les pièces jointes', async () => {
      const mockBlob = new Blob(['test content'], { type: 'text/plain' })
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ message: 'Email envoyé' }),
      }

      ;(global.fetch as any).mockResolvedValue(mockResponse)

      // Mock FileReader pour blobToBase64
      const mockFileReaderInstance = {
        readAsDataURL: vi.fn(function (this: any) {
          setTimeout(() => {
            this.result = 'data:text/plain;base64,dGVzdCBjb250ZW50'
            if (this.onloadend) {
              this.onloadend()
            }
          }, 0)
        }),
        onloadend: null as any,
        result: null as any,
      }

      global.FileReader = vi.fn(function (this: any) {
        Object.assign(this, mockFileReaderInstance)
        return this
      }) as any

      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        attachments: [
          {
            filename: 'test.txt',
            content: mockBlob,
            contentType: 'text/plain',
          },
        ],
      })

      // Attendre que le FileReader termine
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(global.fetch).toHaveBeenCalled()
      const callArgs = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)
      expect(body.attachments).toBeDefined()
      expect(body.attachments[0].filename).toBe('test.txt')
    })

    it('devrait accepter plusieurs destinataires', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ message: 'Email envoyé' }),
      }

      ;(global.fetch as any).mockResolvedValue(mockResponse)

      await emailService.sendEmail({
        to: ['test1@example.com', 'test2@example.com'],
        subject: 'Test Subject',
      })

      const callArgs = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)
      expect(Array.isArray(body.to)).toBe(true)
      expect(body.to).toHaveLength(2)
    })

    it('devrait inclure CC et BCC si fournis', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ message: 'Email envoyé' }),
      }

      ;(global.fetch as any).mockResolvedValue(mockResponse)

      await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        cc: 'cc@example.com',
        bcc: 'bcc@example.com',
      })

      const callArgs = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)
      expect(body.cc).toBe('cc@example.com')
      expect(body.bcc).toBe('bcc@example.com')
    })
  })

  describe('sendDocument', () => {
    it('devrait envoyer un document PDF par email', async () => {
      const mockPdfBlob = new Blob(['pdf content'], { type: 'application/pdf' })
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ message: 'Document envoyé' }),
      }

      ;(global.fetch as any).mockResolvedValue(mockResponse)

      // Mock FileReader
      const mockFileReaderInstance = {
        readAsDataURL: vi.fn(function (this: any) {
          setTimeout(() => {
            this.result = 'data:application/pdf;base64,cGRmIGNvbnRlbnQ='
            if (this.onloadend) {
              this.onloadend()
            }
          }, 0)
        }),
        onloadend: null as any,
        result: null as any,
      }

      global.FileReader = vi.fn(function (this: any) {
        Object.assign(this, mockFileReaderInstance)
        return this
      }) as any

      const result = await emailService.sendDocument(
        'test@example.com',
        'Document Test',
        mockPdfBlob,
        'document.pdf'
      )

      // Attendre que le FileReader termine
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  describe('sendMultipleDocuments', () => {
    it('devrait envoyer plusieurs documents par email', async () => {
      const mockPdfBlob1 = new Blob(['pdf1'], { type: 'application/pdf' })
      const mockPdfBlob2 = new Blob(['pdf2'], { type: 'application/pdf' })
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ message: 'Documents envoyés' }),
      }

      ;(global.fetch as any).mockResolvedValue(mockResponse)

      // Mock FileReader
      const mockFileReaderInstance = {
        readAsDataURL: vi.fn(function (this: any) {
          setTimeout(() => {
            this.result = 'data:application/pdf;base64,cGRmMQ=='
            if (this.onloadend) {
              this.onloadend()
            }
          }, 0)
        }),
        onloadend: null as any,
        result: null as any,
      }

      global.FileReader = vi.fn(function (this: any) {
        Object.assign(this, mockFileReaderInstance)
        return this
      }) as any

      const result = await emailService.sendMultipleDocuments(
        'test@example.com',
        'Documents Test',
        [
          { blob: mockPdfBlob1, filename: 'doc1.pdf' },
          { blob: mockPdfBlob2, filename: 'doc2.pdf' },
        ]
      )

      // Attendre que le FileReader termine
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalled()
    })
  })
})
