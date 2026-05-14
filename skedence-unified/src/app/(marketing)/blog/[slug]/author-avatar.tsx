'use client';

import { useState } from 'react';
import Image from 'next/image';

interface AuthorAvatarProps {
  src: string;
  alt: string;
  initial: string;
}

export default function AuthorAvatar({ src, alt, initial }: AuthorAvatarProps) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <span className="text-xl font-bold text-primary">{initial}</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={48}
      height={48}
      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
      unoptimized
      onError={() => setBroken(true)}
    />
  );
}
