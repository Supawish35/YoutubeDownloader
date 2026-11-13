export interface ClipRangeValidation {
  valid: boolean;
  error: string | null;
  startSecs: number | null;
  endSecs: number | null;
}

/**
 * Formats a duration in seconds as MM:SS or H:MM:SS.
 * Returns null if the input is null, undefined, non-finite, or negative.
 */
export function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return null;
  }
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * Formats non-negative seconds into MM:SS or H:MM:SS.
 */
export function formatSecsToTimestamp(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds >= 0 ? Math.floor(seconds) : 0;
  return formatDuration(safe) ?? '00:00';
}

/**
 * Parses a timestamp string in SS, MM:SS, or HH:MM:SS format into non-negative seconds.
 * Returns null if the input is empty or malformed.
 */
export function parseTimestampToSecs(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(':');
  if (parts.length < 1 || parts.length > 3) return null;

  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
  }

  let total = 0;
  if (parts.length === 1) {
    total = Number(parts[0]);
  } else if (parts.length === 2) {
    const mins = Number(parts[0]);
    const secs = Number(parts[1]);
    if (secs >= 60) return null;
    total = mins * 60 + secs;
  } else {
    const hrs = Number(parts[0]);
    const mins = Number(parts[1]);
    const secs = Number(parts[2]);
    if (mins >= 60 || secs >= 60) return null;
    total = hrs * 3600 + mins * 60 + secs;
  }

  if (!Number.isSafeInteger(total) || total < 0) return null;
  return total;
}

/**
 * Validates clip start/end timestamp strings against each other and an optional max duration.
 */
export function validateClipRange(
  startStr: string,
  endStr: string,
  maxDurationSecs?: number | null
): ClipRangeValidation {
  const trimmedStart = startStr.trim();
  const trimmedEnd = endStr.trim();

  const startSecs = trimmedStart ? parseTimestampToSecs(trimmedStart) : null;
  if (trimmedStart && startSecs === null) {
    return {
      valid: false,
      error: 'Invalid start time. Use SS, MM:SS, or HH:MM:SS.',
      startSecs: null,
      endSecs: null,
    };
  }

  const endSecs = trimmedEnd ? parseTimestampToSecs(trimmedEnd) : null;
  if (trimmedEnd && endSecs === null) {
    return {
      valid: false,
      error: 'Invalid end time. Use SS, MM:SS, or HH:MM:SS.',
      startSecs,
      endSecs: null,
    };
  }

  if (startSecs !== null && endSecs !== null && startSecs >= endSecs) {
    return {
      valid: false,
      error: 'Start time must be earlier than end time.',
      startSecs,
      endSecs,
    };
  }

  const hasMax =
    maxDurationSecs !== null &&
    maxDurationSecs !== undefined &&
    Number.isFinite(maxDurationSecs) &&
    maxDurationSecs > 0;

  if (hasMax) {
    if (startSecs !== null && startSecs >= maxDurationSecs) {
      return {
        valid: false,
        error: `Start time must be less than media duration (${formatSecsToTimestamp(maxDurationSecs)}).`,
        startSecs,
        endSecs,
      };
    }

    if (endSecs !== null && endSecs > maxDurationSecs) {
      return {
        valid: false,
        error: `End time cannot exceed media duration (${formatSecsToTimestamp(maxDurationSecs)}).`,
        startSecs,
        endSecs,
      };
    }
  }

  return {
    valid: true,
    error: null,
    startSecs,
    endSecs,
  };
}
