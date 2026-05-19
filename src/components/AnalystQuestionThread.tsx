import { useEffect, useState } from 'react';
import { Send, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Question {
  id: string;
  subject: string;
  body: string;
  status: string;
  analyst_response: string;
  responded_at: string | null;
  created_at: string;
}

const AnalystQuestionThread = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Question[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from('analyst_questions')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setItems(data as Question[]);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subject.trim() || !body.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('analyst_questions').insert({
      user_id: user.id,
      subject: subject.trim().slice(0, 200),
      body: body.trim().slice(0, 4000),
    });
    setSubmitting(false);
    if (error) {
      toast.error('Could not submit question');
      return;
    }
    setSubject(''); setBody('');
    toast.success('Question submitted');
    load();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-2">
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          maxLength={200}
          required
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Your question to the analyst desk…"
          rows={3}
          maxLength={4000}
          required
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={submitting || !subject.trim() || !body.trim()}>
            <Send className="h-3.5 w-3.5 mr-1.5" /> Send to analyst
          </Button>
        </div>
      </form>

      {items.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/30">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Your thread</p>
          {items.map((q) => (
            <div key={q.id} className="rounded-lg border border-border/40 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{q.subject}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider flex items-center gap-1">
                  {q.status === 'answered' ? (
                    <><CheckCircle2 className="h-3 w-3 text-primary" /> Answered</>
                  ) : (
                    <><Clock className="h-3 w-3 text-muted-foreground" /> {q.status}</>
                  )}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{q.body}</p>
              {q.analyst_response && (
                <div className="mt-2 rounded-md bg-primary/5 border border-primary/20 p-2">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-primary mb-1">Analyst reply</p>
                  <p className="text-xs whitespace-pre-wrap">{q.analyst_response}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnalystQuestionThread;
