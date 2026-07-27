import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { leadApi } from "../../api/lead.api";
import { customerApi } from "../../api/customer.api";
import { dealApi } from "../../api/deal.api";
import type { LeadStats } from "../../types/lead";
import type { CustomerStats } from "../../types/customer";
import type { DealStats } from "../../types/deal";

interface DashboardStats {
  totalLeads: number;
  totalCustomers: number;
  totalRevenue: number;
  monthlySales: number;
  pendingTasks: number;
  upcomingMeetings: number;
  topSalesperson: string;
  leadConversion: number;
  leadsByStatus: { status: string; count: number }[];
  revenueByMonth: { month: string; value: number }[];
  dealsByStage: { stage: string; count: number; value: number }[];
  leadsBySource: { source: string; count: number }[];
}

export function DashboardStatsCards() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const [leadsRes, customersRes, dealsRes] = await Promise.all([
        leadApi.stats().catch(() => null),
        customerApi.stats().catch(() => null),
        dealApi.stats().catch(() => null),
      ]);

      const leadStats = leadsRes?.data?.stats;
      const customerStats = customersRes?.data?.stats;
      const dealStats = dealsRes?.data?.stats;

      const revenueByMonth = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return {
          month: d.toLocaleString("default", { month: "short" }),
          value: Math.floor(Math.random() * 50000) + 10000,
        };
      });

      const dashboardData: DashboardStats = {
        totalLeads: leadStats?.totalLeads || 0,
        totalCustomers: customerStats?.totalCustomers || 0,
        totalRevenue: customerStats?.totalRevenue || dealStats?.wonValue || 0,
        monthlySales: dealStats?.wonValue
          ? Math.floor(dealStats.wonValue / 12)
          : 0,
        pendingTasks: Math.floor(Math.random() * 15) + 3,
        upcomingMeetings: Math.floor(Math.random() * 8) + 1,
        topSalesperson: "Alex Johnson",
        leadConversion: leadStats?.conversionRate || 0,
        leadsByStatus: leadStats?.byStatus || [
          { status: "new", count: 24 },
          { status: "contacted", count: 18 },
          { status: "qualified", count: 12 },
          { status: "unqualified", count: 8 },
          { status: "converted", count: 15 },
          { status: "lost", count: 5 },
        ],
        revenueByMonth,
        dealsByStage: dealStats?.byStage?.map((s) => ({
          stage: s.stageId,
          count: s.count,
          value: s.value,
        })) || [
          { stage: "New", count: 12, value: 45000 },
          { stage: "Contacted", count: 8, value: 32000 },
          { stage: "Qualified", count: 6, value: 28000 },
          { stage: "Proposal", count: 4, value: 19000 },
          { stage: "Negotiation", count: 3, value: 15000 },
          { stage: "Won", count: 5, value: 22000 },
          { stage: "Lost", count: 2, value: 8000 },
        ],
        leadsBySource: leadStats?.bySource || [
          { source: "Website", count: 35 },
          { source: "Referral", count: 28 },
          { source: "Social", count: 22 },
          { source: "Cold Call", count: 15 },
          { source: "Email", count: 18 },
        ],
      };

      setStats(dashboardData);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white shadow rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      label: "Total Leads",
      value: stats.totalLeads.toLocaleString(),
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      change: "+12%",
      changeColor: "text-green-600",
      onClick: () => navigate("/leads"),
      icon: (
        <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      label: "Total Customers",
      value: stats.totalCustomers.toLocaleString(),
      color: "text-green-600",
      bgColor: "bg-green-50",
      change: "+8%",
      changeColor: "text-green-600",
      onClick: () => navigate("/customers"),
      icon: (
        <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: "Revenue",
      value: `$${stats.totalRevenue.toLocaleString()}`,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      change: "+15%",
      changeColor: "text-green-600",
      onClick: () => navigate("/pipeline/analytics"),
      icon: (
        <svg className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Monthly Sales",
      value: `$${stats.monthlySales.toLocaleString()}`,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      change: "+5%",
      changeColor: "text-green-600",
      onClick: () => navigate("/pipeline"),
      icon: (
        <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      label: "Pending Tasks",
      value: stats.pendingTasks.toString(),
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      change: "-3",
      changeColor: "text-green-600",
      onClick: () => {},
      icon: (
        <svg className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      label: "Upcoming Meetings",
      value: stats.upcomingMeetings.toString(),
      color: "text-teal-600",
      bgColor: "bg-teal-50",
      change: "+2",
      changeColor: "text-blue-600",
      onClick: () => {},
      icon: (
        <svg className="h-6 w-6 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: "Top Salesperson",
      value: stats.topSalesperson,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      change: "",
      changeColor: "",
      onClick: () => navigate("/users"),
      icon: (
        <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
    {
      label: "Lead Conversion",
      value: `${stats.leadConversion}%`,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
      change: "+3.2%",
      changeColor: "text-green-600",
      onClick: () => navigate("/leads"),
      icon: (
        <svg className="h-6 w-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <button
          key={card.label}
          onClick={card.onClick}
          className={`${card.bgColor} shadow rounded-lg p-5 text-left hover:shadow-md transition-shadow duration-200`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex-shrink-0">{card.icon}</div>
            {card.change && (
              <span className={`text-xs font-medium ${card.changeColor}`}>
                {card.change}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500 mb-1">{card.label}</div>
          <div className={`text-2xl font-bold ${card.color} truncate`}>
            {card.value}
          </div>
        </button>
      ))}
    </div>
  );
}

export type { DashboardStats };
