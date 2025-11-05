# AWS Cognito Authentication Setup Script
# Asegúrate de tener AWS CLI configurado antes de ejecutar este script

# Variables de configuración
$REGION = "us-east-1"
$APP_NAME = "numerica-auth"

Write-Host "🚀 Configurando autenticación AWS Cognito para $APP_NAME" -ForegroundColor Green

# Verificar autenticación de AWS CLI
Write-Host "📋 Verificando credenciales AWS..." -ForegroundColor Yellow
try {
    $callerIdentity = aws sts get-caller-identity --output json | ConvertFrom-Json
    $ACCOUNT_ID = $callerIdentity.Account
    Write-Host "✅ AWS CLI autenticado. Account ID: $ACCOUNT_ID" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: AWS CLI no está configurado correctamente" -ForegroundColor Red
    Write-Host "Por favor ejecuta: aws configure" -ForegroundColor Red
    exit 1
}

# 1. Crear User Pool en Cognito
Write-Host "📱 Creando User Pool en Cognito..." -ForegroundColor Yellow
$userPoolResult = aws cognito-idp create-user-pool `
    --pool-name "$APP_NAME-userpool" `
    --policies 'PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=true}' `
    --auto-verified-attributes email `
    --admin-create-user-config 'AllowAdminCreateUserOnly=true' `
    --mfa-configuration "OFF" `
    --schema Name=email,AttributeDataType=String,Required=true,Mutable=true `
    --region $REGION `
    --output json

$userPool = $userPoolResult | ConvertFrom-Json
$USER_POOL_ID = $userPool.UserPool.Id
Write-Host "✅ User Pool creado: $USER_POOL_ID" -ForegroundColor Green

# 2. Crear App Client
Write-Host "📱 Creando App Client..." -ForegroundColor Yellow
$appClientResult = aws cognito-idp create-user-pool-client `
    --user-pool-id "$USER_POOL_ID" `
    --client-name "react-client" `
    --generate-secret false `
    --explicit-auth-flows "ALLOW_USER_PASSWORD_AUTH" "ALLOW_REFRESH_TOKEN_AUTH" "ALLOW_ADMIN_USER_PASSWORD_AUTH" `
    --prevent-user-existence-errors ENABLED `
    --region $REGION `
    --output json

$appClient = $appClientResult | ConvertFrom-Json
$USER_POOL_CLIENT_ID = $appClient.UserPoolClient.ClientId
Write-Host "✅ App Client creado: $USER_POOL_CLIENT_ID" -ForegroundColor Green

# 3. Crear tabla DynamoDB
Write-Host "🗄️  Creando tabla DynamoDB para permisos..." -ForegroundColor Yellow
aws dynamodb create-table `
    --table-name user_permissions `
    --attribute-definitions AttributeName=user_sub,AttributeType=S `
    --key-schema AttributeName=user_sub,KeyType=HASH `
    --billing-mode PAY_PER_REQUEST `
    --region $REGION `
    --output table | Out-Null

Write-Host "✅ Tabla user_permissions creada" -ForegroundColor Green

# 4. Crear IAM Role para Lambda
Write-Host "🔐 Creando IAM Role para Lambda..." -ForegroundColor Yellow

# Trust policy para Lambda
$trustPolicy = @{
    Version = "2012-10-17"
    Statement = @(
        @{
            Effect = "Allow"
            Principal = @{
                Service = "lambda.amazonaws.com"
            }
            Action = "sts:AssumeRole"
        }
    )
} | ConvertTo-Json -Depth 10

$trustPolicyPath = "trust-policy.json"
$trustPolicy | Out-File -FilePath $trustPolicyPath -Encoding UTF8

# Crear el rol
$roleResult = aws iam create-role `
    --role-name "$APP_NAME-lambda-role" `
    --assume-role-policy-document "file://$trustPolicyPath" `
    --output json

$role = $roleResult | ConvertFrom-Json
$LAMBDA_ROLE_ARN = $role.Role.Arn

# Adjuntar política básica de Lambda
aws iam attach-role-policy `
    --role-name "$APP_NAME-lambda-role" `
    --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" | Out-Null

# Crear política inline para acceso a DynamoDB
$dynamoPolicy = @{
    Version = "2012-10-17"
    Statement = @(
        @{
            Effect = "Allow"
            Action = @("dynamodb:GetItem")
            Resource = "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/user_permissions"
        }
    )
} | ConvertTo-Json -Depth 10

$dynamoPolicyPath = "dynamo-policy.json"
$dynamoPolicy | Out-File -FilePath $dynamoPolicyPath -Encoding UTF8

aws iam put-role-policy `
    --role-name "$APP_NAME-lambda-role" `
    --policy-name "DynamoDBReadPermissions" `
    --policy-document "file://$dynamoPolicyPath" | Out-Null

Write-Host "✅ IAM Role creado: $LAMBDA_ROLE_ARN" -ForegroundColor Green

# Esperar a que el rol se propague
Write-Host "⏳ Esperando propagación del IAM Role..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 5. Crear función Lambda
Write-Host "⚡ Creando función Lambda..." -ForegroundColor Yellow

# Crear ZIP de la función Lambda
cd infra/lambda-pretoken
if (Test-Path "pretoken.zip") { Remove-Item "pretoken.zip" }

# Comprimir archivos usando PowerShell
Compress-Archive -Path "index.mjs", "package.json", "node_modules" -DestinationPath "pretoken.zip" -Force

$lambdaResult = aws lambda create-function `
    --function-name "$APP_NAME-pretoken-claims-injector" `
    --runtime nodejs18.x `
    --role "$LAMBDA_ROLE_ARN" `
    --handler index.handler `
    --zip-file "fileb://pretoken.zip" `
    --environment "Variables={PERMISSIONS_TABLE=user_permissions}" `
    --timeout 30 `
    --region $REGION `
    --output json

