-- ESQUEMA PARA GESTIÓN DE USUARIOS - NUMERICA
-- Tabla para información adicional de usuarios y 2FA

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cognito_sub VARCHAR(255) NOT NULL UNIQUE, -- ID de Cognito
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    phone_verified BOOLEAN DEFAULT FALSE,
    profile_completed BOOLEAN DEFAULT FALSE,
    
    -- Campos de auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Índices para búsqueda rápida
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (phone_number ~* '^\+?[1-9]\d{1,14}$')
);

-- Tabla para códigos de verificación SMS (2FA)
CREATE TABLE IF NOT EXISTS sms_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) NOT NULL, -- 'phone_verification', 'login_2fa'
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índice para limpieza automática de códigos expirados
    CONSTRAINT valid_code CHECK (code ~ '^[0-9]{6}$')
);

-- Tabla para sesiones de login pendientes de 2FA
CREATE TABLE IF NOT EXISTS pending_logins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    cognito_challenge_session VARCHAR(512), -- Para custom auth challenge
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_cognito_sub ON user_profiles(cognito_sub);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_sms_codes_user_expires ON sms_verification_codes(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_pending_logins_token ON pending_logins(session_token);

-- Función para limpiar códigos expirados (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION cleanup_expired_codes()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sms_verification_codes 
    WHERE expires_at < NOW() OR (used = TRUE AND created_at < NOW() - INTERVAL '24 hours');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    DELETE FROM pending_logins 
    WHERE expires_at < NOW();
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Datos de ejemplo para testing (opcional)
-- INSERT INTO user_profiles (cognito_sub, email, first_name, last_name, phone_number, profile_completed) 
-- VALUES ('example-cognito-sub-123', 'usuario@ejemplo.com', 'Juan', 'Pérez', '+521234567890', true);
