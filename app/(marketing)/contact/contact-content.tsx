'use client'

import { memo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Mail,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  Headphones,
  MapPin,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const Footer = dynamic(
  () => import('@/components/landing/Footer').then(mod => ({ default: mod.Footer })),
  { loading: () => <div className="min-h-[200px] bg-gray-900" /> }
)

const contactReasons = [
  { value: 'demo', label: 'Demande de démonstration' },
  { value: 'question', label: 'Question sur les fonctionnalités' },
  { value: 'pricing', label: 'Question sur les tarifs' },
  { value: 'support', label: 'Support technique' },
  { value: 'partnership', label: 'Partenariat' },
  { value: 'other', label: 'Autre' }
]

const contactInfo = [
  {
    icon: Mail,
    title: 'Email',
    value: 'contact@eduzen.io',
    description: 'Écrivez-nous à tout moment'
  },
  {
    icon: Clock,
    title: 'Réponse rapide',
    value: 'Sous 24h',
    description: 'Du lundi au vendredi'
  },
  {
    icon: Headphones,
    title: 'Support',
    value: 'Prioritaire',
    description: 'Pour nos utilisateurs'
  }
]

export const ContactContent = memo(function ContactContent() {
  const [formState, setFormState] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    reason: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormState(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simuler l'envoi (à remplacer par une vraie API)
    await new Promise(resolve => setTimeout(resolve, 1500))

    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-20 overflow-hidden bg-gradient-to-b from-white via-gray-50/50 to-white">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-brand-blue/5 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-brand-cyan/5 rounded-full blur-[80px]" />
        </div>

        <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="animate-fade-in-up inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-blue-ghost border border-brand-blue-pale mb-8">
              <MessageSquare className="w-4 h-4 text-brand-blue" />
              <span className="text-sm font-medium text-brand-blue-darker">Contactez-nous</span>
            </div>

            <h1 className="animate-fade-in-up animation-delay-100 text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-6">
              Une question ?{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">
                Parlons-en
              </span>
            </h1>

            <p className="animate-fade-in-up animation-delay-200 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Notre équipe est là pour répondre à toutes vos questions et vous accompagner dans votre projet.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {contactInfo.map((info, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:border-brand-blue/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center mx-auto mb-4">
                  <info.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">{info.title}</h3>
                <p className="text-lg font-bold text-gray-900">{info.value}</p>
                <p className="text-sm text-gray-500">{info.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            {isSubmitted ? (
              // Success Message
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                  Message envoyé !
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Merci pour votre message. Notre équipe vous répondra dans les plus brefs délais,
                  généralement sous 24 heures.
                </p>
                <Button
                  onClick={() => {
                    setIsSubmitted(false)
                    setFormState({
                      firstName: '',
                      lastName: '',
                      email: '',
                      company: '',
                      reason: '',
                      message: ''
                    })
                  }}
                  variant="outline"
                  className="rounded-full"
                >
                  Envoyer un autre message
                </Button>
              </div>
            ) : (
              // Contact Form
              <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100">
                <div className="text-center mb-10">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                    Envoyez-nous un message
                  </h2>
                  <p className="text-gray-600">
                    Remplissez le formulaire ci-dessous et nous vous répondrons rapidement.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Prénom *</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        placeholder="Jean"
                        value={formState.firstName}
                        onChange={handleChange}
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nom *</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        type="text"
                        required
                        placeholder="Dupont"
                        value={formState.lastName}
                        onChange={handleChange}
                        className="h-12 rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email professionnel *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="jean.dupont@organisme.fr"
                      value={formState.email}
                      onChange={handleChange}
                      className="h-12 rounded-xl"
                    />
                  </div>

                  {/* Company */}
                  <div className="space-y-2">
                    <Label htmlFor="company">Organisme de formation</Label>
                    <Input
                      id="company"
                      name="company"
                      type="text"
                      placeholder="Nom de votre organisme"
                      value={formState.company}
                      onChange={handleChange}
                      className="h-12 rounded-xl"
                    />
                  </div>

                  {/* Reason */}
                  <div className="space-y-2">
                    <Label htmlFor="reason">Objet de votre demande *</Label>
                    <select
                      id="reason"
                      name="reason"
                      required
                      value={formState.reason}
                      onChange={handleChange}
                      className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                    >
                      <option value="">Sélectionnez une option</option>
                      {contactReasons.map(reason => (
                        <option key={reason.value} value={reason.value}>
                          {reason.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <Label htmlFor="message">Votre message *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      required
                      rows={5}
                      placeholder="Décrivez votre demande ou posez-nous vos questions..."
                      value={formState.message}
                      onChange={handleChange}
                      className="rounded-xl resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-14 text-lg font-bold rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan hover:from-brand-blue-dark hover:to-brand-cyan-dark text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Envoyer le message
                      </>
                    )}
                  </Button>

                  {/* Email Alternative */}
                  <p className="text-center text-sm text-gray-500 pt-4">
                    Vous pouvez aussi nous écrire directement à{' '}
                    <a
                      href="mailto:contact@eduzen.io"
                      className="text-brand-blue font-medium hover:underline"
                    >
                      contact@eduzen.io
                    </a>
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Teaser */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Questions fréquentes ?
            </h2>
            <p className="text-gray-600 mb-6">
              Consultez notre FAQ pour trouver rapidement des réponses à vos questions.
            </p>
            <Link href="/#faq">
              <Button variant="outline" className="rounded-full">
                Voir la FAQ
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
})
