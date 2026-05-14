'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClassesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/classes-and-camps');
  }, [router]);
  return null;
}
