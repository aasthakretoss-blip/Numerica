import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { Construct } from 'constructs'

export class PayrollStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'PayrollUserPool', {
      userPoolName: 'payroll-employees',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })

    // Add groups
    new cognito.CfnUserPoolGroup(this, 'ViewerGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'viewer',
      description: 'Read-only access'
    })
    new cognito.CfnUserPoolGroup(this, 'ManagerGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'manager',
      description: 'Manager access'
    })
    new cognito.CfnUserPoolGroup(this, 'HRGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'hr',
      description: 'HR access'
    })
    new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: userPool.userPoolId,
      groupName: 'admin',
      description: 'Full admin access'
    })

    const userPoolClient = new cognito.UserPoolClient(this, 'PayrollUserPoolClient', {
      userPool,
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true
        },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE]
      }
    })

    // Lambda Layer for psycopg2 (PostgreSQL client)
    const psycopg2Layer = new lambda.LayerVersion(this, 'Psycopg2Layer', {
      code: lambda.Code.fromAsset('./layers/psycopg2'),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
      description: 'psycopg2-binary compiled for Lambda Python 3.11',
      layerVersionName: 'psycopg2-binary-layer'
    })

    // Lambda function - Uses existing PostgreSQL database
    const apiLambda = new lambda.Function(this, 'PayrollAPILambda', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'enhanced_lambda_function.lambda_handler',
      code: lambda.Code.fromAsset('./lambda-code'),
      layers: [psycopg2Layer],
      environment: {
        // Using existing PostgreSQL database (standard DB_* format)
        // ✅ CREDENCIALES CORREGIDAS
        DB_HOST: 'dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com',
        DB_PORT: '5432',
        DB_NAME: 'Historic',
        DB_USER: 'postgres',
        DB_PASSWORD: 'cd5!A-%aisPF186W',
        COGNITO_JWKS_URL: `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}/.well-known/jwks.json`,
        ALLOWED_ORIGINS: 'http://localhost:5173,https://d3s6xfijfd78h6.cloudfront.net'
      },
      timeout: cdk.Duration.seconds(30)
    })

    // API Gateway
    const httpApi = new apigatewayv2.HttpApi(this, 'PayrollHttpApi', {
      apiName: 'payroll-employees-api',
      corsPreflight: {
        allowOrigins: ['http://localhost:5173', 'https://d3s6xfijfd78h6.cloudfront.net'],
        allowMethods: [apigatewayv2.CorsHttpMethod.ANY],
        allowHeaders: ['*'],
        allowCredentials: true
      }
    })

    const lambdaIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      'PayrollLambdaIntegration',
      apiLambda
    )

    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: lambdaIntegration
    })

    // S3 bucket for frontend hosting
    const websiteBucket = new s3.Bucket(this, 'PayrollWebsiteBucket', {
      bucketName: `payroll-employees-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    })

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'PayrollDistribution', {
      defaultBehavior: {
        origin: new cloudfrontOrigins.S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html'
        }
      ]
    })

    // Test data bucket (optional)
    const testDataBucket = new s3.Bucket(this, 'PayrollTestDataBucket', {
      bucketName: `payroll-test-data-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    })

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: httpApi.apiEndpoint,
      description: 'HTTP API Gateway endpoint URL'
    })
    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront distribution URL'
    })
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID'
    })
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID'
    })
    new cdk.CfnOutput(this, 'TestDataBucket', {
      value: testDataBucket.bucketName,
      description: 'S3 bucket for test data'
    })
    new cdk.CfnOutput(this, 'WebsiteBucket', {
      value: websiteBucket.bucketName,
      description: 'S3 bucket for website hosting'
    })
    new cdk.CfnOutput(this, 'Region', {
      value: this.region,
      description: 'AWS Region'
    })
  }
}

