import { execFileSync } from 'node:child_process';
import os from 'node:os';

export interface SystemRamSnapshot {
  total: number;
  free: number;
  used: number;
}

const parseInteger = (raw: string): number => Number.parseInt(raw.replace(/[^0-9]/g, ''), 10);

const getDarwinRamSnapshot = (): SystemRamSnapshot | null => {
  try {
    const vmStat = execFileSync('vm_stat', { encoding: 'utf-8' });
    const pageSizeMatch = vmStat.match(/page size of\s+(\d+)\s+bytes/i);

    if (!pageSizeMatch) {
      return null;
    }

    const pageSize = Number.parseInt(pageSizeMatch[1], 10);
    const pageCounts = new Map<string, number>();

    for (const line of vmStat.split('\n')) {
      const match = line.match(/^([^:]+):\s+([0-9.,]+)\./);
      if (!match) {
        continue;
      }

      pageCounts.set(match[1].trim().toLowerCase(), parseInteger(match[2]));
    }

    const anonymousPages = pageCounts.get('anonymous pages');
    const wiredPages = pageCounts.get('pages wired down');
    const compressedPages = pageCounts.get('pages occupied by compressor');

    if (anonymousPages === undefined || wiredPages === undefined || compressedPages === undefined) {
      return null;
    }

    const total = os.totalmem();
    // Align with Activity Monitor's "Memory Used": app memory + wired + compressed.
    const usedByActivityMonitorModel = (anonymousPages + wiredPages + compressedPages) * pageSize;
    const used = Math.min(total, Math.max(0, usedByActivityMonitorModel));
    const free = Math.max(0, total - used);

    return { total, free, used };
  } catch {
    return null;
  }
};

export const getSystemRamSnapshot = (): SystemRamSnapshot => {
  if (process.platform === 'darwin') {
    const snapshot = getDarwinRamSnapshot();
    if (snapshot) {
      return snapshot;
    }
  }

  const total = os.totalmem();
  const free = os.freemem();

  return {
    total,
    free,
    used: total - free,
  };
};
