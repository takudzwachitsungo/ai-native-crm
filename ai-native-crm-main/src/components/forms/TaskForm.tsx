import { useState, useEffect } from 'react';
import { Modal } from '../Modal';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
}

export function TaskForm({ isOpen, onClose, onSubmit, initialData }: TaskFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'MEDIUM',
    status: 'TODO',
    assignee: '',
    relatedTo: '',
    relatedType: 'contact',
    reminder: '',
  });

  useEffect(() => {
    if (initialData) {
      // Extract date from datetime string (e.g., "2026-01-20T23:59:59" -> "2026-01-20")
      const dueDate = initialData.dueDate 
        ? initialData.dueDate.split('T')[0] 
        : '';
      
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        dueDate: dueDate,
        priority: initialData.priority || 'MEDIUM',
        status: initialData.status || 'TODO',
        assignee: initialData.assignee || initialData.assignedTo || '',
        relatedTo: initialData.relatedTo || '',
        relatedType: initialData.relatedType || 'contact',
        reminder: initialData.reminder || '',
      });
    } else {
      // Reset form for new task
      setFormData({
        title: '',
        description: '',
        dueDate: '',
        priority: 'MEDIUM',
        status: 'TODO',
        assignee: '',
        relatedTo: '',
        relatedType: 'contact',
        reminder: '',
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Transform to backend DTO - dueDate needs to be in LocalDateTime format
    const taskData: any = {
      title: formData.title,
      description: formData.description || null,
      dueDate: formData.dueDate ? `${formData.dueDate}T23:59:59` : null, // Convert date to LocalDateTime
      priority: formData.priority, // Already uppercase from select
      status: formData.status, // Already uppercase from select (TODO, IN_PROGRESS, COMPLETED)
    };
    
    console.log('TaskForm submitting:', taskData);
    onSubmit(taskData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Task' : 'Create New Task'}
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded hover:bg-secondary transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors">
            {initialData ? 'Save Changes' : 'Create Task'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Task Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            required
            placeholder="e.g., Follow up with client"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            rows={4}
            placeholder="Add task details..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Due Date *</label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Assign To</label>
            <input
              type="text"
              value={formData.assignee}
              onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Select team member"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Related To</label>
            <select
              value={formData.relatedType}
              onChange={(e) => setFormData({ ...formData, relatedType: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="contact">Contact</option>
              <option value="company">Company</option>
              <option value="deal">Deal</option>
              <option value="lead">Lead</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Record Name</label>
            <input
              type="text"
              value={formData.relatedTo}
              onChange={(e) => setFormData({ ...formData, relatedTo: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Search records..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Reminder</label>
          <select
            value={formData.reminder}
            onChange={(e) => setFormData({ ...formData, reminder: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">No reminder</option>
            <option value="5min">5 minutes before</option>
            <option value="15min">15 minutes before</option>
            <option value="30min">30 minutes before</option>
            <option value="1hour">1 hour before</option>
            <option value="1day">1 day before</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}