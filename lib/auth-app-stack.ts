import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import { AuthApi } from './auth-api'
import {AppApi } from './app-api'
import { getConfig } from "../lib/config";

// 1. Retrieving our config and envs
const config = getConfig();

export class AuthAppStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    

    const userPoolId =config.USERPOOL_ID// "process.env.REACT_APP_USER_POOL_ID"
    const userPoolClientId =config.CLIENT_ID //"process.env.REACT_APP_CLIENT_ID";

    new AuthApi(this, 'AuthServiceApi', {
      userPoolId: userPoolId,
      userPoolClientId: userPoolClientId,
    });
  

 

  } 

}