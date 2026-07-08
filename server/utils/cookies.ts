export function getCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production'
  const config = useRuntimeConfig()
  const domain = config.public.baseDomain || undefined

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    domain
  }
}
