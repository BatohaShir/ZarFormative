"use client";

import Link from "next/link";
import { FolderTree, Users, Settings, ArrowRight } from "lucide-react";

const quickLinks = [
  {
    name: "Категории",
    description: "Управление категориями услуг",
    href: "/admin/categories",
    icon: FolderTree,
    color: "bg-blue-500",
  },
  {
    name: "Пользователи",
    description: "Управление пользователями",
    href: "/admin/users",
    icon: Users,
    color: "bg-green-500",
  },
  {
    name: "Настройки",
    description: "Настройки системы",
    href: "/admin/settings",
    icon: Settings,
    color: "bg-purple-500",
  },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Добро пожаловать в административную панель
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickLinks.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="group p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div
                className={`w-12 h-12 ${item.color} rounded-lg flex items-center justify-center`}
              >
                <item.icon className="h-6 w-6 text-white" />
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            </div>
            <h3 className="mt-4 font-semibold text-gray-900 dark:text-white">
              {item.name}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
