-- TABLA DE USUARIOS PARA SISTEMA NUMERICA
-- Tabla separada para gestión de usuarios sin afectar datos históricos

CREATE TABLE IF NOT EXISTS Numerica_Users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Información básica de autenticación
    cognito_sub VARCHAR(255) UNIQUE, -- Se asigna después del primer login
    email VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'pending_setup', -- pending_setup, profile_incomplete, phone_verification, active, suspended
    
    -- Información personal (se completa en primer login)
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone_number VARCHAR(20),
    phone_verified BOOLEAN DEFAULT FALSE,
    
    -- Control de configuración inicial
    password_changed BOOLEAN DEFAULT FALSE,
    profile_completed BOOLEAN DEFAULT FALSE,
    setup_completed BOOLEAN DEFAULT FALSE,
    
    -- Configuración 2FA
    twofa_enabled BOOLEAN DEFAULT TRUE, -- Obligatorio para todos
    twofa_method VARCHAR(20) DEFAULT 'sms', -- sms, app (futuro)
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) DEFAULT 'admin', -- Quien creó el usuario
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    
    -- Metadatos del sistema
    user_role VARCHAR(50) DEFAULT 'user', -- admin, user (para futuro)
    notes TEXT, -- Notas administrativas
    
    -- Validaciones
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (phone_number IS NULL OR phone_number ~* '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT valid_status CHECK (status IN ('pending_setup', 'profile_incomplete', 'phone_verification', 'active', 'suspended'))
);

-- Tabla para códigos de verificación 2FA
CREATE TABLE IF NOT EXISTS Numerica_SMS_Codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES Numerica_Users(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) NOT NULL, -- phone_verification, login_2fa
    phone_number VARCHAR(20) NOT NULL, -- El número al que se envió
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_code CHECK (code ~ '^[0-9]{6}$'),
    CONSTRAINT valid_purpose CHECK (purpose IN ('phone_verification', 'login_2fa'))
);

-- Tabla para sesiones de login pendientes (2FA)
CREATE TABLE IF NOT EXISTS Numerica_Login_Sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES Numerica_Users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    cognito_session_data JSONB, -- Data de Cognito si es necesaria
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_numerica_users_email ON Numerica_Users(email);
CREATE INDEX IF NOT EXISTS idx_numerica_users_cognito_sub ON Numerica_Users(cognito_sub);
CREATE INDEX IF NOT EXISTS idx_numerica_users_status ON Numerica_Users(status);
CREATE INDEX IF NOT EXISTS idx_numerica_sms_codes_user_expires ON Numerica_SMS_Codes(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_numerica_login_sessions_token ON Numerica_Login_Sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_numerica_login_sessions_expires ON Numerica_Login_Sessions(expires_at);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_numerica_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_numerica_users_updated_at_trigger 
    BEFORE UPDATE ON Numerica_Users 
    FOR EACH ROW EXECUTE FUNCTION update_numerica_users_updated_at();

-- Función para limpiar códigos y sesiones expiradas
CREATE OR REPLACE FUNCTION cleanup_numerica_expired_data()
RETURNS TABLE(sms_codes_deleted INTEGER, sessions_deleted INTEGER) AS $$
DECLARE
    sms_deleted INTEGER;
    sessions_deleted INTEGER;
BEGIN
    -- Limpiar códigos SMS expirados o usados hace más de 24h
    DELETE FROM Numerica_SMS_Codes 
    WHERE expires_at < NOW() OR (used = TRUE AND used_at < NOW() - INTERVAL '24 hours');
    GET DIAGNOSTICS sms_deleted = ROW_COUNT;
    
    -- Limpiar sesiones expiradas
    DELETE FROM Numerica_Login_Sessions 
    WHERE expires_at < NOW();
    GET DIAGNOSTICS sessions_deleted = ROW_COUNT;
    
    RETURN QUERY SELECT sms_deleted, sessions_deleted;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estado del usuario
CREATE OR REPLACE FUNCTION get_user_setup_status(user_email VARCHAR)
RETURNS TABLE(
    user_id UUID,
    email VARCHAR,
    status VARCHAR,
    needs_password_change BOOLEAN,
    needs_profile_completion BOOLEAN,
    needs_phone_verification BOOLEAN,
    setup_complete BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        nu.id,
        nu.email,
        nu.status,
        NOT nu.password_changed as needs_password_change,
        NOT nu.profile_completed as needs_profile_completion,
        NOT nu.phone_verified as needs_phone_verification,
        nu.setup_completed
    FROM Numerica_Users nu
    WHERE nu.email = user_email;
END;
$$ LANGUAGE plpgsql;

-- Insertar usuarios iniciales con contraseñas temporales
INSERT INTO Numerica_Users (email, status, created_by, notes) VALUES
('alberto.ochoaf@gmail.com', 'pending_setup', 'admin', 'Usuario administrador - resetear para nuevo flujo'),
('rroman@vencom.com.mx', 'pending_setup', 'admin', 'Usuario inicial - contraseña temporal asignada'),
('arangel@vencom.com.mx', 'pending_setup', 'admin', 'Usuario inicial - contraseña temporal asignada'),
('epirez@vencom.com.mx', 'pending_setup', 'admin', 'Usuario inicial - contraseña temporal asignada'),
('aibarrola.mateos@vencom.com.mx', 'pending_setup', 'admin', 'Usuario inicial - contraseña temporal asignada'),
('pibarrola@vencom.com.mx', 'pending_setup', 'admin', 'Usuario inicial - contraseña temporal asignada'),
('aibarrola@vencom.com.mx', 'pending_setup', 'admin', 'Usuario inicial - contraseña temporal asignada')
ON CONFLICT (email) DO NOTHING;

-- Vista para resumen de usuarios
CREATE OR REPLACE VIEW Numerica_Users_Summary AS
SELECT 
    id,
    email,
    COALESCE(first_name || ' ' || last_name, 'Sin nombre') as full_name,
    status,
    CASE 
        WHEN setup_completed THEN '✅ Configurado'
        WHEN profile_completed THEN '📝 Verificando teléfono'
        WHEN password_changed THEN '👤 Completando perfil'
        ELSE '🔐 Pendiente setup inicial'
    END as setup_status,
    phone_number,
    phone_verified,
    last_login,
    login_count,
    created_at
FROM Numerica_Users
ORDER BY created_at DESC;