$lambda = $lambdaResult | ConvertFrom-Json
$LAMBDA_ARN = $lambda.FunctionArn

cd ../..
Write-Host "✅ Función Lambda creada: $LAMBDA_ARN" -ForegroundColor Green

# 6. Conectar trigger en Cognito
Write-Host "🔗 Conectando trigger Lambda a Cognito..." -ForegroundColor Yellow

# Dar permisos a Cognito para invocar Lambda
aws lambda add-permission `
    --function-name "$APP_NAME-pretoken-claims-injector" `
    --principal cognito-idp.amazonaws.com `
    --action lambda:InvokeFunction `
    --statement-id cognito-trigger `
    --source-arn "arn:aws:cognito-idp:${REGION}:${ACCOUNT_ID}:userpool/$USER_POOL_ID" `
    --region $REGION | Out-Null

# Actualizar User Pool con el trigger
aws cognito-idp update-user-pool `
    --user-pool-id "$USER_POOL_ID" `
    --lambda-config "PreTokenGeneration=$LAMBDA_ARN" `
    --region $REGION | Out-Null

Write-Host "✅ Trigger Lambda conectado a Cognito" -ForegroundColor Green

# 7. Crear usuario de prueba
Write-Host "👤 Creando usuario de prueba..." -ForegroundColor Yellow
$EMAIL_TEST = "admin@numerica.com"

aws cognito-idp admin-create-user `
    --user-pool-id "$USER_POOL_ID" `
    --username "$EMAIL_TEST" `
    --user-attributes Name=email,Value="$EMAIL_TEST" `
    --message-action SUPPRESS `
    --desired-delivery-mediums EMAIL `
    --temporary-password "TempPassw0rd!" `
    --region $REGION | Out-Null

Write-Host "✅ Usuario de prueba creado: $EMAIL_TEST" -ForegroundColor Green

# Obtener el SUB del usuario
$userResult = aws cognito-idp admin-get-user `
    --user-pool-id "$USER_POOL_ID" `
    --username "$EMAIL_TEST" `
    --region $REGION `
    --output json

$user = $userResult | ConvertFrom-Json
$USER_SUB = ($user.UserAttributes | Where-Object { $_.Name -eq "sub" }).Value

# 8. Insertar permisos en DynamoDB
Write-Host "🗄️  Insertando permisos en DynamoDB..." -ForegroundColor Yellow
aws dynamodb put-item `
    --table-name user_permissions `
    --item "{`"user_sub`":{`"S`":`"$USER_SUB`"},`"role`":{`"S`":`"admin`"},`"can_upload`":{`"S`":`"true`"},`"can_view_funds`":{`"S`":`"true`"}}" `
    --region $REGION | Out-Null

Write-Host "✅ Permisos insertados para el usuario admin" -ForegroundColor Green

# Limpiar archivos temporales
Remove-Item "trust-policy.json" -ErrorAction SilentlyContinue
Remove-Item "dynamo-policy.json" -ErrorAction SilentlyContinue

Write-Host "`n🎉 ¡Configuración completada exitosamente!" -ForegroundColor Green
Write-Host "`n📋 Resumen de recursos creados:" -ForegroundColor Cyan
Write-Host "USER_POOL_ID: $USER_POOL_ID" -ForegroundColor White
Write-Host "USER_POOL_CLIENT_ID: $USER_POOL_CLIENT_ID" -ForegroundColor White
Write-Host "LAMBDA_ARN: $LAMBDA_ARN" -ForegroundColor White
Write-Host "ACCOUNT_ID: $ACCOUNT_ID" -ForegroundColor White
Write-Host "REGIÓN: $REGION" -ForegroundColor White
Write-Host "Usuario de prueba: $EMAIL_TEST" -ForegroundColor White
Write-Host "Contraseña temporal: TempPassw0rd!" -ForegroundColor White

# Crear archivo de configuración para React
$awsConfig = @"
export default {
  Auth: {
    region: '$REGION',
    userPoolId: '$USER_POOL_ID',
    userPoolWebClientId: '$USER_POOL_CLIENT_ID',
    mandatorySignIn: true
  }
};
"@

$awsConfig | Out-File -FilePath "src\aws-exports.ts" -Encoding UTF8

Write-Host "`n✅ Archivo src/aws-exports.ts creado con la configuración" -ForegroundColor Green

# Mostrar comandos útiles
Write-Host "`n🔧 Comandos útiles:" -ForegroundColor Cyan
Write-Host "Para crear un nuevo usuario:" -ForegroundColor Yellow
Write-Host "aws cognito-idp admin-create-user --user-pool-id `"$USER_POOL_ID`" --username `"usuario@email.com`" --user-attributes Name=email,Value=`"usuario@email.com`" --message-action SUPPRESS --temporary-password `"TempPass123!`" --region $REGION" -ForegroundColor Gray

Write-Host "`nPara asignar permisos a un usuario (reemplazar USER_SUB):" -ForegroundColor Yellow
Write-Host "aws dynamodb put-item --table-name user_permissions --item '{`"user_sub`":{`"S`":`"USER_SUB_AQUI`"},`"role`":{`"S`":`"user`"},`"can_upload`":{`"S`":`"false`"},`"can_view_funds`":{`"S`":`"false`"}}' --region $REGION" -ForegroundColor Gray

Write-Host "`n🚀 Ahora puedes ejecutar: npm run dev" -ForegroundColor Green
