import * as cdk from 'aws-cdk-lib';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from 'constructs';
import * as custom from "aws-cdk-lib/custom-resources";
import { generateBatch } from "../shared/util";
import {movieReview} from "../seed/movieReview";
import * as lambdanode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apig from "aws-cdk-lib/aws-apigateway";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class Assignment01Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    //Table
    const movieReviewsTable = new dynamodb.Table(this, "movieReviews", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: {name: "reviewDate", type: dynamodb.AttributeType.STRING},
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "movieReviews",
    });

    movieReviewsTable.addGlobalSecondaryIndex({
      indexName: "rvrName",
      partitionKey: { name: "reviewerName", type: dynamodb.AttributeType.STRING },
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

//Functions
   

    const getReviewsByMovieIdFn = new lambdanode.NodejsFunction(
      this,
      "GetReviewsByMovieIdFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/getReviewsByMovieId.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: movieReviewsTable.tableName,
          REGION: 'eu-west-1',
        },
      }
      );

      const getReviewByReviewerNameFn = new lambdanode.NodejsFunction(
        this,
        "GetReviewByReviewerNameFn",
        {
          architecture: lambda.Architecture.ARM_64,
          runtime: lambda.Runtime.NODEJS_18_X,
          entry: `${__dirname}/../lambdas/getReviewByReviewerName.ts`,
          timeout: cdk.Duration.seconds(10),
          memorySize: 128,
          environment: {
            TABLE_NAME: movieReviewsTable.tableName,
            REGION: 'eu-west-1',
          },
        }
        );

        const newMovieReviewFn = new lambdanode.NodejsFunction(this, "AddMovieReviewFn", {
          architecture: lambda.Architecture.ARM_64,
          runtime: lambda.Runtime.NODEJS_16_X,
          entry: `${__dirname}/../lambdas/addMovieReview.ts`,
          timeout: cdk.Duration.seconds(10),
          memorySize: 128,
          environment: {
            TABLE_NAME: movieReviewsTable.tableName,
            REGION: "eu-west-1",
          },
        });

    //Permissions
    movieReviewsTable.grantReadData(getReviewsByMovieIdFn)
    movieReviewsTable.grantReadData(getReviewByReviewerNameFn)
    movieReviewsTable.grantReadWriteData(newMovieReviewFn)


    // REST API 
    const api = new apig.RestApi(this, "RestAPI", {
      description: "movie reviews api",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date"],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });

    const moviesEndpoint = api.root.addResource("movies");
    moviesEndpoint.addMethod(
      "GET"
    );
    const movieIdEndpoint = moviesEndpoint.addResource("{movieId}");
    movieIdEndpoint.addMethod(
      "GET"
    );
    const movieReviewsEndpoint = movieIdEndpoint.addResource("reviews");
    movieReviewsEndpoint.addMethod(
      "GET",new apig.LambdaIntegration(getReviewsByMovieIdFn, { proxy: true })
    );

    const movieReviewsAddEndpoint = moviesEndpoint.addResource("reviews");
    movieReviewsAddEndpoint.addMethod(
      "POST", new apig.LambdaIntegration(newMovieReviewFn, { proxy: true })
    );
    const reviewsEndpoint = api.root.addResource("reviews");
    reviewsEndpoint.addMethod(
      "GET"
    );
    const reviewerNameEndpoint = reviewsEndpoint.addResource("{reviewerName}");
    reviewerNameEndpoint.addMethod(
      "GET",new apig.LambdaIntegration(getReviewByReviewerNameFn, { proxy: true })
    );
  
    
  }
}
