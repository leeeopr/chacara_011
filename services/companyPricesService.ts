import { supabase } from '@/lib/supabase';
import { CompanyPrice, CompanyPriceFormData } from '@/lib/types';

export const companyPricesService = {
  /**
   * Fetch all prices, joining with company name and appointment type name.
   */
  async getPrices(): Promise<CompanyPrice[]> {
    const { data, error } = await supabase
      .from('company_prices')
      .select(`
        *,
        companies ( id, name ),
        appointment_types ( id, name )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Busca de preços de convênios/particulares finalizada:', error.message);
      return [];
    }

    return (data as any[]) || [];
  },

  /**
   * Fetch a single price entry by its UUID.
   */
  async getPriceById(id: string): Promise<CompanyPrice | null> {
    if (!id) return null;
    const { data, error } = await supabase
      .from('company_prices')
      .select(`
        *,
        companies ( id, name ),
        appointment_types ( id, name )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.warn(`Busca de preço por id ${id} finalizada:`, error.message);
      return null;
    }

    return data as any as CompanyPrice;
  },

  /**
   * Create a new company/particular price entry in the database.
   */
  async createPrice(formData: CompanyPriceFormData): Promise<CompanyPrice> {
    const { data, error } = await supabase
      .from('company_prices')
      .insert([
        {
          company_id: formData.company_id || null,
          appointment_type_id: formData.appointment_type_id,
          price: formData.price,
          is_active: formData.is_active ?? true
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error in createPrice:', error);
      throw error;
    }

    return data as CompanyPrice;
  },

  /**
   * Update an existing price entry.
   */
  async updatePrice(id: string, formData: Partial<CompanyPriceFormData>): Promise<CompanyPrice> {
    const updatePayload: any = {
      updated_at: new Date().toISOString()
    };

    if (formData.company_id !== undefined) updatePayload.company_id = formData.company_id || null;
    if (formData.appointment_type_id !== undefined) updatePayload.appointment_type_id = formData.appointment_type_id;
    if (formData.price !== undefined) updatePayload.price = formData.price;
    if (formData.is_active !== undefined) updatePayload.is_active = formData.is_active;

    const { data, error } = await supabase
      .from('company_prices')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error in updatePrice for id ${id}:`, error);
      throw error;
    }

    return data as CompanyPrice;
  },

  /**
   * Toggle the active status of a company price.
   */
  async togglePrice(id: string, currentStatus: boolean): Promise<CompanyPrice> {
    return this.updatePrice(id, { is_active: !currentStatus });
  },

  /**
   * Retrieve all prices set for a specific company.
   */
  async getCompanyPrices(companyId: string): Promise<CompanyPrice[]> {
    if (!companyId) return [];
    const { data, error } = await supabase
      .from('company_prices')
      .select(`
        *,
        companies ( id, name ),
        appointment_types ( id, name )
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error in getCompanyPrices for company ${companyId}:`, error);
      throw error;
    }

    return (data as any[]) || [];
  },

  /**
   * Retrieve all default (Particular) prices (where company_id is NULL).
   */
  async getDefaultPrices(): Promise<CompanyPrice[]> {
    const { data, error } = await supabase
      .from('company_prices')
      .select(`
        *,
        companies ( id, name ),
        appointment_types ( id, name )
      `)
      .is('company_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error in getDefaultPrices:', error);
      throw error;
    }

    return (data as any[]) || [];
  },

  /**
   * Retrieve the price for a specific appointment based on its company and appointment type.
   * If a company-specific price is not found, fallback to the default (Particular) price.
   */
  async getPriceForAppointment(
    companyId: string | null | undefined,
    appointmentTypeId: string
  ): Promise<{ price: number; source: 'DEFAULT_PRICE' | 'COMPANY_PRICE' } | null> {
    if (!appointmentTypeId) return null;

    // 1. Try company-specific price first, if companyId is provided
    if (companyId) {
      const { data, error } = await supabase
        .from('company_prices')
        .select('price')
        .eq('company_id', companyId)
        .eq('appointment_type_id', appointmentTypeId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching company-specific price:', error);
      } else if (data) {
        return {
          price: Number(data.price),
          source: 'COMPANY_PRICE'
        };
      }
    }

    // 2. Fallback to default (Particular) price where company_id is NULL
    const { data, error } = await supabase
      .from('company_prices')
      .select('price')
      .is('company_id', null)
      .eq('appointment_type_id', appointmentTypeId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching default price:', error);
    } else if (data) {
      return {
        price: Number(data.price),
        source: 'DEFAULT_PRICE'
      };
    }

    // 3. Fallback to appointment_types.default_price (General Default) if no explicit entries exist
    try {
      // Query everything and check field to prevent crashing if the column does not exist yet
      const { data: typeData, error: typeError } = await supabase
        .from('appointment_types')
        .select('*')
        .eq('id', appointmentTypeId)
        .maybeSingle();

      if (typeError) {
        console.error('Error fetching default price from appointment_types:', typeError);
      } else if (typeData) {
        const defaultPrice = (typeData as any).default_price;
        if (defaultPrice !== undefined && defaultPrice !== null) {
          return {
            price: Number(defaultPrice),
            source: 'DEFAULT_PRICE'
          };
        }
      }
    } catch (err) {
      console.error('Error querying default_price in appointment_types table:', err);
    }

    return null;
  }
};
