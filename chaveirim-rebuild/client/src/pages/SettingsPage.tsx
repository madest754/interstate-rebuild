import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Bell, Lock, LogOut, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toaster';
import { useAuth } from '@/App';

export default function SettingsPage() {
  const { user, refetch: refetchUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { data: profile } = useQuery({
    queryKey: ['member-profile'],
    queryFn: async () => {
      const res = await fetch('/api/members/me', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to change password');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Password changed successfully', variant: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'error' });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Logout failed');
    },
    onSuccess: () => {
      queryClient.setQueryData(['user'], null);
      queryClient.invalidateQueries();
    },
  });

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Profile Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-500">Name</label>
              <p className="font-medium">
                {profile?.firstName || user?.firstName || ''} {profile?.lastName || user?.lastName || ''}
              </p>
            </div>
            <div>
              <label className="text-sm text-slate-500">Unit Number</label>
              <p className="font-medium">{profile?.unitNumber || user?.unitNumber || 'N/A'}</p>
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-500">Email</label>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm text-slate-500">Role</label>
            <p className="font-medium capitalize">{user?.role}</p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm">SMS Notifications</span>
              <input 
                type="checkbox" 
                defaultChecked={profile?.smsOptIn ?? true}
                className="rounded"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Email Notifications</span>
              <input 
                type="checkbox" 
                defaultChecked={profile?.emailOptIn ?? true}
                className="rounded"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">WhatsApp Notifications</span>
              <input 
                type="checkbox" 
                defaultChecked={profile?.whatsappOptIn ?? false}
                className="rounded"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">App Push Notifications</span>
              <input 
                type="checkbox" 
                defaultChecked={profile?.appOptIn ?? true}
                className="rounded"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              changePasswordMutation.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium">Current Password</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">New Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Confirm New Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button 
              type="submit" 
              disabled={changePasswordMutation.isPending || !currentPassword || !newPassword}
            >
              {changePasswordMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        variant="destructive"
        className="w-full"
        onClick={() => logoutMutation.mutate()}
        disabled={logoutMutation.isPending}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Logout
      </Button>
    </div>
  );
}
