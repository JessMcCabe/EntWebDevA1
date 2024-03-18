import { Aws } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as node from "aws-cdk-lib/aws-lambda-nodejs";
import * as custom from "aws-cdk-lib/custom-resources";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { generateBatch } from "../shared/util";
import {movieReview} from "../seed/movieReview";
import { getConfig } from "../lib/config";

// 1. Retrieving our config and envs
const config = getConfig();


type AppApiProps = {
  userPoolId: string;
  userPoolClientId: string;
};

export class AppApi extends Construct {
  constructor(scope: Construct, id: string, props: AppApiProps) {
    super(scope, id);

    const appApi = new apig.RestApi(this, "AppApi", {
      description: "App RestApi",
      endpointTypes: [apig.EndpointType.REGIONAL],
      defaultCorsPreflightOptions: {
        allowOrigins: apig.Cors.ALL_ORIGINS,
      },
    });


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

    const appCommonFnProps = {
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "handler",
      environment: {
        USER_POOL_ID: config.USERPOOL_ID,
        CLIENT_ID: config.CLIENT_ID,
        REGION: cdk.Aws.REGION,
        TABLE_NAME: movieReviewsTable.tableName,
        
      },
      iamRoleStatements: [
        {
            Effect: 'Allow',
            Action: 'translate:*',
            Resource: '*',
        },
    ],
    };

   
    const getReviewsByMovieIdFn = new node.NodejsFunction(this, "GetReviewsByMovieIdFn",{
      ...appCommonFnProps,
        entry: `${__dirname}/../lambdas/getReviewsByMovieId.ts`,
        
      }
      );

      const getReviewByReviewerNameFn = new node.NodejsFunction(this, "GetReviewByReviewerNameFn",{
        ...appCommonFnProps,
          entry: `${__dirname}/../lambdas/getReviewByReviewerName.ts`,
        }
        );


        const newMovieReviewFn = new node.NodejsFunction(this,  "AddMovieReviewFn", {
          ...appCommonFnProps,
          entry: `${__dirname}/../lambdas/addMovieReview.ts`,
         
        });

        const getReviewsByMovieIdYrReviewerFn = new node.NodejsFunction(this,  "GetReviewsByMovieIdYrReviewerFn",{
          ...appCommonFnProps,
            entry: `${__dirname}/../lambdas/getReviewsByMovieIdYrReviewer.ts`,
            
          }
          );

          const getReviewByReviewerNameMovieIdFn = new node.NodejsFunction(this,  "GetReviewsByReviewerNameMovieIdFn",{
            ...appCommonFnProps,
              entry: `${__dirname}/../lambdas/getReviewByReviewerNameMovieId.ts`,
              
            }
            );




   //Permissions
   movieReviewsTable.grantReadData(getReviewsByMovieIdFn)
   movieReviewsTable.grantReadData(getReviewByReviewerNameFn)
   movieReviewsTable.grantReadWriteData(newMovieReviewFn)
   movieReviewsTable.grantReadData(getReviewsByMovieIdYrReviewerFn)
   movieReviewsTable.grantReadData(getReviewByReviewerNameMovieIdFn)


    const authorizerFn = new node.NodejsFunction(this, "AuthorizerFn", {
      ...appCommonFnProps,
      entry: "./lambdas/auth/authorizer.ts",
    });

    const requestAuthorizer = new apig.RequestAuthorizer(
      this,
      "RequestAuthorizer",
      {
        identitySources: [apig.IdentitySource.header("cookie")],
        handler: authorizerFn,
        resultsCacheTtl: cdk.Duration.minutes(0),
      }
    );




    const moviesEndpoint = appApi.root.addResource("movies");
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
    
    movieReviewsAddEndpoint.addMethod("POST", new apig.LambdaIntegration(newMovieReviewFn), { 
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
       });
    
  
    const reviewsByIdReviewerEndpoint = movieReviewsEndpoint.addResource("{reviewer_year}");
    reviewsByIdReviewerEndpoint.addMethod(
      "GET",new apig.LambdaIntegration(getReviewsByMovieIdYrReviewerFn, { proxy: true })
    );

    const reviewsEndpoint = appApi.root.addResource("reviews");
    reviewsEndpoint.addMethod(
      "GET"
    );
    const reviewerNameEndpoint = reviewsEndpoint.addResource("{reviewerName}");
    reviewerNameEndpoint.addMethod(
      "GET",new apig.LambdaIntegration(getReviewByReviewerNameFn, { proxy: true })
    );

    const reviewerNameMovieIdEndpoint = reviewerNameEndpoint.addResource("{movieId}");
    const movieReviewsTransEndpoint = reviewerNameMovieIdEndpoint.addResource("translation");

    movieReviewsTransEndpoint.addMethod(
      "GET",new apig.LambdaIntegration(getReviewByReviewerNameMovieIdFn, { proxy: true })
    );

    

  }
}