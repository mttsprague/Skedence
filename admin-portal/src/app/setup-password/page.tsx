import { Suspense } from 'react';
import SetupPasswordContent from './SetupPasswordContent';

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-[#3258A3] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <SetupPasswordContent />
    </Suspense>
  );
}
