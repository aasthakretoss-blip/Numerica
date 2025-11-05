# Deployment Guide - Payroll Employees System

## Prerequisites

Before starting, ensure you have:

- **Node.js 18+** and **pnpm** (or npm)
- **Python 3.11**
- **AWS CLI** configured with appropriate permissions
- **AWS CDK v2** (`npm install -g aws-cdk`)

## 1. Initial Setup

### Clone and Install Dependencies

```bash
# Navigate to project directory
cd login

# Install all dependencies
pnpm install -w
```

## 2. Infrastructure Deployment

### Bootstrap CDK (First time only)

```bash
# Bootstrap CDK in your AWS account/region
cdk bootstrap
```

### Deploy Infrastructure

```bash
# Deploy all AWS resources
pnpm deploy:infra
```

This will create:
- VPC with public, private, and isolated subnets
- Aurora PostgreSQL Serverless v2 cluster
- RDS Proxy for connection pooling
- Lambda function for the API
- API Gateway HTTP API
- Cognito User Pool with groups (viewer, manager, hr, admin)
- S3 buckets for website hosting and test data
- CloudFront distribution

### Note Outputs

After deployment, CDK will output important values:
```
PayrollEmployeesStack.ApiUrl = https://xxxxx.execute-api.region.amazonaws.com
PayrollEmployeesStack.CloudFrontUrl = https://xxxxx.cloudfront.net
PayrollEmployeesStack.UserPoolId = region_xxxxxxxxx
PayrollEmployeesStack.UserPoolClientId = xxxxx
PayrollEmployeesStack.WebsiteBucket = payroll-employees-account-region
PayrollEmployeesStack.Region = us-east-1
```

## 3. Database Setup

### Connect to Database

Use AWS Systems Manager Session Manager or a bastion host to connect to Aurora:

```bash
# Generate seed data (200 employees)
cd backend-lambda/seed
python generate_seed.py 200 > employees.csv

# Connect to database using psql via RDS Proxy
psql -h YOUR_RDS_PROXY_ENDPOINT -U postgres -d payroll

# Run schema creation
\i schema.sql

# Load seed data
\copy employees FROM 'employees.csv' WITH (FORMAT CSV, HEADER);
```

## 4. Frontend Configuration

### Set Environment Variables

Create `frontend-react/.env.local`:

```bash
# Copy from outputs above
VITE_REACT_APP_API_URL=https://xxxxx.execute-api.region.amazonaws.com
VITE_REACT_APP_COGNITO_REGION=us-east-1
VITE_REACT_APP_COGNITO_USER_POOL_ID=region_xxxxxxxxx
VITE_REACT_APP_COGNITO_CLIENT_ID=xxxxx
VITE_REACT_APP_TEST_JSON_URL=/test-employees.json
```

### Local Development

```bash
# Start development server
pnpm dev
```

Access: http://localhost:5173

### Deploy Frontend to S3

```bash
# Build and deploy frontend
pnpm build
aws s3 sync frontend-react/dist s3://YOUR_WEBSITE_BUCKET --delete
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

## 5. User Management

### Create Users in Cognito

```bash
# Create a test admin user
aws cognito-idp admin-create-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin@example.com \
  --user-attributes Name=email,Value=admin@example.com \
  --temporary-password TempPass123!

# Add user to admin group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin@example.com \
  --group-name admin
```

## 6. Testing the System

### Test Data Loading Priority

The system loads data in this priority order:

1. **Backend API** (if VITE_REACT_APP_API_URL is set)
2. **Test File** (test-employees.json in /public)
3. **LocalStorage** (key: 'uploadedPayrollData')
4. **Memory** (empty fallback)

### Test API Endpoints

```bash
# Test without auth (should return 401)
curl https://YOUR_API_URL/api/employees

