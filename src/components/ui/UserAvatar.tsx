'use client';

import { useState } from 'react';
import { getUserInitial } from '@/lib/user-profile';

type Props = {
  avatarUrl?: string | null;
  email?: string | null;
  name?: string | null;
  size?: number;
  id?: string | null;
  accent?: 'default' | 'pro';
};

export function UserAvatar({
  avatarUrl,
  email,
  name,
  size = 40,
  id,
  accent = 'default',
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const fallbackSource = {
    email,
    id,
    user_metadata: {
      nickname: name,
      full_name: name,
    },
  };
  const initial = getUserInitial(fallbackSource);
  const background = accent === 'pro' ? '#6B5CE7' : '#EEEDFE';
  const color = accent === 'pro' ? '#fff' : '#6B5CE7';

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background,
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.max(12, Math.round(size * 0.38)),
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {avatarUrl && !imageFailed ? (
        <img
          src={avatarUrl}
          alt={name ?? email ?? 'User avatar'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}
