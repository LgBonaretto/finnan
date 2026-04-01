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
      <div className="hidden w-1/2 flex-col items-center justify-center bg-white lg:flex">
        <FinnanLogo height={56} variant="light" />
      </div>

      {/* Right side - Login form */}
      <div className="flex w-full flex-col items-center justify-center bg-zinc-950 px-4 lg:w-1/2">
        {/* Logo on mobile */}
        <div className="mb-8 lg:hidden">
          <FinnanLogo height={40} variant="dark" />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-white">Entrar no Finnan</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Acesse sua conta para gerenciar suas finanças
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                className="border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-zinc-300">Senha</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>

            <p className="text-center text-sm text-zinc-400">
              Não tem conta?{' '}
              <Link
                href="/register"
                className="font-medium text-white underline-offset-4 hover:underline"
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
