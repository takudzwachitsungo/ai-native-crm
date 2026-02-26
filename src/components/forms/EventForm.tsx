import { useState, useEffect } from "react";
import { Modal } from "../Modal";

interface EventFormData {
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  attendees: string;
  eventType: string;
  reminder: string;
  description: string;
}

interface EventFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
}

export function EventForm({ isOpen, onClose, onSubmit, initialData }: EventFormProps) {
  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    location: "",
    attendees: "",
    eventType: "MEETING",
    reminder: "15min",
    description: "",
  });

  useEffect(() => {
    if (initialData) {
      // Parse existing event data - backend uses startTime/endTime
      const startDateTime = initialData.startTime ? new Date(initialData.startTime) : null;
      const endDateTime = initialData.endTime ? new Date(initialData.endTime) : null;
      
      setFormData({
        title: initialData.title || "",
        startDate: startDateTime ? startDateTime.toISOString().split('T')[0] : "",
        startTime: startDateTime ? startDateTime.toTimeString().slice(0, 5) : "",
        endDate: endDateTime ? endDateTime.toISOString().split('T')[0] : "",
        endTime: endDateTime ? endDateTime.toTimeString().slice(0, 5) : "",
        location: initialData.location || "",
        attendees: initialData.attendees || "",
        eventType: initialData.eventType || "MEETING",
        reminder: initialData.reminder || "15min",
        description: initialData.description || "",
      });
    } else {
      setFormData({
        title: "",
        startDate: "",
        startTime: "",
        endDate: "",
        endTime: "",
        location: "",
        attendees: "",
        eventType: "MEETING",
        reminder: "15min",
        description: "",
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Transform form data to match backend API
    const apiData = {
      title: formData.title,
      description: formData.description || null,
      startTime: `${formData.startDate}T${formData.startTime}:00`,
      endTime: `${formData.endDate}T${formData.endTime}:00`,
      eventType: formData.eventType,
      location: formData.location || null,
    };
    
    onSubmit(apiData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Event" : "Create Event"}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-border rounded hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            {initialData ? "Update" : "Create"}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Event Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="e.g., Client Meeting, Demo Call"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Event Type</label>
                <select
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="MEETING">Meeting</option>
                  <option value="CALL">Call</option>
                  <option value="DEMO">Demo</option>
                  <option value="FOLLOW_UP">Follow Up</option>
                  <option value="INTERNAL">Internal</option>
                  <option value="PRESENTATION">Presentation</option>
                  <option value="TRAINING">Training</option>
                  <option value="CONFERENCE">Conference</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Office, Zoom, etc."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Date & Time */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Date & Time</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                required
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                required
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        {/* Attendees & Reminder */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Additional Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Attendees</label>
              <input
                type="text"
                value={formData.attendees}
                onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Comma-separated emails"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Reminder</label>
              <select
                value={formData.reminder}
                onChange={(e) => setFormData({ ...formData, reminder: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="none">No Reminder</option>
                <option value="5min">5 minutes before</option>
                <option value="15min">15 minutes before</option>
                <option value="30min">30 minutes before</option>
                <option value="1hour">1 hour before</option>
                <option value="1day">1 day before</option>
              </select>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            placeholder="Agenda, meeting notes, etc."
          />
        </div>
      </form>
    </Modal>
  );
}
