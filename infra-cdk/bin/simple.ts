#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SimplePayrollStack } from '../lib/simple-stack';

const app = new cdk.App();
new SimplePayrollStack(app, 'NumericalSimpleStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
