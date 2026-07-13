import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Lightbulb } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Priority = Database['public']['Enums']['feature_request_priority'];

const FeatureRequestForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to submit a feature request.', variant: 'destructive' });
      return;
    }
    if (!title.trim()) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('feature_requests').insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim(),
      priority,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Request submitted', description: 'Thank you! Our team will review your request.' });
      setTitle('');
      setDescription('');
      setPriority('medium');
      setOpen(false);
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Lightbulb className="h-4 w-4" />
          Request a Feature
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Request a Feature</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Add Google Calendar integration"
              maxLength={200}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the feature you'd like..."
              maxLength={2000}
              rows={4}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Priority</label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FeatureRequestForm;
