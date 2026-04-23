type MetadataRecord = Record<string, unknown> | null | undefined;

type UserProfileSource = {
  email?: string | null;
  id?: string | null;
  user_metadata?: MetadataRecord;
};

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function getUserDisplayName(source: UserProfileSource | null | undefined) {
  const metadata = source?.user_metadata;
  const nickname = readString(metadata?.nickname);
  const fullName = readString(metadata?.full_name);
  const emailPrefix = source?.email?.split('@')[0]?.trim() ?? '';

  if (nickname !== '') {
    return nickname;
  }

  if (fullName !== '') {
    return fullName;
  }

  if (emailPrefix !== '') {
    return emailPrefix;
  }

  if (source?.id) {
    return `User ${source.id.slice(0, 8)}`;
  }

  return 'User';
}

export function getUserAvatarUrl(source: UserProfileSource | null | undefined) {
  const metadata = source?.user_metadata;
  const avatarUrl = readString(metadata?.avatar_url);
  return avatarUrl === '' ? null : avatarUrl;
}

export function getUserInitial(source: UserProfileSource | null | undefined) {
  const displayName = getUserDisplayName(source);
  const firstCharacter = Array.from(displayName).find((character) => /[\p{L}\p{N}]/u.test(character));
  return firstCharacter?.toUpperCase() ?? 'U';
}
