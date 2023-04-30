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
    apiFunctionName: string;
    throttleFunctionName: string;
    throttleTableName: string;
    uiBucketPrefix: string;
    webCertParamName: string;
    webDomainParamName: string;
    apiCertParamName: string;
    apiDomainParamName: string;
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
            apiFunctionName: props.apiFunctionName,
            throttleFunctionName: props.throttleFunctionName,
            throttleTableName: props.throttleTableName,
            uiBucketPrefix: props.uiBucketPrefix,
            webCertParamName: props.webCertParamName,
            webDomainParamName: props.webDomainParamName,
            apiCertParamName: props.apiCertParamName,
            apiDomainParamName: props.apiDomainParamName,
            terminationProtection: true
        });
    }
}