import React from "react";
import Link from "next/link";

const NAV = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/quickstart", label: "Quickstart" },
  { href: "/docs/api", label: "API Reference" },
  { href: "/docs/contracts", label: "Smart Contracts" },
  { href: "/docs/x402", label: "x402 Payments" },
  { href: "/docs/agents", label: "Agent Integration" },
  { href: "/docs/architecture", label: "Architecture" },
];

export default function DocsLayout({ children }) {
  return (
    <div className="docs-page">
      <nav className="docs-nav">
        <Link href="/" className="docs-nav__logo">
          HJIVEMIND
        </Link>
        <ul className="docs-nav__list">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="docs-nav__link">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="docs-content">{children}</main>
      <style jsx global>{`
        .docs-page {
          display: flex;
          min-height: 100vh;
          background: #0a0a0f;
          color: #e0e0e8;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            monospace;
        }
        .docs-nav {
          width: 240px;
          padding: 24px 16px;
          border-right: 1px solid #1a1a2e;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
        }
        .docs-nav__logo {
          display: block;
          font-size: 18px;
          font-weight: 700;
          color: #7c6ff7;
          text-decoration: none;
          margin-bottom: 32px;
          letter-spacing: 2px;
        }
        .docs-nav__list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .docs-nav__list li {
          margin-bottom: 4px;
        }
        .docs-nav__link {
          display: block;
          padding: 8px 12px;
          color: #a0a0b0;
          text-decoration: none;
          border-radius: 6px;
          font-size: 14px;
          transition: all 0.15s;
        }
        .docs-nav__link:hover {
          color: #fff;
          background: #1a1a2e;
        }
        .docs-content {
          flex: 1;
          max-width: 820px;
          padding: 48px 64px;
          line-height: 1.7;
        }
        .docs-content h1 {
          font-size: 36px;
          font-weight: 700;
          color: #fff;
          margin: 0 0 8px;
          letter-spacing: -0.5px;
        }
        .docs-content h2 {
          font-size: 24px;
          font-weight: 600;
          color: #fff;
          margin: 48px 0 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid #1a1a2e;
        }
        .docs-content h3 {
          font-size: 18px;
          font-weight: 600;
          color: #c0c0d0;
          margin: 32px 0 12px;
        }
        .docs-content p {
          margin: 0 0 16px;
          color: #b0b0c0;
        }
        .docs-content a {
          color: #7c6ff7;
          text-decoration: none;
        }
        .docs-content a:hover {
          text-decoration: underline;
        }
        .docs-content code {
          background: #12121e;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 13px;
          color: #e0b0ff;
        }
        .docs-content pre {
          background: #12121e;
          border: 1px solid #1a1a2e;
          border-radius: 8px;
          padding: 20px;
          overflow-x: auto;
          margin: 0 0 24px;
        }
        .docs-content pre code {
          background: none;
          padding: 0;
          font-size: 13px;
          color: #d0d0e0;
        }
        .docs-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 0 0 24px;
          font-size: 14px;
        }
        .docs-content th {
          text-align: left;
          padding: 10px 12px;
          border-bottom: 2px solid #1a1a2e;
          color: #fff;
          font-weight: 600;
        }
        .docs-content td {
          padding: 10px 12px;
          border-bottom: 1px solid #12121e;
          color: #b0b0c0;
        }
        .docs-content blockquote {
          border-left: 3px solid #7c6ff7;
          margin: 0 0 24px;
          padding: 12px 20px;
          background: #12121e;
          border-radius: 0 8px 8px 0;
        }
        .docs-content blockquote p {
          margin: 0;
        }
        .docs-content ul,
        .docs-content ol {
          margin: 0 0 16px;
          padding-left: 24px;
          color: #b0b0c0;
        }
        .docs-content li {
          margin-bottom: 6px;
        }
        .docs-content hr {
          border: none;
          border-top: 1px solid #1a1a2e;
          margin: 48px 0;
        }
        @media (max-width: 768px) {
          .docs-page {
            flex-direction: column;
          }
          .docs-nav {
            width: 100%;
            height: auto;
            position: static;
            border-right: none;
            border-bottom: 1px solid #1a1a2e;
          }
          .docs-nav__list {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
          }
          .docs-content {
            padding: 32px 24px;
          }
        }
      `}</style>
    </div>
  );
}
