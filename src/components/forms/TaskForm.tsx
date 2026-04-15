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

  const isEdit = !!initialData;
  const [activeTab, setActiveTab] = useState<'details' | 'context' | 'notes'>('details');

  const tabs: ('details' | 'context' | 'notes')[] = ['details', 'context', 'notes'];
  const tabHeaders: Record<string, string> = {
    details: isEdit ? 'Update the task basics, priority, and schedule.' : 'Define what needs to be done and when.',
    context: isEdit ? 'Adjust assignment and linked records.' : 'Assign the task and link it to a record.',
    notes: 'Add detailed instructions or context.',
  };

  const inputClass = "w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150";
  const selectClass = "w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150";
  const labelClass = "block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Task' : 'Create New Task'}
      size="xl"
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-[0.8125rem] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} className="px-5 py-1.5 rounded-lg bg-teal-600 text-white text-[0.8125rem] font-medium hover:bg-teal-700 focus:ring-2 focus:ring-teal-500/30 focus:ring-offset-1 transition-all duration-150 shadow-sm">
            {isEdit ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Segment Control */}
        <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5 gap-0.5">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1 text-[0.75rem] font-medium rounded-md transition-all duration-150 capitalize ${
                activeTab === tab
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Header */}
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-teal-500" />
          <p className="text-[0.8rem] text-gray-500 dark:text-gray-400">{tabHeaders[activeTab]}</p>
        </div>

        {/* Tab Content */}
        <div className="min-h-[20rem]">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div className="col-span-2">
                  <label className={labelClass}>Task Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={inputClass}
                    required
                    placeholder="e.g., Follow up with client"
                  />
                </div>
                <div>
                  <label className={labelClass}>Due Date *</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className={selectClass}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className={selectClass}
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Reminder</label>
                  <select
                    value={formData.reminder}
                    onChange={(e) => setFormData({ ...formData, reminder: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">No reminder</option>
                    <option value="5min">5 minutes before</option>
                    <option value="15min">15 minutes before</option>
                    <option value="30min">30 minutes before</option>
                    <option value="1hour">1 hour before</option>
                    <option value="1day">1 day before</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'context' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div className="col-span-2">
                  <label className={labelClass}>Assign To</label>
                  <input
                    type="text"
                    value={formData.assignee}
                    onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                    className={inputClass}
                    placeholder="Select team member"
                  />
                </div>
                <div>
                  <label className={labelClass}>Related To</label>
                  <select
                    value={formData.relatedType}
                    onChange={(e) => setFormData({ ...formData, relatedType: e.target.value })}
                    className={selectClass}
                  >
                    <option value="contact">Contact</option>
                    <option value="company">Company</option>
                    <option value="deal">Deal</option>
                    <option value="lead">Lead</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Record Name</label>
                  <input
                    type="text"
                    value={formData.relatedTo}
                    onChange={(e) => setFormData({ ...formData, relatedTo: e.target.value })}
                    className={inputClass}
                    placeholder="Search records..."
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={6}
                  className="w-full px-2.5 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150 resize-none"
                  placeholder="Add task details..."
                />
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}