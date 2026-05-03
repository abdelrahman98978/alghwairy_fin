-- Sovereign Financial Ledger - Core Schema (Supabase)

-- 1. Transactions (Main Ledger)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trx_number TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(20, 2) NOT NULL,
    type TEXT CHECK (type IN ('income', 'expense')),
    status TEXT DEFAULT 'مكتمل',
    currency TEXT DEFAULT 'SAR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    user_email TEXT -- Who created it
);

-- 2. Customers (Legal Entities)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    vat_number TEXT,
    cr_number TEXT,
    phone TEXT,
    email TEXT,
    type TEXT CHECK (type IN ('individual', 'corporate', 'agency')),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Invoices (ZATCA Compliant)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    amount DECIMAL(20, 2) NOT NULL,
    vat DECIMAL(20, 2) NOT NULL,
    total DECIMAL(20, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'cancelled')),
    zatca_hash TEXT, -- Phase 2 Hash
    qr_code_data TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Expenses (Institutional Spending)
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exp_number TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    amount DECIMAL(20, 2) NOT NULL,
    status TEXT DEFAULT 'Approved',
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. User Roles & Security (Sovereign Identity)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    password TEXT NOT NULL, -- Stored as plain for simplicity in this demo, usually hashed
    role TEXT CHECK (role IN ('admin', 'cfo', 'accountant', 'auditor')),
    biometric_key TEXT, -- Stores JSON string of WebAuthn Credential ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Activity Logs (Audit Integrity)
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
