import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Icons } from "../components/icons";
import { cn } from "../lib/utils";
import { PageLayout } from "../components/PageLayout";
import { TaskForm } from "../components/forms";
import { useToast } from "../components/Toast";
import { ConfirmModal } from "../components/Modal";
import { tasksApi } from "../lib/api";
import type { Task } from "../lib/types";
import { useInsights } from "../hooks/useInsights";
import { InsightBadge } from "../components/InsightBadge";
import { exportToCSV } from "../lib/helpers";

const priorityColors = {
  low: "bg-gray-100 text-gray-600 border-gray-200",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  high: "bg-red-50 text-red-700 border-red-200",
};

const statusColors = {
  todo: "bg-blue-50 text-blue-700 border-blue-200",
  "in-progress": "bg-purple-50 text-purple-700 border-purple-200",
  completed: "bg-green-50 text-green-700 border-green-200",
};

export default function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Task | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (searchParams.get("create") === "1") {
      setSelectedItem(null);
      setIsFormOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Fetch live insights for tasks
  useInsights('tasks');

  // Fetch tasks from backend with auto-refresh every 30 seconds
  const { data: tasksData } = useQuery({
    queryKey: ['tasks', searchQuery, currentPage, pageSize],
    queryFn: () => tasksApi.getAll({ search: searchQuery, page: currentPage, size: pageSize }),
    refetchInterval: 30000, // Auto-refresh every 30 seconds for real-time overdue badges
  });

  const tasks = tasksData?.content || [];
  const totalElements = tasksData?.totalElements || 0;
  const totalPages = Math.ceil(totalElements / pageSize);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<Task>) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsFormOpen(false);
      showToast('Task created successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to create task', 'error');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) => 
      tasksApi.update(id, data),
    onSuccess: (response) => {
      console.log('Task update successful, response:', response);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsFormOpen(false);
      setSelectedItem(null);
      showToast('Task updated successfully', 'success');
    },
    onError: (error: any) => {
      console.error('Task update error:', error);
      showToast(error.response?.data?.message || 'Failed to update task', 'error');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsDeleteModalOpen(false);
      showToast('Task deleted successfully', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to delete task', 'error');
    },
  });

  const filteredTasks = tasks.filter((task) => {
    const matchesFilter = filter === "all" || task.status.toLowerCase().replace('_', '-') === filter;
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    return matchesFilter && matchesSearch;
  });

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, filter]);

  const statusCounts = {
    all: totalElements,
    todo: tasks.filter(t => t.status === "TODO").length,
    'in-progress': tasks.filter(t => t.status === "IN_PROGRESS").length,
    completed: tasks.filter(t => t.status === "COMPLETED").length,
  };

  // Get insight badges for a task based on its data
  const getTaskBadges = (task: Task): Array<{ type: 'overdue'; label?: string }> => {
    const badges: Array<{ type: 'overdue'; label?: string }> = [];
    
    // Check if task is overdue
    if (task.dueDate && task.status !== 'COMPLETED') {
      const dueDate = new Date(task.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      
      if (dueDate < today) {
        const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        badges.push({ type: 'overdue', label: `${daysOverdue}d` });
      }
    }
    
    return badges;
  };

  return (
    <PageLayout>
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="px-5 py-3.5">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-[26px] leading-none font-semibold text-foreground">Tasks</h1>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  exportToCSV(filteredTasks, [
                    { header: 'Title', accessor: 'title' },
                    { header: 'Description', accessor: 'description' },
                    { header: 'Status', accessor: 'status' },
                    { header: 'Priority', accessor: 'priority' },
                    { header: 'Due Date', accessor: (t) => t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '' },
                    { header: 'Assigned To', accessor: 'assignedTo' },
                    { header: 'Created At', accessor: (t) => t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '' },
                  ], 'tasks');
                  showToast(`Exported ${filteredTasks.length} tasks to CSV`, 'success');
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-secondary/60"
              >
                <Icons.Download size={14} />
                Export
              </button>
              <button className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-secondary/60">
                <Icons.Filter size={14} />
                Filter
              </button>
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setIsFormOpen(true);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Icons.Plus size={14} />
                New Task
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex-1 relative">
              <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-full border border-border bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
                  viewMode === "list" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"
                )}
                aria-label="List view"
              >
                <Icons.List size={16} />
              </button>
              <button
                onClick={() => setViewMode("board")}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
                  viewMode === "board" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"
                )}
                aria-label="Board view"
              >
                <Icons.Kanban size={16} />
              </button>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {(["all", "todo", "in-progress", "completed"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={cn(
                  "inline-flex h-7.5 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium capitalize transition-colors",
                  filter === status
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:border-primary/30 hover:bg-secondary/70"
                )}
              >
                <span>{status === "all" ? "All Tasks" : status.replace("-", " ")}</span>
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none tabular-nums",
                  filter === status ? "bg-primary-foreground/16 text-primary-foreground" : "bg-secondary text-muted-foreground"
                )}>
                  {statusCounts[status]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {viewMode === "list" ? (
          <div className="overflow-hidden rounded-2xl bg-card border border-border/70">
            <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    <input type="checkbox" className="rounded" />
                  </th>
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Task</th>
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Assignee</th>
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Priority</th>
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Due Date</th>
                  <th className="border-b border-border/60 bg-secondary/50 px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card">
                {filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="transition-colors hover:bg-secondary/20 [box-shadow:inset_0_-1px_0_rgba(148,163,184,0.22),0_6px_10px_-12px_rgba(15,23,42,0.45)]"
                  >
                    <td className="px-3 py-2.5">
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{task.title}</span>
                          {getTaskBadges(task).map((badge, idx) => (
                            <InsightBadge 
                              key={idx}
                              type={badge.type}
                              label={badge.label}
                            />
                          ))}
                        </div>
                        {task.description && (
                          <span className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {task.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                            {task.assignedTo.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm">{task.assignedTo}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize",
                        task.status === 'TODO' ? statusColors['todo'] :
                        task.status === 'IN_PROGRESS' ? statusColors['in-progress'] :
                        task.status === 'COMPLETED' ? statusColors['completed'] :
                        statusColors['todo']
                      )}>
                        {task.status.toLowerCase().replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize",
                        task.priority === 'LOW' ? priorityColors['low'] :
                        task.priority === 'MEDIUM' ? priorityColors['medium'] :
                        task.priority === 'HIGH' || task.priority === 'URGENT' ? priorityColors['high'] :
                        priorityColors['medium']
                      )}>
                        {task.priority.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-sm text-foreground">
                        <Icons.Calendar size={14} className="text-muted-foreground" />
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedItem(task);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 hover:bg-muted rounded transition-colors"
                          title="Edit"
                        >
                          <Icons.Edit size={16} className="text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(task);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-muted rounded transition-colors"
                          title="Delete"
                        >
                          <Icons.Trash size={16} className="text-muted-foreground" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {(["todo", "in-progress", "completed"] as const).map((status) => {
              const statusKey = status === 'in-progress' ? 'IN_PROGRESS' : status.toUpperCase();
              const statusTasks = filteredTasks.filter(t => t.status === statusKey);
              
              return (
                <div key={status} className="space-y-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold capitalize">{status.replace("-", " ")}</h3>
                    <span className="text-sm text-muted-foreground">
                      {statusTasks.length}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {statusTasks.map((task) => (
                      <div key={task.id} className="bg-card border border-border rounded-lg p-3 hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-sm flex-1">{task.title}</h4>
                          {getTaskBadges(task).map((badge, idx) => (
                            <InsightBadge 
                              key={idx}
                              type={badge.type}
                              label={badge.label}
                            />
                          ))}
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
                            task.priority === 'LOW' ? priorityColors['low'] :
                            task.priority === 'MEDIUM' ? priorityColors['medium'] :
                            task.priority === 'HIGH' || task.priority === 'URGENT' ? priorityColors['high'] :
                            priorityColors['medium']
                          )}>
                            {task.priority.toLowerCase()}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Icons.Calendar size={12} />
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                          </div>
                        </div>
                        {task.assignedTo && (
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                              {task.assignedTo.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs text-muted-foreground">{task.assignedTo}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Pagination */}
      <div className="border-t border-border px-5 py-3 flex items-center justify-between bg-card">
        <div className="text-xs text-muted-foreground">
          Showing {Math.min((currentPage * pageSize) + 1, totalElements)} to {Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements} tasks
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 0}
            className={cn(
              "h-8 px-3 text-xs font-medium border border-border rounded-full transition-colors",
              currentPage === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-secondary"
            )}
          >
            Previous
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) pageNum = i;
            else if (currentPage < 3) pageNum = i;
            else if (currentPage >= totalPages - 3) pageNum = totalPages - 5 + i;
            else pageNum = currentPage - 2 + i;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={cn(
                  "h-8 min-w-8 px-3 text-xs font-medium rounded-full transition-colors",
                  currentPage === pageNum
                    ? "bg-primary text-primary-foreground"
                    : "border border-border hover:bg-secondary"
                )}
              >
                {pageNum + 1}
              </button>
            );
          })}
          <button 
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            className={cn(
              "h-8 px-3 text-xs font-medium border border-border rounded-full transition-colors",
              currentPage >= totalPages - 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-secondary"
            )}
          >
            Next
          </button>
        </div>
      </div>

      {/* Form Modal */}
      <TaskForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedItem(null);
        }}
        onSubmit={(data) => {
          console.log('Tasks onSubmit - selectedItem:', selectedItem?.id, 'data:', data);
          if (selectedItem?.id) {
            updateMutation.mutate({ id: selectedItem.id, data });
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
          if (selectedItem?.id) {
            deleteMutation.mutate(selectedItem.id);
          }
        }}
        title="Delete Task"
        message={`Are you sure you want to delete "${selectedItem?.title}"?`}
        variant="danger"
      />
    </PageLayout>
  );
}
