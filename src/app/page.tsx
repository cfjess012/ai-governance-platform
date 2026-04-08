import Link from 'next/link';

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">AI Governance Platform</h1>
        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          Register AI use cases, assess risk, and track governance requirements. Adaptive intake
          wizard with auto-classification against EU AI Act and Agent Tier frameworks.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/intake"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Start New Intake
          </Link>
          <Link
            href="/inventory"
            className="inline-flex items-center justify-center rounded-md border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            View Inventory
          </Link>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Adaptive Intake</h3>
          <p className="text-sm text-gray-600">
            Smart wizard that adapts questions based on solution type, showing only relevant
            questions (11-17 depending on use case).
          </p>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Auto-Classification</h3>
          <p className="text-sm text-gray-600">
            Real-time EU AI Act risk tier and Agent Tier classification as you fill out the form,
            with transparent scoring.
          </p>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Risk Scoring</h3>
          <p className="text-sm text-gray-600">
            Weighted risk score (0-100) with full breakdown showing which factors contribute most to
            the governance requirements.
          </p>
        </div>
      </div>
    </div>
  );
}
