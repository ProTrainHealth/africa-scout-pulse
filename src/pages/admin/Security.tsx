import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ExternalLink, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import Seo from '@/components/Seo';

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
type Status = 'open' | 'in_progress' | 'fixed' | 'ignored';
type Source = 'supabase' | 'wiz' | 'npm-audit' | 'sentry' | 'dependabot';

type Finding = {
  id: string;
  source: Source;
  title: string;
  severity: Severity;
  status: Status;
  detectedAt: string;
  prUrl?: string;
  fixNote?: string;
};

// Placeholder until live ingestors (Sentry / Wiz / GitHub PR webhook) are wired.
// Each ingestor will INSERT into a `security_findings` table; this page will
// then read from supabase.from('security_findings').
const SEED: Finding[] = [
  {
    id: 'sb-realtime-messages',
    source: 'supabase',
    title: 'realtime.messages RLS scoped to subscribers',
    severity: 'high',
    status: 'fixed',
    detectedAt: '2026-06-19',
    fixNote: 'Migration 20260619125409 — RLS + topic policy',
  },
  {
    id: 'sb-resources-bucket',
    source: 'supabase',
    title: 'resources storage bucket restricted to paid tiers',
    severity: 'high',
    status: 'fixed',
    detectedAt: '2026-06-19',
    fixNote: 'Migration 20260619125409 — bucket SELECT policy',
  },
  {
    id: 'sb-subscriptions-realtime',
    source: 'supabase',
    title: 'subscriptions dropped from realtime publication',
    severity: 'high',
    status: 'fixed',
    detectedAt: '2026-06-19',
    fixNote: 'Migration 20260619125624',
  },
  {
    id: 'sb-pgcron-public',
    source: 'supabase',
    title: 'pg_cron / pg_net in public schema',
    severity: 'low',
    status: 'ignored',
    detectedAt: '2026-06-19',
    fixNote: 'Accepted per project memory',
  },
];

const sevColor: Record<Severity, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-destructive/80 text-destructive-foreground',
  medium: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
  low: 'bg-muted text-muted-foreground',
  info: 'bg-muted text-muted-foreground',
};

const statusIcon = (s: Status) =>
  s === 'fixed' ? <ShieldCheck className="h-4 w-4 text-emerald-400" />
    : s === 'ignored' ? <ShieldCheck className="h-4 w-4 text-muted-foreground" />
    : s === 'in_progress' ? <AlertTriangle className="h-4 w-4 text-amber-400" />
    : <ShieldAlert className="h-4 w-4 text-destructive" />;

export default function AdminSecurity() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [findings] = useState<Finding[]>(SEED);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
    if (!loading && user && !isAdmin) navigate('/dashboard');
  }, [loading, user, isAdmin, navigate]);

  if (loading || !user || !isAdmin) return null;

  const bySource = findings.reduce<Record<Source, Finding[]>>((acc, f) => {
    (acc[f.source] ??= []).push(f);
    return acc;
  }, {} as Record<Source, Finding[]>);

  const counts = {
    open: findings.filter(f => f.status === 'open' || f.status === 'in_progress').length,
    fixed: findings.filter(f => f.status === 'fixed').length,
    ignored: findings.filter(f => f.status === 'ignored').length,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo title="Security Findings — Admin" description="Aggregated security findings across all scanners." path="/admin/security" />
      <header className="border-b border-border bg-card/40">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Admin
            </Button>
            <h1 className="font-display text-xl font-semibold tracking-tight">Security Findings</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-6 px-4 py-6">
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Open</p>
            <p className="font-display text-3xl text-destructive">{counts.open}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Fixed</p>
            <p className="font-display text-3xl text-emerald-400">{counts.fixed}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Accepted</p>
            <p className="font-display text-3xl text-muted-foreground">{counts.ignored}</p>
          </Card>
        </div>

        {(Object.keys(bySource) as Source[]).map((src) => (
          <Card key={src} className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider">{src}</h2>
              <Badge variant="outline">{bySource[src].length}</Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Finding</TableHead>
                  <TableHead className="w-24">Severity</TableHead>
                  <TableHead className="w-28">Detected</TableHead>
                  <TableHead>Remediation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bySource[src].map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{statusIcon(f.status)}</TableCell>
                    <TableCell className="font-medium">{f.title}</TableCell>
                    <TableCell>
                      <Badge className={sevColor[f.severity]}>{f.severity}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{f.detectedAt}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {f.prUrl ? (
                        <a href={f.prUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                          PR <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : f.fixNote ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ))}

        <Card className="border-dashed p-4 text-xs text-muted-foreground">
          <p className="mb-1 font-semibold text-foreground">Ingestion roadmap</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>Sentry — needs DSN secret; events POST to <code>security-ingest</code> edge fn.</li>
            <li>Wiz — workspace connector must be enabled; webhook → same edge fn.</li>
            <li>Dependabot / npm-audit — GitHub Actions job posts SARIF → edge fn.</li>
            <li>PR linking — GitHub App webhook matches <code>fix/&lt;finding_id&gt;</code> branch to finding row.</li>
          </ul>
        </Card>
      </main>
    </div>
  );
}
