import { useNavigate, useLocation } from 'react-router-dom';

export function ChatAssistant() {
  const navigate = useNavigate();
  const location = useLocation();

  const isOnChatPage = location.pathname === '/chat';
  const isOnDashboard = location.pathname === '/';

  if (isOnChatPage || isOnDashboard) return null;

  return (
    <button
      onClick={() => navigate('/chat')}
      className="fixed bottom-6 right-6 z-[100] size-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center group"
      title="Open CRM Assistant"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </button>
  );
}
