import { createClient } from '@supabase/supabase-js';

const getClient = () => {
    const url = localStorage.getItem('sov_supabase_url') || 'https://qbrsiulszjzqwiljnuym.supabase.co';
    const key = localStorage.getItem('sov_supabase_key') || 'sb_publishable_WbHnx1jcZ_SnCK9Ug1ZVfA_ogetXnKl';
    return createClient(url, key);
};

export const supabase = getClient();
