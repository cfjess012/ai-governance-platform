import { redirect } from 'next/navigation';

export default function IntakeStepPage({ params }: { params: { step: string } }) {
  // For now, redirect to main intake page — step management is handled by WizardShell
  redirect('/intake');
}
