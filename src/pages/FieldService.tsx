import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ConfirmModal, Modal } from '../components/Modal';
import { PageLayout } from '../components/PageLayout';
import { Icons } from '../components/icons';
import { useToast } from '../components/Toast';
import { companiesApi, contactsApi, supportCasesApi, usersApi, workOrdersApi } from '../lib/api';
import { exportToCSV } from '../lib/helpers';
import { cn } from '../lib/utils';
import type { SupportCase, WorkOrder } from '../lib/types';

type WorkOrderFormState = {
  title: string;
  priority: string;
  workType: string;
  companyId: string;
  contactId: string;
  supportCaseId: string;
  assignedTechnicianId: string;
  territory: string;
  serviceAddress: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  description: string;
};

const statusClasses: Record<string, string> = {
  OPEN: 'bg-slate-50 text-slate-700 border-slate-200',
  SCHEDULED: 'bg-blue-50 text-blue-700 border-blue-200',
  DISPATCHED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED: 'bg-green-50 text-green-700 border-green-200',
  CANCELED: 'bg-red-50 text-red-700 border-red-200',
};

function buildInitialForm(order?: WorkOrder | null): WorkOrderFormState {
  return {
    title: order?.title || '',
    priority: order?.priority || 'MEDIUM',
    workType: order?.workType || 'OTHER',
    companyId: order?.companyId || '',
    contactId: order?.contactId || '',
    supportCaseId: order?.supportCaseId || '',
    assignedTechnicianId: order?.assignedTechnicianId || '',
    territory: order?.territory || '',
    serviceAddress: order?.serviceAddress || '',
    scheduledStartAt: order?.scheduledStartAt ? order.scheduledStartAt.slice(0, 16) : '',
    scheduledEndAt: order?.scheduledEndAt ? order.scheduledEndAt.slice(0, 16) : '',
    description: order?.description || '',
  };
}

type WOTab = 'details' | 'schedule' | 'notes';
const woTabs: WOTab[] = ['details', 'schedule', 'notes'];
const woTabHeaders: Record<WOTab, { create: string; edit: string }> = {
  details: { create: 'Define the work order basics and assign resources.', edit: 'Update work order details and assignments.' },
  schedule: { create: 'Set the service location and schedule window.', edit: 'Adjust location and timing for this work order.' },
  notes: { create: 'Add a description or special instructions.', edit: 'Update work order description and notes.' },
};

