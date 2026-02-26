# CRM System - UI Components Guide

A complete, modern CRM system built with React, TypeScript, and Tailwind CSS featuring all essential forms, modals, and UI components.

## 🎨 Features Overview

### Core Pages (16 Total)
- **Dashboard** - Analytics overview with widgets
- **Leads** - Lead management with scoring
- **Contacts** - Contact directory with relationship tracking
- **Companies** - Organization management
- **Deals** - Sales pipeline and opportunity tracking
- **Pipeline** - Visual deal stages with drag-and-drop
- **Products** - Product catalog with inventory
- **Quotes** - Quote generation and tracking
- **Invoices** - Billing and payment management
- **Tasks** - Task and activity tracking
- **Calendar** - Event scheduling
- **Email** - Email integration with templates
- **Documents** - File management system
- **Reports** - Report generation and analytics
- **Forecasting** - Sales forecasting and projections
- **Settings** - System configuration

### UI Components

#### 1. Modal System (`/src/components/Modal.tsx`)
Reusable modal dialog with multiple features:
- **Sizes**: `sm`, `md`, `lg`, `xl`
- **Keyboard Support**: ESC key to close
- **Overlay Click**: Click outside to dismiss
- **Customizable Footer**: Custom buttons and actions
- **ConfirmModal Variant**: Pre-built confirmation dialog with variants (`danger`, `warning`, `info`)

**Usage Example:**
```tsx
import { Modal, ConfirmModal } from './components/Modal';

// Basic Modal
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="My Modal"
  size="lg"
  footer={<CustomFooter />}
>
  <p>Modal content</p>
</Modal>

// Confirmation Modal
<ConfirmModal
  isOpen={isOpen}
  onClose={handleClose}
  onConfirm={handleConfirm}
  title="Delete Item"
  message="Are you sure? This action cannot be undone."
  variant="danger"
/>
```

#### 2. Toast Notifications (`/src/components/Toast.tsx`)
Global notification system with context provider:
- **Types**: `success`, `error`, `warning`, `info`
- **Auto-Dismiss**: Automatically disappears after 4 seconds
- **Positioning**: Bottom-right corner
- **Manual Dismiss**: Click X button to close

**Setup:**
```tsx
// In App.tsx (already configured)
import { ToastProvider } from './components/Toast';

<ToastProvider>
  <YourApp />
</ToastProvider>
```

**Usage in Components:**
```tsx
import { useToast } from './components/Toast';

function MyComponent() {
  const { showToast } = useToast();
  
  const handleSuccess = () => {
    showToast('Operation completed successfully!', 'success');
  };
  
  const handleError = () => {
    showToast('Something went wrong', 'error');
  };
}
```

#### 3. Command Palette (`/src/components/CommandPalette.tsx`)
Quick navigation and action execution:
- **Keyboard Shortcut**: `Cmd/Ctrl + K` to open
- **Search**: Filter commands by typing
- **Keyboard Navigation**: Arrow keys to navigate, Enter to execute, ESC to close
- **Grouped Commands**: Navigation and Actions categories
- **16 Navigation Commands**: Quick access to all pages
- **5 Action Commands**: Create new records

**Already Integrated in App.tsx** - Just press `Cmd/Ctrl + K` to use!

#### 4. Form Components (`/src/components/forms/`)

All forms include validation, controlled inputs, and are pre-integrated with the modal system.

##### LeadForm
- Fields: Name*, Email*, Phone, Company, Title, Source, Status, Value, Notes
- Dropdowns: Source options, Status options
- Layout: 2-column grid

##### ContactForm (Most Comprehensive)
- **Sections**: Basic Information, Address, Additional Info
- Fields: 14 total including full address
- Special Fields: Website, LinkedIn profile
- Modal Size: XL (extra large)

##### DealForm
- Fields: Name*, Value*, Company, Contact, Stage*, Probability, Expected Close Date, Type, Source, Description
- Special: Probability slider (0-100%)
- Stage Dropdown: Prospecting → Closed-Won/Lost
- Type Options: New Business, Existing Business, Renewal, Upsell

##### TaskForm
- Fields: Title*, Description, Due Date, Priority, Status, Assignee, Related To, Reminder
- Related Records: Link to Contact, Company, Deal, or Lead
- Priority: Low, Medium, High
- Reminder Options: 5min, 15min, 30min, 1hour, 1day before

##### CompanyForm
- **Sections**: Basic Information, Address
- Fields: 13 total including full address
- Special: Industry selector, Employee range, Annual revenue
- Industries: Technology, Healthcare, Finance, Manufacturing, etc.

