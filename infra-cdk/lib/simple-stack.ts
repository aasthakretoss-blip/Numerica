import * as cdk from 'aws-cdk-lib'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import { Construct } from 'constructs'

export class SimplePayrollStack extends cdk.Stack {
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
      }
    })

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID'
    })
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID'
    })
    new cdk.CfnOutput(this, 'Region', {
      value: this.region,
      description: 'AWS Region'
    })
  }
}
