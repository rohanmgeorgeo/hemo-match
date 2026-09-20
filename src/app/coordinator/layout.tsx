import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Coordinator',
    template: '%s | Hemo Match',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
