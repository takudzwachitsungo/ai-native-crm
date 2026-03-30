import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '../components/PageLayout';
import { Icons } from '../components/icons';
import { cn } from '../lib/utils';
import { DocumentUploadModal } from '../components/forms';
import { useToast } from '../components/Toast';
import { ConfirmModal } from '../components/Modal';
import { documentsApi } from '../lib/api';
import type { Document } from '../lib/types';

type DocumentCategory = Document['category'];
type DocumentCardType = 'pdf' | 'doc' | 'xls' | 'ppt' | 'image' | 'other';

interface DocumentUploadData {
  name: string;
  category: string;
  relatedEntityId: string;
  relatedType: string;
  description: string;
  file?: File;
}

const categories: Array<{ label: string; value?: DocumentCategory }> = [
  { label: 'All' },
  { label: 'Proposals', value: 'PROPOSALS' },
  { label: 'Contracts', value: 'CONTRACTS' },
  { label: 'Reports', value: 'REPORTS' },
  { label: 'Templates', value: 'TEMPLATES' },
  { label: 'Marketing', value: 'MARKETING' },
  { label: 'Presentations', value: 'PRESENTATIONS' },
  { label: 'Assets', value: 'ASSETS' },
];

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatBytes(bytes?: number) {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatCategory(category?: DocumentCategory) {
  if (!category) return 'Uncategorized';
  return category.charAt(0) + category.slice(1).toLowerCase();
}

function getDocumentType(fileType?: string, name?: string): DocumentCardType {
  const normalized = (fileType || name || '').toLowerCase();
  if (normalized.includes('pdf') || normalized.endsWith('.pdf')) return 'pdf';
  if (
    normalized.includes('word') ||
    normalized.includes('doc') ||
    normalized.endsWith('.doc') ||
    normalized.endsWith('.docx')
  ) {
    return 'doc';
  }
  if (
    normalized.includes('sheet') ||
    normalized.includes('excel') ||
    normalized.endsWith('.xls') ||
    normalized.endsWith('.xlsx')
  ) {
    return 'xls';
  }
  if (
    normalized.includes('presentation') ||
    normalized.includes('powerpoint') ||
    normalized.endsWith('.ppt') ||
    normalized.endsWith('.pptx')
  ) {
    return 'ppt';
  }
  if (
    normalized.includes('image') ||
    normalized.endsWith('.png') ||
    normalized.endsWith('.jpg') ||
    normalized.endsWith('.jpeg') ||
    normalized.endsWith('.gif') ||
    normalized.endsWith('.svg') ||
    normalized.endsWith('.webp')
  ) {
    return 'image';
  }
  return 'other';
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export default function Documents() {
  const [activeCategory, setActiveCategory] = useState<DocumentCategory | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Document | null>(null);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: documentsData, isLoading } = useQuery({
    queryKey: ['documents', activeCategory, searchQuery],
    queryFn: () =>
      documentsApi.getAll({
        page: 0,
        size: 100,
        sort: 'createdAt,desc',
        search: searchQuery.trim() || undefined,
        category: activeCategory,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: {
      file: File;
      name: string;
      category: DocumentCategory;
      description?: string;
      relatedEntityType?: string;
      relatedEntityId?: string;
    }) => documentsApi.upload(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      showToast(`"${created.name}" uploaded successfully`, 'success');
      setIsUploadOpen(false);
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to upload document', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      showToast('Document deleted successfully', 'success');
      setIsDeleteModalOpen(false);
      setSelectedItem(null);
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to delete document', 'error');
    },
  });

  const documents = documentsData?.content || [];

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (activeCategory && doc.category !== activeCategory) return false;
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        doc.name.toLowerCase().includes(query) ||
        doc.description?.toLowerCase().includes(query) ||
        doc.fileType?.toLowerCase().includes(query) ||
        doc.uploadedByName?.toLowerCase().includes(query)
      );
    });
  }, [activeCategory, documents, searchQuery]);

  const getFileIcon = (type: DocumentCardType) => {
    switch (type) {
      case 'pdf':
        return <Icons.FileText className="text-red-500" size={32} />;
      case 'doc':
        return <Icons.FileText className="text-blue-500" size={32} />;
      case 'xls':
        return <Icons.FileText className="text-green-500" size={32} />;
      case 'ppt':
        return <Icons.FileText className="text-orange-500" size={32} />;
      case 'image':
        return <Icons.Image className="text-pink-500" size={32} />;
      default:
        return <Icons.File className="text-muted-foreground" size={32} />;
    }
  };

  const handleDownload = async (doc: Document) => {
    if (!doc.id) {
      showToast('This document cannot be downloaded yet', 'error');
      return;
    }

    try {
      const { blob, fileName } = await documentsApi.download(doc.id);
      triggerBlobDownload(blob, fileName || doc.name);
      showToast(`"${doc.name}" downloaded`, 'success');
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to download document', 'error');
    }
  };

  const handleCreate = (data: DocumentUploadData) => {
    if (!data.file) {
      showToast('Please choose a file to upload', 'error');
      return;
    }

    const normalizedCategory = (data.category || 'ASSETS').toUpperCase() as DocumentCategory;
    const relatedEntityId =
      data.relatedEntityId.trim() && uuidPattern.test(data.relatedEntityId.trim())
        ? data.relatedEntityId.trim()
        : undefined;

    createMutation.mutate({
      file: data.file,
      name: data.name.trim(),
      description: data.description.trim() || undefined,
      category: normalizedCategory,
      relatedEntityType: data.relatedType.trim() || undefined,
      relatedEntityId,
    });
  };

  const renderEmptyState = () => (
    <div className="border border-dashed border-border rounded-lg p-12 text-center">
      <Icons.FolderOpen size={40} className="mx-auto text-muted-foreground/50 mb-4" />
      <p className="font-medium text-foreground mb-1">No documents found</p>
      <p className="text-sm text-muted-foreground">
        {searchQuery || activeCategory
          ? 'Try adjusting your search or category filter.'
          : 'Create your first document record to start building your shared library.'}
      </p>
    </div>
  );

  const renderGridView = () => {
    if (filteredDocuments.length === 0) return renderEmptyState();

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredDocuments.map((doc) => {
          const type = getDocumentType(doc.fileType, doc.name);
          return (
            <div key={doc.id} className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
              <div className="flex flex-col items-center text-center">
                <div className="mb-3">{getFileIcon(type)}</div>
                <p className="font-medium text-sm mb-1 line-clamp-2">{doc.name}</p>
                <p className="text-xs text-muted-foreground mb-2">{formatBytes(doc.fileSize)}</p>
                <span className="text-xs px-2 py-1 bg-muted rounded">{formatCategory(doc.category)}</span>
              </div>
              <div className="mt-4 pt-4 border-t border-border space-y-1">
                <p className="text-xs text-muted-foreground">Uploaded by {doc.uploadedByName || 'Unknown user'}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'Unknown date'}
                </p>
                {doc.relatedEntityType && doc.relatedEntityId && (
                  <p className="text-xs text-primary mt-1">
                    {doc.relatedEntityType}: {doc.relatedEntityId}
                  </p>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleDownload(doc)}
                  className="flex-1 px-3 py-1.5 text-xs border border-border rounded hover:bg-secondary transition-colors"
                >
                  Download
                </button>
                <button
                  onClick={() => {
                    setSelectedItem(doc);
                    setIsDeleteModalOpen(true);
                  }}
                  className="flex-1 px-3 py-1.5 text-xs border border-border rounded hover:bg-secondary transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderListView = () => {
    if (filteredDocuments.length === 0) return renderEmptyState();

    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 text-xs font-semibold">Name</th>
              <th className="text-left p-3 text-xs font-semibold">Type</th>
              <th className="text-left p-3 text-xs font-semibold">Size</th>
              <th className="text-left p-3 text-xs font-semibold">Category</th>
              <th className="text-left p-3 text-xs font-semibold">Uploaded By</th>
              <th className="text-left p-3 text-xs font-semibold">Date</th>
              <th className="text-left p-3 text-xs font-semibold">Related To</th>
              <th className="text-right p-3 text-xs font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocuments.map((doc) => {
              const type = getDocumentType(doc.fileType, doc.name);
              return (
                <tr key={doc.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {getFileIcon(type)}
                      <span className="text-sm font-medium">{doc.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground uppercase">{doc.fileType || type}</td>
                  <td className="p-3 text-sm text-muted-foreground">{formatBytes(doc.fileSize)}</td>
                  <td className="p-3">
                    <span className="text-xs px-2 py-1 bg-muted rounded">{formatCategory(doc.category)}</span>
                  </td>
                  <td className="p-3 text-sm">{doc.uploadedByName || 'Unknown user'}</td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-3 text-sm text-primary">
                    {doc.relatedEntityType && doc.relatedEntityId
                      ? `${doc.relatedEntityType}: ${doc.relatedEntityId}`
                      : '-'}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleDownload(doc)} className="p-1.5 hover:bg-secondary rounded transition-colors">
                        <Icons.Download size={16} className="text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedItem(doc);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-secondary rounded transition-colors"
                      >
                        <Icons.Trash size={16} className="text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <PageLayout
      title="Documents"
      subtitle="Secure tenant document storage with real uploads and downloads"
      icon={<Icons.FolderOpen size={20} />}
      actions={
        <button
          onClick={() => setIsUploadOpen(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Icons.Upload size={16} />
          Add Document
        </button>
      }
    >
      <div className="border-b border-border bg-background">
        <div className="flex overflow-x-auto px-6">
          {categories.map((category) => (
            <button
              key={category.label}
              onClick={() => setActiveCategory(category.value)}
              className={cn(
                'px-4 py-3 border-b-2 transition-colors text-sm font-medium whitespace-nowrap',
                activeCategory === category.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-b border-border flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icons.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="pl-9 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Backend-backed records: {documentsData?.totalElements ?? filteredDocuments.length}
          </div>
        </div>
        <div className="flex gap-1 border border-border rounded-lg">
          <button
            onClick={() => setViewMode('grid')}
            className={cn('p-2 rounded-l transition-colors', viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary')}
          >
            <Icons.Grid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn('p-2 rounded-r transition-colors', viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary')}
          >
            <Icons.List size={16} />
          </button>
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading documents...</div>
        ) : viewMode === 'grid' ? (
          renderGridView()
        ) : (
          renderListView()
        )}
      </div>

      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSubmit={handleCreate}
      />

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
        title="Delete Document"
        message={`Are you sure you want to delete "${selectedItem?.name}"?`}
        variant="danger"
      />
    </PageLayout>
  );
}
