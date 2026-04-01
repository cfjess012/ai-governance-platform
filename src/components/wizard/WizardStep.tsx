'use client';

import { intakeQuestions } from '@/config/questions';
import { ConditionalField } from './ConditionalField';
import { QuestionRenderer } from './QuestionRenderer';

interface WizardStepProps {
  stepId: string;
  title: string;
  sections: string[];
  visibleQuestionIds: Set<string>;
  errors: Record<string, string>;
  values: Record<string, unknown>;
  onFieldChange: (field: string, value: unknown) => void;
}

export function WizardStep({
  title,
  sections,
  visibleQuestionIds,
  errors,
  values,
  onFieldChange,
}: WizardStepProps) {
  const stepQuestions = intakeQuestions.filter((q) => sections.includes(q.section));

  return (
    <div className="space-y-6 stagger-children">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="space-y-6">
        {stepQuestions.map((question) => (
          <ConditionalField key={question.id} visible={visibleQuestionIds.has(question.id)}>
            <QuestionRenderer
              question={question}
              value={values[question.field]}
              error={errors[question.field]}
              onChange={onFieldChange}
            />
          </ConditionalField>
        ))}
      </div>
    </div>
  );
}
