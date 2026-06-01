import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Save, 
  RotateCcw,
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Kanban,
  Users,
  Clock,
  MessageSquare,
  BarChart2,
  LifeBuoy,
  Zap,
  BarChart3,
  AlertTriangle,
  Info
} from 'lucide-react';
import { PERMISSION_MODULES, getDefaultPermissions } from '../../lib/permissionDefaults';
import api from '../../lib/api';
import { useToast } from '@/hooks/use-toast';

const iconMap = {
  LayoutDashboard, FolderKanban, CheckSquare, Kanban,
  Users, Clock, MessageSquare, BarChart2, LifeBuoy, Zap, BarChart3
};

const ManageAccess = () => {
  const [activeTab, setActiveTab] = useState('MANAGER');
  const [permissions, setPermissions] = useState(null);
  const [originalPermissions, setOriginalPermissions] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/organizations/permissions');
      setPermissions(res.data);
      setOriginalPermissions(JSON.parse(JSON.stringify(res.data)));
    } catch (error) {
      console.error('Failed to load permissions:', error);
      toast({
        title: "Error",
        description: "Failed to load permissions",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (moduleKey, permKey) => {
    setPermissions(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [permKey]: !prev[activeTab][permKey]
      }
    }));
  };

  const handleModuleToggle = (moduleKey, forceState) => {
    const mod = PERMISSION_MODULES.find(m => m.key === moduleKey);
    if (!mod) return;
    
    setPermissions(prev => {
      const nextTabPerms = { ...prev[activeTab] };
      mod.permissions.forEach(p => {
        nextTabPerms[p.key] = forceState;
      });
      return {
        ...prev,
        [activeTab]: nextTabPerms
      };
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await api.put('/organizations/permissions', permissions);
      setOriginalPermissions(JSON.parse(JSON.stringify(permissions)));
      toast({
        title: "Success",
        description: "Permissions updated successfully",
      });
    } catch (error) {
      console.error('Failed to save permissions:', error);
      toast({
        title: "Error",
        description: "Failed to save permissions",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all roles to their default permissions? This cannot be undone unless you click save.')) {
      const defaults = getDefaultPermissions();
      setPermissions(defaults);
      toast({
        title: "Reset",
        description: "Reset to defaults. Don't forget to save.",
      });
    }
  };

  const handleDiscard = () => {
    setPermissions(JSON.parse(JSON.stringify(originalPermissions)));
  };

  const hasUnsavedChanges = JSON.stringify(permissions) !== JSON.stringify(originalPermissions);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading permissions...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-xl border border-border">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-primary" />
            Manage Access
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure granular permissions for roles within your organisation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <button
              onClick={handleDiscard}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              Discard
            </button>
          )}
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {hasUnsavedChanges && (
        <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-destructive">Unsaved Changes</h3>
            <p className="text-sm text-destructive/80 mt-1">You have unsaved permission changes. Click Save Changes to apply them.</p>
          </div>
        </div>
      )}

      {/* Role Tabs */}
      <div className="flex space-x-1 p-1 bg-muted rounded-xl">
        {['MANAGER', 'MEMBER', 'CLIENT'].map((role) => (
          <button
            key={role}
            onClick={() => setActiveTab(role)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === role
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }`}
          >
            {role.charAt(0) + role.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg flex gap-3 text-sm text-primary">
        <Info className="w-5 h-5 shrink-0" />
        <p>
          {activeTab === 'MANAGER' && "Managers typically have broad access to manage projects, tasks, and teams, but may be restricted from destructive actions like deleting projects or changing user roles."}
          {activeTab === 'MEMBER' && "Members typically have access to view and work on their assigned tasks and projects, but cannot manage the team or create top-level projects."}
          {activeTab === 'CLIENT' && "Clients usually have restricted, read-only access to view progress, communicate via comments or tickets, and see reports. They should not be able to modify internal data."}
        </p>
      </div>

      {/* Permissions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {PERMISSION_MODULES.map((module) => {
          const Icon = iconMap[module.icon] || LayoutDashboard;
          
          // Calculate module summary
          const modulePerms = module.permissions;
          const enabledCount = modulePerms.filter(p => permissions?.[activeTab]?.[p.key]).length;
          const isAllEnabled = enabledCount === modulePerms.length;
          const isSomeEnabled = enabledCount > 0 && !isAllEnabled;
          
          const moduleHasChanges = module.permissions.some(p => 
            permissions?.[activeTab]?.[p.key] !== originalPermissions?.[activeTab]?.[p.key]
          );

          return (
            <div key={module.key} className="bg-card rounded-xl border border-border overflow-hidden flex flex-col">
              
              {/* Module Header */}
              <div className="p-5 border-b border-border flex justify-between items-center bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${enabledCount > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{module.label}</h3>
                    <p className="text-xs text-muted-foreground">{module.description}</p>
                  </div>
                </div>
                
                {/* Module Master Toggle */}
                <button
                  type="button"
                  onClick={() => handleModuleToggle(module.key, !isAllEnabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                    isAllEnabled ? 'bg-primary' : isSomeEnabled ? 'bg-primary/70' : 'bg-border'
                  }`}
                  role="switch"
                  aria-checked={isAllEnabled}
                >
                  <span className="sr-only">Toggle {module.label}</span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isAllEnabled || isSomeEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Permission List */}
              <div className="p-2 flex-grow">
                {module.permissions.map((perm) => {
                  const isEnabled = permissions?.[activeTab]?.[perm.key] || false;
                  
                  return (
                    <div 
                      key={perm.key}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="pr-4">
                        <p className="text-sm font-medium text-foreground">
                          {perm.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {perm.description}
                        </p>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => handleToggle(module.key, perm.key)}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                          isEnabled ? 'bg-primary' : 'bg-border'
                        }`}
                        role="switch"
                        aria-checked={isEnabled}
                      >
                        <span className="sr-only">Toggle {perm.label}</span>
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            isEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Module Footer (Save/Discard) */}
              {moduleHasChanges && (
                <div className="p-3 border-t border-border bg-primary/5 flex justify-end gap-2 items-center mt-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <span className="text-xs font-medium text-primary/80 mr-auto ml-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Unsaved changes
                  </span>
                  <button
                    onClick={handleDiscard}
                    className="px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors bg-background border border-border rounded-lg"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ManageAccess;
