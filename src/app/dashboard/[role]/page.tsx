import { redirect } from 'next/navigation';

export default function RoleDashboardPage({ params }: { params: { role: string } }) {
  // Role-based views will be implemented in a future phase
  redirect('/dashboard');
}
