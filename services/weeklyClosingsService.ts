import { supabase } from '@/lib/supabase';
import { WeeklyClosing } from '@/lib/types';

export const weeklyClosingsService = {
  /**
   * Fetches all weekly closing records from the database.
   * Joins the closed_by profile details.
   */
  async getWeeklyClosings(): Promise<WeeklyClosing[]> {
    // Attempt 1: Try with custom fkey alias
    try {
      const { data, error } = await supabase
        .from('weekly_closings')
        .select('*, profiles!weekly_closings_closed_by_fkey(id, full_name)')
        .order('period_start', { ascending: false });

      if (!error && data) {
        return (data as any[]).map(item => {
          const { profiles, ...rest } = item;
          return {
            ...rest,
            profiles: profiles || null
          };
        }) as WeeklyClosing[];
      }
      
      if (error) {
        console.warn('Attempt 1 (with custom fkey) failed for getWeeklyClosings. Retrying with simpler profiles join...', error);
      }
    } catch (e) {
      console.warn('Attempt 1 exception:', e);
    }

    // Attempt 2: Simple join without explicit fkey alias
    try {
      const { data, error } = await supabase
        .from('weekly_closings')
        .select('*, profiles(id, full_name)')
        .order('period_start', { ascending: false });

      if (!error && data) {
        return (data as any[]).map(item => {
          const { profiles, ...rest } = item;
          return {
            ...rest,
            profiles: profiles || null
          };
        }) as WeeklyClosing[];
      }
      if (error) {
        console.warn('Attempt 2 (simple profiles join) failed. Retrying with explicit closed_by join...', error);
      }
    } catch (e) {
      console.warn('Attempt 2 exception:', e);
    }

    // Attempt 3: Explicit closed_by join
    try {
      const { data, error } = await supabase
        .from('weekly_closings')
        .select('*, profiles!closed_by(id, full_name)')
        .order('period_start', { ascending: false });

      if (!error && data) {
        return (data as any[]).map(item => {
          const { profiles, ...rest } = item;
          return {
            ...rest,
            profiles: profiles || null
          };
        }) as WeeklyClosing[];
      }
    } catch (e) {
      console.warn('Attempt 3 exception:', e);
    }

    // Attempt 4 (Guaranteed/Bulletproof): Fetch without join, manually batch fetch profiles
    console.log('Using robust application-level manual join fallback for getWeeklyClosings...');
    const { data, error } = await supabase
      .from('weekly_closings')
      .select('*')
      .order('period_start', { ascending: false });

    if (error) {
      console.error('All getWeeklyClosings attempts failed, including manual fetch:', error);
      throw error;
    }

    const closings = data || [];
    const closedByUuids = Array.from(new Set(closings.map(c => c.closed_by).filter(Boolean)));

    let profilesMap = new Map<string, { id: string; full_name: string }>();
    if (closedByUuids.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', closedByUuids);

      if (!profilesError && profilesData) {
        profilesData.forEach(p => {
          profilesMap.set(p.id, p);
        });
      }
    }

    return closings.map(item => {
      const profileInfo = item.closed_by ? (profilesMap.get(item.closed_by) || null) : null;
      return {
        ...item,
        profiles: profileInfo
      } as WeeklyClosing;
    });
  },

  /**
   * Fetches a single weekly closing record by its ID.
   */
  async getWeeklyClosingById(id: string): Promise<WeeklyClosing | null> {
    if (!id) return null;

    // Attempt 1: Try with custom fkey alias
    try {
      const { data, error } = await supabase
        .from('weekly_closings')
        .select('*, profiles!weekly_closings_closed_by_fkey(id, full_name)')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        const { profiles, ...rest } = data as any;
        return {
          ...rest,
          profiles: profiles || null
        } as WeeklyClosing;
      }
    } catch (e) {
      console.warn('getWeeklyClosingById Attempt 1 exception:', e);
    }

    // Attempt 2: Simple profiles join
    try {
      const { data, error } = await supabase
        .from('weekly_closings')
        .select('*, profiles(id, full_name)')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        const { profiles, ...rest } = data as any;
        return {
          ...rest,
          profiles: profiles || null
        } as WeeklyClosing;
      }
    } catch (e) {
      console.warn('getWeeklyClosingById Attempt 2 exception:', e);
    }

    // Attempt 3: Explicit closed_by join
    try {
      const { data, error } = await supabase
        .from('weekly_closings')
        .select('*, profiles!closed_by(id, full_name)')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        const { profiles, ...rest } = data as any;
        return {
          ...rest,
          profiles: profiles || null
        } as WeeklyClosing;
      }
    } catch (e) {
      console.warn('getWeeklyClosingById Attempt 1 exception:', e);
    }

    // Attempt 4: Fetch without join, manually fetch profile
    console.log('Using robust manual profiles fetch for getWeeklyClosingById...');
    const { data, error } = await supabase
      .from('weekly_closings')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`Error in getWeeklyClosingById manual fallback for id ${id}:`, error);
      throw error;
    }

    if (!data) return null;

    let profileInfo: { id: string; full_name: string } | null = null;
    if (data.closed_by) {
      const { data: pData, error: pError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', data.closed_by)
        .maybeSingle();
      
      if (!pError && pData) {
        profileInfo = pData;
      }
    }

    return {
      ...data,
      profiles: profileInfo
    } as WeeklyClosing;
  },

  /**
   * Creates a new weekly closing record.
   */
  async createWeeklyClosing(closingData: Partial<WeeklyClosing>): Promise<WeeklyClosing> {
    const { data, error } = await supabase
      .from('weekly_closings')
      .insert([
        {
          period_start: closingData.period_start,
          period_end: closingData.period_end,
          closed_by: closingData.closed_by || null,
          total_revenue: closingData.total_revenue ?? 0.00,
          total_payout: closingData.total_payout ?? 0.00,
          company_revenue: closingData.company_revenue ?? 0.00,
          status: closingData.status || 'DRAFT',
          data_snapshot: closingData.data_snapshot || {},
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error in createWeeklyClosing:', error);
      throw error;
    }

    return data as WeeklyClosing;
  },

  /**
   * Updates an existing weekly closing record.
   */
  async updateWeeklyClosing(id: string, closingData: Partial<WeeklyClosing>): Promise<WeeklyClosing> {
    const { data, error } = await supabase
      .from('weekly_closings')
      .update({
        period_start: closingData.period_start,
        period_end: closingData.period_end,
        closed_by: closingData.closed_by,
        total_revenue: closingData.total_revenue,
        total_payout: closingData.total_payout,
        company_revenue: closingData.company_revenue,
        status: closingData.status,
        data_snapshot: closingData.data_snapshot,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error in updateWeeklyClosing for id ${id}:`, error);
      throw error;
    }

    return data as WeeklyClosing;
  },

  /**
   * Calculates the weekly closing data based on eligible appointments for a given period.
   * Uses real historical snapshots (agreed_price, discount_value, net_value, etc.).
   */
  async calculateClosingData(startDate: string, endDate: string): Promise<{
    period_start: string;
    period_end: string;
    total_revenue: number;
    total_payout: number;
    company_revenue: number;
    data_snapshot: any;
  }> {
    const { data: appointments, error: apptError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        status,
        agreed_price,
        discount_value,
        net_value,
        commission_rate_snapshot,
        fono_id,
        billing_company_id,
        patient_id,
        parent_appointment_id,
        is_continuation,
        profiles!appointments_fono_id_fkey (
          id,
          full_name
        ),
        companies!appointments_billing_company_id_fkey (
          id,
          name
        )
      `)
      .eq('status', 'ATENDIDO')
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate);

    // Note: If explicit fkeys in select above fail due to alias names or missing columns, we'll gracefully fallback
    let apptsData = appointments;
    if (apptError || !apptsData) {
      console.warn('First join failed. Retrying with simpler join schema.', apptError);
      const { data: fallbackAppts, error: fallbackError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          status,
          agreed_price,
          discount_value,
          net_value,
          commission_rate_snapshot,
          fono_id,
          billing_company_id,
          patient_id,
          parent_appointment_id,
          is_continuation,
          profiles (
            id,
            full_name
          ),
          companies (
            id,
            name
          )
        `)
        .eq('status', 'ATENDIDO')
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate);

      if (fallbackError) {
        console.warn('Simplest fallback failed, retrying WITHOUT continuation columns...', fallbackError);
        const { data: ultimateFallback, error: ultimateError } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            status,
            agreed_price,
            discount_value,
            net_value,
            commission_rate_snapshot,
            fono_id,
            billing_company_id,
            patient_id,
            profiles (
              id,
              full_name
            ),
            companies (
              id,
              name
            )
          `)
          .eq('status', 'ATENDIDO')
          .gte('appointment_date', startDate)
          .lte('appointment_date', endDate);

        if (ultimateError) {
          console.error('All fallback attempts failed:', ultimateError);
          throw ultimateError;
        }
        apptsData = (ultimateFallback || []).map(item => ({
          ...item,
          parent_appointment_id: null,
          is_continuation: false
        })) as any;
      } else {
        apptsData = fallbackAppts;
      }
    }

    const appts = apptsData || [];

    // 1. Fetch all companies for Name lookup
    const { data: companiesData } = await supabase
      .from('companies')
      .select('id, name');
    const companiesNameMap = new Map<string, string>();
    companiesData?.forEach(c => companiesNameMap.set(c.id, c.name));

    // 2. Fetch patients involved to map them to their default companies
    const patientIds = Array.from(new Set(appts.map(a => a.patient_id).filter(Boolean)));
    const patientsCompanyMap = new Map<string, string>();
    if (patientIds.length > 0) {
      const { data: patientsData } = await supabase
        .from('patients')
        .select('id, company_id')
        .in('id', patientIds);
      patientsData?.forEach(p => {
        if (p.company_id) {
          patientsCompanyMap.set(p.id, p.company_id);
        }
      });
    }

    let totalRevenue = 0;
    let totalPayout = 0;

    const professionalsMap = new Map<string, {
      fono_id: string;
      name: string;
      count: number;
      gross_total: number;
      discount_total: number;
      net_total: number;
      payout_total: number;
      commission_rate_avg: number;
      company_production: Record<string, number>;
    }>();

    const companiesMap = new Map<string, {
      company_id: string;
      name: string;
      session_count: number;
      patient_ids: Set<string>;
    }>();

    for (const app of appts) {
      if (app.parent_appointment_id || app.is_continuation) {
        continue; // Skip continuation/prolonged appointments entirely from financial summaries
      }
      const gross = Number(app.agreed_price || 0);
      const discount = Number(app.discount_value || 0);
      
      // Net can be read from app.net_value or fall back safely
      const net = app.net_value !== null && app.net_value !== undefined 
        ? Number(app.net_value) 
        : Math.max(0, gross - discount);

      // Commission rate
      let commissionRate = app.commission_rate_snapshot !== null && app.commission_rate_snapshot !== undefined 
        ? Number(app.commission_rate_snapshot) 
        : 0;

      // Handle common percentage conventions
      const rateFraction = commissionRate > 1 ? commissionRate / 100 : commissionRate;
      const payout = Number((net * rateFraction).toFixed(2));

      totalRevenue += net;
      totalPayout += payout;

      // Profiles can come back as object or array depending on PostgREST version
      const profilesObj = (app as any).profiles;
      const profName = (Array.isArray(profilesObj) ? profilesObj[0]?.full_name : profilesObj?.full_name) || 'Profissional Sem Nome';
      const fonoId = app.fono_id || 'unassigned';

      if (!professionalsMap.has(fonoId)) {
        professionalsMap.set(fonoId, {
          fono_id: fonoId,
          name: profName,
          count: 0,
          gross_total: 0,
          discount_total: 0,
          net_total: 0,
          payout_total: 0,
          commission_rate_avg: 0,
          company_production: {},
        });
      }

      const prof = professionalsMap.get(fonoId)!;
      prof.count += 1;
      prof.gross_total = Number((prof.gross_total + gross).toFixed(2));
      prof.discount_total = Number((prof.discount_total + discount).toFixed(2));
      prof.net_total = Number((prof.net_total + net).toFixed(2));
      prof.payout_total = Number((prof.payout_total + payout).toFixed(2));
      prof.commission_rate_avg += commissionRate;

      // Group by company for production counting
      const companyId = app.billing_company_id || (app.patient_id ? patientsCompanyMap.get(app.patient_id) : null) || null;
      const companyName = companyId ? (companiesNameMap.get(companyId) || 'Empresa Sem Nome') : 'Particular';
      prof.company_production[companyName] = (prof.company_production[companyName] || 0) + 1;

      // Global company statistical grouping
      if (companyId) {
        if (!companiesMap.has(companyId)) {
          companiesMap.set(companyId, {
            company_id: companyId,
            name: companyName,
            session_count: 0,
            patient_ids: new Set<string>(),
          });
        }

        const comp = companiesMap.get(companyId)!;
        comp.session_count += 1;
        if (app.patient_id) {
          comp.patient_ids.add(app.patient_id);
        }
      }
    }

    // Average out professional commission rates
    const professionalsList = Array.from(professionalsMap.values()).map(p => {
      const rateAvg = p.count > 0 ? p.commission_rate_avg / p.count : 0;
      return {
        ...p,
        commission_rate_avg: Number(rateAvg.toFixed(2)),
        payout_mode: 'auto',
        payout_calculated: p.payout_total,
        payout_final: p.payout_total,
        notes: ''
      };
    });

    const companiesList = Array.from(companiesMap.values()).map(comp => ({
      company_id: comp.company_id,
      name: comp.name,
      session_count: comp.session_count,
      patient_count: comp.patient_ids.size,
    }));

    return {
      period_start: startDate,
      period_end: endDate,
      total_revenue: Number(totalRevenue.toFixed(2)),
      total_payout: Number(totalPayout.toFixed(2)),
      company_revenue: 0,
      data_snapshot: {
        totals: {
          appointments_count: appts.length,
          total_revenue: Number(totalRevenue.toFixed(2)),
          total_payout: Number(totalPayout.toFixed(2)),
          company_revenue: 0,
        },
        professionals: professionalsList,
        companies: companiesList,
      }
    };
  },

  /**
   * Deletes an existing weekly closing record.
   */
  async deleteWeeklyClosing(id: string): Promise<void> {
    const { error } = await supabase
      .from('weekly_closings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error in deleteWeeklyClosing for id ${id}:`, error);
      throw error;
    }
  }
};
