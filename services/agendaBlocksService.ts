import { supabase } from '@/lib/supabase';
import { AgendaBlock, AgendaBlockTask } from '@/lib/types';

export const agendaBlocksService = {
  /**
   * Fetches all recurring agenda blocks, optionally filtered by professional (profileId).
   * Automatically joins profile details and associated tasks.
   * Tasks are sorted by their position in JavaScript to guarantee order correctness.
   */
  async getBlocks(profileId?: string): Promise<AgendaBlock[]> {
    let query = supabase
      .from('agenda_blocks')
      .select('*, profiles(id, full_name, email, role), agenda_block_tasks(*)');
    
    if (profileId) {
      query = query.eq('profile_id', profileId);
    }

    const { data, error } = await query
      .order('weekday', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.warn('Busca de blocos de agenda finalizada:', error?.message || error);
      return [];
    }

    const blocks = (data as any[]) || [];
    blocks.forEach(block => {
      if (block.agenda_block_tasks) {
        block.agenda_block_tasks.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
      }
    });

    return blocks as AgendaBlock[];
  },

  /**
   * Fetches a single agenda block by its uuid, joining profile and tasks.
   */
  async getBlock(id: string): Promise<AgendaBlock | null> {
    if (!id) return null;
    const { data, error } = await supabase
      .from('agenda_blocks')
      .select('*, profiles(id, full_name, email, role), agenda_block_tasks(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`Error in getBlock for id ${id}:`, error);
      throw error;
    }

    if (data && data.agenda_block_tasks) {
      data.agenda_block_tasks.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
    }

    return data as AgendaBlock;
  },

  /**
   * Inserts a new recurring agenda block.
   */
  async createBlock(blockData: Partial<AgendaBlock>): Promise<AgendaBlock> {
    const { data, error } = await supabase
      .from('agenda_blocks')
      .insert([
        {
          profile_id: blockData.profile_id,
          title: blockData.title,
          description: blockData.description || null,
          weekday: blockData.weekday,
          start_time: blockData.start_time,
          end_time: blockData.end_time,
          color: blockData.color || null,
          category: blockData.category || null,
          is_active: blockData.is_active ?? true,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error in createBlock:', error);
      throw error;
    }

    return data as AgendaBlock;
  },

  /**
   * Updates an existing agenda block.
   */
  async updateBlock(id: string, blockData: Partial<AgendaBlock>): Promise<AgendaBlock> {
    const { data, error } = await supabase
      .from('agenda_blocks')
      .update({
        title: blockData.title,
        description: blockData.description,
        weekday: blockData.weekday,
        start_time: blockData.start_time,
        end_time: blockData.end_time,
        color: blockData.color,
        category: blockData.category,
        is_active: blockData.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error in updateBlock for id ${id}:`, error);
      throw error;
    }

    return data as AgendaBlock;
  },

  /**
   * Deletes an agenda block by its uuid.
   * Cascade delete on the db handles removing standard agenda_block_tasks child listings on Supabase.
   */
  async deleteBlock(id: string): Promise<void> {
    const { error } = await supabase
      .from('agenda_blocks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error in deleteBlock for id ${id}:`, error);
      throw error;
    }
  },

  /**
   * Fetches all tasks for a given block ordered by position.
   */
  async getTasks(blockId: string): Promise<AgendaBlockTask[]> {
    const { data, error } = await supabase
      .from('agenda_block_tasks')
      .select('*')
      .eq('block_id', blockId)
      .order('position', { ascending: true });

    if (error) {
      console.error(`Error in getTasks for blockId ${blockId}:`, error);
      throw error;
    }

    return (data as AgendaBlockTask[]) || [];
  },

  /**
   * Creates a new pending task under a specific agenda block.
   */
  async createTask(taskData: Partial<AgendaBlockTask>): Promise<AgendaBlockTask> {
    const { data, error } = await supabase
      .from('agenda_block_tasks')
      .insert([
        {
          block_id: taskData.block_id,
          title: taskData.title,
          description: taskData.description || null,
          completed: taskData.completed ?? false,
          position: taskData.position ?? 0,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error in createTask:', error);
      throw error;
    }

    return data as AgendaBlockTask;
  },

  /**
   * Updates an existing agenda block task.
   */
  async updateTask(id: string, taskData: Partial<AgendaBlockTask>): Promise<AgendaBlockTask> {
    const { data, error } = await supabase
      .from('agenda_block_tasks')
      .update({
        title: taskData.title,
        description: taskData.description,
        completed: taskData.completed,
        position: taskData.position,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error in updateTask for id ${id}:`, error);
      throw error;
    }

    return data as AgendaBlockTask;
  },

  /**
   * Deletes a specific task.
   */
  async deleteTask(id: string): Promise<void> {
    const { error } = await supabase
      .from('agenda_block_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error in deleteTask for id ${id}:`, error);
      throw error;
    }
  }
};