export default function FieldServicePage() {
  const [searchParams] = useSearchParams();
  const createRequested = searchParams.get('create') === '1';
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | WorkOrder['status']>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(createRequested);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formState, setFormState] = useState<WorkOrderFormState>(buildInitialForm());
  const [woActiveTab, setWoActiveTab] = useState<WOTab>('details');

  const { data: workOrdersData, isLoading } = useQuery({ queryKey: ['work-orders'], queryFn: () => workOrdersApi.getAll({ page: 0, size: 1000 }) });
  const { data: workOrderStats } = useQuery({ queryKey: ['work-orders', 'stats'], queryFn: () => workOrdersApi.getStatistics() });
  const { data: companiesData } = useQuery({ queryKey: ['companies', 'work-orders'], queryFn: () => companiesApi.getAll({ page: 0, size: 1000 }) });
  const { data: contactsData } = useQuery({ queryKey: ['contacts', 'work-orders'], queryFn: () => contactsApi.getAll({ page: 0, size: 1000 }) });
  const { data: casesData } = useQuery({ queryKey: ['support-cases', 'work-orders'], queryFn: () => supportCasesApi.getAll({ page: 0, size: 1000 }) });
  const { data: usersData } = useQuery({ queryKey: ['tenant-users', 'work-orders'], queryFn: () => usersApi.getAll({ page: 0, size: 1000 }) });

  const workOrders = workOrdersData?.content || [];
  const companies = companiesData?.content || [];
  const contacts = contactsData?.content || [];
  const supportCases = casesData?.content || [];
  const users = usersData?.content || [];

  const refreshWorkOrders = () => {
    queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    queryClient.invalidateQueries({ queryKey: ['work-orders', 'stats'] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: Partial<WorkOrder>) => workOrdersApi.create(payload),
    onSuccess: () => {
      refreshWorkOrders();
      setIsFormOpen(false);
      setSelectedOrder(null);
      showToast('Work order created successfully', 'success');
    },
    onError: (error: any) => showToast(error.response?.data?.message || 'Failed to create work order', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WorkOrder> }) => workOrdersApi.update(id, data),
    onSuccess: () => {
      refreshWorkOrders();
      setIsFormOpen(false);
      setSelectedOrder(null);
      showToast('Work order updated successfully', 'success');
    },
    onError: (error: any) => showToast(error.response?.data?.message || 'Failed to update work order', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workOrdersApi.delete(id),
    onSuccess: () => {
      refreshWorkOrders();
      setIsDeleteModalOpen(false);
      setSelectedOrder(null);
      showToast('Work order deleted successfully', 'success');
    },
    onError: (error: any) => showToast(error.response?.data?.message || 'Failed to delete work order', 'error'),
  });

  const lifecycleMutation = useMutation({
    mutationFn: async ({ action, order }: { action: string; order: WorkOrder }) => {
      if (!order.id) throw new Error('Missing work order id');
      if (action === 'dispatch') return workOrdersApi.dispatch(order.id);
      if (action === 'start') return workOrdersApi.start(order.id);
      if (action === 'complete') return workOrdersApi.complete(order.id, window.prompt('Completion notes (optional):', order.completionNotes || '') || '');
      throw new Error('Unsupported action');
    },
    onSuccess: (_, variables) => {
      refreshWorkOrders();
      showToast(`Work order ${variables.action} completed`, 'success');
    },
    onError: (error: any) => showToast(error.response?.data?.message || error.message || 'Failed to update work order', 'error'),
  });

  const filteredOrders = workOrders.filter((order) => {
    const matchesSearch = !searchQuery
      || order.title.toLowerCase().includes(searchQuery.toLowerCase())
      || (order.orderNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
      || (order.companyName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSaveWorkOrder = () => {
    const payload: Partial<WorkOrder> = {
      title: formState.title,
      priority: formState.priority as WorkOrder['priority'],
      workType: formState.workType as WorkOrder['workType'],
      companyId: formState.companyId || undefined,
      contactId: formState.contactId || undefined,
      supportCaseId: formState.supportCaseId || undefined,
      assignedTechnicianId: formState.assignedTechnicianId || undefined,
      territory: formState.territory || undefined,
      serviceAddress: formState.serviceAddress || undefined,
      scheduledStartAt: formState.scheduledStartAt ? new Date(formState.scheduledStartAt).toISOString() : undefined,
      scheduledEndAt: formState.scheduledEndAt ? new Date(formState.scheduledEndAt).toISOString() : undefined,
      description: formState.description || undefined,
      status: selectedOrder?.status || 'OPEN',
    };

    if (selectedOrder?.id) {
      updateMutation.mutate({ id: selectedOrder.id, data: payload });
      return;
    }
    createMutation.mutate(payload);
  };

  return (
    <PageLayout
      title="Field Service"
      subtitle="Work orders, dispatch, technician assignment, and service workload visibility."
      icon={<Icons.Briefcase size={20} />}
      actions={
        <button onClick={() => { setSelectedOrder(null); setFormState(buildInitialForm()); setIsFormOpen(true); }} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Icons.Plus size={16} />
          New Work Order
        </button>
      }
    >
      <div className="p-6 border-b border-border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 border border-border rounded-lg"><p className="text-sm text-muted-foreground mb-1">Total Work Orders</p><p className="text-2xl font-semibold">{workOrderStats?.totalWorkOrders || 0}</p></div>
          <div className="p-4 border border-border rounded-lg"><p className="text-sm text-muted-foreground mb-1">Active</p><p className="text-2xl font-semibold text-blue-600">{workOrderStats?.activeWorkOrders || 0}</p></div>
          <div className="p-4 border border-border rounded-lg"><p className="text-sm text-muted-foreground mb-1">Scheduled</p><p className="text-2xl font-semibold text-indigo-600">{workOrderStats?.scheduledWorkOrders || 0}</p></div>
          <div className="p-4 border border-border rounded-lg"><p className="text-sm text-muted-foreground mb-1">Overdue Scheduled</p><p className="text-2xl font-semibold text-red-600">{workOrderStats?.overdueScheduledWorkOrders || 0}</p></div>
        </div>
      </div>

      <div className="p-4 border-b border-border flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Icons.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search work orders..." className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <select value={statusFilter || 'ALL'} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="px-3 py-2 border border-border rounded-lg bg-background">
            <option value="ALL">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELED">Canceled</option>
          </select>
        </div>
        <button onClick={() => { exportToCSV(filteredOrders, [{ header: 'Order #', accessor: (item) => item.orderNumber || '' }, { header: 'Title', accessor: 'title' }, { header: 'Status', accessor: (item) => item.status || '' }, { header: 'Priority', accessor: (item) => item.priority || '' }, { header: 'Company', accessor: (item) => item.companyName || '' }, { header: 'Technician', accessor: (item) => item.assignedTechnicianName || '' }, { header: 'Scheduled Start', accessor: (item) => item.scheduledStartAt || '' }], 'field-service-work-orders'); showToast(`Exported ${filteredOrders.length} work orders`, 'success'); }} className="px-3 py-2 border border-border rounded-lg hover:bg-secondary transition-colors flex items-center gap-2">
          <Icons.Download size={16} />
          Export
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div className="overflow-hidden rounded-2xl bg-card">
          <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border-b border-border/60 bg-secondary/50 px-4 py-2.5 text-left text-[11px] uppercase tracking-wider text-muted-foreground">Work Order</th>
                <th className="border-b border-border/60 bg-secondary/50 px-4 py-2.5 text-left text-[11px] uppercase tracking-wider text-muted-foreground">Customer</th>
                <th className="border-b border-border/60 bg-secondary/50 px-4 py-2.5 text-left text-[11px] uppercase tracking-wider text-muted-foreground">Schedule</th>
                <th className="border-b border-border/60 bg-secondary/50 px-4 py-2.5 text-left text-[11px] uppercase tracking-wider text-muted-foreground">Technician</th>
                <th className="border-b border-border/60 bg-secondary/50 px-4 py-2.5 text-left text-[11px] uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="border-b border-border/60 bg-secondary/50 px-4 py-2.5 text-left text-[11px] uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card">
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="transition-colors hover:bg-secondary/20 [box-shadow:inset_0_-1px_0_rgba(148,163,184,0.22),0_6px_10px_-12px_rgba(15,23,42,0.45)]"
                >
                  <td className="px-4 py-3"><div><p className="font-semibold text-primary">{order.orderNumber || 'Pending number'}</p><p className="text-xs text-muted-foreground">{order.title}</p></div></td>
                  <td className="px-4 py-3"><div><p className="font-medium">{order.companyName || 'No company'}</p><p className="text-xs text-muted-foreground">{order.contactName || 'No contact'}{order.supportCaseNumber ? ` · ${order.supportCaseNumber}` : ''}</p></div></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground"><div>{order.scheduledStartAt ? new Date(order.scheduledStartAt).toLocaleString() : 'Unscheduled'}</div><div className="text-xs">{order.serviceAddress || order.territory || 'No service location'}</div></td>
                  <td className="px-4 py-3"><div className="font-medium">{order.assignedTechnicianName || 'Unassigned'}</div><div className="text-xs text-muted-foreground">{order.priority || 'MEDIUM'} · {order.workType || 'OTHER'}</div></td>
                  <td className="px-4 py-3"><span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border', statusClasses[order.status || 'OPEN'])}>{(order.status || 'OPEN').replace('_', ' ')}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => { setSelectedOrder(order); setFormState(buildInitialForm(order)); setIsFormOpen(true); }} className="px-2 py-1 text-xs border border-border rounded hover:bg-secondary">Edit</button>
                      {(order.status === 'OPEN' || order.status === 'SCHEDULED') && <button onClick={() => lifecycleMutation.mutate({ action: 'dispatch', order })} className="px-2 py-1 text-xs border border-border rounded hover:bg-secondary">Dispatch</button>}
                      {order.status === 'DISPATCHED' && <button onClick={() => lifecycleMutation.mutate({ action: 'start', order })} className="px-2 py-1 text-xs border border-border rounded hover:bg-secondary">Start</button>}
                      {order.status === 'IN_PROGRESS' && <button onClick={() => lifecycleMutation.mutate({ action: 'complete', order })} className="px-2 py-1 text-xs border border-border rounded hover:bg-secondary">Complete</button>}
                      <button onClick={() => { setSelectedOrder(order); setIsDeleteModalOpen(true); }} className="px-2 py-1 text-xs border border-border rounded hover:bg-secondary">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {!isLoading && filteredOrders.length === 0 && <div className="py-10 text-center text-muted-foreground">No work orders found yet.</div>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-border rounded-lg p-4">
            <h2 className="font-semibold mb-3">Technician Workload</h2>
            <div className="space-y-3">
              {(workOrderStats?.technicianWorkloads || []).map((technician) => (
                <div key={technician.technicianId} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{technician.technicianName || 'Unassigned technician'}</p>
                    <p className="text-xs text-muted-foreground">{technician.territory || 'No territory'}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>{technician.activeWorkOrders || 0} active</p>
                    <p className="text-muted-foreground">{technician.urgentWorkOrders || 0} urgent</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-border rounded-lg p-4">
            <h2 className="font-semibold mb-3">Priority Mix</h2>
            <div className="space-y-2 text-sm">
              {Object.entries(workOrderStats?.workOrdersByPriority || {}).map(([priority, count]) => (
                <div key={priority} className="flex items-center justify-between">
                  <span>{priority}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setSelectedOrder(null); }} title={selectedOrder ? 'Edit Work Order' : 'Create Work Order'} size="xl" footer={
        <div className="flex justify-end gap-3">
          <button onClick={() => { setIsFormOpen(false); setSelectedOrder(null); }} className="px-4 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-[0.8125rem] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150">Cancel</button>
          <button onClick={handleSaveWorkOrder} className="px-5 py-1.5 rounded-lg bg-teal-600 text-white text-[0.8125rem] font-medium hover:bg-teal-700 focus:ring-2 focus:ring-teal-500/30 focus:ring-offset-1 transition-all duration-150 shadow-sm">{selectedOrder ? 'Save Changes' : 'Create Work Order'}</button>
        </div>
      }>
        <div className="space-y-5">
          {/* Segment Control */}
          <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5 gap-0.5">
            {woTabs.map((tab) => (
              <button key={tab} type="button" onClick={() => setWoActiveTab(tab)} className={`px-4 py-1 text-[0.75rem] font-medium rounded-md transition-all duration-150 capitalize ${woActiveTab === tab ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>{tab}</button>
            ))}
          </div>

          {/* Tab Header */}
          <div className="flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-teal-500" />
            <p className="text-[0.8rem] text-gray-500 dark:text-gray-400">{woTabHeaders[woActiveTab][selectedOrder ? 'edit' : 'create']}</p>
          </div>

          {/* Tab Content */}
          <div className="min-h-[20rem]">
            {woActiveTab === 'details' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <div>
                    <label className="block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Title *</label>
                    <input value={formState.title} onChange={(e) => setFormState((c) => ({ ...c, title: e.target.value }))} className="w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150" />
                  </div>
                  <div>
                    <label className="block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Priority</label>
                    <select value={formState.priority} onChange={(e) => setFormState((c) => ({ ...c, priority: e.target.value }))} className="w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150">
                      <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Work Type</label>
                    <select value={formState.workType} onChange={(e) => setFormState((c) => ({ ...c, workType: e.target.value }))} className="w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150">
                      <option value="INSTALLATION">Installation</option><option value="MAINTENANCE">Maintenance</option><option value="REPAIR">Repair</option><option value="INSPECTION">Inspection</option><option value="DELIVERY">Delivery</option><option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Technician</label>
                    <select value={formState.assignedTechnicianId} onChange={(e) => setFormState((c) => ({ ...c, assignedTechnicianId: e.target.value }))} className="w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150">
                      <option value="">Unassigned</option>{users.map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Company</label>
                    <select value={formState.companyId} onChange={(e) => setFormState((c) => ({ ...c, companyId: e.target.value }))} className="w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150">
                      <option value="">No company</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contact</label>
                    <select value={formState.contactId} onChange={(e) => setFormState((c) => ({ ...c, contactId: e.target.value }))} className="w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150">
                      <option value="">No contact</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.firstName} {contact.lastName}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Support Case</label>
                    <select value={formState.supportCaseId} onChange={(e) => setFormState((c) => ({ ...c, supportCaseId: e.target.value }))} className="w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150">
                      <option value="">No support case</option>{supportCases.map((supportCase: SupportCase) => <option key={supportCase.id} value={supportCase.id}>{supportCase.caseNumber} · {supportCase.title}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {woActiveTab === 'schedule' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <div>
                    <label className="block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Territory</label>
                    <input value={formState.territory} onChange={(e) => setFormState((c) => ({ ...c, territory: e.target.value }))} className="w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150" />
                  </div>
                  <div>
                    <label className="block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Service Address</label>
                    <input value={formState.serviceAddress} onChange={(e) => setFormState((c) => ({ ...c, serviceAddress: e.target.value }))} className="w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150" />
                  </div>
                  <div>
                    <label className="block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Scheduled Start</label>
                    <input type="datetime-local" value={formState.scheduledStartAt} onChange={(e) => setFormState((c) => ({ ...c, scheduledStartAt: e.target.value }))} className="w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150" />
                  </div>
                  <div>
                    <label className="block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Scheduled End</label>
                    <input type="datetime-local" value={formState.scheduledEndAt} onChange={(e) => setFormState((c) => ({ ...c, scheduledEndAt: e.target.value }))} className="w-full h-9 px-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150" />
                  </div>
                </div>
              </div>
            )}

            {woActiveTab === 'notes' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[0.75rem] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                  <textarea value={formState.description} onChange={(e) => setFormState((c) => ({ ...c, description: e.target.value }))} rows={6} className="w-full px-2.5 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-[0.8125rem] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all duration-150 resize-none" placeholder="Work order details, special instructions..." />
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmModal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setSelectedOrder(null); }} onConfirm={() => { if (selectedOrder?.id) deleteMutation.mutate(selectedOrder.id); }} title="Delete Work Order" message={`Delete ${selectedOrder?.orderNumber || selectedOrder?.title}?`} confirmText="Delete" variant="danger" />
    </PageLayout>
  );
}
