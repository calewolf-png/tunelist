'use client'

import { useActionState, useState } from 'react'
import { signIn, signUp } from '@/app/actions/auth'

function InputField({ id, label, type, name, autoComplete, placeholder, minLength }: {
  id: string; label: string; type: string; name: string
  autoComplete?: string; placeholder?: string; minLength?: number
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        minLength={minLength}
        placeholder={placeholder}
        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-colors"
      />
    </div>
  )
}

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [signInError, signInAction, signInPending] = useActionState(signIn, null)
  const [signUpError, signUpAction, signUpPending] = useActionState(signUp, null)

  const isSignIn = mode === 'signin'
  const needsEmailConfirmation = signUpError === 'CHECK_EMAIL'

  if (needsEmailConfirmation) {
    return (
      <div className="max-w-sm mx-auto mt-20 text-center">
        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4 text-xl">✉️</div>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Check your email</h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          We sent a confirmation link to your inbox. Click it to finish creating your account, then come back and sign in.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto mt-16">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">
        {isSignIn ? 'Welcome back' : 'Create an account'}
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        {isSignIn ? 'Sign in to your Tunelist.' : 'Start building your jazz standards collection.'}
      </p>

      {isSignIn ? (
        <form action={signInAction} className="space-y-4">
          <InputField id="signin-email" label="Email" type="email" name="email" autoComplete="email" placeholder="you@example.com" />
          <InputField id="signin-password" label="Password" type="password" name="password" autoComplete="current-password" placeholder="••••••••" />
          {signInError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {signInError}
            </p>
          )}
          <button
            type="submit"
            disabled={signInPending}
            className="w-full bg-indigo-600 text-white font-medium rounded-lg py-2.5 text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {signInPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      ) : (
        <form action={signUpAction} className="space-y-4">
          <InputField id="signup-email" label="Email" type="email" name="email" autoComplete="email" placeholder="you@example.com" />
          <InputField id="signup-password" label="Password" type="password" name="password" autoComplete="new-password" placeholder="••••••••" minLength={6} />
          {signUpError && signUpError !== 'CHECK_EMAIL' && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {signUpError}
            </p>
          )}
          <button
            type="submit"
            disabled={signUpPending}
            className="w-full bg-indigo-600 text-white font-medium rounded-lg py-2.5 text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {signUpPending ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      )}

      <p className="text-sm text-slate-500 mt-6 text-center">
        {isSignIn ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button
          onClick={() => setMode(isSignIn ? 'signup' : 'signin')}
          className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
        >
          {isSignIn ? 'Sign up' : 'Sign in'}
        </button>
      </p>
    </div>
  )
}
