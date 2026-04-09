import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Icons } from "../components/icons";
import { cn } from "../lib/utils";
import { PageLayout } from "../components/PageLayout";
import { EventForm } from "../components/forms";
import { useToast } from "../components/Toast";
import { ConfirmModal } from "../components/Modal";
import { eventsApi } from "../lib/api";
import { exportToCSV } from "../lib/helpers";
import type { Event } from "../lib/types";

interface CalendarEvent {
  id: string;
  title: string;
  type: Event['eventType'];
  time: string;
  duration: string;
  attendees: string[];
  company?: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
}

interface DayEvents {
  [key: string]: CalendarEvent[];
}

const eventTypeColors = {
  MEETING: "bg-blue-50 text-blue-700 border-blue-200",
  CALL: "bg-green-50 text-green-700 border-green-200",
  OTHER: "bg-gray-50 text-gray-700 border-gray-200",
  DEMO: "bg-indigo-50 text-indigo-700 border-indigo-200",
  FOLLOW_UP: "bg-orange-50 text-orange-700 border-orange-200",
  INTERNAL: "bg-slate-50 text-slate-700 border-slate-200",
  PRESENTATION: "bg-pink-50 text-pink-700 border-pink-200",
  TRAINING: "bg-teal-50 text-teal-700 border-teal-200",
  CONFERENCE: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"week" | "month">("week");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Event | null>(null);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Fetch events from backend
  const { data: eventsData } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.getAll({ page: 0, size: 1000 }),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<Event>) => eventsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setIsFormOpen(false);
      showToast('Event created successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to create event', 'error');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Event> }) => 
      eventsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setIsFormOpen(false);
      showToast('Event updated successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to update event', 'error');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setIsDeleteModalOpen(false);
      showToast('Event deleted successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to delete event', 'error');
    },
  });

  const syncMicrosoft365Mutation = useMutation({
    mutationFn: () => eventsApi.syncMicrosoft365(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      showToast(result.summary, 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to sync Microsoft 365 calendar', 'error');
    },
  });

  const syncGoogleWorkspaceMutation = useMutation({
    mutationFn: () => eventsApi.syncGoogleWorkspace(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      showToast(result.summary, 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to sync Google Workspace calendar', 'error');
    },
  });

  // Transform backend events to calendar format
  const events = eventsData?.content || [];
  const eventsByDate: DayEvents = {};
  
  events.forEach((event) => {
    const dateKey = event.startTime.split('T')[0];
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000); // minutes
    
    const calendarEvent: CalendarEvent = {
      id: event.id!,
      title: event.title,
      type: event.eventType,
      time: startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      duration: duration < 60 ? `${duration} min` : `${Math.round(duration / 60)} hour${Math.round(duration / 60) > 1 ? 's' : ''}`,
      attendees: [],
      description: event.description,
      location: event.location,
      startTime: event.startTime,
      endTime: event.endTime,
    };
    
    if (!eventsByDate[dateKey]) {
      eventsByDate[dateKey] = [];
    }
    eventsByDate[dateKey].push(calendarEvent);
  });

  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay() + 1); // Monday
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays();
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const formatDateKey = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const allEvents = Object.values(eventsByDate).flat();
  const filteredEvents = searchQuery
    ? allEvents.filter(e => 
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allEvents;

  const totalMeetings = filteredEvents.length;
  const todayKey = formatDateKey(new Date());
  const todayMeetings = eventsByDate[todayKey]?.length || 0;

  const eventCounts = {
    all: allEvents.length,
    MEETING: allEvents.filter(e => e.type === "MEETING").length,
    CALL: allEvents.filter(e => e.type === "CALL").length,
    OTHER: allEvents.filter(e => e.type === "OTHER").length,
  };

  return (
    <PageLayout>
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold text-foreground">Calendar</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => syncGoogleWorkspaceMutation.mutate()}
                disabled={syncGoogleWorkspaceMutation.isPending}
                className="px-4 py-2 text-sm border border-border rounded hover:bg-secondary transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Icons.Download size={16} />
                {syncGoogleWorkspaceMutation.isPending ? 'Syncing Google...' : 'Sync Google'}
              </button>
              <button
                onClick={() => syncMicrosoft365Mutation.mutate()}
                disabled={syncMicrosoft365Mutation.isPending}
                className="px-4 py-2 text-sm border border-border rounded hover:bg-secondary transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Icons.Download size={16} />
                {syncMicrosoft365Mutation.isPending ? 'Syncing Outlook...' : 'Sync Outlook'}
              </button>
              <button
                onClick={() => {
                  exportToCSV(events, [
                    { header: 'Title', accessor: 'title' },
                    { header: 'Type', accessor: 'eventType' },
                    { header: 'Start', accessor: 'startTime' },
                    { header: 'End', accessor: 'endTime' },
                    { header: 'Location', accessor: (item) => item.location || '' },
                    { header: 'Description', accessor: (item) => item.description || '' },
                  ], 'calendar-events');
                  showToast(`Exported ${events.length} events`, 'success');
                }}
                className="px-4 py-2 text-sm border border-border rounded hover:bg-secondary transition-colors flex items-center gap-2"
              >
                <Icons.Download size={16} />
                Export
              </button>
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setIsFormOpen(true);
                }}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Icons.Plus size={16} />
                New Event
              </button>
            </div>
          </div>

          {/* Search and Controls */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousWeek}
                className="p-2 hover:bg-secondary rounded transition-colors border border-border"
              >
                <Icons.ChevronRight size={18} className="rotate-180" />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-2 text-sm border border-border rounded hover:bg-secondary transition-colors"
              >
                Today
              </button>
              <button
                onClick={goToNextWeek}
                className="p-2 hover:bg-secondary rounded transition-colors border border-border"
              >
                <Icons.ChevronRight size={18} />
              </button>
              <button
                onClick={() => setView("week")}
                className={cn(
                  "px-3 py-2 text-sm rounded border",
                  view === "week" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"
                )}
              >
                Week
              </button>
              <button
                onClick={() => setView("month")}
                className={cn(
                  "px-3 py-2 text-sm rounded border",
                  view === "month" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"
                )}
              >
                Month
              </button>
            </div>
          </div>

          {/* Month/Year Display */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <p className="text-sm text-muted-foreground">
              {todayMeetings} events today · {totalMeetings} this week
            </p>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="p-6">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {view === "week" ? (
            <div className="grid grid-cols-7">
              {weekDays.map((day, index) => {
                const dateKey = formatDateKey(day);
                const dayEvents = eventsByDate[dateKey] || [];
                const today = isToday(day);

                return (
                  <div
                    key={index}
                    className={cn(
                      "border-r border-border last:border-r-0 flex flex-col min-h-[600px]",
                      today && "bg-primary/5"
                    )}
                  >
                    {/* Day Header */}
                    <div className={cn(
                      "p-3 border-b border-border text-center",
                      today && "bg-primary/10"
                    )}>
                      <p className="text-xs text-muted-foreground uppercase">{dayNames[index]}</p>
                      <p className={cn(
                        "text-lg font-semibold mt-1",
                        today ? "text-primary" : "text-foreground"
                      )}>
                        {day.getDate()}
                      </p>
                    </div>

                    {/* Events */}
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                      {dayEvents.map((event) => {
                        // Find the original event data for editing
                        const originalEvent = events.find(e => e.id === event.id);
                        return (
                        <div
                          key={event.id}
                          className={cn(
                            "p-2 rounded border text-xs cursor-pointer hover:shadow-sm transition-shadow group relative",
                            eventTypeColors[event.type] || eventTypeColors.OTHER
                          )}
                        >
                          {/* Edit/Delete buttons */}
                          <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItem(originalEvent || null);
                                setIsFormOpen(true);
                              }}
                              className="p-1 rounded hover:bg-background/50"
                              title="Edit"
                            >
                              <Icons.Edit size={10} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItem(originalEvent || null);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-1 rounded hover:bg-red-100 text-red-600"
                              title="Delete"
                            >
                              <Icons.Trash size={10} />
                            </button>
                          </div>
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <p className="font-medium text-xs leading-tight line-clamp-2">{event.title}</p>
                            <span className="text-[10px] px-1 py-0.5 bg-background/50 rounded capitalize whitespace-nowrap">
                              {event.type.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <Icons.Clock size={10} />
                            <span className="text-[10px]">{event.time}</span>
                          </div>
                          {event.company && (
                            <p className="text-[10px] truncate mt-1 opacity-75">{event.company}</p>
                          )}
                        </div>
                        );
                      })}
                      {dayEvents.length === 0 && (
                        <div className="text-center py-6 text-muted-foreground/50">
                          <p className="text-xs">No events</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4">
              {/* Month View - Simple List */}
              <div className="space-y-3 max-h-[700px] overflow-y-auto">
                {Object.entries(eventsByDate).map(([date, dayEvents]) => (
                  <div key={date} className="border-b border-border pb-3 last:border-b-0">
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                      {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </h3>
                    <div className="space-y-2">
                      {dayEvents.map((event) => {
                        const originalEvent = events.find(e => e.id === event.id);
                        return (
                        <div
                          key={event.id}
                          className={cn(
                            "p-3 rounded border cursor-pointer hover:shadow-sm transition-shadow group relative",
                            eventTypeColors[event.type] || eventTypeColors.OTHER
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{event.title}</h4>
                              <div className="flex items-center gap-3 mt-1 text-xs">
                                <div className="flex items-center gap-1">
                                  <Icons.Clock size={12} />
                                  <span>{event.time} · {event.duration}</span>
                                </div>
                                {event.company && (
                                  <div className="flex items-center gap-1">
                                    <Icons.Building2 size={12} />
                                    <span>{event.company}</span>
                                  </div>
                                )}
                              </div>
                              {event.description && (
                                <p className="text-xs mt-2 opacity-75">{event.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <span className="text-xs px-2 py-1 bg-background/50 rounded capitalize whitespace-nowrap">
                                {event.type.toLowerCase().replace('_', ' ')}
                              </span>
                              <div className="hidden group-hover:flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedItem(originalEvent || null);
                                    setIsFormOpen(true);
                                  }}
                                  className="p-1 rounded hover:bg-background/50"
                                  title="Edit"
                                >
                                  <Icons.Edit size={14} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedItem(originalEvent || null);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  className="p-1 rounded hover:bg-red-100 text-red-600"
                                  title="Delete"
                                >
                                  <Icons.Trash size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Event Type Legend */}
        <div className="mt-6 flex items-center gap-4 px-4">
          <span className="text-sm text-muted-foreground">Event Types:</span>
          {Object.entries(eventTypeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded border", color)}></div>
              <span className="text-xs capitalize">{type.toLowerCase()}</span>
              <span className="text-xs text-muted-foreground">({eventCounts[type as keyof typeof eventCounts]})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Form Modal */}
      <EventForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedItem(null);
        }}
        onSubmit={(data) => {
          if (selectedItem) {
            updateMutation.mutate({ id: selectedItem.id!, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        initialData={selectedItem || undefined}
      />

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedItem(null);
        }}
        onConfirm={() => {
          if (selectedItem) {
            deleteMutation.mutate(selectedItem.id!);
          }
        }}
        title="Delete Event"
        message={`Are you sure you want to delete "${selectedItem?.title}"?`}
        variant="danger"
      />
    </PageLayout>
  );
}
