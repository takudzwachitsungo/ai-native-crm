import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';
import { ConfirmModal, Modal } from '../components/Modal';
import { Icons } from '../components/icons';
import { useToast } from '../components/Toast';
import { companiesApi, contactsApi, contractsApi, quotesApi, usersApi } from '../lib/api';
import { exportToCSV } from '../lib/helpers';
import { cn } from '../lib/utils';
import type { Company, Contact, Contract, Quote, TenantUser } from '../lib/types';

type ContractFormState = {
  contractNumber: string;
  title: string;
  companyId: string;
  contactId: string;
  quoteId: string;
  ownerId: string;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  renewalNoticeDays: string;
  contractValue: string;
  notes: string;
};

type QuoteConversionState = {
  quoteId: string;
  contractNumber: string;
  title: string;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  renewalNoticeDays: string;
  ownerId: string;
  notes: string;
};

const statusClasses: Record<string, string> = {
  DRAFT: 'bg-slate-50 text-slate-700 border-slate-200',
  ACTIVE: 'bg-green-50 text-green-700 border-green-200',
  RENEWAL_DUE: 'bg-amber-50 text-amber-700 border-amber-200',
  EXPIRED: 'bg-red-50 text-red-700 border-red-200',
  TERMINATED: 'bg-zinc-50 text-zinc-700 border-zinc-200',
};

function formatCurrency(value?: number) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function toLocalDateInput(daysFromToday = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().split('T')[0];
}

function buildInitialForm(contract?: Contract | null): ContractFormState {
  return {
    contractNumber: contract?.contractNumber || '',
    title: contract?.title || '',
    companyId: contract?.companyId || '',
    contactId: contract?.contactId || '',
    quoteId: contract?.quoteId || '',
    ownerId: contract?.ownerId || '',
    startDate: contract?.startDate || toLocalDateInput(0),
    endDate: contract?.endDate || toLocalDateInput(365),
    autoRenew: contract?.autoRenew ?? true,
    renewalNoticeDays: String(contract?.renewalNoticeDays ?? 30),
    contractValue: contract?.contractValue != null ? String(contract.contractValue) : '',
    notes: contract?.notes || '',
  };
}

function buildInitialConversion(quoteId?: string): QuoteConversionState {
  return {
    quoteId: quoteId || '',
    contractNumber: '',
    title: '',
    startDate: toLocalDateInput(0),
    endDate: toLocalDateInput(365),
    autoRenew: true,
    renewalNoticeDays: '30',
    ownerId: '',
    notes: '',
  };
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">{label}</span>
      {children}
    </label>
  );
}

