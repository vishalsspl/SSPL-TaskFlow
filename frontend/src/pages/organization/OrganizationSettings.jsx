import { useEffect, useState, useRef } from 'react';
import { useHeaderStore } from '@/store/headerStore';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  MapPin, 
  Globe, 
  Mail, 
  Phone, 
  Save, 
  Upload,
  ShieldCheck,
  CreditCard,
  Loader2
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { PLAN_LIMITS } from '@/lib/plans';

const OrganizationSettings = () => {
  const { setHeader } = useHeaderStore();
  const { user, updateUser } = useAuthStore();
  const { toast } = useToast();
  const logoInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.organization?.name || '',
    industry: user?.organization?.industry || '',
    website: user?.organization?.website || '',
    billingEmail: user?.organization?.billingEmail || '',
    primaryContactName: user?.organization?.primaryContactName || '',
    primaryContactPhone: user?.organization?.primaryContactPhone || '',
    address: user?.organization?.address || '',
  });

  useEffect(() => {
    setHeader("Organisation Profile", "Manage your company details and platform appearance");
    fetchLatestOrg();
  }, [setHeader]);

  const fetchLatestOrg = async () => {
    try {
      setLoading(true);
      const res = await api.get('/organizations/me');
      const org = res.data;
      setFormData({
        name: org.name || '',
        industry: org.industry || '',
        website: org.website || '',
        billingEmail: org.billingEmail || '',
        primaryContactName: org.primaryContactName || '',
        primaryContactPhone: org.primaryContactPhone || '',
        address: org.address || '',
      });
      // Sync authStore if needed
      updateUser({ ...user, organization: org });
    } catch (error) {
      console.error('Failed to fetch org:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          setUpdating(true);
          const response = await api.put('/organizations/me', { logoUrl: reader.result });
          updateUser({
            ...user,
            organization: response.data
          });
          toast({
            title: "Logo Updated",
            description: "Your organization logo has been updated successfully.",
          });
        } catch (error) {
          toast({
            title: "Update Failed",
            description: error.response?.data?.error || "Failed to update organization logo.",
            variant: "destructive",
          });
        } finally {
          setUpdating(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      setUpdating(true);
      const res = await api.put('/organizations/me', formData);
      updateUser({ ...user, organization: res.data });
      toast({
        title: "Settings Saved",
        description: "Organization details have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error.response?.data?.error || "Failed to save organization settings.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Branding & Essentials */}
      <Card className="border-border/40 shadow-sm overflow-hidden bg-white/50 dark:bg-black/20 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Company Identity</CardTitle>
          <CardDescription className="text-xs">Your public profile info as seen by team members and clients</CardDescription>
        </CardHeader>
        <Separator className="bg-border/40" />
        <CardContent className="pt-6 space-y-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex flex-col items-center gap-4">
              <input
                type="file"
                ref={logoInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleLogoUpload}
              />
              <div 
                className="w-32 h-32 rounded-2xl bg-accent flex items-center justify-center border-2 border-dashed border-border/60 hover:border-primary/40 transition-colors cursor-pointer group relative overflow-hidden"
                onClick={() => logoInputRef.current?.click()}
              >
                {user?.organization?.logoUrl ? (
                  <img src={user.organization.logoUrl} alt="Logo" className="w-full h-full object-contain p-4" />
                ) : (
                  <Building2 className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                {updating && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  </div>
                )}
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Company Logo</p>
            </div>

            <div className="flex-1 grid gap-6 w-full">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Company Name</Label>
                  <Input 
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="rounded-xl border-border/40 h-11" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Industry</Label>
                  <Input 
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    className="rounded-xl border-border/40 h-11" 
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      className="!pl-10 rounded-xl border-border/40 h-11" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Billing Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      name="billingEmail"
                      value={formData.billingEmail}
                      onChange={handleChange}
                      className="!pl-10 rounded-xl border-border/40 h-11" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Location & Preferences */}
      <Card className="border-border/40 shadow-sm overflow-hidden bg-white/50 dark:bg-black/20 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Location & Contact</CardTitle>
          <CardDescription className="text-xs">Physical address and primary contact details</CardDescription>
        </CardHeader>
        <Separator className="bg-border/40" />
        <CardContent className="pt-6 space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Primary Contact Name</Label>
              <Input 
                name="primaryContactName"
                value={formData.primaryContactName}
                onChange={handleChange}
                className="rounded-xl border-border/40 h-11" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Contact Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  name="primaryContactPhone"
                  value={formData.primaryContactPhone}
                  onChange={handleChange}
                  className="!pl-10 rounded-xl border-border/40 h-11" 
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Office Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <textarea 
                name="address"
                className="w-full min-h-[100px] pl-10 pt-3 rounded-xl border border-border/40 bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all p-4 text-sm font-medium"
                placeholder="Full office or billing address..."
                value={formData.address}
                onChange={handleChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Status Card */}
      <Card className="border-primary/20 shadow-lg bg-primary/5 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <CreditCard className="w-32 h-32" />
        </div>
        <CardContent className="p-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-bold tracking-tight">Active Plan: {user?.organization?.plan || 'PRO'}</h3>
              </div>
              <p className="text-sm font-medium text-muted-foreground">Your subscription is active and in good standing. Managed by platform administrators.</p>
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="px-3 py-1.5 bg-white/80 dark:bg-black/40 rounded-lg border border-border/40 text-[10px] font-bold uppercase tracking-widest">
                  Users: <span className="text-primary">{user?.organization?.maxUsers || PLAN_LIMITS[user?.organization?.plan]?.users || 10} Limit</span>
                </div>
                <div className="px-3 py-1.5 bg-white/80 dark:bg-black/40 rounded-lg border border-border/40 text-[10px] font-bold uppercase tracking-widest">
                  Projects: <span className="text-primary">{user?.organization?.maxProjects || PLAN_LIMITS[user?.organization?.plan]?.projects || 3} Limit</span>
                </div>
              </div>
            </div>
            <Button className="rounded-xl px-8 h-12 shadow-xl shadow-primary/20 font-bold uppercase text-[11px] tracking-widest shrink-0">
              Manage Billing
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
        <Button 
          variant="outline" 
          className="rounded-xl px-6 h-11 border-border/40 font-bold uppercase text-[10px] tracking-widest"
          onClick={() => fetchLatestOrg()}
          disabled={updating}
        >
          Reset Changes
        </Button>
        <Button 
          className="rounded-xl px-10 h-11 shadow-lg shadow-primary/20 font-bold uppercase text-[10px] tracking-widest gap-2"
          onClick={handleSave}
          disabled={updating}
        >
          {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {updating ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};

export default OrganizationSettings;
