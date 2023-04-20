import { Duration, Size, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { aws_pinpoint as pinpoint } from 'aws-cdk-lib';
import { Subscription, SubscriptionProtocol, Topic } from "aws-cdk-lib/aws-sns";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { CfnDeliveryStream } from "aws-cdk-lib/aws-kinesisfirehose";
import { Effect, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { SnsDestination } from "aws-cdk-lib/aws-lambda-destinations";
import { SnsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { AwsIntegration, CognitoUserPoolsAuthorizer, EndpointType, LambdaIntegration, RestApi, SecurityPolicy } from "aws-cdk-lib/aws-apigateway";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { UserPool } from "aws-cdk-lib/aws-cognito";

export interface InfraStackProps extends StackProps {
    throttleArtifactKey: string;
    throttleName: string;
    apiArtifactKey: string;
    apiName: string;
    messageTableName: string;
    artifactBucketParamName: string;
    apiCertArn: string;
    apiDomain: string;
    throttleFunctionName: string;
    apiFunctionName: string;
    throttleTableName: string;
    uiBucketPrefix: string;
    webCertArn: string;
    webDomain: string;
}

export class LordLaserInfraStack extends Stack {
    constructor(scope: Construct, id: string, props: InfraStackProps) {
        super(scope, id, props);

        const lambdaArtifactBucketName = StringParameter.fromStringParameterAttributes(this, 'LordLaserLambdaArtifactParameterBucketName', {
            parameterName: props.artifactBucketParamName,
        }).stringValue

        const lambdaArtifactBucket = Bucket.fromBucketName(this, 'LordLaserLambdaArtifactBucket', lambdaArtifactBucketName);
        const pinpointProject = new pinpoint.CfnApp(this, 'LordLaserPinpointProject', {
            name: 'LordLaser'
        });

        new pinpoint.CfnSMSChannel(this, 'LordLaserPinpointSMSChannel', {
            applicationId: pinpointProject.ref,
            enabled: true,
        });

        const inboundMsgTopic = new Topic(this, 'LordLaserInboundTopic', {
            displayName: "Handles raw incoming messages from the crowd"
        });

        const analyticsBucket = new Bucket(this, 'LordLaserAnalyticsBucket', {

        });

        const kinesisRole = new Role(this, 'LordLaserKinesisRole', {
            assumedBy: new ServicePrincipal('firehose.amazonaws.com'),

        });

        analyticsBucket.grantReadWrite(kinesisRole);

        const messageDeliveryStream = new CfnDeliveryStream(this, 'LordLaserDeliveryStream', {
            s3DestinationConfiguration: {
                bucketArn: analyticsBucket.bucketArn,
                roleArn: kinesisRole.roleArn,
                bufferingHints: {
                    intervalInSeconds: 900,
                    sizeInMBs: 128,
                },
                compressionFormat: 'UNCOMPRESSED',
            }
        });

        const snsRole = new Role(this, 'LordLaserSNSRole', {
            assumedBy: new ServicePrincipal('sns.amazonaws.com'),
        });

        const snsFireHosePolicy = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                "firehose:*",
            ],
            resources: [
                messageDeliveryStream.attrArn,
            ]
        });

        snsRole.addToPolicy(snsFireHosePolicy);

        new Subscription(this, 'LordLaserFirehoseSubscription', {
            topic: inboundMsgTopic,
            endpoint: messageDeliveryStream.getAtt('Arn').toString(),
            protocol: SubscriptionProtocol.FIREHOSE,
            subscriptionRoleArn: snsRole.roleArn,
        });

        const lambdaFailureTopic = new Topic(this, 'LordLaserLambdaFailureTopic', {
            displayName: "SNS Topic for LordLaser Lambda Failures"
        });

        const messageTable = new Table(this, 'LordLaserMessageTable', {
            partitionKey: { name: 'messageId', type: AttributeType.STRING },
            billingMode: BillingMode.PAY_PER_REQUEST,
            tableName: props.messageTableName,
        });

        const throttleTable = new Table(this, 'LordLaserThrottleTable', {
            partitionKey: { name: 'throttleType', type: AttributeType.STRING },
            billingMode: BillingMode.PAY_PER_REQUEST,
            tableName: props.throttleTableName,
        });

        const throttleFunction = new Function(this, 'LordLaserThrottleFunction', {
            code: Code.fromBucket(lambdaArtifactBucket, props.throttleArtifactKey),
            memorySize: 128,
            timeout: Duration.minutes(5),
            onFailure: new SnsDestination(lambdaFailureTopic),
            retryAttempts: 2,
            runtime: Runtime.GO_1_X,
            handler: props.throttleName,
            environment: {
                MSG_TABLE: props.messageTableName,
                THROTTLE_TABLE: props.throttleTableName
            },
            logRetention: RetentionDays.THREE_MONTHS,
            functionName: props.throttleFunctionName
        });

        throttleFunction.addEventSource(new SnsEventSource(inboundMsgTopic));

        messageTable.grantReadWriteData(throttleFunction);
        throttleTable.grantReadData(throttleFunction);
        throttleFunction.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                "translate:TranslateText",
                "comprehend:DetectDominantLanguage"
            ],
            resources: ["*"]
        }));

        const apiFunction = new Function(this, 'LordLaserAPIFunction', {
            code: Code.fromBucket(lambdaArtifactBucket, props.apiArtifactKey),
            memorySize: 128,
            timeout: Duration.minutes(5),
            onFailure: new SnsDestination(lambdaFailureTopic),
            runtime: Runtime.GO_1_X,
            handler: props.apiName,
            environment: {
                MSG_TABLE: props.messageTableName,
                THROTTLE_TABLE: props.throttleTableName
            },
            logRetention: RetentionDays.THREE_MONTHS,
            functionName: props.apiFunctionName
        });

        messageTable.grantReadWriteData(apiFunction);
        throttleTable.grantReadWriteData(apiFunction);

        const userPool = new UserPool(this, 'LordLaserUserPool', {
            userPoolName: 'LordLaserUserPoool'
        });

        // const apiAuth = new CognitoUserPoolsAuthorizer(this, 'APIAuthorizer', {
        //     cognitoUserPools: [userPool]
        // });

        const api = new RestApi(this, 'LordLaserApi', {
            deployOptions: {
                metricsEnabled: true,
                tracingEnabled: true
            },
            endpointConfiguration: {
                types: [EndpointType.REGIONAL]
            },
            cloudWatchRole: true,
            binaryMediaTypes: ["*/*"],
            minCompressionSize: Size.bytes(0),
        });

        const apiGatewayRole = new Role(this, 'ApiGWS3Role', {
            assumedBy: new ServicePrincipal('apigateway.amazonaws.com')
        });

        const s3ReadPolicy = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                "s3:Get*",
                "s3:List*"
            ],
            resources: [
                lambdaArtifactBucket.bucketArn,
                lambdaArtifactBucket.bucketArn + "/*"
            ]
        });

        apiGatewayRole.addToPolicy(s3ReadPolicy);

        const lambdaIntegration = new LambdaIntegration(apiFunction);
        const s3Integration = new AwsIntegration({
            service: "s3",
            integrationHttpMethod: "GET",
            path: `${lambdaArtifactBucketName}/${props.uiBucketPrefix}/{folder}/{key}`,
            region: this.region,
            options: {
                credentialsRole: apiGatewayRole,
                integrationResponses: [
                    {
                        statusCode: "200",
                        responseParameters: {
                            "method.response.header.Content-Type": "integration.response.header.Content-Type",
                        }
                    }
                ],
                requestParameters: {
                    "integration.request.path.folder": "method.request.path.folder",
                    "integration.request.path.key": "method.request.path.key",
                }
            }
        })

        api.root
            .addResource("{folder}")
            .addResource("{key}")
            .addMethod('GET', s3Integration, {
                //authorizer: apiAuth,
                //authorizationType: AuthorizationType.COGNITO
                methodResponses: [
                    {
                        statusCode: "200",
                        responseParameters: {
                            "method.response.header.Content-Type": true,
                        },
                    },
                ],
                requestParameters: {
                    "method.request.path.folder": true,
                    "method.request.path.key": true,
                    "method.request.header.Content-Type": true,
                },
            });

        const apiRoute = api.root.addResource('api');
        apiRoute.addMethod('GET', lambdaIntegration);
        apiRoute.addMethod('POST', lambdaIntegration);
        apiRoute.addMethod('PUT', lambdaIntegration);
        apiRoute.addMethod('DELETE', lambdaIntegration);

        const rssRoute = api.root.addResource('rss');
        rssRoute.addMethod('GET', lambdaIntegration);

        api.addDomainName('LordLaserAPIDomainName', {
            certificate: Certificate.fromCertificateArn(this, 'ApiCert', props.apiCertArn),
            domainName: props.apiDomain,
            securityPolicy: SecurityPolicy.TLS_1_2
        });
    }
}