##### ProductForm
- Fields: Name*, SKU*, Category, Price*, Cost, Stock, Unit, Description, Status
- **Auto-Calculate**: Profit margin calculation
- Units: Pieces, Box, Kilogram, License, User, Hour, Month
- Categories: Software, Hardware, Services, Subscriptions, Training

##### EventForm (Calendar)
- Fields: Title*, Start Date/Time*, End Date/Time*, Location, Attendees, Type, Reminder, Description
- Event Types: Meeting, Call, Demo, Presentation, Training, Conference
- Time Pickers: Separate date and time inputs
- Reminders: None to 1 day before

##### EmailComposeModal
- Fields: To*, CC, BCC, Subject*, Message*
- **Template System**: 3 pre-built templates (Introduction, Follow-up, Proposal)
- CC/BCC: Show/hide toggle buttons
- Large Text Area: 12-row message body

##### DocumentUploadModal
- **Drag & Drop**: Drop files or click to browse
- File Info Display: Name, size, type
- Fields: Document Name*, Category, Related To, Tags, Description
- Categories: Contracts, Proposals, Invoices, Presentations, Reports
- Related Records: Link to Contact, Company, Deal, or Lead

### 🔧 Integration Pattern

All forms follow a consistent pattern. Here's how to integrate them into any page:

```tsx
import { useState } from "react";
import { LeadForm } from "../components/forms";
import { useToast } from "../components/Toast";
import { ConfirmModal } from "../components/Modal";

function MyPage() {
  // State management
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const { showToast } = useToast();

  return (
    <div>
      {/* Create Button */}
      <button onClick={() => {
        setSelectedItem(null);
        setIsFormOpen(true);
      }}>
        Create New
      </button>

      {/* Edit Button (in table row) */}
      <button onClick={() => {
        setSelectedItem(item);
        setIsFormOpen(true);
      }}>
        Edit
      </button>

      {/* Delete Button */}
      <button onClick={() => {
        setSelectedItem(item);
        setIsDeleteModalOpen(true);
      }}>
        Delete
      </button>

      {/* Form Modal */}
      <LeadForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedItem(null);
        }}
        onSubmit={(data) => {
          if (selectedItem) {
            showToast(`"${data.name}" updated successfully`, "success");
          } else {
            showToast(`"${data.name}" created successfully`, "success");
          }
          setIsFormOpen(false);
          setSelectedItem(null);
        }}
        initialData={selectedItem || undefined}
      />

      {/* Delete Confirmation */}
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
        title="Delete Item"
        message={`Are you sure you want to delete "${selectedItem?.name}"?`}
        variant="danger"
      />
    </div>
  );
}
```

### 🎯 Example Implementations

The following pages already have full form integration:

1. **Leads Page** (`/src/pages/Leads.tsx`)
   - ✅ Create/Edit with LeadForm
   - ✅ Delete confirmation
   - ✅ Toast notifications
   - ✅ Edit and Delete buttons in table

2. **Contacts Page** (`/src/pages/Contacts.tsx`)
   - ✅ Create/Edit with ContactForm
   - ✅ Delete confirmation
   - ✅ Toast notifications
   - ✅ Edit and Delete buttons in table

### 📋 Next Steps

To complete the UI for remaining pages, apply the same integration pattern:

#### High Priority
1. **Companies** - Add CompanyForm integration
2. **Products** - Add ProductForm integration
3. **Deals** - Add DealForm integration (already created)
4. **Tasks** - Add TaskForm integration (already created)
5. **Calendar** - Add EventForm integration
6. **Email** - Add EmailComposeModal integration
7. **Documents** - Add DocumentUploadModal integration

#### Additional Components Needed
- **Filter Modals** - For date ranges, status, custom fields
- **Bulk Action Modals** - Delete selected, update status
- **Detail Views** - Sidebar or modal for viewing full record details
- **Empty States** - For empty lists/tables
- **Loading Skeletons** - For data fetching states

### 🎨 Design System

The UI follows Zoho CRM design patterns:
- **Border-Separated Headers** - Clear section divisions
- **Tab Navigation** - Status filters with active underline
- **Table/Grid Toggle** - Switch between list and card views
- **Status Filters** - Quick filtering with counts
- **Search Bars** - Instant search across records
- **Action Buttons** - Consistent primary/secondary button styling

### 🚀 Running the Project

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### 📦 Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

### 🎹 Keyboard Shortcuts

- `Cmd/Ctrl + K` - Open Command Palette
- `ESC` - Close modals/dialogs
- `Arrow Keys` - Navigate Command Palette
- `Enter` - Execute selected command

---

**Status**: All core UI components are complete and ready for integration. Forms are fully functional with validation, modals work with keyboard support, toasts provide user feedback, and command palette enables quick navigation.
