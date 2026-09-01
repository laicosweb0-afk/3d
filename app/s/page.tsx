import { Suspense } from 'react';
import QuizFlow from './QuizFlow';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <QuizFlow />
    </Suspense>
  );
}
