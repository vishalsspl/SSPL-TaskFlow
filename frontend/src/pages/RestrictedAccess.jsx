import { useNavigate } from 'react-router-dom';
import { ShieldOff, ArrowLeft, Crown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const RestrictedAccess = ({ feature }) => {
  const navigate = useNavigate();

  const featureLabels = {
    projects: 'Project Management',
    kanban: 'Kanban Boards',
    tasks: 'Task Tracking',
    team: 'Team Management',
    timesheets: 'Time Tracking',
    performance: 'Performance Analytics',
    chat: 'Team Chat',
    tickets: 'Support Helpdesk',
    branding: 'Custom Branding',
  };

  const featureLabel = featureLabels[feature?.toLowerCase()] || feature || 'This Feature';

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Icon */}
        <div className="relative mx-auto w-28 h-28">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 via-orange-500/10 to-transparent rounded-[2rem] animate-pulse" />
          <div className="relative w-28 h-28 rounded-[2rem] bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/20 flex items-center justify-center shadow-2xl shadow-red-500/10">
            <ShieldOff className="w-12 h-12 text-red-400" />
          </div>
          <div className="absolute -top-2 -right-2 w-10 h-10 rounded-xl bg-background border border-border/40 flex items-center justify-center shadow-lg">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Feature Restricted
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground font-medium leading-relaxed max-w-md mx-auto">
            <span className="font-bold text-foreground">{featureLabel}</span> is not included in your organization's current plan. Contact your administrator to upgrade and unlock this feature.
          </p>
        </div>

        {/* Upgrade hint card */}
        <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-5 mx-auto max-w-sm">
          <div className="flex items-center gap-3 justify-center">
            <Crown className="w-5 h-5 text-primary" />
            <p className="text-xs font-bold text-primary uppercase tracking-widest">
              Upgrade to Unlock
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 font-medium">
            Upgrading your plan gives access to premium features, higher limits, and priority support.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            onClick={() => navigate('/dashboard')}
            className="h-12 px-8 rounded-2xl bg-primary text-white font-bold text-sm shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/settings')}
            className="h-12 px-8 rounded-2xl font-bold text-sm border-border/40 hover:bg-muted transition-all"
          >
            View Plan Details
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RestrictedAccess;
