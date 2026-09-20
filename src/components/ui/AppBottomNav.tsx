'use client';

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
  icon: (active: boolean) => React.ReactNode;
}

export const AppBottomNav: React.FC = () => {
  const pathname = usePathname() || "/";

  const navItems: NavItem[] = [
    {
      href: "/requests/new",
      label: "Request",
      isActive: (p) => p === "/requests/new",
      icon: (active) => (
        <svg
          className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-150 ${active ? "scale-105" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={active ? "2.5" : "2"}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
    },
    {
      href: "/requests/matching-demo",
      label: "Matches",
      isActive: (p) => p.startsWith("/requests/matching"),
      icon: (active) => (
        <svg
          className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-150 ${active ? "scale-105" : ""}`}
          fill={active ? "currentColor" : "none"}
          viewBox="0 0 24 24"
          strokeWidth={active ? "0" : "2"}
          stroke="currentColor"
          aria-hidden="true"
        >
          {active ? (
            <path d="M4.5 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM14.25 8.625a3.375 3.375 0 1 1 6.75 0 3.375 3.375 0 0 1-6.75 0ZM1.5 19.125a7.125 7.125 0 0 1 14.25 0v.75H1.5v-.75ZM16.5 19.875v-.75a5.975 5.975 0 0 0-1.074-3.415 8.625 8.625 0 0 1 7.074 4.165h-6Z" />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
            />
          )}
        </svg>
      ),
    },
    {
      href: "/donors/notifications",
      label: "Inbox",
      isActive: (p) => p.startsWith("/donors/notifications"),
      icon: (active) => (
        <svg
          className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-150 ${active ? "scale-105" : ""}`}
          fill={active ? "currentColor" : "none"}
          viewBox="0 0 24 24"
          strokeWidth={active ? "0" : "2"}
          stroke="currentColor"
          aria-hidden="true"
        >
          {active ? (
            <path d="M5.85 3.5a.75.75 0 0 0-1.117-1A9.972 9.972 0 0 0 1.5 9.75v.75a.75.75 0 0 0 1.5 0v-.75c0-2.443.876-4.68 2.333-6.417ZM19.267 2.5a.75.75 0 0 0-1.117 1A7.72 7.72 0 0 1 20.5 9v.75a.75.75 0 0 0 1.5 0V9a9.22 9.22 0 0 0-2.733-6.5ZM12 1.5a5.25 5.25 0 0 0-5.25 5.25v3.136c0 .878-.29 1.73-.825 2.422l-1.39 1.8A1.875 1.875 0 0 0 6 17.25h12a1.875 1.875 0 0 0 1.465-3.142l-1.39-1.8a3.75 3.75 0 0 1-.825-2.422V6.75A5.25 5.25 0 0 0 12 1.5ZM9.75 18.75a2.25 2.25 0 0 0 4.5 0h-4.5Z" />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
            />
          )}
        </svg>
      ),
    },
    {
      href: "/donors/profile",
      label: "Profile",
      isActive: (p) => p.startsWith("/donors/profile") || p.startsWith("/donors/register"),
      icon: (active) => (
        <svg
          className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-150 ${active ? "scale-105" : ""}`}
          fill={active ? "currentColor" : "none"}
          viewBox="0 0 24 24"
          strokeWidth={active ? "0" : "2"}
          stroke="currentColor"
          aria-hidden="true"
        >
          {active ? (
            <path d="M12 2.25a5.25 5.25 0 0 0-5.25 5.25 5.25 5.25 0 0 0 5.25 5.25 5.25 5.25 0 0 0 5.25-5.25A5.25 5.25 0 0 0 12 2.25ZM3.75 19.5a8.25 8.25 0 0 1 16.5 0v1.125c0 .621-.504 1.125-1.125 1.125H4.875A1.125 1.125 0 0 1 3.75 20.625V19.5Z" />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.964 0a9 9 0 1 0-11.963 0m11.964 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
          )}
        </svg>
      ),
    },
    {
      href: "/coordinator",
      label: "Ops",
      isActive: (p) => p.startsWith("/coordinator"),
      icon: (active) => (
        <svg
          className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-150 ${active ? "scale-105" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={active ? "2.5" : "2"}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
          />
        </svg>
      ),
    },
  ];

  return (
    <nav
      aria-label="Mobile Application Navigation"
      className="md:hidden fixed inset-x-3 bottom-2.5 z-40 max-w-md mx-auto liquid-glass-dock rounded-2xl sm:rounded-3xl p-1.5 transition-all duration-150"
      style={{
        marginBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-center justify-around gap-1">
        {navItems.map((item) => {
          const active = item.isActive(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl py-1 px-1.5 transition-all select-none pressable ${
                active
                  ? "bg-rose-50/90 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold border border-rose-200/60 dark:border-rose-900/50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 font-medium hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40 border border-transparent"
              }`}
            >
              <div className="relative flex items-center justify-center">
                {item.icon(active)}
              </div>
              <span className="text-[10px] tracking-tight leading-none mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
