import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '../components/PageLayout';
import { Icons } from '../components/icons';
import { cn } from '../lib/utils';
import { EmailComposeModal } from '../components/forms';
import { useToast } from '../components/Toast';
import { emailsApi } from '../lib/api';
import type { Email, EmailFolder } from '../lib/types';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

export default function EmailPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<EmailFolder>('INBOX');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (searchParams.get('compose') === '1') {
      setIsComposeOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: emailsPage, isLoading } = useQuery({
    queryKey: ['emails', activeTab],
    queryFn: () =>
      emailsApi.getAll({
        page: 0,
        size: 50,
        sort: 'createdAt,desc',
        folder: activeTab === 'TEMPLATES' ? 'TEMPLATES' : activeTab,
      }),
  });

  const emails = emailsPage?.content || [];

  useEffect(() => {
    if (selectedEmail && !emails.some((email) => email.id === selectedEmail.id)) {
      setSelectedEmail(null);
    }
  }, [emails, selectedEmail]);

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => emailsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => emailsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      setSelectedEmail(null);
      showToast('Email deleted', 'success');
    },
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => emailsApi.send(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      showToast('Email sent successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to send email', 'error');
    },
  });

  const syncMicrosoft365Mutation = useMutation({
    mutationFn: () => emailsApi.syncMicrosoft365(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      showToast(result.summary, 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to sync Microsoft 365 email', 'error');
    },
  });

  const syncGoogleWorkspaceMutation = useMutation({
    mutationFn: () => emailsApi.syncGoogleWorkspace(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      showToast(result.summary, 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to sync Google Workspace email', 'error');
    },
  });

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
    if (!email.isRead && email.id) {
      markAsReadMutation.mutate(email.id);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    if (days === 1) {
      return 'Yesterday';
    }
    if (days < 7) {
      return `${days} days ago`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPreview = (body: string, maxLength = 100) => {
    if (!body) return '';
    return body.length > maxLength ? `${body.substring(0, maxLength)}...` : body;
  };

  const filteredEmails = emails.filter((email) => {
    if (activeTab === 'INBOX') return email.folder === 'INBOX' || !email.folder;
    return email.folder === activeTab;
  });

  const renderInbox = () => {
    if (isLoading) {
      return <LoadingSkeleton />;
    }

    if (filteredEmails.length === 0) {
      return (
        <div className="p-12 text-center">
          <Icons.Mail size={48} className="mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No emails in this folder</p>
        </div>
      );
    }

    return (
      <div className="flex h-[calc(100vh-190px)]">
        <div
          className={cn(
            'border-r border-border overflow-y-auto',
            selectedEmail ? 'w-2/5' : 'w-full'
          )}
        >
          {filteredEmails.map((email) => (
            <div
              key={email.id}
              onClick={() => handleEmailClick(email)}
              className={cn(
                'px-3 py-2.5 border-b border-border cursor-pointer hover:bg-muted/30 transition-colors',
                !email.isRead && 'bg-primary/5',
                selectedEmail?.id === email.id && 'bg-muted'
              )}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={cn('font-medium text-sm', !email.isRead && 'font-semibold')}>
                    {activeTab === 'SENT'
                      ? email.toEmail || 'Unknown Recipient'
                      : email.fromEmail || 'Unknown Sender'}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(email.createdAt)}</span>
              </div>
              <p className={cn('text-sm mb-1', !email.isRead && 'font-semibold')}>
                {email.subject || '(No Subject)'}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2">{getPreview(email.body)}</p>
              {email.isDraft && (
                <div className="flex gap-1 mt-2">
                  <span className="text-xs px-2 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded">
                    Draft
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {selectedEmail && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold mb-1">{selectedEmail.subject || '(No Subject)'}</h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium">From: {selectedEmail.fromEmail}</span>
                    <span>&bull;</span>
                    <span>{formatDate(selectedEmail.createdAt)}</span>
                  </div>
                  {selectedEmail.toEmail && (
                    <div className="text-sm text-muted-foreground mt-1">
                      <span>To: {selectedEmail.toEmail}</span>
                    </div>
                  )}
                  {selectedEmail.ccEmail && (
                    <div className="text-sm text-muted-foreground mt-1">
                      <span>CC: {selectedEmail.ccEmail}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Icons.X size={20} />
                </button>
              </div>

              <div className="prose max-w-none dark:prose-invert">
                <div className="whitespace-pre-wrap">{selectedEmail.body}</div>
              </div>

              <div className="flex gap-2 mt-5">
                {selectedEmail.isDraft && (
                  <button
                    onClick={() => selectedEmail.id && sendMutation.mutate(selectedEmail.id)}
                    disabled={sendMutation.isPending}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors disabled:opacity-50 hover:bg-primary/90"
                  >
                    <Icons.Send size={14} />
                    {sendMutation.isPending ? 'Sending...' : 'Send Now'}
                  </button>
                )}
                <button
                  onClick={() => selectedEmail.id && deleteMutation.mutate(selectedEmail.id)}
                  disabled={deleteMutation.isPending}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 text-xs font-medium text-foreground transition-colors disabled:opacity-50 hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Icons.Trash size={14} />
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <PageLayout
      title="Email"
      subtitle="Manage communications"
      icon={<Icons.Mail size={20} />}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => syncGoogleWorkspaceMutation.mutate()}
            disabled={syncGoogleWorkspaceMutation.isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 text-xs font-medium text-foreground transition-colors disabled:opacity-50 hover:border-primary/30 hover:bg-secondary/60"
          >
            <Icons.Download size={14} />
            {syncGoogleWorkspaceMutation.isPending ? 'Syncing Gmail...' : 'Sync Gmail'}
          </button>
          <button
            onClick={() => syncMicrosoft365Mutation.mutate()}
            disabled={syncMicrosoft365Mutation.isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 text-xs font-medium text-foreground transition-colors disabled:opacity-50 hover:border-primary/30 hover:bg-secondary/60"
          >
            <Icons.Download size={14} />
            {syncMicrosoft365Mutation.isPending ? 'Syncing Outlook...' : 'Sync Outlook'}
          </button>
          <button
            onClick={() => setIsComposeOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Icons.Plus size={14} />
            Compose
          </button>
        </div>
      }
    >
      <div className="border-b border-border bg-background">
        <div className="flex px-5">
          <button
            onClick={() => {
              setActiveTab('INBOX');
              setSelectedEmail(null);
            }}
            className={cn(
              'px-3 py-2.5 border-b-2 transition-colors text-xs font-medium',
              activeTab === 'INBOX'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Inbox
          </button>
          <button
            onClick={() => {
              setActiveTab('SENT');
              setSelectedEmail(null);
            }}
            className={cn(
              'px-3 py-2.5 border-b-2 transition-colors text-xs font-medium',
              activeTab === 'SENT'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Sent
          </button>
          <button
            onClick={() => {
              setActiveTab('DRAFTS');
              setSelectedEmail(null);
            }}
            className={cn(
              'px-3 py-2.5 border-b-2 transition-colors text-xs font-medium',
              activeTab === 'DRAFTS'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Drafts
          </button>
          <button
            onClick={() => {
              setActiveTab('TEMPLATES');
              setSelectedEmail(null);
            }}
            className={cn(
              'px-3 py-2.5 border-b-2 transition-colors text-xs font-medium',
              activeTab === 'TEMPLATES'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Templates
          </button>
        </div>
      </div>

      {(activeTab === 'INBOX'
        || activeTab === 'SENT'
        || activeTab === 'DRAFTS'
        || activeTab === 'TEMPLATES') && renderInbox()}

      <EmailComposeModal isOpen={isComposeOpen} onClose={() => setIsComposeOpen(false)} />
    </PageLayout>
  );
}
