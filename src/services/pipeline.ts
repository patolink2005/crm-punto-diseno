import { supabase } from '../lib/supabase';

export interface PipelineStage {
  id: string;
  name: string;
  slug: string;
  position: number;
  color: string;
}

export const pipelineService = {
  async getStages() {
    const { data, error } = await supabase
      .from('pipeline_stages')
      .select('*')
      .order('position');
    if (error) throw error;
    return data as PipelineStage[];
  },

  async createStage(stage: Partial<PipelineStage>) {
    const { data, error } = await supabase
      .from('pipeline_stages')
      .insert([stage])
      .select()
      .single();
    if (error) throw error;
    return data as PipelineStage;
  },

  async updateStage(id: string, updates: Partial<PipelineStage>) {
    const { data, error } = await supabase
      .from('pipeline_stages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as PipelineStage;
  },

  async deleteStage(id: string) {
    const { error } = await supabase
      .from('pipeline_stages')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async reorderStages(stages: { id: string; position: number }[]) {
    for (const s of stages) {
      await supabase.from('pipeline_stages').update({ position: s.position }).eq('id', s.id);
    }
  }
};