function ContractForm({
  formState,
  onChange,
  companies,
  contacts,
  quotes,
  users,
}: {
  formState: ContractFormState;
  onChange: React.Dispatch<React.SetStateAction<ContractFormState>>;
  companies: Company[];
  contacts: Contact[];
  quotes: Quote[];
  users: TenantUser[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField label="Contract Number">
        <input value={formState.contractNumber} onChange={(e) => onChange((c) => ({ ...c, contractNumber: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
      </FormField>
      <FormField label="Owner">
        <select value={formState.ownerId} onChange={(e) => onChange((c) => ({ ...c, ownerId: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg bg-background">
          <option value="">Unassigned</option>
          {users.map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>)}
        </select>
      </FormField>
      <FormField label="Title">
        <input value={formState.title} onChange={(e) => onChange((c) => ({ ...c, title: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
      </FormField>
      <FormField label="Contract Value">
        <input type="number" min="0" step="0.01" value={formState.contractValue} onChange={(e) => onChange((c) => ({ ...c, contractValue: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
      </FormField>
      <FormField label="Company">
        <select value={formState.companyId} onChange={(e) => onChange((c) => ({ ...c, companyId: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg bg-background">
          <option value="">Select company</option>
          {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
        </select>
      </FormField>
      <FormField label="Contact">
        <select value={formState.contactId} onChange={(e) => onChange((c) => ({ ...c, contactId: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg bg-background">
          <option value="">No contact</option>
          {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.firstName} {contact.lastName}</option>)}
        </select>
      </FormField>
      <FormField label="Source Quote">
        <select value={formState.quoteId} onChange={(e) => onChange((c) => ({ ...c, quoteId: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg bg-background">
          <option value="">No quote</option>
          {quotes.map((quote) => <option key={quote.id} value={quote.id}>{quote.quoteNumber} · {quote.companyName || quote.contactName || 'Unknown'}</option>)}
        </select>
      </FormField>
      <FormField label="Renewal Notice Days">
        <input type="number" min="0" value={formState.renewalNoticeDays} onChange={(e) => onChange((c) => ({ ...c, renewalNoticeDays: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
      </FormField>
      <FormField label="Start Date">
        <input type="date" value={formState.startDate} onChange={(e) => onChange((c) => ({ ...c, startDate: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
      </FormField>
      <FormField label="End Date">
        <input type="date" value={formState.endDate} onChange={(e) => onChange((c) => ({ ...c, endDate: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
      </FormField>
      <div className="md:col-span-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={formState.autoRenew} onChange={(e) => onChange((c) => ({ ...c, autoRenew: e.target.checked }))} />
          Enable auto-renewal
        </label>
      </div>
      <div className="md:col-span-2">
        <FormField label="Notes">
          <textarea value={formState.notes} onChange={(e) => onChange((c) => ({ ...c, notes: e.target.value }))} rows={4} className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
        </FormField>
      </div>
    </div>
  );
}

export default function ContractsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const createRequested = searchParams.get('create') === '1';
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Contract['status']>('ALL');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(createRequested);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isConversionOpen, setIsConversionOpen] = useState(false);
  const [formState, setFormState] = useState<ContractFormState>(buildInitialForm());
  const [conversionState, setConversionState] = useState<QuoteConversionState>(buildInitialConversion());

  const { data: contractsData, isLoading } = useQuery({ queryKey: ['contracts'], queryFn: () => contractsApi.getAll({ page: 0, size: 1000 }) });
  const { data: quotesData } = useQuery({ queryKey: ['quotes', 'contracts-conversion'], queryFn: () => quotesApi.getAll({ page: 0, size: 1000 }) });
  const { data: companiesData } = useQuery({ queryKey: ['companies', 'contracts-form'], queryFn: () => companiesApi.getAll({ page: 0, size: 1000 }) });
  const { data: contactsData } = useQuery({ queryKey: ['contacts', 'contracts-form'], queryFn: () => contactsApi.getAll({ page: 0, size: 1000 }) });
  const { data: usersData } = useQuery({ queryKey: ['tenant-users', 'contracts-form'], queryFn: () => usersApi.getAll({ page: 0, size: 1000 }) });

  const contracts = contractsData?.content || [];
  const quotes = quotesData?.content || [];
  const companies = companiesData?.content || [];
  const contacts = contactsData?.content || [];
  const users = usersData?.content || [];
  const acceptedQuotes = quotes.filter((quote) => quote.status === 'ACCEPTED');

  useEffect(() => {
    const convertQuoteId = searchParams.get('convertQuoteId');
    if (!convertQuoteId) return;
    const quote = acceptedQuotes.find((item) => item.id === convertQuoteId);
    if (!quote) return;
    setConversionState({
      ...buildInitialConversion(convertQuoteId),
      contractNumber: `CTR-${quote.quoteNumber}`,
      title: `Contract for ${quote.companyName || quote.contactName || quote.quoteNumber}`,
    });
    setIsConversionOpen(true);
  }, [acceptedQuotes, searchParams]);

  const refreshContracts = () => queryClient.invalidateQueries({ queryKey: ['contracts'] });

  const createMutation = useMutation({
    mutationFn: (payload: Partial<Contract>) => contractsApi.create(payload),
    onSuccess: () => {
      refreshContracts();
      setIsFormOpen(false);
      setSelectedContract(null);
      setFormState(buildInitialForm());
      showToast('Contract created successfully', 'success');
    },
    onError: (error: any) => showToast(error.response?.data?.message || 'Failed to create contract', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Contract> }) => contractsApi.update(id, data),
    onSuccess: () => {
      refreshContracts();
      setIsFormOpen(false);
      setSelectedContract(null);
      showToast('Contract updated successfully', 'success');
    },
    onError: (error: any) => showToast(error.response?.data?.message || 'Failed to update contract', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contractsApi.delete(id),
    onSuccess: () => {
      refreshContracts();
      setIsDeleteModalOpen(false);
      setSelectedContract(null);
      showToast('Contract deleted successfully', 'success');
    },
    onError: (error: any) => showToast(error.response?.data?.message || 'Failed to delete contract', 'error'),
  });

  const convertMutation = useMutation({
    mutationFn: (payload: QuoteConversionState) =>
      contractsApi.createFromQuote(payload.quoteId, {
        contractNumber: payload.contractNumber,
        title: payload.title || undefined,
        startDate: payload.startDate,
        endDate: payload.endDate,
        autoRenew: payload.autoRenew,
        renewalNoticeDays: Number(payload.renewalNoticeDays || 0),
        ownerId: payload.ownerId || undefined,
        notes: payload.notes || undefined,
      }),
    onSuccess: () => {
      refreshContracts();
      setIsConversionOpen(false);
      setConversionState(buildInitialConversion());
      setSearchParams((params) => {
        params.delete('convertQuoteId');
        return params;
      });
      showToast('Quote converted to contract', 'success');
    },
    onError: (error: any) => showToast(error.response?.data?.message || 'Failed to convert quote', 'error'),
  });

  const lifecycleMutation = useMutation({
    mutationFn: async ({ action, contract }: { action: string; contract: Contract }) => {
      if (!contract.id) throw new Error('Missing contract id');
      if (action === 'activate') return contractsApi.activate(contract.id);
      if (action === 'renewal-due') return contractsApi.markRenewalDue(contract.id);
      if (action === 'invoice') return contractsApi.generateRenewalInvoice(contract.id, window.prompt('Renewal invoice number (optional):', `INV-REN-${contract.contractNumber}`) || '');
      if (action === 'renew') {
        const contractNumber = window.prompt('New contract number:', `${contract.contractNumber}-R1`);
        if (!contractNumber) throw new Error('Renewal cancelled');
        return contractsApi.renew(contract.id, contractNumber);
      }
      if (action === 'terminate') return contractsApi.terminate(contract.id, window.prompt('Termination reason:', contract.terminationReason || 'Customer request') || '');
      throw new Error('Unsupported action');
    },
    onSuccess: (_, variables) => {
      refreshContracts();
      showToast(`Contract ${variables.action.replace('-', ' ')} completed`, 'success');
    },
    onError: (error: any) => showToast(error.message === 'Renewal cancelled' ? 'Renewal cancelled' : error.response?.data?.message || 'Failed to update contract lifecycle', error.message === 'Renewal cancelled' ? 'info' : 'error'),
  });

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch = !searchQuery
      || contract.contractNumber.toLowerCase().includes(searchQuery.toLowerCase())
      || (contract.title || '').toLowerCase().includes(searchQuery.toLowerCase())
      || (contract.companyName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || contract.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: contracts.length,
    active: contracts.filter((contract) => contract.status === 'ACTIVE').length,
    renewalDue: contracts.filter((contract) => contract.status === 'RENEWAL_DUE').length,
    value: contracts.reduce((sum, contract) => sum + Number(contract.contractValue || 0), 0),
  };

  const handleSaveContract = () => {
    const payload: Partial<Contract> = {
      contractNumber: formState.contractNumber,
      title: formState.title || undefined,
      companyId: formState.companyId,
      contactId: formState.contactId || undefined,
      quoteId: formState.quoteId || undefined,
      ownerId: formState.ownerId || undefined,
      startDate: formState.startDate,
      endDate: formState.endDate,
      autoRenew: formState.autoRenew,
      renewalNoticeDays: Number(formState.renewalNoticeDays || 0),
      contractValue: formState.contractValue ? Number(formState.contractValue) : undefined,
      notes: formState.notes || undefined,
      status: selectedContract?.status || 'DRAFT',
    };

    if (selectedContract?.id) {
      updateMutation.mutate({ id: selectedContract.id, data: payload });
      return;
    }
    createMutation.mutate(payload);
  };

  return (
    <PageLayout
      title="Contracts"
      subtitle="Quote conversion, lifecycle management, renewals, and contract visibility for QA."
      icon={<Icons.FileText size={20} />}
      actions={
        <div className="flex items-center gap-2">
          <button onClick={() => setIsConversionOpen(true)} className="px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors flex items-center gap-2">
            <Icons.ArrowRight size={16} />
            Convert Quote
          </button>
          <button onClick={() => { setSelectedContract(null); setFormState(buildInitialForm()); setIsFormOpen(true); }} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Icons.Plus size={16} />
            New Contract
          </button>
        </div>
      }
    >
      <div className="p-6 border-b border-border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 border border-border rounded-lg"><p className="text-sm text-muted-foreground mb-1">Total Contracts</p><p className="text-2xl font-semibold">{stats.total}</p></div>
          <div className="p-4 border border-border rounded-lg"><p className="text-sm text-muted-foreground mb-1">Active</p><p className="text-2xl font-semibold text-green-600">{stats.active}</p></div>
          <div className="p-4 border border-border rounded-lg"><p className="text-sm text-muted-foreground mb-1">Renewal Due</p><p className="text-2xl font-semibold text-amber-600">{stats.renewalDue}</p></div>
          <div className="p-4 border border-border rounded-lg"><p className="text-sm text-muted-foreground mb-1">Contract Value</p><p className="text-2xl font-semibold">{formatCurrency(stats.value)}</p></div>
        </div>
      </div>

      <div className="p-4 border-b border-border flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Icons.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search contracts..." className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <select value={statusFilter || 'ALL'} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="px-3 py-2 border border-border rounded-lg bg-background">
            <option value="ALL">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="RENEWAL_DUE">Renewal due</option>
            <option value="EXPIRED">Expired</option>
            <option value="TERMINATED">Terminated</option>
          </select>
        </div>
        <button
          onClick={() => {
            exportToCSV(filteredContracts, [
              { header: 'Contract #', accessor: 'contractNumber' },
              { header: 'Title', accessor: (item) => item.title || '' },
              { header: 'Company', accessor: (item) => item.companyName || '' },
              { header: 'Quote', accessor: (item) => item.quoteNumber || '' },
              { header: 'Status', accessor: (item) => item.status || '' },
              { header: 'Start Date', accessor: (item) => item.startDate },
              { header: 'End Date', accessor: (item) => item.endDate },
              { header: 'Value', accessor: (item) => item.contractValue || 0 },
            ], 'contracts');
            showToast(`Exported ${filteredContracts.length} contracts`, 'success');
          }}
          className="px-3 py-2 border border-border rounded-lg hover:bg-secondary transition-colors flex items-center gap-2"
        >
          <Icons.Download size={16} />
          Export
        </button>
      </div>

      <div className="p-6">
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Contract</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Account</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Term</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Value</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredContracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-muted/20">
                  <td className="px-4 py-4"><div><p className="font-semibold text-primary">{contract.contractNumber}</p><p className="text-xs text-muted-foreground">{contract.title || 'Untitled contract'}</p></div></td>
                  <td className="px-4 py-4"><div><p className="font-medium">{contract.companyName || 'Unassigned company'}</p><p className="text-xs text-muted-foreground">{contract.contactName || 'No contact'}{contract.quoteNumber ? ` · ${contract.quoteNumber}` : ''}</p></div></td>
                  <td className="px-4 py-4 text-sm text-muted-foreground"><div>{contract.startDate} → {contract.endDate}</div><div className="text-xs">Renewal {contract.autoRenew ? 'auto' : 'manual'}</div></td>
                  <td className="px-4 py-4"><div className="font-semibold">{formatCurrency(contract.contractValue)}</div><div className="text-xs text-muted-foreground">{contract.ownerName || 'No owner'}</div></td>
                  <td className="px-4 py-4"><span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border', statusClasses[contract.status || 'DRAFT'])}>{(contract.status || 'DRAFT').replace('_', ' ')}</span></td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => { setSelectedContract(contract); setFormState(buildInitialForm(contract)); setIsFormOpen(true); }} className="px-2 py-1 text-xs border border-border rounded hover:bg-secondary">Edit</button>
                      {(contract.status === 'DRAFT' || contract.status === 'RENEWAL_DUE') && <button onClick={() => lifecycleMutation.mutate({ action: 'activate', contract })} className="px-2 py-1 text-xs border border-border rounded hover:bg-secondary">Activate</button>}
                      {contract.status === 'ACTIVE' && <button onClick={() => lifecycleMutation.mutate({ action: 'renewal-due', contract })} className="px-2 py-1 text-xs border border-border rounded hover:bg-secondary">Renewal Due</button>}
                      {contract.status === 'RENEWAL_DUE' && <>
                        <button onClick={() => lifecycleMutation.mutate({ action: 'invoice', contract })} className="px-2 py-1 text-xs border border-border rounded hover:bg-secondary">Renewal Invoice</button>
                        <button onClick={() => lifecycleMutation.mutate({ action: 'renew', contract })} className="px-2 py-1 text-xs border border-border rounded hover:bg-secondary">Renew</button>
                      </>}
                      {(contract.status === 'ACTIVE' || contract.status === 'RENEWAL_DUE') && <button onClick={() => lifecycleMutation.mutate({ action: 'terminate', contract })} className="px-2 py-1 text-xs border border-red-200 text-red-700 rounded hover:bg-red-50">Terminate</button>}
                      <button onClick={() => { setSelectedContract(contract); setIsDeleteModalOpen(true); }} className="px-2 py-1 text-xs border border-border rounded hover:bg-secondary">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && filteredContracts.length === 0 && <div className="py-10 text-center text-muted-foreground">No contracts found yet.</div>}
        </div>
      </div>

      <Modal isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setSelectedContract(null); }} title={selectedContract ? 'Edit Contract' : 'Create Contract'} size="lg" footer={<><button onClick={() => { setIsFormOpen(false); setSelectedContract(null); }} className="px-4 py-2 border border-border rounded-lg hover:bg-secondary">Cancel</button><button onClick={handleSaveContract} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">{selectedContract ? 'Save Changes' : 'Create Contract'}</button></>}>
        <ContractForm formState={formState} onChange={setFormState} companies={companies} contacts={contacts} quotes={quotes} users={users} />
      </Modal>

      <Modal isOpen={isConversionOpen} onClose={() => { setIsConversionOpen(false); setConversionState(buildInitialConversion()); setSearchParams((params) => { params.delete('convertQuoteId'); return params; }); }} title="Convert Accepted Quote" size="lg" footer={<><button onClick={() => setIsConversionOpen(false)} className="px-4 py-2 border border-border rounded-lg hover:bg-secondary">Cancel</button><button onClick={() => convertMutation.mutate(conversionState)} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">Convert Quote</button></>}>
        <div className="space-y-4">
          <FormField label="Accepted Quote">
            <select value={conversionState.quoteId} onChange={(e) => setConversionState((current) => ({ ...current, quoteId: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg bg-background">
              <option value="">Select accepted quote</option>
              {acceptedQuotes.map((quote) => <option key={quote.id} value={quote.id}>{quote.quoteNumber} · {quote.companyName || quote.contactName || 'Unnamed customer'}</option>)}
            </select>
          </FormField>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Contract Number"><input value={conversionState.contractNumber} onChange={(e) => setConversionState((c) => ({ ...c, contractNumber: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg bg-background" /></FormField>
            <FormField label="Owner"><select value={conversionState.ownerId} onChange={(e) => setConversionState((c) => ({ ...c, ownerId: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg bg-background"><option value="">Unassigned</option>{users.map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>)}</select></FormField>
            <FormField label="Title"><input value={conversionState.title} onChange={(e) => setConversionState((c) => ({ ...c, title: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg bg-background" /></FormField>
            <FormField label="Renewal Notice Days"><input type="number" value={conversionState.renewalNoticeDays} onChange={(e) => setConversionState((c) => ({ ...c, renewalNoticeDays: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg bg-background" /></FormField>
            <FormField label="Start Date"><input type="date" value={conversionState.startDate} onChange={(e) => setConversionState((c) => ({ ...c, startDate: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg bg-background" /></FormField>
            <FormField label="End Date"><input type="date" value={conversionState.endDate} onChange={(e) => setConversionState((c) => ({ ...c, endDate: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg bg-background" /></FormField>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={conversionState.autoRenew} onChange={(e) => setConversionState((c) => ({ ...c, autoRenew: e.target.checked }))} />Enable auto-renewal</label>
          <FormField label="Notes"><textarea value={conversionState.notes} onChange={(e) => setConversionState((c) => ({ ...c, notes: e.target.value }))} rows={4} className="w-full px-3 py-2 border border-border rounded-lg bg-background" /></FormField>
        </div>
      </Modal>

      <ConfirmModal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setSelectedContract(null); }} onConfirm={() => { if (selectedContract?.id) deleteMutation.mutate(selectedContract.id); }} title="Delete Contract" message={`Delete ${selectedContract?.contractNumber}? This removes the contract record from the workspace.`} confirmText="Delete" variant="danger" />
    </PageLayout>
  );
}
