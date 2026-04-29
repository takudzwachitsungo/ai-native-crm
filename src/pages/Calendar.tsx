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

  const getMonthDays = () => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - startOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + index);
      return day;
    });
  };

  const weekDays = getWeekDays();
  const monthDays = getMonthDays();
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
    if (view === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    if (view === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
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
  const todayEvents = eventsByDate[todayKey] || [];

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
  };

  const eventCounts = {
    all: allEvents.length,
    MEETING: allEvents.filter(e => e.type === "MEETING").length,
    CALL: allEvents.filter(e => e.type === "CALL").length,
    OTHER: allEvents.filter(e => e.type === "OTHER").length,
  };

  return (
    <PageLayout>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6">
      {/* Header */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold text-foreground">Calendar</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => syncGoogleWorkspaceMutation.mutate()}
                disabled={syncGoogleWorkspaceMutation.isPending}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-secondary/60 disabled:opacity-50"
              >
                <Icons.Download size={16} />
                {syncGoogleWorkspaceMutation.isPending ? 'Syncing Google...' : 'Sync Google'}
              </button>
              <button
                onClick={() => syncMicrosoft365Mutation.mutate()}
                disabled={syncMicrosoft365Mutation.isPending}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-secondary/60 disabled:opacity-50"
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
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-secondary/60"
              >
                <Icons.Download size={16} />
                Export
              </button>
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setIsFormOpen(true);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Icons.Plus size={16} />
                New Event
              </button>
            </div>
          </div>

          {/* Search and Controls */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 relative">
              <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-full border border-border bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousWeek}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border transition-colors hover:bg-secondary"
              >
                <Icons.ChevronRight size={18} className="rotate-180" />
              </button>
              <button
                onClick={goToToday}
                className="inline-flex h-8 items-center rounded-full border border-border px-3 text-xs font-medium transition-colors hover:bg-secondary"
              >
                Today
              </button>
              <button
                onClick={goToNextWeek}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border transition-colors hover:bg-secondary"
              >
                <Icons.ChevronRight size={18} />
              </button>
              <button
                onClick={() => setView("week")}
                className={cn(
                  "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors",
                  view === "week" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"
                )}
              >
                Week
              </button>
              <button
                onClick={() => setView("month")}
                className={cn(
                  "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors",
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
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="grid min-h-[720px] grid-cols-[260px_minmax(0,1fr)]">
            <aside className="border-r border-border bg-muted/20">
              <div className="border-b border-border px-4 py-4">
                <div className="mb-4 flex items-center justify-between">
                  <button
                    onClick={goToPreviousWeek}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-secondary"
                  >
                    <Icons.ChevronRight size={16} className="rotate-180" />
                  </button>
                  <div className="text-sm font-semibold text-foreground">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </div>
                  <button
                    onClick={goToNextWeek}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-secondary"
                  >
                    <Icons.ChevronRight size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-y-2 text-center text-[11px] font-medium text-muted-foreground">
                  {dayNames.map((day) => (
                    <span key={day}>{day.slice(0, 2)}</span>
                  ))}
                  {monthDays.map((day) => {
                    const today = isToday(day);
                    const inMonth = isCurrentMonth(day);
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setCurrentDate(day)}
                        className={cn(
                          "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors",
                          today
                            ? "bg-primary text-primary-foreground"
                            : inMonth
                              ? "text-foreground hover:bg-secondary"
                              : "text-muted-foreground/50 hover:bg-secondary"
                        )}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-6 px-4 py-4">
                <section>
                  <h3 className="mb-3 text-sm font-semibold text-foreground">Task Due Today</h3>
                  <div className="space-y-2">
                    {todayEvents.length > 0 ? todayEvents.slice(0, 5).map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          "rounded-lg border bg-background px-3 py-2 text-sm",
                          eventTypeColors[event.type] || eventTypeColors.OTHER
                        )}
                      >
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Icons.Clock size={11} />
                          <span>{event.time}</span>
                        </div>
                        <div className="mt-1 truncate font-medium text-foreground">{event.title}</div>
                      </div>
                    )) : (
                      <div className="rounded-lg border border-dashed border-border bg-background px-3 py-4 text-sm text-muted-foreground">
                        No events scheduled today.
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 text-sm font-semibold text-foreground">Calendar Setting</h3>
                  <div className="space-y-2">
                    {Object.entries(eventTypeColors).map(([type, color]) => (
                      <div key={type} className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div className={cn("h-3 w-3 rounded-full border", color)} />
                          <span className="capitalize text-foreground">{type.toLowerCase().replace('_', ' ')}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{allEvents.filter((event) => event.type === type).length}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </aside>

            <div className="min-w-0 bg-card">
              <div className="grid grid-cols-7 border-b border-border bg-background/60">
                {dayNames.map((day) => (
                  <div key={day} className="border-r border-border px-4 py-3 text-sm font-medium text-muted-foreground last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

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
                          "min-h-[640px] border-r border-border px-3 py-3 last:border-r-0",
                          today && "bg-primary/5"
                        )}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground">{day.getDate()}</span>
                          <span className="text-xs text-muted-foreground">{dayEvents.length || ""}</span>
                        </div>
                        <div className="space-y-2">
                          {dayEvents.map((event) => {
                            const originalEvent = events.find((item) => item.id === event.id);
                            return (
                              <div
                                key={event.id}
                                className={cn(
                                  "group relative rounded-md border-l-2 bg-background px-2.5 py-2 text-xs shadow-sm",
                                  eventTypeColors[event.type] || eventTypeColors.OTHER
                                )}
                              >
                                <div className="absolute right-1 top-1 hidden items-center gap-1 group-hover:flex">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedItem(originalEvent || null);
                                      setIsFormOpen(true);
                                    }}
                                    className="rounded p-1 hover:bg-background/60"
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
                                    className="rounded p-1 text-red-600 hover:bg-red-100"
                                    title="Delete"
                                  >
                                    <Icons.Trash size={10} />
                                  </button>
                                </div>
                                <div className="pr-8 font-medium leading-tight text-foreground line-clamp-2">{event.title}</div>
                                <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Icons.Clock size={10} />
                                  <span>{event.time}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-7">
                  {monthDays.map((day) => {
                    const dateKey = formatDateKey(day);
                    const dayEvents = eventsByDate[dateKey] || [];
                    const today = isToday(day);
                    const inMonth = isCurrentMonth(day);

                    return (
                      <div
                        key={dateKey}
                        className={cn(
                          "min-h-[132px] border-r border-b border-border px-2.5 py-2 last:border-r-0",
                          !inMonth && "bg-muted/10",
                          today && "bg-primary/5"
                        )}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              today ? "text-primary" : inMonth ? "text-foreground" : "text-muted-foreground"
                            )}
                          >
                            {day.getDate()}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {dayEvents.slice(0, 3).map((event) => {
                            const originalEvent = events.find((item) => item.id === event.id);
                            return (
                              <div
                                key={event.id}
                                className={cn(
                                  "group relative rounded-sm border-l-2 bg-background px-2 py-1.5 text-[11px] shadow-sm",
                                  eventTypeColors[event.type] || eventTypeColors.OTHER
                                )}
                              >
                                <div className="pr-6 font-medium leading-tight text-foreground truncate">{event.title}</div>
                                <div className="mt-0.5 text-[10px] text-muted-foreground">{event.time}</div>
                                <div className="absolute right-1 top-1 hidden items-center gap-1 group-hover:flex">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedItem(originalEvent || null);
                                      setIsFormOpen(true);
                                    }}
                                    className="rounded p-0.5 hover:bg-background/60"
                                    title="Edit"
                                  >
                                    <Icons.Edit size={9} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <div className="px-1 text-[11px] font-medium text-amber-600">
                              {dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Event Type Legend */}
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3">
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
