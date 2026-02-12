// Re-export the AuthProvider and hook implemented in components to keep API stable
// Re-export the AuthProvider and hook implemented in components to keep API stable
export { AuthProvider } from '@/components/Auth/AuthProvider'
export { useAuthContext as useAuth } from '@/components/Auth/AuthProvider'
