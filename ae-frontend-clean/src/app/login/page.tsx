import LoginForm from '@/components/Auth/LoginForm'

export default function LoginPage() {
  // Render the login/signup UI. Redirects are handled client-side after auth success.
  return (
    <div className="min-h-screen bg-[#07090f] text-white overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-20%] h-130 w-130 -translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-[120px]" />
        <div className="absolute right-[-10%] top-[20%] h-90 w-90 rounded-full bg-cyan-500/20 blur-[120px]" />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-120px)] px-4 py-12">
        <div className="w-full max-w-lg px-4">
          <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-linear-to-b from-white/5 to-white/0 p-6 sm:p-8 backdrop-blur">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  )
}