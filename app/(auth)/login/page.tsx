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
      <div className="relative hidden w-1/2 overflow-hidden bg-zinc-950 lg:flex">
        {/* Gradient orbs */}
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute left-1/3 top-1/2 h-64 w-64 rounded-full bg-fuchsia-600/10 blur-3xl" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-12">
          <FinnanLogo height={48} variant="dark" />
          <p className="mt-6 max-w-xs text-center text-lg font-light text-zinc-400">
            Organize suas finanças em grupo, de forma simples e inteligente.
          </p>

          {/* Feature pills */}
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {['Grupos', 'Metas', 'Mesadas', 'Insights IA'].map((item) => (
              <span
                key={item}
                className="rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-1.5 text-xs font-medium text-zinc-400 backdrop-blur-sm"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex w-full flex-col items-center justify-center bg-white px-6 lg:w-1/2">
        {/* Logo on mobile */}
        <div className="mb-10 lg:hidden">
          <FinnanLogo height={40} variant="light" />
        </div>

        <div className="w-full max-w-[380px]">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
              Bem-vindo de volta
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Entre na sua conta para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-zinc-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                className="h-11 rounded-xl border-zinc-200 bg-zinc-50 transition-colors focus:border-zinc-900 focus:bg-white focus:ring-zinc-900/10"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-zinc-700">
                  Senha
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="h-11 rounded-xl border-zinc-200 bg-zinc-50 transition-colors focus:border-zinc-900 focus:bg-white focus:ring-zinc-900/10"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-xl bg-zinc-900 text-sm font-semibold transition-all hover:bg-zinc-800 active:scale-[0.98]"
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

            <p className="text-center text-sm text-zinc-500">
              Não tem conta?{' '}
              <Link
                href="/register"
                className="font-semibold text-zinc-900 underline-offset-4 hover:underline"
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
