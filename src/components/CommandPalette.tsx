import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from './icons';
import { cn } from '../lib/utils';

interface Command {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const commands: Command[] = [
    // Navigation
    { id: 'nav-dashboard', label: 'Go to Dashboard', icon: <Icons.Dashboard size={16} />, action: () => navigate('/'), category: 'Navigation' },
    { id: 'nav-leads', label: 'Go to Leads', icon: <Icons.Leads size={16} />, action: () => navigate('/leads'), category: 'Navigation' },
    { id: 'nav-contacts', label: 'Go to Contacts', icon: <Icons.Contacts size={16} />, action: () => navigate('/contacts'), category: 'Navigation' },
    { id: 'nav-companies', label: 'Go to Companies', icon: <Icons.Building2 size={16} />, action: () => navigate('/companies'), category: 'Navigation' },
    { id: 'nav-deals', label: 'Go to Deals', icon: <Icons.Deals size={16} />, action: () => navigate('/deals'), category: 'Navigation' },
    { id: 'nav-tasks', label: 'Go to Tasks', icon: <Icons.Tasks size={16} />, action: () => navigate('/tasks'), category: 'Navigation' },
    { id: 'nav-calendar', label: 'Go to Calendar', icon: <Icons.Calendar size={16} />, action: () => navigate('/calendar'), category: 'Navigation' },
    { id: 'nav-email', label: 'Go to Email', icon: <Icons.Mail size={16} />, action: () => navigate('/email'), category: 'Navigation' },
    { id: 'nav-documents', label: 'Go to Documents', icon: <Icons.FolderOpen size={16} />, action: () => navigate('/documents'), category: 'Navigation' },
    { id: 'nav-reports', label: 'Go to Reports', icon: <Icons.Reports size={16} />, action: () => navigate('/reports'), category: 'Navigation' },
    { id: 'nav-settings', label: 'Go to Settings', icon: <Icons.Settings size={16} />, action: () => navigate('/settings'), category: 'Navigation' },
    
    // Actions
    { id: 'action-new-lead', label: 'Create New Lead', icon: <Icons.UserPlus size={16} />, action: () => {}, category: 'Actions' },
    { id: 'action-new-contact', label: 'Create New Contact', icon: <Icons.Contact size={16} />, action: () => {}, category: 'Actions' },
    { id: 'action-new-deal', label: 'Create New Deal', icon: <Icons.Handshake size={16} />, action: () => {}, category: 'Actions' },
    { id: 'action-new-task', label: 'Create New Task', icon: <Icons.CheckSquare size={16} />, action: () => {}, category: 'Actions' },
    { id: 'action-compose-email', label: 'Compose Email', icon: <Icons.Mail size={16} />, action: () => {}, category: 'Actions' },
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedIndex(0);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filteredCommands, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-lg shadow-2xl w-full max-w-2xl mx-4 border border-border">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Icons.Search size={20} className="text-muted-foreground" />
          <input
            type="text"
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent outline-none text-sm"
            autoFocus
          />
          <kbd className="px-2 py-1 text-xs border border-border rounded">ESC</kbd>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {Object.entries(groupedCommands).map(([category, cmds]) => (
            <div key={category} className="mb-4">
              <p className="px-2 py-1 text-xs text-muted-foreground font-semibold">{category}</p>
              {cmds.map((cmd) => {
                const globalIndex = filteredCommands.indexOf(cmd);
                return (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      cmd.action();
                      onClose();
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-left transition-colors",
                      globalIndex === selectedIndex
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary"
                    )}
                  >
                    {cmd.icon}
                    {cmd.label}
                  </button>
                );
              })}
            </div>
          ))}
          {filteredCommands.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No commands found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}