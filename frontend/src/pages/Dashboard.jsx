import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { FileText, Folder, Target, Briefcase, TrendingUp, Map, BarChart3, Trophy, Award } from "lucide-react";

const USER_CARDS = [
  {
    title: "Resume Analyze",
    description: "Upload and analyze your resume with AI",
    link: "/resume-analyze",
    cta: "Get Started ",
    Icon: FileText,
    color: "blue",
  },
  {
    title: "My Resumes",
    description: "View and manage all your uploaded resumes",
    link: "/my-resumes",
    cta: "View Resumes ",
    Icon: Folder,
    color: "violet",
  },
  {
    title: "Compare Job",
    description: "Paste a job description and match it to your skills",
    link: "/compare-job",
    cta: "Compare Now ",
    Icon: Target,
    color: "orange",
  },
  {
    title: "Job Postings",
    description: "Browse live jobs matched to your resume and explore skills in demand",
    link: "/job-postings",
    cta: "View Jobs ",
    Icon: Briefcase,
    color: "indigo",
  },
  {
    title: "Career Analytics",
    description: "CV completeness score and personalised career insights",
    link: "/analytics",
    cta: "View Analytics ",
    Icon: TrendingUp,
    color: "green",
  },
  {
    title: "My Roadmaps",
    description: "Follow your personalised learning path to your dream role",
    link: "/my-roadmap",
    cta: "View Roadmaps ",
    Icon: Map,
    color: "purple",
  },
];

const COLOR_MAP = {
  blue:   { heading: "text-blue-400",   icon: "bg-blue-500/10 text-blue-400 border border-blue-500/20",   cta: "text-blue-400" },
  violet: { heading: "text-violet-400", icon: "bg-violet-500/10 text-violet-400 border border-violet-500/20", cta: "text-violet-400" },
  orange: { heading: "text-orange-400", icon: "bg-orange-500/10 text-orange-400 border border-orange-500/20", cta: "text-orange-400" },
  indigo: { heading: "text-indigo-400", icon: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20", cta: "text-indigo-400" },
  green:  { heading: "text-green-400",  icon: "bg-green-500/10 text-green-400 border border-green-500/20",  cta: "text-green-400" },
  purple: { heading: "text-purple-400", icon: "bg-purple-500/10 text-purple-400 border border-purple-500/20", cta: "text-purple-400" },
  rose:   { heading: "text-rose-400",   icon: "bg-rose-500/10 text-rose-400 border border-rose-500/20",   cta: "text-rose-400" },
};

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  if (!user) {
    return <Layout><div className="text-gray-400 p-8">Loading…</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-8">

        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-white">Welcome back, {user.name}!</h2>
          <p className="text-slate-400 mt-1 text-sm">
            Here’s everything you need to advance your career.
          </p>
        </div>

        {/* User feature cards */}
        {user.role === 'USER' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {USER_CARDS.map(({ title, description, link, cta, Icon, color }) => {
                const c = COLOR_MAP[color];
                return (
                  <Link
                    key={link}
                    to={link}
                    className="group relative rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-white/20 hover:bg-white/8 transition-all duration-200 flex flex-col gap-4 text-left no-underline"
                    style={{ textDecoration: "none" }}
                  >
                    {/* Icon badge */}
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${c.icon}`}>
                      <Icon size={26} />
                    </div>

                    {/* Text */}
                    <div className="flex-1">
                      <p className={`font-bold text-lg ${c.heading} group-hover:opacity-90 mb-2`}>{title}</p>
                      <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
                    </div>

                    {/* CTA */}
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${c.cta}`}>{cta} →</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Additional Dashboard Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Industry Trends Card */}
              <Link
                to="/trends"
                className="group relative rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-white/20 hover:bg-white/8 transition-all duration-200 flex flex-col gap-4 text-left no-underline"
                style={{ textDecoration: "none" }}
              >
                <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <BarChart3 size={26} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg text-orange-400 group-hover:opacity-90 mb-2">Industry Trends</p>
                  <p className="text-slate-400 text-sm leading-relaxed">Track emerging skills and market trends</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-orange-400">View Trends →</span>
                </div>
              </Link>

              {/* Skills in Demand Card */}
              <Link
                to="/skills-in-demand"
                className="group relative rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-white/20 hover:bg-white/8 transition-all duration-200 flex flex-col gap-4 text-left no-underline"
                style={{ textDecoration: "none" }}
              >
                <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Trophy size={26} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg text-rose-400 group-hover:opacity-90 mb-2">Skills in Demand</p>
                  <p className="text-slate-400 text-sm leading-relaxed">Discover the most sought-after skills in the market</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-rose-400">View Skills →</span>
                </div>
              </Link>

              {/* Your Progress Card */}
              <Link
                to="/progress"
                className="group relative rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-white/20 hover:bg-white/8 transition-all duration-200 flex flex-col gap-4 text-left no-underline"
                style={{ textDecoration: "none" }}
              >
                <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-green-500/10 text-green-400 border border-green-500/20">
                  <Award size={26} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg text-green-400 group-hover:opacity-90 mb-2">Your Progress</p>
                  <p className="text-slate-400 text-sm leading-relaxed">Monitor your learning journey and achievements</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-green-400">View Progress →</span>
                </div>
              </Link>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
