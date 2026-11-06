import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div className="space-y-3">
        <p className="text-5xl font-bold text-brand-600">404</p>
        <p className="text-slate-600">This page does not exist.</p>
        <Link to="/" className="text-sm font-medium text-brand-700 hover:underline">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}