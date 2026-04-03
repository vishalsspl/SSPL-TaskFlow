import { useEffect } from 'react';
import { useHeaderStore } from '@/store/headerStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wrench, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PlansAndLimits = () => {
  const { setHeader } = useHeaderStore();
  const navigate = useNavigate();

  useEffect(() => {
    setHeader('Plans & Limits', 'This section is being rebuilt');
  }, [setHeader]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 px-4 sm:px-0">
      <Card className="rounded-[2.5rem] border-border/40 shadow-2xl bg-white/40 dark:bg-black/40 backdrop-blur-3xl overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shadow-inner">
              <Wrench className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold tracking-widest">Plans & Limits</CardTitle>
              <CardDescription className="text-[10px] font-bold tracking-widest opacity-60 uppercase">
                Removed for now — will be implemented step-by-step
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 pt-4 space-y-4">
          <p className="text-sm text-muted-foreground font-medium">
            We have temporarily removed the old plan/feature access logic from this screen to rebuild it cleanly.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="rounded-2xl h-11 px-6 font-bold text-[11px] tracking-widest uppercase"
              onClick={() => navigate('/superadmin/orgs')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Organizations
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlansAndLimits;

