import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as node from "aws-cdk-lib/aws-lambda-nodejs";
import { getConfig } from "../lib/config";

// 1. Retrieving our config and envs
const config = getConfig();

type AuthApiProps = {
  userPoolId: string;
  userPoolClientId: string;
};

export class AuthApi extends Construct {
   auth: apig.IResource;
   userPoolId: string;
   userPoolClientId: string;

   

  constructor(scope: Construct, id: string, props: AuthApiProps) {
    super(scope, id);

    ({ userPoolId: config.USERPOOL_ID, userPoolClientId: config.CLIENT_ID } =
      props);

    const api = new apig.RestApi(this, "AuthServiceApi", {
      description: "Authentication Service RestApi",
      endpointTypes: [apig.EndpointType.REGIONAL],
      defaultCorsPreflightOptions: {
        allowOrigins: apig.Cors.ALL_ORIGINS,
      },
    });

    console.log("USer Pool ID IS")
    console.log(config.USERPOOL_ID)

    this.auth = api.root.addResource("auth");

    this.addAuthRoute("signup", "POST", "SignupFn", "signup.ts");

    this.addAuthRoute(
      "confirm_signup",
      "POST",
      "ConfirmFn",
      "confirm-signup.ts"
    );

    this.addAuthRoute("signout", "GET", "SignoutFn", "signout.ts");
    this.addAuthRoute("signin", "POST", "SigninFn", "signin.ts");
  }

  private addAuthRoute(
    resourceName: string,
    method: string,
    fnName: string,
    fnEntry: string
  ): void {
    const commonFnProps = {
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "handler",
      environment: {
        USER_POOL_ID: config.USERPOOL_ID,
        CLIENT_ID: config.CLIENT_ID,
        REGION: cdk.Aws.REGION,
      },
    };

    const resource = this.auth.addResource(resourceName);

    const fn = new node.NodejsFunction(this, fnName, {
      ...commonFnProps,
      entry: `${__dirname}/../lambdas/auth/${fnEntry}`,
    });

    resource.addMethod(method, new apig.LambdaIntegration(fn));
  }
}