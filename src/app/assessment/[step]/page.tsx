import { redirect } from 'next/navigation';

export default function AssessmentStepPage({ params }: { params: { step: string } }) {
  redirect('/assessment');
}
