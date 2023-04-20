import { Duration, Size, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { aws_pinpoint as pinpoint } from 'aws-cdk-lib';
import { Subscription, SubscriptionProtocol, Topic } from "aws-cdk-lib/aws-sns";
import { BlockPublicAccess, Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { CfnDeliveryStream } from "aws-cdk-lib/aws-kinesisfirehose";
import { Effect, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { SnsDestination } from "aws-cdk-lib/aws-lambda-destinations";
import { SnsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { CognitoUserPoolsAuthorizer, EndpointType, LambdaIntegration, RestApi, SecurityPolicy } from "aws-cdk-lib/aws-apigateway";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import { CloudFrontAllowedMethods, CloudFrontWebDistribution, HttpVersion, OriginAccessIdentity,
    OriginProtocolPolicy, SecurityPolicyProtocol, SourceConfiguration, ViewerCertificate } from "aws-cdk-lib/aws-cloudfront";

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
            encryption: BucketEncryption.S3_MANAGED,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL
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
            minCompressionSize: Size.bytes(500),
        });

        const lambdaIntegration = new LambdaIntegration(apiFunction);


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
        // Creates an origin access identity which allows CloudFront to access non-public S3 buckets
        const originAccessIdentity = new OriginAccessIdentity(this, 'UIBucketORI');

        // Grants the origin access identity the permissions to read from the bucket
        lambdaArtifactBucket.grantRead(originAccessIdentity.grantPrincipal);

        // The origin configuration for our S3 bucket hosting the UI
        const s3OriginConfig: SourceConfiguration = {
            s3OriginSource: { 
                s3BucketSource: lambdaArtifactBucket,
                originPath: '/' + props.uiBucketPrefix,
                originAccessIdentity 
            },
            behaviors: [{
                isDefaultBehavior: true,
            }],
        };

        // The origin configuration for the api
        const apiOriginConfig: SourceConfiguration = {
            customOriginSource: {
                domainName: props.apiDomain,
                originProtocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
                originHeaders: {
                    /**
                   * Pass along the appropriate signing region so that the SigV4 signer knows which region to
                   * generate the signature against
                   */
                    'x-signing-region': this.region,
                }
            },
            behaviors: [
                {
                    allowedMethods: CloudFrontAllowedMethods.ALL,
                    forwardedValues: { headers: ['Accept', 'Referer', 'Authorization', 'Content-Type', 'x-forwarded-user'], queryString: true },
                    pathPattern: '/api*',
                    maxTtl: Duration.seconds(0), // Don't cache the API responses
                    minTtl: Duration.seconds(0), // Don't cache the API responses
                    defaultTtl: Duration.seconds(0), // Don't cache the API responses
                },
            ],
        };

        const webCertificate = Certificate.fromCertificateArn(this, 'WebUICertificate', props.webCertArn)

        const viewerCertificate = ViewerCertificate.fromAcmCertificate(webCertificate, {
            aliases: [props.webDomain],
            securityPolicy: SecurityPolicyProtocol.TLS_V1_2_2021,
        });


        new CloudFrontWebDistribution(this, 'LordLaserDistribution', {
            originConfigs: [s3OriginConfig, apiOriginConfig],
            viewerCertificate: viewerCertificate,
            defaultRootObject: "index.html",
            httpVersion: HttpVersion.HTTP2_AND_3,
            loggingConfig: {
                bucket: analyticsBucket,
                includeCookies: true,
                prefix: 'cloudfront/'
            }
        });
    }
}