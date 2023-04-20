import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from "constructs";
import { LordLaserInfraStack } from './lordlaser-infra-stack';

export interface ProdStageProps extends StageProps {
    throttleArtifactKey: string;
    throttleName: string;
    apiArtifactKey: string;
    apiName: string;
    messageTableName: string;
    artifactBucketParamName: string;
    apiCertArn: string;
    apiDomain: string;
    apiFunctionName: string;
    throttleFunctionName: string;
    throttleTableName: string;
    uiBucketPrefix: string;
    webCertArn: string;
    webDomain: string;
}

export class LordLaserProdStage extends Stage {

    constructor(scope: Construct, id: string, props: ProdStageProps) {
        super(scope, id, props);

        const infraStack = new LordLaserInfraStack(this, 'InfraStack', {
            throttleArtifactKey: props.throttleArtifactKey,
            throttleName: props.throttleName,
            apiArtifactKey: props.apiArtifactKey,
            apiName: props.apiName,
            messageTableName: props.messageTableName,
            artifactBucketParamName: props.artifactBucketParamName,
            apiCertArn: props.apiCertArn,
            apiDomain: props.apiDomain,
            apiFunctionName: props.apiFunctionName,
            throttleFunctionName: props.throttleFunctionName,
            throttleTableName: props.throttleTableName,
            uiBucketPrefix: props.uiBucketPrefix,
            webCertArn: props.webCertArn,
            webDomain: props.webDomain,
            terminationProtection: true
        });
    }
}