import { useState } from 'react';
import { PageLayout } from '../components/PageLayout';
import { Icons } from '../components/icons';
import { cn } from '../lib/utils';
import { DocumentUploadModal } from '../components/forms';
import { useToast } from '../components/Toast';
import { ConfirmModal } from '../components/Modal';

interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'xls' | 'ppt' | 'image' | 'other';
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  category: string;
  relatedTo?: string;
}

const mockDocuments: Document[] = [
  { id: '1', name: 'Q4_Sales_Proposal.pdf', type: 'pdf', size: '2.4 MB', uploadedBy: 'John Doe', uploadedAt: '2025-12-20', category: 'Proposals', relatedTo: 'Acme Corp - Deal' },
  { id: '2', name: 'Contract_Template_2025.docx', type: 'doc', size: '128 KB', uploadedBy: 'Sarah Johnson', uploadedAt: '2025-12-18', category: 'Templates', relatedTo: undefined },
  { id: '3', name: 'Product_Catalog.pdf', type: 'pdf', size: '5.2 MB', uploadedBy: 'Mike Chen', uploadedAt: '2025-12-15', category: 'Marketing', relatedTo: undefined },
  { id: '4', name: 'Financial_Report_Q4.xlsx', type: 'xls', size: '856 KB', uploadedBy: 'Emily White', uploadedAt: '2025-12-12', category: 'Reports', relatedTo: undefined },
  { id: '5', name: 'Client_Presentation.pptx', type: 'ppt', size: '12.3 MB', uploadedBy: 'David Brown', uploadedAt: '2025-12-10', category: 'Presentations', relatedTo: 'TechStart Inc - Deal' },
  { id: '6', name: 'Brand_Logo.png', type: 'image', size: '245 KB', uploadedBy: 'Lisa Anderson', uploadedAt: '2025-12-08', category: 'Assets', relatedTo: undefined },
];

const categories = ['All', 'Proposals', 'Contracts', 'Reports', 'Templates', 'Marketing', 'Presentations', 'Assets'];

export default function Documents() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Document | null>(null);
  const { showToast } = useToast();

  const filteredDocuments = activeCategory === 'All' 
    ? mockDocuments 
    : mockDocuments.filter(doc => doc.category === activeCategory);

  const getFileIcon = (type: Document['type']) => {
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
        return <Icons.Image className="text-purple-500" size={32} />;
      default:
        return <Icons.File className="text-muted-foreground" size={32} />;
    }
  };

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredDocuments.map((doc) => (
        <div key={doc.id} className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3">
              {getFileIcon(doc.type)}
            </div>
            <p className="font-medium text-sm mb-1 line-clamp-2">{doc.name}</p>
            <p className="text-xs text-muted-foreground mb-2">{doc.size}</p>
            <span className="text-xs px-2 py-1 bg-muted rounded">{doc.category}</span>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">Uploaded by {doc.uploadedBy}</p>
            <p className="text-xs text-muted-foreground">{doc.uploadedAt}</p>
            {doc.relatedTo && (
              <p className="text-xs text-primary mt-1">{doc.relatedTo}</p>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <button className="flex-1 px-3 py-1.5 text-xs border border-border rounded hover:bg-secondary transition-colors">
              Download
            </button>
            <button className="flex-1 px-3 py-1.5 text-xs border border-border rounded hover:bg-secondary transition-colors">
              Share
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderListView = () => (
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
          {filteredDocuments.map((doc) => (
            <tr key={doc.id} className="border-t border-border hover:bg-muted/30">
              <td className="p-3">
                <div className="flex items-center gap-2">
                  {getFileIcon(doc.type)}
                  <span className="text-sm font-medium">{doc.name}</span>
                </div>
              </td>
              <td className="p-3 text-sm text-muted-foreground uppercase">{doc.type}</td>
              <td className="p-3 text-sm text-muted-foreground">{doc.size}</td>
              <td className="p-3">
                <span className="text-xs px-2 py-1 bg-muted rounded">{doc.category}</span>
              </td>
              <td className="p-3 text-sm">{doc.uploadedBy}</td>
              <td className="p-3 text-sm text-muted-foreground">{doc.uploadedAt}</td>
              <td className="p-3 text-sm text-primary">{doc.relatedTo || '-'}</td>
              <td className="p-3">
                <div className="flex justify-end gap-1">
                  <button className="p-1.5 hover:bg-secondary rounded transition-colors">
                    <Icons.Download size={16} className="text-muted-foreground" />
                  </button>
                  <button className="p-1.5 hover:bg-secondary rounded transition-colors">
                    <Icons.Share size={16} className="text-muted-foreground" />
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
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <PageLayout
      title="Documents"
      subtitle="Centralized file management"
      icon={<Icons.FolderOpen size={20} />}
      actions={
        <button
          onClick={() => setIsUploadOpen(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Icons.Upload size={16} />
          Upload Files
        </button>
      }
    >
      {/* Category Tabs */}
      <div className="border-b border-border bg-background">
        <div className="flex overflow-x-auto px-6">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                "px-4 py-3 border-b-2 transition-colors text-sm font-medium whitespace-nowrap",
                activeCategory === category
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icons.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search documents..."
              className="pl-9 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
            />
          </div>
          <button className="px-3 py-2 border border-border rounded-lg hover:bg-secondary transition-colors flex items-center gap-2 text-sm">
            <Icons.Filter size={16} />
            Filter
          </button>
        </div>
        <div className="flex gap-1 border border-border rounded-lg">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              "p-2 rounded-l transition-colors",
              viewMode === 'grid' ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
            )}
          >
            <Icons.Grid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "p-2 rounded-r transition-colors",
              viewMode === 'list' ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
            )}
          >
            <Icons.List size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {viewMode === 'grid' ? renderGridView() : renderListView()}
      </div>

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSubmit={(data) => {
          showToast(`"${data.name}" uploaded successfully`, "success");
          setIsUploadOpen(false);
        }}
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
            showToast(`"${selectedItem.name}" deleted successfully`, "success");
          }
          setIsDeleteModalOpen(false);
          setSelectedItem(null);
        }}
        title="Delete Document"
        message={`Are you sure you want to delete "${selectedItem?.name}"?`}
        variant="danger"
      />
    </PageLayout>
  );
}