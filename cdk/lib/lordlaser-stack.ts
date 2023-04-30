import { Stack, StackProps } from 'aws-cdk-lib';
import { CodeBuildStep, CodePipeline, CodePipelineSource } from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';
import { LordLaserProdStage } from './lordlaser-prod-stage';
import { GenerateCodestarARN, GenerateACMCertificateARN, LordLaserConstants } from '../bin/lordlaser-constants';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';

export interface LordLaserStackProps extends StackProps {
    readonly githubRepo: string;
    readonly githubBranch: string;
    readonly throttleName: string;
    readonly throttleArtifact: string;
    readonly apiName: string;
    readonly apiArtifact: string;
    readonly messageTableName: string;
    readonly artifactBucketParamName: string;
    readonly uiBucketPrefix: string;
    readonly codeStarGuidParamName: string;
}

export class LordLaserStack extends Stack {
    constructor(scope: Construct, id: string, props: LordLaserStackProps) {
        super(scope, id, props);

        const codeStarConnectionGUID = StringParameter.fromStringParameterAttributes(this, 'GitHubCodeStarGuid', {
            parameterName: props.codeStarGuidParamName,
        }).stringValue

        const codestarConnectionARN = GenerateCodestarARN(this.account, this.region, codeStarConnectionGUID);

        const customArtifactBucket = new Bucket(this, 'LordLaser-ArtifactBucket', {
            encryption: BucketEncryption.S3_MANAGED,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL
        });

        new StringParameter(this, 'LordLaser-ArtifactBucketParam', {
            parameterName: props.artifactBucketParamName,
            description: 'S3 Bucket for the LordLaser Artifacts',
            stringValue: customArtifactBucket.bucketName
        });

        const s3CodeBuildPolicy = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['s3:*'],
            resources: [
                customArtifactBucket.bucketArn,
                customArtifactBucket.arnForObjects('*')
            ]
        });

        const deployLambdaPolicy = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["lambda:UpdateFunctionCode"],
            resources: ["*"]

        });

        const sourceConnector = CodePipelineSource.connection(props.githubRepo, props.githubBranch, {
            connectionArn: codestarConnectionARN
        });

        const pipeline = new CodePipeline(this, 'LordLaserPipeline', {
            pipelineName: 'LordLaserPipeline',
            synth: new CodeBuildStep('SynthBuild', {
                input: sourceConnector,
                commands: [
                    'cd cdk',
                    'npm ci',
                    'npm run build',
                    'npx cdk synth -o ../cdk.out',
                ]
            })
        });


        const buildSource = new CodeBuildStep('BuildThrottleLambda', {
            input: sourceConnector,
            commands: [
                'pwd',
                'ls',
                'env',
                'cd src/api-lambda',
                'GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o ${ApiBinary}',
                'zip ${ApiArtifact} ${ApiBinary}',
                'ls',
                'aws s3 cp ${ApiArtifact} s3://${ArtifactBucket}/${ApiArtifact}',
                'cd ../throttle-lambda',
                'GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o ${ThrottleBinary}',
                'zip ${ThrottleArtifact} ${ThrottleBinary}',
                'ls',
                'aws s3 cp ${ThrottleArtifact} s3://${ArtifactBucket}/${ThrottleArtifact}',
                'cd ../../web',
                'npm install',
                'npm run build',
                'ls',
                'aws s3 rm s3://${ArtifactBucket}/${UIPrefix}/ --recursive',
                'aws s3 cp ./build s3://${ArtifactBucket}/${UIPrefix}/ --recursive'
            ],
            buildEnvironment: {
                environmentVariables: {
                    ArtifactBucket: { value: customArtifactBucket.bucketName },
                    ApiArtifact: { value: props.apiArtifact },
                    ApiBinary: { value: props.apiName },
                    ThrottleArtifact: { value: props.throttleArtifact },
                    ThrottleBinary: { value: props.throttleName },
                    UIPrefix: { value: props.uiBucketPrefix },
                }
            },
            rolePolicyStatements: [s3CodeBuildPolicy]
        });


        pipeline.addWave('BuildSource', {
            post: [
                buildSource
            ]
        });

        const prodWave = pipeline.addWave('Prod');

        const prodStage = new LordLaserProdStage(this, 'LordLaser-Prod', {
            artifactBucketParamName: props.artifactBucketParamName,
            throttleArtifactKey: props.throttleArtifact,
            throttleName: props.throttleName,
            apiArtifactKey: props.apiArtifact,
            apiName: props.apiName,
            messageTableName: props.messageTableName,
            apiFunctionName: LordLaserConstants.API_LAMBDA_NAME,
            throttleFunctionName: LordLaserConstants.THROTTLE_LAMBDA_NAME,
            throttleTableName: LordLaserConstants.THROTTLE_TABLE_NAME,
            uiBucketPrefix: props.uiBucketPrefix,
            webCertParamName: LordLaserConstants.WEB_ACM_PARAM,
            webDomainParamName: LordLaserConstants.WEB_DNS_PARAM,
            apiCertParamName: LordLaserConstants.API_ACM_PARAM,
            apiDomainParamName: LordLaserConstants.API_DNS_PARAM,
        });

        prodWave.addStage(prodStage, {
            post: [
                new CodeBuildStep('UpdateLambdas', {
                    commands: [
                        'aws lambda update-function-code --function-name ${ApiFunctionName} --s3-bucket ${ArtifactBucket} --s3-key ${ApiArtifactName}',
                        'aws lambda update-function-code --function-name ${ThrottleFunctionName} --s3-bucket ${ArtifactBucket} --s3-key ${ThrottleArtifactName}'
                    ],
                    env: {
                        ApiFunctionName: LordLaserConstants.API_LAMBDA_NAME,
                        ThrottleFunctionName: LordLaserConstants.THROTTLE_LAMBDA_NAME,
                        ArtifactBucket: customArtifactBucket.bucketName,
                        ApiArtifactName: props.apiArtifact,
                        ThrottleArtifactName: props.throttleArtifact
                    },
                    rolePolicyStatements: [deployLambdaPolicy, s3CodeBuildPolicy]
                })
            ]
        });
    }
}
