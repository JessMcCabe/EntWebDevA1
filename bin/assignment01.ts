#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Assignment01Stack } from '../lib/assignment01-stack';
import { AuthAppStack } from '../lib/auth-app-stack';


//multi stack deployment
//https://docs.aws.amazon.com/cdk/v2/guide/stacks.html
const app = new cdk.App();
new Assignment01Stack(app, 'AppStack',  { env: { region: "eu-west-1" } });
new AuthAppStack(app, 'AuthStack',  { env: { region: "eu-west-1" } });
