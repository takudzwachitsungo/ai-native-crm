import { useEffect, useState } from "react";
import { Icons } from "../components/icons";
import { cn } from "../lib/utils";
import { PageLayout } from "../components/PageLayout";
import { usersApi } from "../lib/api";
import type { TenantUser, UserRole } from "../lib/types";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../components/Toast";

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Icons;
}

const settingSections: SettingSection[] = [
  { id: "profile", title: "Profile", description: "Manage your personal information", icon: "User" },
  { id: "team", title: "Team", description: "Manage team members and roles", icon: "Users" },
  { id: "notifications", title: "Notifications", description: "Configure email and push notifications", icon: "Bell" },
  { id: "integrations", title: "Integrations", description: "Connect with third-party services", icon: "Zap" },
  { id: "billing", title: "Billing", description: "Manage subscription and payments", icon: "CreditCard" },
  { id: "security", title: "Security", description: "Password and security settings", icon: "Lock" },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState("profile");
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TenantUser[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamSubmitting, setTeamSubmitting] = useState(false);
  const [roleUpdates, setRoleUpdates] = useState<Record<string, UserRole>>({});
  const [newMember, setNewMember] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "USER" as UserRole,
  });

  const isAdmin = user?.role === "ADMIN";

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();

  const roleLabel = (role: UserRole) => {
    switch (role) {
      case "ADMIN":
        return "Admin";
      case "MANAGER":
        return "Manager";
      case "SALES_REP":
        return "Sales Rep";
      default:
        return "User";
    }
  };

  const loadTeamMembers = async () => {
    if (!isAdmin) return;
    setTeamLoading(true);
    try {
      const response = await usersApi.getAll({ page: 0, size: 100, sort: "createdAt,desc" });
      setTeamMembers(response.content ?? []);
      setRoleUpdates(
        (response.content ?? []).reduce<Record<string, UserRole>>((acc, member) => {
          acc[member.id] = member.role;
          return acc;
        }, {})
      );
    } catch (error) {
      console.error("Failed to load users:", error);
      showToast("Failed to load team members", "error");
    } finally {
      setTeamLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === "team") {
      void loadTeamMembers();
    }
  }, [activeSection, isAdmin]);

  const handleCreateMember = async () => {
    if (!newMember.firstName || !newMember.lastName || !newMember.email || !newMember.password) {
      showToast("Please fill all required fields", "warning");
      return;
    }

    setTeamSubmitting(true);
    try {
      await usersApi.create({
        firstName: newMember.firstName,
        lastName: newMember.lastName,
        email: newMember.email,
        password: newMember.password,
        role: newMember.role,
        isActive: true,
      });
      showToast("Team member created", "success");
      setNewMember({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "USER",
      });
      await loadTeamMembers();
    } catch (error) {
      console.error("Failed to create user:", error);
      showToast("Could not create user", "error");
    } finally {
      setTeamSubmitting(false);
    }
  };

  const handleUpdateRole = async (member: TenantUser) => {
    const nextRole = roleUpdates[member.id];
    if (!nextRole || nextRole === member.role) return;

    try {
      const updated = await usersApi.updateRole(member.id, nextRole);
      setTeamMembers((prev) => prev.map((m) => (m.id === member.id ? updated : m)));
      showToast(`Role updated to ${roleLabel(updated.role)}`, "success");
    } catch (error) {
      console.error("Failed to update role:", error);
      showToast("Failed to update role", "error");
      setRoleUpdates((prev) => ({ ...prev, [member.id]: member.role }));
    }
  };

  const handleToggleStatus = async (member: TenantUser) => {
    try {
      const updated = await usersApi.updateStatus(member.id, !member.isActive);
      setTeamMembers((prev) => prev.map((m) => (m.id === member.id ? updated : m)));
      showToast(
        updated.isActive ? "User activated" : "User deactivated",
        "success"
      );
    } catch (error) {
      console.error("Failed to update status:", error);
      showToast("Failed to update status", "error");
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case "profile":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-semibold">
                  JD
                </div>
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">First Name</label>
                      <input
                        type="text"
                        defaultValue="John"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Last Name</label>
                      <input
                        type="text"
                        defaultValue="Doe"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      defaultValue="john.doe@company.com"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Role</label>
                    <input
                      type="text"
                      defaultValue="Sales Manager"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-semibold mb-4">Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Dark Mode</p>
                    <p className="text-sm text-muted-foreground">Use dark theme across the application</p>
                  </div>
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      darkMode ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                      darkMode ? "translate-x-6" : "translate-x-0.5"
                    )} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Timezone</p>
                    <p className="text-sm text-muted-foreground">Set your local timezone</p>
                  </div>
                  <select className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option>Pacific Time (PT)</option>
                    <option>Mountain Time (MT)</option>
                    <option>Central Time (CT)</option>
                    <option>Eastern Time (ET)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        );

      case "team":
        if (!isAdmin) {
          return (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Team Members</h3>
              <div className="p-4 rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground">
                Only tenant admins can manage team members and roles.
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold">Team Members</h3>
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
              <h4 className="font-medium">Create Team Member</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newMember.firstName}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, firstName: e.target.value }))}
                  placeholder="First name"
                  className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  type="text"
                  value={newMember.lastName}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Last name"
                  className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Email"
                  className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <input
                  type="password"
                  value={newMember.password}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Temporary password"
                  className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, role: e.target.value as UserRole }))}
                  className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="USER">User</option>
                  <option value="SALES_REP">Sales Rep</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleCreateMember}
                  disabled={teamSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  <Icons.Plus size={18} />
                  <span>{teamSubmitting ? "Creating..." : "Create Member"}</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {teamLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading team members...</div>
              ) : teamMembers.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No team members found.</div>
              ) : (
                teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium">
                        {getInitials(member.firstName, member.lastName)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{member.firstName} {member.lastName}</p>
                        <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={roleUpdates[member.id] ?? member.role}
                        onChange={(e) => setRoleUpdates((prev) => ({ ...prev, [member.id]: e.target.value as UserRole }))}
                        className="px-2 py-1 border border-border rounded bg-background text-sm"
                      >
                        <option value="USER">User</option>
                        <option value="SALES_REP">Sales Rep</option>
                        <option value="MANAGER">Manager</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      <button
                        onClick={() => handleUpdateRole(member)}
                        className="px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      >
                        Save Role
                      </button>
                      <button
                        onClick={() => handleToggleStatus(member)}
                        disabled={member.id === user?.id && member.isActive}
                        className={cn(
                          "px-2 py-1 text-xs rounded transition-colors",
                          member.isActive
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200",
                          member.id === user?.id && member.isActive && "opacity-60 cursor-not-allowed"
                        )}
                      >
                        {member.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Notification Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
                <button
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    emailNotifications ? "bg-primary" : "bg-muted"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                    emailNotifications ? "translate-x-6" : "translate-x-0.5"
                  )} />
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive push notifications in browser</p>
                </div>
                <button
                  onClick={() => setPushNotifications(!pushNotifications)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    pushNotifications ? "bg-primary" : "bg-muted"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                    pushNotifications ? "translate-x-6" : "translate-x-0.5"
                  )} />
                </button>
              </div>
              <div className="border-t border-border pt-4">
                <h4 className="font-medium mb-3">Notify me about:</h4>
                <div className="space-y-2">
                  {["New leads assigned", "Deal stage changes", "Task reminders", "Team mentions", "Weekly reports"].map((item) => (
                    <label key={item} className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                      <span className="text-sm">{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case "integrations":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Connected Apps</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: "Slack", description: "Team communication", connected: true },
                { name: "Google Calendar", description: "Calendar sync", connected: true },
                { name: "Salesforce", description: "CRM import", connected: false },
                { name: "HubSpot", description: "Marketing automation", connected: false },
                { name: "Zapier", description: "Workflow automation", connected: true },
                { name: "Mailchimp", description: "Email campaigns", connected: false },
              ].map((app) => (
                <div key={app.name} className="p-4 bg-card border border-border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{app.name}</p>
                      <p className="text-sm text-muted-foreground">{app.description}</p>
                    </div>
                    <button className={cn(
                      "px-3 py-1.5 text-sm rounded-lg transition-colors",
                      app.connected
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}>
                      {app.connected ? "Connected" : "Connect"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "billing":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Subscription</h3>
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-primary">Professional Plan</p>
                  <p className="text-sm text-muted-foreground">$49/user/month · 5 users</p>
                </div>
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                  Upgrade
                </button>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Billing History</h4>
              <div className="space-y-2">
                {[
                  { date: "Dec 1, 2024", amount: "$245.00", status: "Paid" },
                  { date: "Nov 1, 2024", amount: "$245.00", status: "Paid" },
                  { date: "Oct 1, 2024", amount: "$245.00", status: "Paid" },
                ].map((invoice, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">{invoice.date}</span>
                    <span className="text-sm font-medium">{invoice.amount}</span>
                    <span className="text-sm text-green-600">{invoice.status}</span>
                    <button className="text-sm text-primary hover:underline">Download</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "security":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Security Settings</h3>
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Change Password</p>
                    <p className="text-sm text-muted-foreground">Last changed 30 days ago</p>
                  </div>
                  <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors">
                    Update
                  </button>
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                    Enable
                  </button>
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Active Sessions</p>
                    <p className="text-sm text-muted-foreground">2 devices currently logged in</p>
                  </div>
                  <button className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    Sign Out All
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <PageLayout>
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-card border border-border rounded-lg p-2">
              <nav className="space-y-1">
                {settingSections.map((section) => {
                  const Icon = Icons[section.icon];
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "w-full flex items-start gap-3 px-4 py-3 rounded text-left transition-colors",
                        activeSection === section.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-foreground"
                      )}
                    >
                      <Icon size={20} className="mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-sm">{section.title}</p>
                        <p className={cn(
                          "text-xs mt-0.5",
                          activeSection === section.id ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}>
                          {section.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-card border border-border rounded-lg p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
