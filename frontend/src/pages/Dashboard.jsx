import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

const USER_CARDS = [
  {
    title: "Resume Analyze",
    description: "Upload and analyze your resume with AI",
    link: "/resume-analyze",
    cta: "Get Started ",
    icon: "📄",
    color: "blue",
  },
  {
    title: "My Resumes",
    description: "View and manage all your uploaded resumes",
    link: "/my-resumes",
    cta: "View Resumes ",
    icon: "📁",
    color: "violet",
  },
  {
    title: "Compare Job",
    description: "Paste a job description and match it to your skills",
    link: "/compare-job",
    cta: "Compare Now ",
    icon: "🎯",
    color: "orange",
  },
  {
    title: "Job Postings",
    description: "Browse live jobs matched to your resume and explore skills in demand",
    link: "/job-postings",
    cta: "View Jobs ",
    icon: "💼",
    color: "indigo",
  },
  {
    title: "Career Analytics",
    description: "CV completeness score and personalised career insights",
    link: "/analytics",
    cta: "View Analytics ",
    icon: "📈",
    color: "green",
  },
  {
    title: "My Roadmaps",
    description: "Follow your personalised learning path to your dream role",
    link: "/my-roadmap",
    cta: "View Roadmaps ",
    icon: "🗺️",
    color: "purple",
  },
];

const COLOR_MAP = {
  blue:   { heading: "text-blue-600",   icon: "bg-blue-100 text-blue-600",   bar: "bg-blue-500" },
  violet: { heading: "text-violet-600", icon: "bg-violet-100 text-violet-600", bar: "bg-violet-500" },
  orange: { heading: "text-orange-600", icon: "bg-orange-100 text-orange-600", bar: "bg-orange-500" },
  indigo: { heading: "text-indigo-600", icon: "bg-indigo-100 text-indigo-600", bar: "bg-indigo-500" },
  green:  { heading: "text-green-600",  icon: "bg-green-100 text-green-600",  bar: "bg-green-500" },
  purple: { heading: "text-purple-600", icon: "bg-purple-100 text-purple-600", bar: "bg-purple-500" },
  rose:   { heading: "text-rose-600",   icon: "bg-rose-100 text-rose-600",   bar: "bg-rose-500" },
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
          <h2 className="text-3xl font-bold text-white">Welcome back, {user.name}! 👋</h2>
          <p className="text-slate-400 mt-1 text-sm">
            Here’s everything you need to advance your career.
          </p>
        </div>

        {/* User feature cards */}
        {user.role === 'USER' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {USER_CARDS.map(({ title, description, link, cta, icon, color }) => {
              const c = COLOR_MAP[color];
              return (
                <Link
                  key={link}
                  to={link}
                  className="group relative rounded-2xl border border-gray-100 bg-white p-5 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 flex flex-col gap-4 text-left no-underline"
                  style={{ textDecoration: "none" }}
                >
                  {/* Icon badge */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl ${c.icon}`}>
                    {icon}
                  </div>

                  {/* Text */}
                  <div className="flex-1">
                    <p className={`font-semibold text-base ${c.heading} group-hover:opacity-90`}>{title}</p>
                    <p className="text-gray-500 text-xs mt-1 leading-relaxed">{description}</p>
                  </div>

                  {/* CTA */}
                  <span className={`text-xs font-medium ${c.heading}`}>{cta}</span>

                  {/* Bottom colour strip */}
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl ${c.bar} opacity-0 group-hover:opacity-100 transition-opacity`} />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
