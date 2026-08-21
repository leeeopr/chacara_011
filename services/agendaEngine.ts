import { agendaBlocksService } from './agendaBlocksService';
import { AgendaBlock, AgendaBlockTask } from '@/lib/types';

/**
 * Converts a time string (e.g., "08:30:00" or "10:15") into minutes from midnight.
 * Handles different variations gracefully.
 */
export function timeToMinutes(timeStr: string | null | undefined): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

export type AgendaEngineOverride = {
  date?: Date;
  weekday?: number; // 0 (Sunday) to 6 (Saturday)
  time?: string; // "HH:mm" style
};

export const agendaEngine = {
  /**
   * Discovers the current day and of-day time, options allow forcing specific values for testing.
   */
  getDateTimeContext(override?: AgendaEngineOverride) {
    const referenceDate = override?.date || new Date();
    
    // weekday uses Date.getDay() (0..6)
    const weekday = override?.weekday !== undefined 
      ? override.weekday 
      : referenceDate.getDay();
      
    let minutesStr = '';
    if (override?.time) {
      minutesStr = override.time;
    } else {
      const hours = String(referenceDate.getHours()).padStart(2, '0');
      const mins = String(referenceDate.getMinutes()).padStart(2, '0');
      minutesStr = `${hours}:${mins}`;
    }
    
    const minutes = timeToMinutes(minutesStr);
    return { weekday, timeStr: minutesStr, minutes };
  },

  /**
   * Fetches all blocks for today (or override weekday) sorted by start_time.
   */
  async getTodayBlocks(profileId?: string, override?: AgendaEngineOverride): Promise<AgendaBlock[]> {
    const { weekday } = this.getDateTimeContext(override);
    const allBlocks = await agendaBlocksService.getBlocks(profileId);
    
    // Filter by weekday and active status
    return allBlocks
      .filter(block => block.weekday === weekday && block.is_active)
      .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
  },

  /**
   * Identifies the current active block for today (or override).
   */
  async getCurrentBlock(profileId?: string, override?: AgendaEngineOverride): Promise<AgendaBlock | null> {
    const { minutes } = this.getDateTimeContext(override);
    const todayBlocks = await this.getTodayBlocks(profileId, override);

    const activeBlock = todayBlocks.find(block => {
      const start = timeToMinutes(block.start_time);
      const end = timeToMinutes(block.end_time);
      return start <= minutes && minutes < end;
    });

    return activeBlock || null;
  },

  /**
   * Identifies the next block for today (or override).
   */
  async getNextBlock(profileId?: string, override?: AgendaEngineOverride): Promise<AgendaBlock | null> {
    const { minutes } = this.getDateTimeContext(override);
    const todayBlocks = await this.getTodayBlocks(profileId, override);
    const currentBlock = await this.getCurrentBlock(profileId, override);

    if (currentBlock) {
      const currentEnd = timeToMinutes(currentBlock.end_time);
      // Find the first block starting after or at current block's end_time, excluding current block itself
      const next = todayBlocks.find(block => {
        if (block.id === currentBlock.id) return false;
        return timeToMinutes(block.start_time) >= currentEnd;
      });
      if (next) return next;
    }

    // If no active block or no block starts after currentBlock.end_time, find first block starting after current time
    const nextAfterTime = todayBlocks.find(block => {
      if (currentBlock && block.id === currentBlock.id) return false;
      return timeToMinutes(block.start_time) > minutes;
    });

    return nextAfterTime || null;
  },

  /**
   * Helper that retrieves both current and next blocks simultaneously.
   */
  async getCurrentAndNextBlock(profileId?: string, override?: AgendaEngineOverride): Promise<{ current: AgendaBlock | null; next: AgendaBlock | null }> {
    const current = await this.getCurrentBlock(profileId, override);
    const next = await this.getNextBlock(profileId, override);
    return { current, next };
  },

  /**
   * Retrieves all completed/uncompleted tasks for the active block.
   */
  async getCurrentBlockTasks(profileId?: string, override?: AgendaEngineOverride): Promise<AgendaBlockTask[]> {
    const currentBlock = await this.getCurrentBlock(profileId, override);
    if (!currentBlock) return [];
    
    return agendaBlocksService.getTasks(currentBlock.id);
  },

  /**
   * Returns the next executable action (first unfinished task formatted as position-ascending order).
   */
  async getNextPendingTask(profileId?: string, override?: AgendaEngineOverride): Promise<AgendaBlockTask | null> {
    const tasks = await this.getCurrentBlockTasks(profileId, override);
    const pending = tasks.filter(t => !t.completed);
    return pending.length > 0 ? pending[0] : null;
  },

  /**
   * Returns the count of pending tasks inside the current active block.
   */
  async getPendingTasksCount(profileId?: string, override?: AgendaEngineOverride): Promise<number> {
    const tasks = await this.getCurrentBlockTasks(profileId, override);
    return tasks.filter(t => !t.completed).length;
  }
};
