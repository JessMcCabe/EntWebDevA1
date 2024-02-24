import * as cdk from 'aws-cdk-lib';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from 'constructs';
import * as custom from "aws-cdk-lib/custom-resources";
import { generateBatch } from "../shared/util";
import {movieReview} from "../seed/movieReview";
import * as lambdanode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class Assignment01Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    const movieReviewsTable = new dynamodb.Table(this, "movieReviews", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "movieReviews",
    });

    new custom.AwsCustomResource(this, "movieReviewsddbInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [movieReviewsTable.tableName]: generateBatch(movieReview),
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("movieReviewsddbInitData"), //.of(Date.now().toString()),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [movieReviewsTable.tableArn],
      }),
    });


    const getMovieByIdFn = new lambdanode.NodejsFunction(
      this,
      "GetMovieByIdFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: `${__dirname}/../lambdas/getMovieById.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: movieReviewsTable.tableName,
          REGION: 'eu-west-1',
        },
      }
    );

    const getMovieByIdURL = getMovieByIdFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ["*"],
      },
    });

    movieReviewsTable.grantReadData(getMovieByIdFn)

    new cdk.CfnOutput(this, "Get Movie Function Url", { value: getMovieByIdURL.url });
    
  }

  

  
}
