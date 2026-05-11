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
  const [activeTab, setActiveTab] = useState<"details" | "schedule" | "notes">("details");
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
      size="xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-1.5 text-[0.8125rem] font-medium text-gray-600 transition-all duration-150 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="rounded-lg bg-teal-600 px-5 py-1.5 text-[0.8125rem] font-medium text-white shadow-sm transition-all duration-150 hover:bg-teal-700 focus:ring-2 focus:ring-teal-500/30 focus:ring-offset-1"
          >
            {initialData ? "Save Changes" : "Create Event"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-teal-500" />
          <p className="text-[0.8rem] text-gray-500 dark:text-gray-400">
            {activeTab === "details" && (initialData ? "Update the core event details below." : "Start with the event basics and where it is happening.")}
            {activeTab === "schedule" && "Set the dates, times, attendees, and reminder in one pass."}
            {activeTab === "notes" && "Capture agenda items, prep notes, or anything the team should remember."}
          </p>
        </div>

        <div className="inline-flex gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
          {([
            ["details", "Details"],
            ["schedule", "Schedule"],
            ["notes", "Notes"],
          ] as const).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-4 py-1 text-[0.75rem] font-medium transition-all duration-150 ${
                activeTab === tab
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-[16rem]">
          {activeTab === "details" && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-[0.8125rem] text-gray-900 transition-all duration-150 placeholder:text-gray-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100"
                  placeholder="e.g. Client meeting, demo call, quarterly review"
                />
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className="mb-1.5 block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300">Event Type</label>
                  <select
                    value={formData.eventType}
                    onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-[0.8125rem] text-gray-900 transition-all duration-150 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100"
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
                  <label className="mb-1.5 block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-[0.8125rem] text-gray-900 transition-all duration-150 placeholder:text-gray-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100"
                    placeholder="Office, Zoom, boardroom, client site"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "schedule" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className="mb-1.5 block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300">
                    Start Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-[0.8125rem] text-gray-900 transition-all duration-150 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300">
                    Start Time <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-[0.8125rem] text-gray-900 transition-all duration-150 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300">
                    End Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-[0.8125rem] text-gray-900 transition-all duration-150 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300">
                    End Time <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-[0.8125rem] text-gray-900 transition-all duration-150 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div>
                  <label className="mb-1.5 block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300">Attendees</label>
                  <input
                    type="text"
                    value={formData.attendees}
                    onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-[0.8125rem] text-gray-900 transition-all duration-150 placeholder:text-gray-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100"
                    placeholder="Comma-separated emails"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300">Reminder</label>
                  <select
                    value={formData.reminder}
                    onChange={(e) => setFormData({ ...formData, reminder: e.target.value })}
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-[0.8125rem] text-gray-900 transition-all duration-150 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100"
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
          )}

          {activeTab === "notes" && (
            <div>
              <label className="mb-1.5 block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                className="w-full resize-none rounded-md border border-gray-200 bg-white px-2.5 py-2 text-[0.8125rem] text-gray-900 transition-all duration-150 placeholder:text-gray-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100"
                placeholder="Agenda, meeting goals, links, or prep notes"
              />
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
