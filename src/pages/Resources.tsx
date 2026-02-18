import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FileText, TrendingUp, Users, Search } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';

const sections = [
  {
    title: 'Weekly Deep-Dive Reports',
    icon: FileText,
    description: 'In-depth analysis of key companies and market movements across Africa.',
    items: [
      { title: 'Nigeria LNG: Catalyst Watch Q1 2026', date: 'Feb 14, 2026', tag: 'Energy Transition' },
      { title: 'MTN Group: Scout Score Deep Dive', date: 'Feb 10, 2026', tag: 'Digital Infrastructure' },
      { title: 'Dangote Refinery: Margin Analysis', date: 'Feb 7, 2026', tag: 'Energy Transition' },
      { title: 'Safaricom: M-Pesa Expansion Thesis', date: 'Feb 3, 2026', tag: 'Financial Systems' },
    ],
  },
  {
    title: 'Sector Thesis Publications',
    icon: BookOpen,
    description: 'Macro-level narratives on sectors shaping Africa\'s infrastructure future.',
    items: [
      { title: 'Energy Transition: The 2026 Inflection Point', date: 'Jan 28, 2026', tag: 'Energy Transition' },
      { title: 'Strategic Resources: Critical Minerals Race', date: 'Jan 15, 2026', tag: 'Strategic Resources' },
      { title: 'Digital Infrastructure: Fiber & Data Centers', date: 'Jan 5, 2026', tag: 'Digital Infrastructure' },
    ],
  },
  {
    title: 'Public Phantom Portfolio',
    icon: TrendingUp,
    description: 'Hypothetical portfolio tracking — zero real positions. Pure signal.',
    items: [
      { title: 'Phantom Portfolio: February 2026 Update', date: 'Feb 1, 2026', tag: 'Portfolio' },
      { title: 'Phantom Portfolio: January 2026 Recap', date: 'Jan 31, 2026', tag: 'Portfolio' },
      { title: 'Phantom Portfolio: 2025 Annual Review', date: 'Dec 31, 2025', tag: 'Portfolio' },
    ],
  },
  {
    title: 'Community',
    icon: Users,
    description: 'Connect with fellow observers tracking Africa\'s next 50.',
    items: [
      { title: 'Community Discussion: Q1 2026 Outlook', date: 'Feb 12, 2026', tag: 'Discussion' },
      { title: 'AMA: Scout Score Methodology Explained', date: 'Feb 5, 2026', tag: 'AMA' },
    ],
  },
];

const Resources = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-48 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pb-12 pt-24">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Resources</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Deep dives, sector theses, and narrative intelligence — free for all members.
          </p>
        </div>

        <div className="space-y-10">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <section.icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold">{section.title}</h2>
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {section.items.map((item) => (
                  <div
                    key={item.title}
                    className="glass-card cursor-pointer rounded-xl p-4 transition-colors hover:bg-secondary/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-sm font-semibold leading-tight">{item.title}</h3>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {item.tag}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{item.date}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Resources;
