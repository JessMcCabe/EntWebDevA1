#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Assignment01Stack } from '../lib/assignment01-stack';

const app = new cdk.App();
new Assignment01Stack(app, 'Assignment01Stack',  { env: { region: "eu-west-1" } });
