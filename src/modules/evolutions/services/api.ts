import { supabase } from '@/lib/supabase';
import { Evolution, EvolutionPack, EvolutionStatus } from '../types';
import { techLog } from '../utils/calculations';

export const EvolutionAPI = {
  /**
   * Fetch all evolution packs ordered by number descending (recent first)
   */
  async fetchPacks(): Promise<EvolutionPack[]> {
    techLog('Packs', 'Fetching packs from Supabase');
    const { data, error } = await supabase
      .from('evolution_packs')
      .select('*')
      .order('number', { ascending: false });

    if (error) {
      techLog('Packs', 'Error fetching packs', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Fetch all evolutions ordered by created_at descending
   */
  async fetchEvolutions(): Promise<Evolution[]> {
    techLog('Evolutions', 'Fetching evolutions from Supabase');
    const { data, error } = await supabase
      .from('evolutions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      techLog('Evolutions', 'Error fetching evolutions', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Save an evolution. If it's a new evolution, it triggers the rollover RPC check.
   */
  async createEvolution(payload: {
    title: string;
    description: string | null;
    weight: number;
    category: string;
    status: EvolutionStatus;
    implementation_notes: string | null;
    created_by?: string | null;
  }): Promise<any> {
    techLog('Rollover', 'Checking rollover and inserting new evolution', payload);

    // Call stored procedure RPC from migration
    const { data, error } = await supabase.rpc('create_evolution_with_rollover', {
      p_title: payload.title,
      p_description: payload.description,
      p_weight: payload.weight,
      p_category: payload.category,
      p_status: payload.status
    });

    if (error) {
      techLog('Rollover', 'Database RPC failed, executing fallback client rollover logic', error);
      
      // Fallback: Safe Client-Side Transactional Rollover Sequence
      // 1. Get current active packs
      const packs = await this.fetchPacks();
      let openPack = packs.find(p => p.status === 'OPEN');

      // 2. If no open pack, create Pack #1
      if (!openPack) {
        techLog('Rollover', 'No active pack. Creating Pack #1...');
        const nextNum = packs.length > 0 ? Math.max(...packs.map(p => p.number)) + 1 : 1;
        const { data: newPack, error: packErr } = await supabase
          .from('evolution_packs')
          .insert({ number: nextNum, status: 'OPEN' })
          .select()
          .single();
        
        if (packErr) throw packErr;
        openPack = newPack;
      }

      if (!openPack) {
        throw new Error('Impossible state: active pack resolve sequence failed');
      }

      // 3. Calculate current weight
      const evos = await this.fetchEvolutions();
      const currentPackEvos = evos.filter(e => e.pack_id === openPack.id);
      const consumedWeight = currentPackEvos.reduce((acc, current) => acc + (current.weight || 0), 0);

      let targetPackId = openPack.id;

      // 4. Check if we need rollover
      if (consumedWeight + payload.weight > openPack.max_weight) {
        techLog('Rollover', `Capacity exceeded. Rollover required: (${consumedWeight} + ${payload.weight} > ${openPack.max_weight}). Closing Pack #${openPack.number}`);
        
        // Mark current pack closed
        await supabase
          .from('evolution_packs')
          .update({ status: 'CLOSED', completed_at: new Date().toISOString() })
          .eq('id', openPack.id);
        
        // Create next pack
        const { data: nextPack, error: nextPackErr } = await supabase
          .from('evolution_packs')
          .insert({ number: openPack.number + 1, status: 'OPEN' })
          .select()
          .single();

        if (nextPackErr) throw nextPackErr;
        targetPackId = nextPack.id;
      }

      // 5. Insert evolution record
      const { data: insertedEvo, error: insertError } = await supabase
        .from('evolutions')
        .insert({
          title: payload.title,
          description: payload.description,
          weight: payload.weight,
          category: payload.category,
          status: payload.status,
          implementation_notes: payload.implementation_notes,
          pack_id: targetPackId,
          created_by: payload.created_by,
          completed_at: payload.status === 'CONCLUÍDA' ? new Date().toISOString() : null
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return insertedEvo;
    }

    // Since RPC went through, update created_by or notes on that inserted ID if needed
    if (data && data.id && (payload.created_by || payload.implementation_notes)) {
      await supabase
        .from('evolutions')
        .update({
          created_by: payload.created_by,
          implementation_notes: payload.implementation_notes,
          completed_at: payload.status === 'CONCLUÍDA' ? new Date().toISOString() : null
        })
        .eq('id', data.id);
    }

    return data;
  },

  /**
   * Update an existing evolution record.
   */
  async updateEvolution(id: string, updates: Partial<Evolution>): Promise<Evolution> {
    techLog('Evolutions', `Updating evolution id: ${id}`, updates);

    // Calculate completed_at timestamp based on status transition
    const dataToUpdate: any = { ...updates };
    if (updates.status) {
      if (updates.status === 'CONCLUÍDA') {
        dataToUpdate.completed_at = new Date().toISOString();
      } else {
        dataToUpdate.completed_at = null;
      }
    }
    
    dataToUpdate.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('evolutions')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      techLog('Evolutions', `Error updating evolution id: ${id}`, error);
      throw error;
    }

    return data;
  },

  /**
   * Delete an evolution record.
   */
  async deleteEvolution(id: string): Promise<void> {
    techLog('Evolutions', `Deleting evolution id: ${id}`);
    const { error } = await supabase
      .from('evolutions')
      .delete()
      .eq('id', id);

    if (error) {
      techLog('Evolutions', `Error deleting evolution id: ${id}`, error);
      throw error;
    }
  }
};
