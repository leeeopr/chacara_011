import { supabase } from '@/lib/supabase';
import { Company, CompanyFormData, CompanyStatus } from '@/lib/types';

export const companiesService = {
  /**
   * Fetch all companies from the database, ordered by name.
   */
  async getCompanies(): Promise<Company[]> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Busca de empresas finalizada:', error.message);
      return [];
    }

    return (data as Company[]) || [];
  },

  /**
   * Fetch a single company by its UUID.
   */
  async getCompanyById(id: string): Promise<Company | null> {
    if (!id) return null;
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.warn(`Busca de empresa por id ${id} finalizada:`, error.message);
      return null;
    }

    return data as Company;
  },

  /**
   * Create a new company record in the database.
   */
  async createCompany(companyData: CompanyFormData): Promise<Company> {
    const { data, error } = await supabase
      .from('companies')
      .insert([
        {
          name: companyData.name,
          status: companyData.status || 'ACTIVE',
          limit_value: companyData.limit_value ?? 0.00,
          limit_type: companyData.limit_type || 'NONE',
          block_on_limit: companyData.block_on_limit ?? true,
          document_number: companyData.document_number || null,
          phone: companyData.phone || null,
          email: companyData.email || null,
          billing_day: companyData.billing_day ?? null,
          notes: companyData.notes || null,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error in createCompany:', error);
      throw error;
    }

    return data as Company;
  },

  /**
   * Update an existing company record by its UUID.
   */
  async updateCompany(id: string, companyData: Partial<CompanyFormData>): Promise<Company> {
    const updatePayload: any = {
      updated_at: new Date().toISOString()
    };

    if (companyData.name !== undefined) updatePayload.name = companyData.name;
    if (companyData.status !== undefined) updatePayload.status = companyData.status;
    if (companyData.limit_value !== undefined) updatePayload.limit_value = companyData.limit_value;
    if (companyData.limit_type !== undefined) updatePayload.limit_type = companyData.limit_type;
    if (companyData.block_on_limit !== undefined) updatePayload.block_on_limit = companyData.block_on_limit;
    if (companyData.document_number !== undefined) updatePayload.document_number = companyData.document_number || null;
    if (companyData.phone !== undefined) updatePayload.phone = companyData.phone || null;
    if (companyData.email !== undefined) updatePayload.email = companyData.email || null;
    if (companyData.billing_day !== undefined) updatePayload.billing_day = companyData.billing_day ?? null;
    if (companyData.notes !== undefined) updatePayload.notes = companyData.notes || null;

    const { data, error } = await supabase
      .from('companies')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error in updateCompany for id ${id}:`, error);
      throw error;
    }

    return data as Company;
  },

  /**
   * Toggle the status of a company representation.
   */
  async toggleCompanyStatus(id: string, currentStatus: CompanyStatus): Promise<Company> {
    const nextStatus: CompanyStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    return this.updateCompany(id, { status: nextStatus });
  },

  /**
   * Fetch all active companies from the database, ordered by name.
   */
  async getActiveCompanies(): Promise<Company[]> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Busca de empresas ativas finalizada:', error.message);
      return [];
    }

    return (data as Company[]) || [];
  }
};
