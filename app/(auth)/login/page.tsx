'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { signIn } from 'next-auth/react'
import Link from 'next/link'

import { FinnanLogo } from '@/components/finnan-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const loginSchema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
})

type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginValues) {
    setError(null)

    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        setError('Email ou senha incorretos.')
        return
      }

      window.location.href = '/dashboard'
    } catch {
      setError('Erro ao fazer login. Tente novamente.')
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="relative hidden w-1/2 overflow-hidden bg-white lg:flex">
        {/* Ambient glow */}
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-900/[0.03] blur-[120px]" />

        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: 'radial-gradient(rgba(0,0,0,0.08) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-16">
          <FinnanLogo height={44} variant="light" />

          <p className="mt-8 max-w-[280px] text-center text-[15px] leading-relaxed text-neutral-400">
            Finanças em grupo, simplificadas.
          </p>

          {/* Minimal feature list */}
          <div className="mt-16 flex flex-col gap-4">
            {[
              'Controle compartilhado',
              'Metas inteligentes',
              'Insights com IA',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="h-1 w-1 rounded-full bg-neutral-900" />
                <span className="text-sm text-neutral-500">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom line */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <span className="text-xs text-neutral-300">tukkan.app</span>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex w-full flex-col items-center justify-center bg-neutral-950 px-6 lg:w-1/2">
        {/* Logo on mobile */}
        <div className="mb-12 lg:hidden">
          <FinnanLogo height={36} variant="dark" />
        </div>

        <div className="w-full max-w-[360px]">
          <div className="mb-10">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Entrar
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              Continue de onde parou
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                className="h-12 rounded-lg border-neutral-800 bg-neutral-900 text-white placeholder:text-neutral-600 transition-all focus:border-neutral-400 focus:bg-neutral-900 focus:ring-white/5"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Senha
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-neutral-600 transition-colors hover:text-white"
                >
                  Esqueceu?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="h-12 rounded-lg border-neutral-800 bg-neutral-900 text-white placeholder:text-neutral-600 transition-all focus:border-neutral-400 focus:bg-neutral-900 focus:ring-white/5"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="h-12 w-full rounded-lg bg-white text-sm font-semibold text-neutral-900 transition-all hover:bg-neutral-200 active:scale-[0.98] disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Entrando...
                  </span>
                ) : (
                  'Entrar'
                )}
              </Button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 pt-2">
              <div className="h-px flex-1 bg-neutral-800" />
              <span className="text-xs text-neutral-600">ou</span>
              <div className="h-px flex-1 bg-neutral-800" />
            </div>

            <p className="text-center text-sm text-neutral-500">
              Primeira vez?{' '}
              <Link
                href="/register"
                className="font-medium text-white transition-colors hover:text-neutral-300"
              >
                Criar conta
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
