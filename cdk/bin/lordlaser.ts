#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { LordLaserStack } from '../lib/lordlaser-stack';
import { LordLaserConstants } from './lordlaser-constants';

const lordlaser = new App();
new LordLaserStack(lordlaser, 'LordLaserPipelineStack', {
    githubRepo: LordLaserConstants.GITHUB_REPO,
    githubBranch: LordLaserConstants.GITHUB_BRANCH,
    throttleName: LordLaserConstants.THROTTLE_EXEC_NAME,
    throttleArtifact: LordLaserConstants.THROTTLE_ARTIFACT_NAME,
    apiArtifact: LordLaserConstants.API_ARTIFACT_NAME,
    apiName: LordLaserConstants.API_EXEC_NAME,
    messageTableName: LordLaserConstants.MESSAGE_TABLE_NAME,
    artifactBucketParamName: LordLaserConstants.ARTIFACT_BUCKET_PARAM,
    uiBucketPrefix: LordLaserConstants.UI_BUCKET_PREFIX,
    terminationProtection: true
});