# Test with Cognito JWT token
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://YOUR_API_URL/api/employees
```

### Test Frontend Features

1. **Search and Filters**: RFC, nombre, puesto, sucursal
2. **Sorting**: Click column headers (↑↓ indicators)
3. **Pagination**: Navigate through pages
4. **Multi-source loading**: Check "Origen" in dashboard
5. **Responsive design**: Test on mobile/desktop

## 7. Monitoring and Logs

### CloudWatch Logs

- Lambda logs: `/aws/lambda/PayrollEmployeesStack-PayrollAPILambda*`
- API Gateway logs: Available in API Gateway console

### CloudWatch Metrics

- Aurora metrics: Database connections, CPU, storage
- Lambda metrics: Duration, errors, invocations
- CloudFront metrics: Cache hit ratio, origin requests

## 8. Security Considerations

### Authentication Flow

1. Users sign in via Cognito
2. Cognito returns JWT tokens (ID token contains groups)
3. Frontend sends JWT in Authorization header
4. Lambda validates JWT against Cognito JWKS
5. RBAC checks group membership for authorization

### Group Permissions

- **viewer**: Read-only access to employees
- **manager**: Read + basic employee updates (future)
- **hr**: Read + activate/deactivate employees (future)  
- **admin**: Full access to all operations

### Network Security

- Aurora in private subnets (no internet access)
- Lambda in VPC with security groups
- RDS Proxy for secure connection pooling
- API Gateway with CORS restrictions

## 9. Costs Optimization

### Current Architecture Costs (estimated)

- Aurora Serverless v2: ~$15-30/month (with ACU 0.5-2)
- Lambda: Pay per request (very low for typical usage)
- API Gateway: $1 per million requests
- S3: ~$1-5/month for hosting + data transfer
- CloudFront: ~$1-10/month depending on traffic

### Cost Optimization Tips

- Aurora scales to 0.5 ACU when idle
- Lambda has generous free tier
- Enable S3 intelligent tiering for test data
- Use CloudFront for global performance and cost reduction

## 10. Troubleshooting

### Common Issues

**Frontend not loading data:**
- Check browser network tab for CORS errors
- Verify API Gateway URL in environment variables
- Check Cognito authentication status

**Lambda timeouts:**
- Check VPC connectivity to RDS Proxy
- Verify security group rules allow PostgreSQL (5432)
- Check RDS Proxy endpoint configuration

**Authentication failures:**
- Verify User Pool and Client IDs
- Check JWKS URL in Lambda environment
- Ensure users are in correct groups

**Database connection issues:**
- Check RDS Proxy configuration
- Verify Lambda VPC configuration
- Check security group rules

### Debug Commands

```bash
# Check CDK diff before deployment
pnpm -C infra-cdk cdk:diff

# View CloudFormation events
aws cloudformation describe-stack-events --stack-name PayrollEmployeesStack

# Test Lambda function locally (if using SAM)
sam local invoke PayrollAPILambda

# Check Cognito user status
aws cognito-idp admin-get-user --user-pool-id YOUR_POOL_ID --username admin@example.com
```

## 11. Next Steps

### Recommended Enhancements

1. **Add comprehensive testing**:
   - Frontend: Jest + React Testing Library
   - Backend: pytest with test fixtures
   - E2E: Playwright or Cypress

2. **Implement CI/CD**:
   - GitHub Actions or AWS CodePipeline
   - Automated testing and deployment
   - Environment-specific configurations

3. **Add more features**:
   - Employee detail editing
   - Bulk operations
   - Data export (CSV, PDF)
   - Advanced reporting and analytics

4. **Improve observability**:
   - AWS X-Ray tracing
   - Custom CloudWatch dashboards
   - Structured logging
   - Performance monitoring

5. **Security hardening**:
   - WAF rules for API Gateway
   - VPC Flow logs
   - Secrets rotation
   - Security scanning

This system provides a solid foundation for an enterprise payroll management application with modern architecture, security best practices, and scalability built-in.
