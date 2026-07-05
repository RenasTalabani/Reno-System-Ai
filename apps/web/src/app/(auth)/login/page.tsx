'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/auth-store'

const LoginSchema = z.object({
  tenantSlug: z.string().min(1, 'Workspace is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof LoginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { tenantSlug: 'demo', email: '', password: '' },
  })

  const fillDemo = () => {
    setValue('tenantSlug', 'demo', { shouldValidate: true })
    setValue('email', 'admin@demo.com', { shouldValidate: true })
    setValue('password', 'Admin1234!', { shouldValidate: true })
  }

  const onSubmit = async (data: LoginForm) => {
    try {
      const result = await login(data.email, data.password, data.tenantSlug)
      if (result.mfaRequired) {
        router.push('/mfa')
      } else {
        toast.success('Welcome back!')
        router.push('/dashboard')
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Login failed. Please check your credentials.'
      toast.error(message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-2xl mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Reno System</h1>
          <p className="text-slate-400 mt-1 text-sm">AI-first Business Operating System</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Workspace */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Workspace
              </label>
              <div className="relative">
                <input
                  {...register('tenantSlug')}
                  placeholder="your-workspace"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">.reno-system.com</span>
              </div>
              {errors.tenantSlug && (
                <p className="mt-1 text-xs text-red-400">{errors.tenantSlug.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Email address
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="admin@company.com"
                autoComplete="off"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-300">Password</label>
                <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300 transition">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 text-sm mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Demo credentials — click to fill */}
          <button
            type="button"
            onClick={fillDemo}
            className="mt-6 w-full p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl hover:bg-indigo-500/20 transition-colors cursor-pointer"
          >
            <p className="text-xs text-indigo-300 text-center">
              <strong>Click to fill demo credentials</strong>
              <br />
              <span className="opacity-75">admin@demo.com · Admin1234! · workspace: demo</span>
            </p>
          </button>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          © 2026 Reno System. All rights reserved.
        </p>
      </div>
    </div>
  )
}
