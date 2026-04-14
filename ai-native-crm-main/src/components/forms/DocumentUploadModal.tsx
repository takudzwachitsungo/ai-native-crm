import { useState } from "react";
import { Modal } from "../Modal";
import { Icons } from "../icons";

interface DocumentUploadData {
  name: string;
  category: string;
  relatedEntityId: string;
  relatedType: string;
  description: string;
  file?: File;
}

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DocumentUploadData) => void;
}

export function DocumentUploadModal({ isOpen, onClose, onSubmit }: DocumentUploadModalProps) {
  const [formData, setFormData] = useState<DocumentUploadData>({
    name: "",
    category: "",
    relatedEntityId: "",
    relatedType: "",
    description: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (!formData.name) {
        setFormData({ ...formData, name: file.name });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!formData.name) {
        setFormData({ ...formData, name: file.name });
      }
    }
  };

  const handleSubmit = () => {
    if (selectedFile) {
      onSubmit({ ...formData, file: selectedFile });
      // Reset form
      setFormData({
        name: "",
        category: "",
        relatedEntityId: "",
        relatedType: "",
        description: "",
      });
      setSelectedFile(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Document"
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
            type="button"
            onClick={handleSubmit}
            disabled={!selectedFile}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Upload
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* File Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileChange}
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-3">
              <Icons.Upload className="text-muted-foreground" size={40} />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Drop your file here, or{" "}
                  <span className="text-primary">browse</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, Images
                </p>
              </div>
            </div>
          </label>
        </div>

        {/* Selected File Info */}
        {selectedFile && (
          <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded border border-border">
            <Icons.File className="text-primary" size={24} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
            >
              <Icons.X size={16} />
            </button>
          </div>
        )}

        {/* Document Details */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Document Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select Category</option>
                <option value="CONTRACTS">Contracts</option>
                <option value="PROPOSALS">Proposals</option>
                <option value="REPORTS">Reports</option>
                <option value="TEMPLATES">Templates</option>
                <option value="MARKETING">Marketing</option>
                <option value="PRESENTATIONS">Presentations</option>
                <option value="ASSETS">Assets</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Related To</label>
              <div className="flex gap-2">
                <select
                  value={formData.relatedType}
                  onChange={(e) => setFormData({ ...formData, relatedType: e.target.value })}
                  className="w-28 px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                <option value="">Type</option>
                  <option value="contact">Contact</option>
                  <option value="company">Company</option>
                  <option value="deal">Deal</option>
                  <option value="lead">Lead</option>
                </select>
                <input
                  type="text"
                  value={formData.relatedEntityId}
                  onChange={(e) => setFormData({ ...formData, relatedEntityId: e.target.value })}
                  placeholder="Related entity UUID"
                  className="flex-1 px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
