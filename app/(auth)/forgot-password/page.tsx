'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { FinnanLogo } from '@/components/finnan-logo'

import { requestPasswordReset } from '@/actions/password-reset'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const schema = z.object({
  email: z.email('Email inválido'),
})

type FormValues = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormValues) {
    setError(null)

    try {
      const result = await requestPasswordReset(data.email)

      if (result.error) {
        setError(result.error)
        return
      }

      setSent(true)
    } catch {
      setError('Erro inesperado. Tente novamente.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Mobile logo */}
        <div className="mb-8 flex justify-center">
          <FinnanLogo height={40} />
        </div>

        <Card className="border-0 shadow-none sm:border sm:shadow-sm">
          {sent ? (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold">
                  Email enviado
                </CardTitle>
                <CardDescription>
                  Se o email estiver cadastrado, você receberá um link para
                  redefinir sua senha. Verifique também a caixa de spam.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Link href="/login" className="w-full">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="size-4" />
                    Voltar ao login
                  </Button>
                </Link>
              </CardFooter>
            </>
          ) : (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold">
                  Esqueceu a senha?
                </CardTitle>
                <CardDescription>
                  Digite seu email e enviaremos um link para redefinir sua senha
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                  {error && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      autoComplete="email"
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-4">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Enviando...' : 'Enviar link'}
                  </Button>

                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="size-3.5" />
                    Voltar ao login
                  </Link>
                </CardFooter>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
