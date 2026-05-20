import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { AccountPushNotificationBridge } from './components/AccountPushNotificationBridge'
import { RealtimeBridge } from './components/RealtimeBridge'
import { ChatRealtimeBridge } from './components/ChatRealtimeBridge'
import { ChatHistoryHydrator } from './components/ChatHistoryHydrator'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AccountPushNotificationBridge />
        <RealtimeBridge />
        <ChatRealtimeBridge />
        <ChatHistoryHydrator />
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
