#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PayrollStack } from '../lib/infra-cdk-stack';

const app = new cdk.App();
new PayrollStack(app, 'PayrollEmployeesStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

